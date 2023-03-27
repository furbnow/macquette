import { mapValues, pickBy } from 'lodash';
import type { ReactElement } from 'react';
import React, { ReactNode, useEffect, useReducer, useState } from 'react';

import { Library } from '../../data-schemas/libraries';
import type {
    Loft,
    LoftMeasure,
    PartyWall,
    PartyWallMeasure,
    Roof,
    RoofMeasure,
    Wall,
    WallMeasure,
} from '../../data-schemas/libraries/elements';
import {
    discriminateTags,
    FabricElement,
    FabricElementsLibrary,
    FabricMeasure,
    FabricMeasuresLibrary,
    isFabricElementsLibrary,
    isFabricMeasuresLibrary,
} from '../../data-schemas/libraries/elements';
import {
    FloorInsulationMaterial,
    isFloorInsulationMaterialLibrary,
} from '../../data-schemas/libraries/floor-insulation';
import { isNonEmpty, NonEmptyArray } from '../../helpers/non-empty-array';
import { isNotNull } from '../../helpers/null-checking';
import { Shadow } from '../../helpers/shadow-object-type';
import { externals } from '../../shims/typed-globals';
import { Select } from '../input-components/select';
import { ErrorModal, Modal, ModalBody, ModalHeader } from '../output-components/modal';
import { NumberOutput } from '../output-components/numeric';

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
    hideTags?: boolean;
    tableColumns: {
        title: string;
        type: 'text' | 'number';
        value: (item: T) => ReactNode;
    }[];
    getFullItemData: (item: T) => {
        title: string;
        value: ReactNode | ReactNode[];
    }[];
    searchText: (item: T) => string;
    currentItemTag: string | null;
};

type LibraryItemProps<T> = Omit<
    SelectLibraryItemProps<T>,
    'searchText' | 'libraries' | 'title' | 'onClose'
> & {
    libraryItem: T;
};

