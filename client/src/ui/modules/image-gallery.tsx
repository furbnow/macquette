import type { ErrorCallback, QueueObject } from 'async';
import { queue } from 'async';
import React, { ReactElement, useEffect, useId, useState } from 'react';
import { z } from 'zod';

import { HTTPClient } from '../../api/http';
import { projectSchema } from '../../data-schemas/project';
import type { Image } from '../../data-schemas/project/image';
import { Result } from '../../helpers/result';
import { DeleteIcon, EditIcon, UploadIcon } from '../icons';
import type { Dispatcher, UiModule } from '../module-management/module-type';
import { Spinner } from '../output-components/spinner';

type FetchStatus = 'at rest' | 'in flight' | 'successful' | 'failed';
type Uploadable<T> = T & { status: FetchStatus };

type ImageUploadData = {
  id: symbol;
  file: File;
};

type State = {
  assessmentId: string;
  images: Image[];
  imagesToUpload: Uploadable<ImageUploadData>[];
};

type Action =
  | { type: 'external data update'; state: Pick<State, 'images' | 'assessmentId'> }
  | { type: 'add to upload list'; files: File[] }
  | { type: 'remove from upload list'; idx: number }
  | { type: 'upload images' }
  | { type: 'image started uploading'; id: symbol }
  | { type: 'image uploaded'; id: symbol; image: Image }
  | { type: 'upload failed'; id: symbol }
  | { type: 'delete image'; id: number }
  | { type: 'delete selected images' }
  | { type: 'image deleted'; id: number }
  | { type: 'start editing note'; id: number }
  | { type: 'note field change'; id: number; note: string }
  | { type: 'save note'; image: Image }
  | { type: 'saving note'; id: number }
  | { type: 'note saved'; id: number }
  | { type: 'cancel note edit'; id: number }
  | { type: 'set featured image'; id: number }
  | { type: 'featured image set'; id: number }
  | { type: 'toggle selected image'; id: number }
  | { type: 'API error'; err: unknown };

type Effect =
  | { type: 'delete images'; ids: number[] }
  | { type: 'save note'; id: number; text: string }
  | { type: 'set featured image'; assessmentId: string; imageId: number }
  | {
      type: 'upload images';
      assessmentId: string;
      files: ImageUploadData[];
    };

function withUpdated<T extends { id: Id }, Id>(
  array: T[],
  id: Id,
  mapper: (row: T) => T,
): T[] {
  return array.map((row) => {
    if (row.id === id) {
      return mapper(row);
    } else {
      return row;
    }
  });
}

