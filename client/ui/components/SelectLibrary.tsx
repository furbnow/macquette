import React, { ReactElement, useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import Dialog from './Dialog';
import SelectField from './SelectField';

import {
    GenerationMeasure,
    GenerationMeasuresLibrary,
    ItemBase,
    LibraryOf,
    MeasureBase,
} from '../types/Library';

type Row = {
    title: string;
    value: string;
};

interface SelectLibraryItemProps<T> {
    title: string;
    libraries: LibraryOf<T>[];
    displayItem: (item: T) => Row[];
    onSelect: (tag: string, measure: T) => void;
    onClose: () => void;
    currentSelectedItemTag: string | null;
}

function SelectLibraryItem<T extends ItemBase>({
    title,
    libraries,
    displayItem,
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SelectLibraryItemProps<T>): ReactElement {
    const [selectedLibIdx, setSelectedLibIdx] = useState(0);
    const selectedLib = libraries[selectedLibIdx];

    const [selectedItemTag, setSelectedItemTag] = useState(
        currentSelectedItemTag ? currentSelectedItemTag : Object.keys(selectedLib.data)[0]
    );
    const selectedItem = selectedLib.data[selectedItemTag];

    return (
        <Dialog onClose={onClose} headerId="select_library_item_header">
            <div className="dialog-header">
                <h4 className="mt-0 mb-15" id="select_library_item_header">
                    Select {title}
                </h4>

                <div className="d-flex">
                    <div>
                        <label htmlFor="field_library_item" className="small-caps">
                            Item
                        </label>
                        <SelectField
                            id="library_item"
                            options={Object.entries(selectedLib.data).map(
                                ([tag, value]) => ({
                                    value: tag,
                                    display: value.name,
                                })
                            )}
                            value={selectedItemTag}
                            setValue={(tag) => {
                                setSelectedItemTag(tag);
                            }}
                            updateModel={false}
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
                            <SelectField
                                id="library_select"
                                options={libraries.map((lib, i) => ({
                                    value: i,
                                    display: lib.name,
                                }))}
                                value={selectedLibIdx}
                                setValue={(idx) => {
                                    setSelectedLibIdx(idx);
                                }}
                                updateModel={false}
                            />
                        ) : (
                            <div
                                style={{
                                    height: 30,
                                    verticalAlign: 'middle',
                                    display: 'table-cell',
                                }}
                            >
                                {selectedLib.name}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dialog-body">
                <table className="table">
                    <tbody>
                        {displayItem(selectedItem).map(({ title, value }, i) => (
                            <tr key={i}>
                                <th className="text-left">{title}</th>
                                <td>{value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="dialog-footer text-right">
                <button className="btn mr-15" onClick={() => onClose()}>
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        onSelect(selectedItemTag, selectedItem);
                        onClose();
                    }}
                >
                    Select
                </button>
            </div>
        </Dialog>
    );
}

/*
 * Return the common 'measure' information.
 */
const addMeasureLines = <T extends MeasureBase>(item: T): Row[] => [
    { value: item.description, title: 'Description' },
    { value: item.performance, title: 'Performance' },
    { value: item.benefits, title: 'Benefits' },
    {
        value: `£${item.cost} (${item.cost_units})`,
        title: 'Cost',
    },
    { value: item.who_by, title: 'Who by' },
    { value: item.disruption, title: 'Disruption' },
    { value: item.associated_work, title: 'Associated work' },
    { value: item.key_risks, title: 'Key risks' },
    { value: item.notes, title: 'Notes' },
    { value: item.maintenance, title: 'Maintenance' },
];

/**
 * The interface for a generic library viewer for a given library item type.
 */
interface SpecificLibrarySelector<T> {
    onSelect: (tag: string, measure: T) => void;
    onClose: () => void;
    currentSelectedItemTag: string | null;
}

const displayGenerationMeasure = (item: GenerationMeasure): Row[] => [
    { value: item.tag, title: 'Tag' },
    { value: item.name, title: 'Name' },
    { value: `${item.kWp} kWp`, title: 'Peak power' },
    ...addMeasureLines(item),
];

export const SelectGenerationMeasure = ({
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SpecificLibrarySelector<GenerationMeasure>): ReactElement => {
    const { libraries } = useContext(AppContext);

    const filteredLibraries = libraries.filter(
        (lib): lib is GenerationMeasuresLibrary => lib.type === 'generation_measures'
    );

    return SelectLibraryItem({
        title: 'Draughtproofing Measures',
        libraries: filteredLibraries,
        displayItem: displayGenerationMeasure,
        onSelect,
        onClose,
        currentSelectedItemTag,
    });
};
