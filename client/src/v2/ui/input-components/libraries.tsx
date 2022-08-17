import { mapValues, pickBy } from 'lodash';
import React, { ReactNode, useReducer, useState } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { Library } from '../../data-schemas/libraries';
import {
    isFabricElementsLibrary,
    FabricElementsLibrary,
    FabricElement,
    discriminateTags,
} from '../../data-schemas/libraries/elements';
import type { Wall } from '../../data-schemas/libraries/elements';
import { isNonEmpty, NonEmptyArray } from '../../helpers/non-empty-array';
import { isNotNull } from '../../helpers/null-checking';
import { Shadow } from '../../helpers/shadow-object-type';
import { Select } from '../input-components/select';
import { externals } from '../module-management/shim';
import { ErrorModal, Modal } from '../output-components/modal';

function nl2br(input: string): ReactNode {
    const lines = input.split('\n');

    const outLines = [
        ...lines.slice(0, -1).map((line) => {
            return [line, null];
        }),
        lines.slice(-1),
    ]
        .flat(1)
        .map((lineOrBr, idx) => (lineOrBr === null ? <br key={idx} /> : lineOrBr));

    return outLines;
}

type LibraryOf<T> = {
    id: string;
    name: string;
    type: string;
    data: Record<string, T>;
};

type MinimalLibraryItem = {
    tag: string;
    name: string;
};

type SelectLibraryItemProps<T> = {
    title: string;
    libraries: NonEmptyArray<LibraryOf<T>>;
    onSelect: (item: T) => void;
    onClose: () => void;
    tableColumns: { title: string; value: (item: T) => ReactNode }[];
    getFullItemData: (item: T) => {
        title: string;
        value: ReactNode | ReactNode[];
    }[];
    searchText: (item: T) => string;
    currentItemTag: string | null;
};

type LibraryItemProps<T> = Omit<
    SelectLibraryItemProps<T>,
    'searchText' | 'libraries' | 'title'
> & {
    libraryItem: T;
};