function reducer(state: State, msg: Action): [State, Array<Effect>?] {
  switch (msg.type) {
    case 'external data update': {
      const { assessmentId, images } = msg.state;
      return [{ ...state, assessmentId, images }];
    }

    case 'add to upload list': {
      return [
        {
          ...state,
          imagesToUpload: [
            ...state.imagesToUpload.filter(({ status }) => status !== 'successful'),
            ...msg.files.map((file) => ({
              id: Symbol(),
              status: 'at rest' as const,
              file,
            })),
          ],
        },
      ];
    }

    case 'remove from upload list': {
      return [
        {
          ...state,
          imagesToUpload: state.imagesToUpload.filter((_, arrIdx) => msg.idx !== arrIdx),
        },
      ];
    }

    case 'upload images': {
      const imagesToUpload = state.imagesToUpload.filter(
        (file) => file.status === 'at rest',
      );
      return [
        {
          ...state,
          imagesToUpload,
        },
        [
          {
            type: 'upload images',
            assessmentId: state.assessmentId,
            files: imagesToUpload.map(({ id, file }) => ({ id, file })),
          },
        ],
      ];
    }

    case 'image started uploading': {
      return [
        {
          ...state,
          imagesToUpload: withUpdated(state.imagesToUpload, msg.id, (image) => ({
            ...image,
            status: 'in flight' as const,
          })),
        },
      ];
    }

    case 'image uploaded': {
      return [
        {
          ...state,
          images: [...state.images, msg.image],
          imagesToUpload: withUpdated(state.imagesToUpload, msg.id, (image) => ({
            ...image,
            status: 'successful' as const,
          })),
        },
      ];
    }

    case 'upload failed': {
      return [
        {
          ...state,
          imagesToUpload: withUpdated(state.imagesToUpload, msg.id, (image) => ({
            ...image,
            status: 'failed' as const,
          })),
        },
      ];
    }

    case 'delete image': {
      return [state, [{ type: 'delete images', ids: [msg.id] }]];
    }

    case 'delete selected images': {
      const ids = state.images
        .filter((image) => image.isSelected)
        .map((image) => image.id);
      return [state, [{ type: 'delete images', ids }]];
    }

    case 'image deleted': {
      return [{ ...state, images: state.images.filter((img) => img.id !== msg.id) }];
    }

    case 'start editing note': {
      return [
        {
          ...state,
          images: withUpdated(state.images, msg.id, (image) => ({
            ...image,
            note: {
              status: 'edited' as const,
              stored: image.note.stored,
              user: image.note.stored,
            },
          })),
        },
      ];
    }

    case 'note field change': {
      return [
        {
          ...state,
          images: withUpdated(state.images, msg.id, (image) => ({
            ...image,
            note: {
              status: 'edited' as const,
              stored: image.note.stored,
              user: msg.note,
            },
          })),
        },
      ];
    }

    case 'save note': {
      const { image } = msg;
      if (image.note.status !== 'edited' && image.note.status !== 'failed to save') {
        return [state];
      }
      return [state, [{ type: 'save note', id: image.id, text: image.note.user }]];
    }

    case 'saving note': {
      return [
        {
          ...state,
          images: withUpdated(state.images, msg.id, (image) =>
            image.note.status === 'edited'
              ? {
                  ...image,
                  note: { ...image.note, status: 'saving' as const },
                }
              : image,
          ),
        },
      ];
    }

    case 'note saved': {
      return [
        {
          ...state,
          images: withUpdated(state.images, msg.id, (image) =>
            image.note.status === 'saving'
              ? {
                  ...image,
                  note: {
                    status: 'not edited' as const,
                    stored: image.note.user,
                  },
                }
              : image,
          ),
        },
      ];
    }

    case 'cancel note edit': {
      return [
        {
          ...state,
          images: withUpdated(state.images, msg.id, (image) => ({
            ...image,
            note: {
              status: 'not edited' as const,
              stored: image.note.stored,
            },
          })),
        },
      ];
    }

    case 'set featured image': {
      return [
        state,
        [
          {
            type: 'set featured image',
            assessmentId: state.assessmentId,
            imageId: msg.id,
          },
        ],
      ];
    }

    case 'featured image set': {
      for (const img of state.images) {
        img.isFeatured = img.id === msg.id;
      }
      return [state];
    }

    case 'toggle selected image': {
      return [
        {
          ...state,
          images: withUpdated(state.images, msg.id, (image) => ({
            ...image,
            isSelected: !image.isSelected,
          })),
        },
      ];
    }

    case 'API error': {
      alert('Error');
      return [state];
    }
  }
}

function GalleryCardDisplay({
  image,
  dispatch,
}: {
  image: Image;
  dispatch: Dispatcher<Action>;
}) {
  return (
    <div className="gallerycard-content">
      {image.note.stored}

      <div className="d-flex align-items-center justify-content-between">
        <span className="d-flex gap-7 align-items-center">
          <button
            className="btn btn--icon"
            onClick={() => dispatch({ type: 'start editing note', id: image.id })}
          >
            <EditIcon />
            Edit note
          </button>
          <button
            className="btn btn--icon"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this image?')) {
                dispatch({
                  type: 'delete image',
                  id: image.id,
                });
              }
            }}
          >
            <DeleteIcon />
            Delete
          </button>
          {image.isFeatured ? (
            <span>Cover image</span>
          ) : (
            <button
              className="btn"
              onClick={() => dispatch({ type: 'set featured image', id: image.id })}
            >
              Use as cover image
            </button>
          )}
        </span>
        <input
          type="checkbox"
          className="gallerycard-checkbox"
          checked={image.isSelected}
          onChange={() => dispatch({ type: 'toggle selected image', id: image.id })}
        />
      </div>
    </div>
  );
}

