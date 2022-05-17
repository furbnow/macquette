import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';

import type { LibraryMetadata } from '../../data-schemas/api-metadata';
import { fabricElements } from '../../data-schemas/libraries/elements';
import type { Wall } from '../../data-schemas/libraries/elements';
import { Shadow } from '../../helpers/shadow-object-type';
import { Select } from '../input-components/select';
import { externals } from '../module-management/shim';
import { Modal } from '../output-components/modal';

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
    libraries: LibraryOf<T>[];
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

type LibraryRowsProps<T> = Omit<
    SelectLibraryItemProps<T>,
    'searchText' | 'libraries' | 'title'
> & {
    idx: number;
    row: T;
    toggleRevealed: (idx: number) => void;
    revealedItems: number[];
};

function LibraryRows<T extends MinimalLibraryItem>({
    onSelect,
    onClose,
    tableColumns,
    getFullItemData,
    currentItemTag,
    idx,
    row,
    toggleRevealed,
    revealedItems,
}: LibraryRowsProps<T>): JSX.Element {
    const fullItemData = getFullItemData(row);
    const canBeRevealed =
        fullItemData.filter((row) => row.value !== null).length > 0 ? true : false;
    const classNames = [
        currentItemTag === row.tag ? 'bg-pale-green' : null,
        canBeRevealed === true ? 'clickable clickable-hover' : null,
    ].filter((className): className is string => className !== null);

    return (
        <React.Fragment key={idx}>
            <tr
                className={classNames.join(' ')}
                onClick={() => canBeRevealed && toggleRevealed(idx)}
            >
                <td className="pr-7">
                    {canBeRevealed && (
                        <svg
                            viewBox="0 0 1000 1000"
                            width="1em"
                            height="1em"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {revealedItems.includes(idx) ? (
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
                <td className="pr-15">{row.tag}</td>
                <td className="pr-15">{row.name}</td>

                {tableColumns.map(({ title, value }) => (
                    <td key={title} className="pr-15 text-tabular-nums align-right">
                        {value(row)}
                    </td>
                ))}

                <td>
                    {currentItemTag === row.tag ? (
                        <div className="py-7">Current</div>
                    ) : (
                        <button
                            className="btn"
                            onClick={() => {
                                onSelect(row);
                                onClose();
                            }}
                        >
                            Select
                        </button>
                    )}
                </td>
            </tr>
            {revealedItems.includes(idx) && (
                <tr>
                    <td colSpan={6}>
                        <table
                            cellPadding={7}
                            style={{
                                border: '4px solid var(--brown-2)',
                            }}
                        >
                            <tbody>
                                {fullItemData.map(({ title, value }) =>
                                    value !== null ? (
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
                                    ) : null,
                                )}
                            </tbody>
                        </table>
                    </td>
                </tr>
            )}
        </React.Fragment>
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
    const [selectedLibrary, setSelectedLibrary] = useState(0);
    const library = libraries[selectedLibrary];
    if (library === undefined) {
        throw new Error('No library');
    }
    const [filterText, setFilterText] = useState('');
    const [filteredLibrary, setFilteredLibrary] = useState(Object.entries(library.data));

    const initialItems: number[] = [];
    const [revealedItems, setRevealedItems] = useState(initialItems);

    useEffect(() => {
        setFilteredLibrary(
            Object.entries(library.data).filter(
                ([tag, row]) =>
                    tag.toLowerCase().includes(filterText.toLowerCase()) ||
                    searchText(row).toLowerCase().includes(filterText.toLowerCase()),
            ),
        );
    }, [filterText, library.data, searchText]);

    const toggleRevealed = (idx: number) => {
        if (revealedItems.includes(idx)) {
            setRevealedItems(revealedItems.filter((num) => num !== idx));
        } else {
            setRevealedItems([...revealedItems, idx]);
        }
    };

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
                                options={libraries.map((lib, i) => ({
                                    value: i.toString(),
                                    display: lib.name,
                                }))}
                                selected={selectedLibrary.toString()}
                                callback={(idx: string) => {
                                    setSelectedLibrary(parseInt(idx, 10));
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    height: 30,
                                    verticalAlign: 'middle',
                                    display: 'table-cell',
                                }}
                            >
                                {library.name}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dialog-body">
                {filteredLibrary.length > 0 ? (
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
                            {filteredLibrary.map(([, row], idx) =>
                                LibraryRows({
                                    idx,
                                    currentItemTag,
                                    row,
                                    toggleRevealed,
                                    revealedItems,
                                    tableColumns,
                                    onSelect,
                                    onClose,
                                    getFullItemData,
                                }),
                            )}
                        </tbody>
                    </table>
                ) : (
                    <p>Nothing matching this filter</p>
                )}
            </div>
        </Modal>
    );
}

type FabricElementLibrary = z.infer<typeof fabricElements> & LibraryMetadata;

export type CompleteWall = Shadow<
    Wall,
    {
        tag: string;
        description: string;
        uvalue: number;
        kvalue: number;
    }
>;

type SelectWallParams = {
    onSelect: (item: CompleteWall) => void;
    onClose: () => void;
    currentItemTag?: string | null;
};

const fail = (msg: string): never => {
    throw new Error(msg);
};

export const SelectWall = ({
    onSelect,
    onClose,
    currentItemTag = null,
}: SelectWallParams) => {
    const libraries = externals().libraries;
    const [filtered] = useState(
        libraries
            .filter((row): row is FabricElementLibrary => row.type === 'elements')
            .map((library) => ({
                ...library,
                data: Object.fromEntries(
                    Object.entries(library.data).filter(
                        (row): row is [string, Wall] => row[1].tags[0] === 'Wall',
                    ),
                ),
            }))
            .map((library) => ({
                ...library,
                data: Object.fromEntries(
                    Object.entries(library.data).map((row): [string, CompleteWall] => [
                        row[0],
                        {
                            ...row[1],
                            tag: row[0],
                            description: row[1].description ?? '',
                            uvalue:
                                row[1].uvalue === ''
                                    ? fail(`bad uvalue: ${row[1].uvalue}`)
                                    : row[1].uvalue,
                            kvalue:
                                row[1].kvalue === ''
                                    ? fail(`bad kvalue: ${row[1].kvalue}`)
                                    : row[1].kvalue,
                        },
                    ]),
                ),
            })),
    );

    const searchText = useCallback((row: CompleteWall) => row.name, []);

    return SelectLibraryItem({
        title: 'wall',
        onSelect,
        onClose,
        currentItemTag,
        libraries: filtered,
        searchText,
        tableColumns: [
            { title: 'U', value: (row) => row.uvalue.toString() },
            { title: 'k', value: (row) => row.kvalue.toString() },
        ],
        getFullItemData: (row: CompleteWall) => [
            {
                title: 'Description',
                value: row.description !== '' ? nl2br(row.description) : null,
            },
        ],
    });
};

export const selectWall = (
    mountPoint: HTMLDivElement,
    callback: (item: CompleteWall) => void,
    currentItemTag: string | null,
) => {
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
};
