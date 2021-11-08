import React, { useRef, useReducer, ReactElement } from 'react';
import { Image } from '../types/Metadata';
import { UploadFile } from '../components/icons/upload';
import { TrashBin } from '../components/icons/trash';
import { Edit } from '../components/icons/edit';

/* eslint-disable @typescript-eslint/no-namespace */
declare namespace mhep_helper {
    function delete_image(imageId: number): Promise<void>;
    function upload_image(assessmentId: number, file: File): Promise<Image>;
    function set_image_note(imageId: number, note: string): Promise<void>;
    function set_featured_image(assessmentId: number, imageId: number): Promise<void>;
}

/*********** State handling ***********/

type Message =
    | { type: 'addFilesToUpload'; files: File[] }
    | { type: 'removeFromUpload'; idx: number }
    | { type: 'imageUploaded'; index: number; image: Image }
    | { type: 'imageDeleted'; id: number }
    | { type: 'editNote'; image: Image }
    | { type: 'noteChange'; id: number; note: string }
    | { type: 'saveNote'; id: number }
    | { type: 'cancelNote'; id: number }
    | { type: 'setFeaturedImage'; id: number }
    | { type: 'toggleSelected'; id: number };

type ImageUploadData = {
    name: string;
    uploaded: boolean;
    file: File;
};

type EditData = {
    id: number;
    note: string;
};

type State = {
    images: Image[];
    assessmentId: number;
    imagesToUpload: ImageUploadData[];
    selectedImageIds: number[];
    noteEdits: EditData[];
};

const blankState: State = {
    images: [],
    assessmentId: NaN,
    imagesToUpload: [],
    selectedImageIds: [],
    noteEdits: [],
};

type Dispatcher = (msg: Message) => void;

/**
 * A reducer for our view state.
 *
 * One of the shortcomings of the architecture in this file at the moment is that you
 * can't dispatch from within the dispatcher - for example, you can't upload something,
 * then trigger a dispatch in an async way.  This is annoying and when we have a global
 * message-dispatch system we should architect it out.
 *
 * The other shortcoming is that we are not really in control of the global state here -
 * meaning that 'state.images' is an alias to the assessment data's image array.  This
 * means we have to do a lot of editing in place of the state.images data, which sucks.
 * But again, when we have a more global state mangement this problem can be refactored
 * away.  The most important bit right now is that UI and state management code are not
 * deeply entwined.
 */
function reducer(state: State, msg: Message): State {
    switch (msg.type) {
        /* Given a set of JS File objects, add them to our upload list */
        case 'addFilesToUpload': {
            const files = state.imagesToUpload;

            // First filter out things that were uploaded
            const list = files.filter(({ uploaded }) => uploaded === false);

            // Then add our juicy new files
            for (const file of msg.files) {
                list.push({ name: file.name, uploaded: false, file });
            }

            return { ...state, imagesToUpload: list };
        }

        /* Remove a file from our list of files to upload */
        case 'removeFromUpload': {
            const list = state.imagesToUpload.filter((_, arrIdx) => msg.idx !== arrIdx);
            return {
                ...state,
                imagesToUpload: list,
            };
        }

        /*
         * Add some given image data to our global image store and note this file has
         * been uploaded
         */
        case 'imageUploaded': {
            state.images.push(msg.image);
            return {
                ...state,
                imagesToUpload: state.imagesToUpload.map((row, idx) => {
                    if (idx === msg.index) {
                        return { ...row, uploaded: true };
                    } else {
                        return row;
                    }
                }),
            };
        }

        /* Remove image from our memory */
        case 'imageDeleted': {
            const idxToRemove = state.images.findIndex((img) => img.id === msg.id);
            state.images.splice(idxToRemove, 1);
            return {
                ...state,
                selectedImageIds: state.selectedImageIds.filter((id) => id !== msg.id),
            };
        }

        /* Start editing a note */
        case 'editNote': {
            return {
                ...state,
                noteEdits: [
                    ...state.noteEdits,
                    { note: msg.image.note, id: msg.image.id },
                ],
            };
        }

        /* Keep track of the note editing data */
        case 'noteChange': {
            return {
                ...state,
                noteEdits: state.noteEdits.map((row) => {
                    if (row.id === msg.id) {
                        return { ...row, note: msg.note };
                    } else {
                        return row;
                    }
                }),
            };
        }

        /* The note has been saved to the server */
        case 'saveNote': {
            const img = state.images.find((img) => img.id === msg.id);
            if (img) {
                img.note = getNoteForId(state, img.id);
            }

            return {
                ...state,
                noteEdits: state.noteEdits.filter((row) => row.id !== msg.id),
            };
        }

        /* Stop editing the note */
        case 'cancelNote': {
            return {
                ...state,
                noteEdits: state.noteEdits.filter((row) => row.id !== msg.id),
            };
        }

        /* Mark one, and only one, image as featured */
        case 'setFeaturedImage': {
            for (const img of state.images) {
                img.is_featured = img.id === msg.id;
            }
            return { ...state };
        }

        /* Select or deselect an image */
        case 'toggleSelected': {
            if (state.selectedImageIds.includes(msg.id)) {
                return {
                    ...state,
                    selectedImageIds: state.selectedImageIds.filter(
                        (id) => id !== msg.id
                    ),
                };
            } else {
                return {
                    ...state,
                    selectedImageIds: [...state.selectedImageIds, msg.id],
                };
            }
        }
    }
}