/**
 * Edit an image note.
 */
function GalleryCardEditor({
  image,
  dispatch,
}: {
  image: Image;
  dispatch: Dispatcher<Action>;
}) {
  if (image.note.status === 'not edited') {
    throw new Error('Should not be called with image not in editing mode');
  }

  // We work around the roundtrip being incredibly slow due to repeated Zod parsing by
  // storing the note state locally.
  const [note, setNote] = useState(image.note.user);

  function save() {
    dispatch({
      type: 'note field change',
      id: image.id,
      note,
    });
    dispatch({ type: 'save note', image });
  }
  function cancel() {
    dispatch({ type: 'cancel note edit', id: image.id });
  }

  return (
    <div className="gallerycard-content">
      <textarea
        rows={4}
        style={{ width: '97%' }}
        onChange={(evt) => setNote(evt.target.value)}
        onKeyDown={(evt) => {
          if (evt.key === 'Esc' || evt.key === 'Escape') {
            cancel();
          } else if (
            evt.key === 'Enter' &&
            (evt.metaKey === true || evt.ctrlKey === true)
          ) {
            save();
          }
        }}
        value={note}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={true}
      ></textarea>

      <div className="d-flex align-items-center justify-content-between">
        <span className="d-flex gap-7 align-items-center">
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={image.note.status === 'saving'}
          >
            Save note
          </button>
          <button
            className="btn"
            onClick={cancel}
            disabled={image.note.status === 'saving'}
          >
            Cancel
          </button>
          {image.note.status === 'saving' && <Spinner />}
        </span>
        <input
          type="checkbox"
          className="gallerycard-checkbox"
          checked={image.isSelected}
          onChange={() => dispatch({ type: 'toggle selected image', id: image.id })}
        />
      </div>
    </div>
  );
}

/**
 * A single image row.
 */
function GalleryCard({
  image,
  dispatch,
}: {
  image: Image;
  dispatch: Dispatcher<Action>;
}) {
  return (
    <div className={`gallerycard ${image.isSelected ? 'gallerycard--selected' : ''}`}>
      <a className="gallerycard-image" href={image.url}>
        {/* We provide no alt text because there is no useful text to display -
         * the text is displayed for everyone in the display/input */}
        <img
          alt=""
          src={image.thumbnailURL}
          width={image.thumbnailWidth}
          height={image.thumbnailHeight}
        />
      </a>

      {image.note.status !== 'not edited' ? (
        <GalleryCardEditor image={image} dispatch={dispatch} />
      ) : (
        <GalleryCardDisplay image={image} dispatch={dispatch} />
      )}
    </div>
  );
}

function GallerySection({
  state,
  dispatch,
}: {
  state: State;
  dispatch: Dispatcher<Action>;
}) {
  const numSelected = state.images.filter((image) => image.isSelected).length;

  return (
    <section className="line-top mb-45">
      <h3 className="mt-0">Gallery</h3>
      <button
        className="btn mb-30"
        disabled={numSelected === 0}
        onClick={() => {
          if (
            window.confirm(`Are you sure you want to delete these ${numSelected} images?`)
          ) {
            dispatch({ type: 'delete selected images' });
          }
        }}
      >
        Delete selected images
      </button>

      {[...state.images]
        .sort((a, b) => a.id - b.id)
        .map((image) => (
          <GalleryCard key={image.id} image={image} dispatch={dispatch} />
        ))}
    </section>
  );
}