function LibraryItem<T extends MinimalLibraryItem>({
    onSelect,
    hideTags = false,
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
                {hideTags !== true && (
                    <td className="pr-15 text-nowrap">{libraryItem.tag}</td>
                )}
                <td className="pr-15">{libraryItem.name}</td>

                {tableColumns.map(({ title, type, value }) => (
                    <td
                        key={title}
                        className={`pr-15 text-tabular-nums ${
                            type === 'number' ? 'align-right' : ''
                        }`}
                    >
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

/**
 * Allow the user to select a library item from a library.
 *
 * If the user aborts, onClose is called; if the user selects something, onSelect is.
 */
export function SelectLibraryItem<T extends MinimalLibraryItem>({
    title,
    libraries,
    onSelect,
    onClose,
    hideTags = false,
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
            <ModalHeader onClose={onClose} title={`Select ${title}`}>
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
                                value={selectedLibrary.id}
                                onChange={selectLibraryById}
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
            </ModalHeader>
            <ModalBody>
                {filteredLibraryItems.length > 0 ? (
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <td style={{ width: 0 }}></td>
                                {hideTags !== true && (
                                    <th align="left" style={{ width: 0 }}>
                                        Tag
                                    </th>
                                )}
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
                                        hideTags,
                                        tableColumns,
                                        onSelect,
                                        getFullItemData,
                                    }}
                                />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>Nothing matching this filter</p>
                )}
            </ModalBody>
        </Modal>
    );
}

export type CompleteWallLike = Shadow<
    Omit<Wall, 'tags'>,
    {
        tag: string;
        uvalue: number;
        kvalue: number;
        type: 'external wall' | 'party wall' | 'roof' | 'loft';
    }
>;

type SelectWallParams = {
    onSelect: (item: CompleteWallLike) => void;
    onClose: () => void;
    type: 'external wall' | 'party wall' | 'roof' | 'loft';
    currentItemTag?: string | null;
};

function fail(msg: string): never {
    throw new Error(msg);
}

export function SelectWallLike({
    onSelect,
    onClose,
    type,
    currentItemTag = null,
}: SelectWallParams) {
    const libraries = useLibraries();
    if (libraries.type === 'waiting') {
        return libraries.modal(onClose);
    }

    let tagType: 'Wall' | 'Party_wall' | 'Roof' | 'Loft';
    switch (type) {
        case 'external wall':
            tagType = 'Wall';
            break;
        case 'party wall':
            tagType = 'Party_wall';
            break;
        case 'roof':
            tagType = 'Roof';
            break;
        case 'loft':
            tagType = 'Loft';
            break;
    }

    const filtered = libraries.data
        .filter(isFabricElementsLibrary)
        .map((library: FabricElementsLibrary) => ({
            ...library,
            data: pickBy<FabricElement, Wall | Roof | Loft | PartyWall>(
                library.data,
                discriminateTags<
                    FabricElement,
                    Wall | Roof | Loft | PartyWall,
                    typeof tagType
                >(tagType),
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
                type,
            })),
        }));
    if (!isNonEmpty(filtered)) {
        return (
            <ErrorModal onClose={onClose} title={'Library missing'}>
                No {type} libraries found
            </ErrorModal>
        );
    }

    return (
        <SelectLibraryItem
            title={type}
            onSelect={onSelect}
            onClose={onClose}
            currentItemTag={currentItemTag}
            libraries={filtered}
            searchText={(wall) => wall.name}
            tableColumns={[
                { title: 'U', type: 'number', value: (wall) => wall.uvalue.toString() },
                { title: 'k', type: 'number', value: (wall) => wall.kvalue.toString() },
            ]}
            getFullItemData={(wall: CompleteWallLike) =>
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

export type Fuel = {
    tag: string;
    name: string;
    category: string;
};

type SelectFuelProps = {
    fuels: Record<string, Fuel>;
    onSelect: (item: Fuel) => void;
    onClose: () => void;
};

export function SelectFuel({ fuels, onSelect, onClose }: SelectFuelProps) {
    const fuelList = Object.entries(fuels);
    fuelList.sort(([, a], [, b]) => {
        if (a.category === b.category) {
            return 0;
        } else {
            if (b.category < a.category) {
                return 1;
            } else if (b.category === a.category) {
                return 0;
            } else {
                return -1;
            }
        }
    });

    const builtinFuelLibrary = {
        id: 'builtin-dataset-fuels',
        name: 'Fuel list',
        type: 'fuels',
        data: Object.fromEntries(fuelList),
    };

    return (
        <SelectLibraryItem
            title="fuel"
            onSelect={onSelect}
            onClose={onClose}
            currentItemTag={null}
            libraries={[builtinFuelLibrary]}
            searchText={(fuel) => `${fuel.name} ${fuel.category}`}
            tableColumns={[
                { title: 'Category', type: 'text', value: (fuel) => fuel.category },
            ]}
            hideTags
            getFullItemData={() => []}
        />
    );
}

export type CompleteWallMeasure = Shadow<
    Omit<WallMeasure, 'tags'>,
    {
        tag: string;
        uvalue: number;
        kvalue: number;
        min_cost: number;
        cost: number;
        type: 'external wall' | 'party wall' | 'roof' | 'loft';
    }
>;

type SelectWallMeasureParams = {
    onSelect: (item: CompleteWallMeasure) => void;
    onClose: () => void;
    type: 'external wall' | 'party wall' | 'roof' | 'loft';
    areaSqm: number | null;
    currentItemTag: string | null;
};

export function SelectWallLikeMeasure({
    onSelect,
    onClose,
    type,
    areaSqm,
    currentItemTag,
}: SelectWallMeasureParams) {
    const libraries = useLibraries();
    if (libraries.type === 'waiting') {
        return libraries.modal(onClose);
    }

    let tagType: 'Wall' | 'Party_wall' | 'Roof' | 'Loft';
    switch (type) {
        case 'external wall':
            tagType = 'Wall';
            break;
        case 'party wall':
            tagType = 'Party_wall';
            break;
        case 'roof':
            tagType = 'Roof';
            break;
        case 'loft':
            tagType = 'Loft';
            break;
    }

    const filtered = libraries.data
        .filter(isFabricMeasuresLibrary)
        .map((library: FabricMeasuresLibrary) => ({
            ...library,
            data: pickBy<
                FabricMeasure,
                WallMeasure | PartyWallMeasure | LoftMeasure | RoofMeasure
            >(
                library.data,
                discriminateTags<
                    FabricMeasure,
                    WallMeasure | PartyWallMeasure | LoftMeasure | RoofMeasure,
                    typeof tagType
                >(tagType),
            ),
        }))
        .map((library) => ({
            ...library,
            data: mapValues(library.data, (element, tag) => ({
                ...element,
                tag,
                type,
                EWI: 'EWI' in element ? element.EWI : false,
                uvalue:
                    element.uvalue === ''
                        ? fail(`bad uvalue: ${element.uvalue}`)
                        : element.uvalue,
                kvalue:
                    element.kvalue === ''
                        ? fail(`bad kvalue: ${element.kvalue}`)
                        : element.kvalue,
                min_cost: typeof element.min_cost === 'number' ? element.min_cost : 0,
                cost: typeof element.cost === 'number' ? element.cost : 0,
            })),
        }));
    if (!isNonEmpty(filtered)) {
        return (
            <ErrorModal onClose={onClose} title={'Library missing'}>
                No wall measure libraries found
            </ErrorModal>
        );
    }

    return (
        <SelectLibraryItem
            title={`${type} measure`}
            onSelect={onSelect}
            onClose={onClose}
            currentItemTag={currentItemTag}
            libraries={filtered}
            searchText={(row) => row.name}
            tableColumns={[
                { title: 'U', type: 'number', value: (row) => row.uvalue.toString() },
                ...(areaSqm !== null
                    ? [
                          {
                              title: '£',
                              type: 'number' as const,
                              value: (row: CompleteWallMeasure) => (
                                  <NumberOutput
                                      value={Math.round(
                                          row.min_cost +
                                              areaSqm * row.cost * (row.EWI ? 1.15 : 1),
                                      )}
                                  />
                              ),
                          },
                      ]
                    : []),
            ]}
            getFullItemData={(row: CompleteWallMeasure) => [
                ...(row.description !== ''
                    ? [
                          {
                              title: 'Description',
                              value: nl2br(row.description),
                          },
                      ]
                    : []),
                {
                    title: 'Cost',
                    value: `£${row.min_cost} + £${row.cost} per ${row.cost_units} ${
                        row.EWI ? '(x1.15 to account for EWI)' : ''
                    }`,
                },
                { title: 'Associated work', value: row.associated_work },
                { title: 'Key risks', value: row.key_risks },
                { title: 'Notes', value: nl2br(row.notes) },
            ]}
        />
    );
}

type SelectFloorInsulationMaterialParams = {
    onSelect: (item: FloorInsulationMaterial) => void;
    onClose: () => void;
    currentItemTag?: string | null;
};

export function SelectFloorInsulationMaterial({
    onSelect,
    onClose,
    currentItemTag = null,
}: SelectFloorInsulationMaterialParams) {
    const libraries = useLibraries();
    if (libraries.type === 'waiting') {
        return libraries.modal(onClose);
    }

    const filtered = libraries.data.filter(isFloorInsulationMaterialLibrary);
    if (!isNonEmpty(filtered)) {
        return (
            <ErrorModal onClose={onClose} title={'Library missing error'}>
                No floor insulation material libraries found
            </ErrorModal>
        );
    }

    function searchText(material: FloorInsulationMaterial) {
        return material.name;
    }

    return SelectLibraryItem<FloorInsulationMaterial>({
        title: 'floor insulation material',
        onSelect,
        onClose,
        currentItemTag,
        libraries: filtered,
        searchText,
        tableColumns: [
            { title: 'Type', type: 'text', value: (material) => material.type },
            {
                title: 'Conductivity',
                type: 'text',
                value: (material) =>
                    material.mechanism === 'conductivity'
                        ? material.conductivity.toString()
                        : '',
            },
            {
                title: 'Resistance',
                type: 'text',
                value: (material) =>
                    material.mechanism === 'resistance'
                        ? material.resistance.toString()
                        : '',
            },
        ],
        getFullItemData: (item) =>
            item.description === ''
                ? []
                : [
                      {
                          title: 'Description',
                          value: nl2br(item.description),
                      },
                  ],
    });
}

function useLibraries() {
    const libraries: Library[] | undefined = externals().libraries;
    const [librariesAvailable, setLibrariesAvailable] = useState(libraries !== undefined);
    useEffect(() => {
        if (!librariesAvailable) {
            const timer = setInterval(() => {
                if (externals().libraries !== undefined) {
                    setLibrariesAvailable(true);
                    clearInterval(timer);
                }
            }, 1000);
            return () => clearInterval(timer);
        } else {
            return () => null;
        }
    }, [librariesAvailable]);
    if (librariesAvailable === false) {
        return {
            type: 'waiting' as const,
            modal: (onClose: () => void) => (
                <Modal onClose={onClose} headerId="modal-header">
                    <ModalHeader onClose={onClose} title={`Loading...`} />
                    <ModalBody>
                        <p>Libraries still loading...</p>
                    </ModalBody>
                </Modal>
            ),
        };
    }
    if (libraries === undefined) {
        throw new Error('temporally unreachable');
    }
    return { type: 'libraries' as const, data: libraries };
}