/**
 * Upload any pending images, and let the UI know.
 */
function upload(state: State, dispatch: Dispatcher) {
    for (let i = 0; i < state.imagesToUpload.length; i++) {
        const file = state.imagesToUpload[i];
        if (file.uploaded) {
            continue;
        }

        mhep_helper
            .upload_image(state.assessmentId, file.file)
            .then((img) =>
                dispatch({
                    type: 'imageUploaded',
                    index: i,
                    image: img,
                })
            )
            .catch(onError);
    }
}

/**
 * Delete a given image, and let the UI know.
 */
function deleteImage(dispatch: Dispatcher, id: number) {
    mhep_helper
        .delete_image(id)
        .then(() => dispatch({ type: 'imageDeleted', id }))
        .catch(onError);
}

/**
 * Set a featured image, and let the UI know.
 */
function setFeaturedImage(state: State, dispatch: Dispatcher, id: number) {
    mhep_helper
        .set_featured_image(state.assessmentId, id)
        .then(() => dispatch({ type: 'setFeaturedImage', id }))
        .catch(onError);
}

/**
 * Save the note, and let the UI know.
 */
function saveNote(state: State, dispatch: Dispatcher, id: number) {
    const note = getNoteForId(state, id);
    mhep_helper
        .set_image_note(id, note)
        .then(() => dispatch({ type: 'saveNote', id }))
        .catch(onError);
}

/*********** Utility ***********/

/**
 * Return the note for a given image ID.
 */
function getNoteForId(state: State, id: number): string {
    const row = state.noteEdits.find((row) => row.id === id);
    if (!row) {
        return '';
    } else {
        return row.note;
    }
}

/*********** UI code ***********/

/**
 * This is appalling. XXX
 *
 * The right thing to do here is probably to log the error to Sentry.  Need to look
 * into all the callers of this function first though.
 */
function onError(err) {
    alert(err);
}

interface DisplayImageProps {
    image: Image;
    isSelected: boolean;
    state: State;
    dispatch: Dispatcher;
}

/**
 * Display an image row.
 */
function DisplayImage({
    image,
    isSelected,
    state,
    dispatch,
}: DisplayImageProps): ReactElement {
    return (
        <div className="gallery-content">
            {image.note}

            <div className="gallery-controls">
                <span>
                    <button
                        className="btn btn--icon"
                        onClick={() => dispatch({ type: 'editNote', image: image })}
                    >
                        <Edit />
                        Edit note
                    </button>
                    <button
                        className="btn btn--icon"
                        onClick={() => {
                            if (
                                window.confirm(
                                    'Are you sure you want to delete this image?'
                                )
                            ) {
                                deleteImage(dispatch, image.id);
                            }
                        }}
                    >
                        <TrashBin />
                        Delete
                    </button>
                    {image.is_featured ? (
                        <span className="badge">Cover image</span>
                    ) : (
                        <button
                            className="btn"
                            onClick={() => setFeaturedImage(state, dispatch, image.id)}
                        >
                            Use as cover image
                        </button>
                    )}
                </span>
                <input
                    type="checkbox"
                    className="gallery-checkbox"
                    checked={isSelected}
                    onChange={() => dispatch({ type: 'toggleSelected', id: image.id })}
                />
            </div>
        </div>
    );
}

interface NoteEditorProps {
    image: Image;
    isSelected: boolean;
    state: State;
    dispatch: Dispatcher;
}

/**
 * Edit an image note.
 */
function ImageNoteEditor({
    image,
    isSelected,
    state,
    dispatch,
}: NoteEditorProps): ReactElement {
    return (
        <div className="gallery-content">
            <textarea
                rows={4}
                className="gallery-editor"
                onChange={(event) =>
                    dispatch({
                        type: 'noteChange',
                        id: image.id,
                        note: event.target.value,
                    })
                }
                onKeyDown={(evt) => {
                    if (evt.key === 'Esc' || evt.key === 'Escape') {
                        dispatch({ type: 'cancelNote', id: image.id });
                    }
                }}
                value={getNoteForId(state, image.id)}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={true}
            ></textarea>

            <div className="gallery-controls">
                <span>
                    <button
                        className="btn btn-primary"
                        onClick={() => saveNote(state, dispatch, image.id)}
                    >
                        Save note
                    </button>
                    <button
                        className="btn"
                        onClick={() => dispatch({ type: 'cancelNote', id: image.id })}
                    >
                        Cancel
                    </button>
                </span>
                <input
                    type="checkbox"
                    className="gallery-checkbox"
                    checked={isSelected}
                    onChange={() => dispatch({ type: 'toggleSelected', id: image.id })}
                />
            </div>
        </div>
    );
}