function FileDropper({
  onNewFiles,
}: {
  onNewFiles: (files: File[]) => void;
}): ReactElement {
  const id = useId();
  const [dropzoneVisible, setDropzoneVisible] = useState(false);

  /* Credit for the 'lastTarget' technique used here to
   * https://stackoverflow.com/questions/28226021/entire-page-as-a-dropzone-for-drag-and-drop
   *
   * What happens?
   *
   * 1. The user drags a file onto the window
   * 2. This fires 'dragenter' on whatever element the user settles over first
   * 3. This triggers the 'dropzone' being displayed on the entire page
   * 4. This causes 'dragenter' on the dropzone and a 'dragleave' on the original
   *    element
   * 5. 'dragover' is then triggered every couple hundred ms on the dropzone element;
   *    to tell the browser that this element will 'accept' the drop event, we have
   *    to cancel the event
   *
   * Then either
   * - the user drops the file on the dropzone element and we handle that
   * - the user aborts the drag and we get a 'dragleave' event
   *
   * In both cases we need to hide the dropzone element.
   */
  useEffect(() => {
    let lastTarget: EventTarget | null = null;

    function dragEnter(evt: DragEvent) {
      lastTarget = evt.target;
      setDropzoneVisible(true);

      evt.preventDefault();
      evt.stopPropagation();
    }

    function dragLeave(evt: DragEvent) {
      if (evt.target === lastTarget || evt.target === document) {
        setDropzoneVisible(false);
      }

      evt.preventDefault();
      evt.stopPropagation();
    }

    function dragOver(evt: DragEvent) {
      evt.preventDefault();
      evt.stopPropagation();
    }

    function drop(evt: DragEvent) {
      evt.preventDefault();
      evt.stopPropagation();

      const dt = evt.dataTransfer;
      if (dt === null) {
        console.error('No files provided with drop event');
        return;
      }
      onNewFiles(Array.from(dt.files));

      if (evt.target === lastTarget || evt.target === document) {
        setDropzoneVisible(false);
      }
    }

    window.addEventListener('dragenter', dragEnter, false);
    window.addEventListener('dragleave', dragLeave, false);
    window.addEventListener('dragover', dragOver, false);
    window.addEventListener('drop', drop, false);

    return () => {
      window.removeEventListener('dragenter', dragEnter);
      window.removeEventListener('dragleave', dragLeave);
      window.removeEventListener('dragover', dragOver, false);
      window.removeEventListener('drop', drop);
    };
  }, [onNewFiles]);

  return (
    <>
      <div
        id={`dropzone-${id}`}
        className="filedropper-dropzone"
        style={dropzoneVisible ? {} : { display: 'none' }}
      >
        <span>Drop here to upload</span>
      </div>
      <input
        type="file"
        multiple
        accept="image/*"
        className="filedropper-input"
        onChange={(evt) => {
          const inputElem = evt.target;
          if (inputElem.files !== null) {
            onNewFiles(Array.from(inputElem.files));
            inputElem.value = '';
          }
        }}
        id={`filedrop-${id}`}
      />
      <label htmlFor={`filedrop-${id}`} className="filedropper-label pa-7 btn mb-15">
        <UploadIcon />
        <span className="ml-7">Add file(s)...</span>
      </label>
    </>
  );
}