function LibraryItem<T extends MinimalLibraryItem>({
    onSelect,
    onClose,
    tableColumns,
    getFullItemData,
    currentItemTag,
    libraryItem,
}: LibraryItemProps<T>): JSX.Element {
    const fullItemData = getFullItemData(libraryItem);
    const canBeRevealed = fullItemData.length > 0;
    const [isRevealed, setRevealed] = useState(false);
    function toggleRevealed() {
        return setRevealed(!isRevealed && canBeRevealed);
    }

    const classNames = [
        currentItemTag === libraryItem.tag ? 'bg-pale-green' : null,
        canBeRevealed === true ? 'clickable clickable-hover' : null,
    ].filter(isNotNull);

    return (
        <>
            <tr
                className={classNames.join(' ')}
                onClick={() => canBeRevealed && toggleRevealed()}
            >
                <td className="pr-7">
                    {canBeRevealed && (
                        <svg
                            viewBox="0 0 1000 1000"
                            width="1em"
                            height="1em"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {isRevealed ? (
                                <polygon
                                    points="75,254.6 925,254.6 500,990.7"
                                    style={{ fill: '#000' }}
                                />
                            ) : (
                                <polygon
                                    points="254.6,75 254.6,925 990.7,500"
                                    style={{ fill: '#000' }}
                                />
                            )}
                        </svg>
                    )}
                </td>
                <td className="pr-15">{libraryItem.tag}</td>
                <td className="pr-15">{libraryItem.name}</td>

                {tableColumns.map(({ title, value }) => (
                    <td key={title} className="pr-15 text-tabular-nums align-right">
                        {value(libraryItem)}
                    </td>
                ))}

                <td>
                    {currentItemTag === libraryItem.tag ? (
                        <div className="py-7">Current</div>
                    ) : (
                        <button
                            className="btn"
                            onClick={() => {
                                onSelect(libraryItem);
                                onClose();
                            }}
                        >
                            Select
                        </button>
                    )}
                </td>
            </tr>
            {isRevealed && (
                <tr>
                    <td colSpan={6}>
                        <table
                            cellPadding={7}
                            style={{
                                border: '4px solid var(--brown-2)',
                            }}
                        >
                            <tbody>
                                {fullItemData.map(({ title, value }) => (
                                    <tr key={title}>
                                        <th
                                            className="pr-15"
                                            style={{
                                                verticalAlign: 'top',
                                                textAlign: 'left',
                                            }}
                                        >
                                            {title}
                                        </th>
                                        <td>{value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </td>
                </tr>
            )}
        </>
    );
}

export function SelectLibraryItem<T extends MinimalLibraryItem>({
    title,
    libraries,
    onSelect,
    onClose,
    tableColumns,
    getFullItemData,
    currentItemTag,
    searchText,
}: SelectLibraryItemProps<T>): ReactElement {
    const [selectedLibrary, selectLibraryById] = useReducer(
        (current: LibraryOf<T>, newId: string): LibraryOf<T> => {
            const newLibrary = libraries.find((lib) => lib.id === newId);
            if (newLibrary !== undefined) return newLibrary;
            else return current;
        },
        libraries[0],
    );
    const [filterText, setFilterText] = useState('');

    const filteredLibraryItems = Object.values(
        pickBy(
            selectedLibrary.data,
            (element, tag) =>
                tag.toLowerCase().includes(filterText.toLowerCase()) ||
                searchText(element).toLowerCase().includes(filterText.toLowerCase()),
        ),
    );

    return (
        <Modal onClose={onClose} headerId="modal-header">
            <div className="dialog-header">
                <div className="d-flex justify-content-between">
                    <h4 className="mt-0 mb-7" id="modal-header">
                        Select {title}
                    </h4>

                    <div>
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={onClose}
                            className="dialog-x"
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 44 44"
                                aria-hidden="true"
                                focusable="false"
                            >
                                <path d="M0.549989 4.44999L4.44999 0.549988L43.45 39.55L39.55 43.45L0.549989 4.44999Z" />
                                <path d="M39.55 0.549988L43.45 4.44999L4.44999 43.45L0.549988 39.55L39.55 0.549988Z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="d-flex">
                    <div>
                        <label htmlFor="field_library_filter" className="small-caps">
                            Filter
                        </label>

                        <input
                            id="field_library_filter"
                            className="mb-0"
                            type="text"
                            onChange={(evt) => setFilterText(evt.target.value)}
                            value={filterText}
                            // WAI-ARIA-PRACTICES tells us to use autofocus here so...
                            // https://www.w3.org/TR/wai-aria-practices-1.1/examples/dialog-modal/dialog.html
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus={true}
                        />
                    </div>

                    <div className="ml-30">
                        <label htmlFor="field_library_select" className="small-caps">
                            From library
                        </label>
                        {libraries.length > 1 ? (
                            <Select
                                id="field_library_select"
                                options={libraries.map((lib) => ({
                                    value: lib.id,
                                    display: lib.name,
                                }))}
                                selected={selectedLibrary.id}
                                callback={selectLibraryById}
                            />
                        ) : (
                            <div
                                style={{
                                    height: 30,
                                    verticalAlign: 'middle',
                                    display: 'table-cell',
                                }}
                            >
                                {selectedLibrary.name}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dialog-body">
                {filteredLibraryItems.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <td style={{ width: 0 }}></td>
                                <th align="left" style={{ width: 0 }}>
                                    Tag
                                </th>
                                <th align="left">Name</th>
                                {tableColumns.map(({ title }) => (
                                    <th key={title} align="left" style={{ width: 0 }}>
                                        {title}
                                    </th>
                                ))}
                                <th style={{ width: 0 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLibraryItems.map((libraryItem) => (
                                <LibraryItem
                                    key={libraryItem.tag}
                                    {...{
                                        currentItemTag,
                                        libraryItem,
                                        tableColumns,
                                        onSelect,
                                        onClose,
                                        getFullItemData,
                                    }}
                                />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>Nothing matching this filter</p>
                )}
            </div>
        </Modal>
    );
}

export type CompleteWall = Shadow<
    Wall,
    {
        tag: string;
        uvalue: number;
        kvalue: number;
    }
>;

type SelectWallParams = {
    onSelect: (item: CompleteWall) => void;
    onClose: () => void;
    currentItemTag?: string | null;
};

function fail(msg: string): never {
    throw new Error(msg);
}

export function SelectWall({
    onSelect,
    onClose,
    currentItemTag = null,
}: SelectWallParams) {
    const libraries: Library[] = externals().libraries;
    const filtered = libraries
        .filter(isFabricElementsLibrary)
        .map((library: FabricElementsLibrary) => ({
            ...library,
            data: pickBy<FabricElement, Wall>(
                library.data,
                discriminateTags<FabricElement, Wall, 'Wall'>('Wall'),
            ),
        }))
        .map((library) => ({
            ...library,
            data: mapValues(library.data, (element, tag) => ({
                ...element,
                tag,
                uvalue:
                    element.uvalue === ''
                        ? fail(`bad uvalue: ${element.uvalue}`)
                        : element.uvalue,
                kvalue:
                    element.kvalue === ''
                        ? fail(`bad kvalue: ${element.kvalue}`)
                        : element.kvalue,
            })),
        }));
    if (!isNonEmpty(filtered)) {
        return (
            <ErrorModal onClose={onClose} title={'Library missing'}>
                No wall libraries found
            </ErrorModal>
        );
    }

    function searchText(wall: CompleteWall) {
        return wall.name;
    }

    return (
        <SelectLibraryItem
            title="wall"
            onSelect={onSelect}
            onClose={onClose}
            currentItemTag={currentItemTag}
            libraries={filtered}
            searchText={searchText}
            tableColumns={[
                { title: 'U', value: (wall) => wall.uvalue.toString() },
                { title: 'k', value: (wall) => wall.kvalue.toString() },
            ]}
            getFullItemData={(wall: CompleteWall) =>
                wall.description === ''
                    ? []
                    : [
                          {
                              title: 'Description',
                              value: nl2br(wall.description),
                          },
                      ]
            }
        />
    );
}

export function selectWall(
    mountPoint: HTMLDivElement,
    callback: (item: CompleteWall) => void,
    currentItemTag: string | null,
) {
    const root = createRoot(mountPoint);
    const element = (
        <SelectWall
            onSelect={callback}
            onClose={() => {
                root.unmount();
            }}
            currentItemTag={currentItemTag}
        />
    );
    root.render(element);
}