interface ImageCardProps {
    image: Image;
    state: State;
    dispatch: Dispatcher;
}

/**
 * A single image row.
 */
function ImageCard({ image, state, dispatch }: ImageCardProps): ReactElement {
    const isEditing = state.noteEdits.find(({ id }) => id === image.id);
    const isSelected = state.selectedImageIds.find((id) => id === image.id)
        ? true
        : false;

    return (
        <div className={`gallery-card ${isSelected ? 'gallery-card--selected' : ''}`}>
            <a className="gallery-head" href={image.url}>
                <img
                    src={image.thumbnail_url}
                    width={image.thumbnail_width}
                    height={image.thumbnail_height}
                    alt={`image_${image.id}`}
                />
            </a>

            {isEditing ? (
                <ImageNoteEditor
                    image={image}
                    isSelected={isSelected}
                    state={state}
                    dispatch={dispatch}
                />
            ) : (
                <DisplayImage
                    image={image}
                    isSelected={isSelected}
                    state={state}
                    dispatch={dispatch}
                />
            )}
        </div>
    );
}

interface GallerySectionProps {
    state: State;
    dispatch: Dispatcher;
}

/**
 * Display all of the images in the gallery section.
 *
 */
function GallerySection({ state, dispatch }: GallerySectionProps): ReactElement {
    return (
        <section className="line-top mb-45">
            <h3 className="mt-0">Gallery</h3>
            <button
                className="btn"
                style={{ marginBottom: '25px' }}
                disabled={state.selectedImageIds.length < 1}
                onClick={() => {
                    const n = state.selectedImageIds.length;
                    if (
                        window.confirm(
                            `Are you sure you want to delete these ${n} images?`
                        )
                    ) {
                        for (const id of state.selectedImageIds) {
                            deleteImage(dispatch, id);
                        }
                    }
                }}
            >
                Delete selected images
            </button>

            {[...state.images]
                .sort((a, b) => a.id - b.id)
                .map((image) => (
                    <ImageCard
                        key={image.id}
                        image={image}
                        state={state}
                        dispatch={dispatch}
                    />
                ))}
        </section>
    );
}

interface FileChooserProps {
    newFiles: (files: File[]) => void;
}

/**
 * Semi-reusable image file chooser.
 */
function FileChooser({ newFiles }: FileChooserProps): ReactElement {
    const controlRef = useRef<HTMLInputElement>(null);

    return (
        <>
            <input
                type="file"
                multiple
                accept="image/*"
                ref={controlRef}
                className="file-dropper"
                onChange={() => {
                    if (!controlRef?.current?.files) {
                        return;
                    }

                    newFiles(Array.from(controlRef.current.files));

                    controlRef.current.value = '';
                }}
                id="fileDropper"
            />
            <label htmlFor="fileDropper" className="file-dropper pa-7 btn mb-15">
                <UploadFile />
                <span className="ml-7">Add file(s)...</span>
            </label>
        </>
    );
}

interface UploadSectionProps {
    state: State;
    dispatch: Dispatcher;
}

function UploadSection({ state, dispatch }: UploadSectionProps): ReactElement {
    const filesLeftToUpload =
        state.imagesToUpload.filter((row) => !row.uploaded).length > 0;

    return (
        <section className="line-top mb-45">
            <h3 className="mt-0">Upload</h3>

            <FileChooser
                newFiles={(files) =>
                    dispatch({
                        type: 'addFilesToUpload',
                        files: files,
                    })
                }
            />

            {state.imagesToUpload.length > 0 && (
                <>
                    <div style={{ border: '1px solid #ccc' }} className="mb-15">
                        <div
                            className="d-flex justify-content-between align-items-center px-15 py-7"
                            style={{ backgroundColor: 'var(--beige-900)' }}
                        >
                            To upload:
                        </div>

                        {state.imagesToUpload.map(({ name, uploaded }, idx) => {
                            return (
                                <div
                                    style={{ borderTop: '1px solid #ccc' }}
                                    className="d-flex justify-content-between align-items-center px-15 py-7"
                                    key={idx}
                                >
                                    <span>{name}</span>
                                    <span>
                                        {(uploaded && 'Uploaded') || (
                                            <button
                                                onClick={() =>
                                                    dispatch({
                                                        type: 'removeFromUpload',
                                                        idx: idx,
                                                    })
                                                }
                                            >
                                                x
                                            </button>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => upload(state, dispatch)}
                        disabled={!filesLeftToUpload}
                    >
                        Upload
                    </button>
                </>
            )}
        </section>
    );
}

interface ImageGalleryProps {
    images: Image[];
    assessmentId: number;
}

/**
 * Image gallery view
 *
 * Allows upload, viewing, some editing.
 */
export default function ImageGallery({
    assessmentId,
    images,
}: ImageGalleryProps): ReactElement {
    const [state, dispatch] = useReducer(reducer, {
        ...blankState,
        images,
        assessmentId,
    });

    return (
        <div className="gallery">
            <UploadSection state={state} dispatch={dispatch} />
            <GallerySection state={state} dispatch={dispatch} />
        </div>
    );
}