function UploadProgress({
  imagesToUpload,
  dispatch,
}: {
  imagesToUpload: State['imagesToUpload'];
  dispatch: Dispatcher<Action>;
}) {
  return (
    <div
      style={{ border: '1px solid var(--grey-600)', width: 'max-content' }}
      className="mb-15"
    >
      <div
        className="d-flex justify-content-between align-items-center px-15 py-7"
        style={{ backgroundColor: 'var(--grey-800)' }}
      >
        To upload:
      </div>

      {imagesToUpload.map(({ file, status }, idx) => (
        <div
          style={{ borderTop: '1px solid var(--grey-600)' }}
          className="d-flex justify-content-between align-items-center px-15 py-7"
          key={idx}
        >
          <span>{file.name}</span>
          <span className="ml-30">
            {status === 'in flight' ? (
              'Uploading...'
            ) : status === 'successful' ? (
              '✔️ Uploaded'
            ) : status === 'failed' ? (
              'Error uploading'
            ) : (
              <button
                className="btn"
                onClick={() =>
                  dispatch({
                    type: 'remove from upload list',
                    idx: idx,
                  })
                }
              >
                <DeleteIcon /> Remove
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function UploadSection({
  state,
  dispatch,
}: {
  state: State;
  dispatch: Dispatcher<Action>;
}): ReactElement {
  const filesToUpload =
    state.imagesToUpload.filter((upload) => upload.status === 'at rest').length > 0;

  return (
    <section className="line-top mb-45">
      <h3 className="mt-0">Upload</h3>

      <FileDropper
        onNewFiles={(files) =>
          dispatch({
            type: 'add to upload list',
            files: files,
          })
        }
      />

      {state.imagesToUpload.length > 0 && (
        <>
          <UploadProgress imagesToUpload={state.imagesToUpload} dispatch={dispatch} />
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'upload images' })}
            disabled={!filesToUpload}
          >
            Upload
          </button>
        </>
      )}
    </section>
  );
}

export default function ImageGallery({
  state,
  dispatch,
}: {
  state: State;
  dispatch: Dispatcher<Action>;
}) {
  return (
    <div>
      <UploadSection state={state} dispatch={dispatch} />
      <GallerySection state={state} dispatch={dispatch} />
    </div>
  );
}

export const imageGalleryModule: UiModule<State, Action, Effect> = {
  name: 'image-gallery',
  component: ImageGallery,
  initialState: () => ({
    images: [],
    assessmentId: '',
    imagesToUpload: [],
    selectedImageIds: [],
    imageUploadCounter: 0,
  }),
  reducer,
  effector: async (effect: Effect, dispatch: Dispatcher<Action>) => {
    const apiClient = new HTTPClient();

    switch (effect.type) {
      case 'delete images': {
        for await (const id of effect.ids) {
          try {
            await apiClient.deleteImage(id);
            dispatch({ type: 'image deleted', id });
          } catch (err) {
            dispatch({ type: 'API error', err: err });
          }
        }
        break;
      }
      case 'save note': {
        try {
          dispatch({ type: 'saving note', id: effect.id });
          await apiClient.setImageNote(effect.id, effect.text);
          dispatch({ type: 'note saved', id: effect.id });
        } catch (err) {
          dispatch({ type: 'API error', err: err });
        }
        break;
      }
      case 'set featured image': {
        try {
          await apiClient.setFeaturedImage(effect.assessmentId, effect.imageId);
          dispatch({ type: 'featured image set', id: effect.imageId });
        } catch (err) {
          dispatch({ type: 'API error', err: err });
        }
        break;
      }
      case 'upload images': {
        const taskQueue: QueueObject<ImageUploadData> = queue(
          ({ id, file }: ImageUploadData, cb: ErrorCallback<unknown>) => {
            dispatch({ type: 'image started uploading', id });
            apiClient
              .uploadImage(effect.assessmentId, file)
              .then((img) => {
                dispatch({ type: 'image uploaded', id, image: img });
                cb();
              })
              .catch((err) => {
                dispatch({ type: 'upload failed', id });
                cb(err);
              });
          },
          3,
        );

        await taskQueue.push(effect.files);

        break;
      }
    }
  },
  shims: {
    extractUpdateAction: ({ project }) => {
      return Result.ok([
        {
          type: 'external data update',
          state: {
            assessmentId: project.id,
            images: project.images,
          },
        },
      ]);
    },
    mutateLegacyData: ({ project: projectRaw }, _context, state) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const project = projectRaw as z.infer<typeof projectSchema>;
      project.images = state.images;
    },
  },
};
