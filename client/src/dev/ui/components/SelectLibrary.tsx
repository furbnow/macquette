import React, { ReactElement, useContext, useState } from 'react';

import { AppContext } from '../context/AppContext';
import {
    ClothesDryingFacilitiesLibrary,
    ClothesDryingItem,
    DraughtProofingMeasure,
    DraughtProofingMeasuresLibrary,
    ExtractVentilationMeasure,
    ExtractVentilationPointsLibrary,
    GenerationMeasure,
    GenerationMeasuresLibrary,
    IntentionalVent,
    IntentionalVentMeasure,
    IntentionalVentsAndFluesLibrary,
    IntentionalVentsAndFluesMeasuresLibrary,
    ItemBase,
    LibraryOf,
    MeasureBase,
    VentilationSystem,
    VentilationSystemMeasure,
    VentilationSystemsLibrary,
    VentilationSystemsMeasuresLibrary,
} from '../types/Library';
import Dialog from './Dialog';
import SelectField from './SelectField';

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
    if (selectedLib === undefined) {
        throw new Error('No libraries to select from');
    }
    const selectedLibData = Object.keys(selectedLib.data)[0];
    if (selectedLibData === undefined) {
        throw new Error('No data in selected library');
    }

    const [selectedItemTag, setSelectedItemTag] = useState(
        currentSelectedItemTag ? currentSelectedItemTag : selectedLibData,
    );
    const selectedItem = selectedLib.data[selectedItemTag];
    if (selectedItem === undefined) {
        throw new Error('Selected library item does not exist');
    }

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
                                }),
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

const displayVentilationSystem = (item: VentilationSystem): Row[] => [
    { value: item.tag, title: 'Tag' },
    { value: item.name, title: 'Name' },
    { value: item.ventilation_type, title: 'Ventilation type' },
    { value: item.source, title: 'Source' },
    {
        value: `${item.system_air_change_rate} ACH`,
        title: 'Specific air change rate',
    },
    {
        value: `${item.specific_fan_power} W/litre.sec`,
        title: 'Specific fan power',
    },
    {
        value: `${item.balanced_heat_recovery_efficiency} %`,
        title: 'Balanced heat recovery efficiency',
    },
];

export const SelectVentilationSystem = ({
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SpecificLibrarySelector<VentilationSystem>): ReactElement => {
    const { libraries } = useContext(AppContext);

    const filteredLibraries = libraries.filter(
        (lib): lib is VentilationSystemsLibrary => lib.type === 'ventilation_systems',
    );

    return SelectLibraryItem({
        title: 'Ventilation systems',
        libraries: filteredLibraries,
        displayItem: displayVentilationSystem,
        onSelect,
        onClose,
        currentSelectedItemTag,
    });
};

const displayVentilationSystemMeasure = (item: VentilationSystemMeasure): Row[] => [
    ...displayVentilationSystem(item),
    ...addMeasureLines(item),
];

export const SelectVentilationSystemMeasure = ({
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SpecificLibrarySelector<VentilationSystemMeasure>): ReactElement => {
    const { libraries } = useContext(AppContext);

    const filteredLibraries = libraries.filter(
        (lib): lib is VentilationSystemsMeasuresLibrary =>
            lib.type === 'ventilation_systems_measures',
    );

    return SelectLibraryItem({
        title: 'Ventilation system measures',
        libraries: filteredLibraries,
        displayItem: displayVentilationSystemMeasure,
        onSelect,
        onClose,
        currentSelectedItemTag,
    });
};

const displayExtractVentilationMeasure = (item: ExtractVentilationMeasure): Row[] => [
    { value: item.tag, title: 'Tag' },
    { value: item.name, title: 'Name' },
    { value: item.type, title: 'Ventilation type' },
    {
        value: `${item.ventilation_rate} m³/h`,
        title: 'Ventilation rate',
    },
    ...addMeasureLines(item),
];

export const SelectExtractVentilationMeasure = ({
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SpecificLibrarySelector<ExtractVentilationMeasure>): ReactElement => {
    const { libraries } = useContext(AppContext);

    const filteredLibraries = libraries.filter(
        (lib): lib is ExtractVentilationPointsLibrary =>
            lib.type === 'ventilation_systems_measures',
    );

    return SelectLibraryItem({
        title: 'Extract ventilation measures',
        libraries: filteredLibraries,
        displayItem: displayExtractVentilationMeasure,
        onSelect,
        onClose,
        currentSelectedItemTag,
    });
};

const displayIntentionalVent = (item: IntentionalVent): Row[] => [
    { value: item.tag, title: 'Tag' },
    { value: item.name, title: 'Name' },
    { value: item.source, title: 'Source' },
    { value: item.type, title: 'Type' },
    {
        value: `${item.ventilation_rate} m³/h`,
        title: 'Ventilation rate',
    },
];

export const SelectIntentionalVent = ({
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SpecificLibrarySelector<IntentionalVent>): ReactElement => {
    const { libraries } = useContext(AppContext);

    const filteredLibraries = libraries.filter(
        (lib): lib is IntentionalVentsAndFluesLibrary =>
            lib.type === 'intentional_vents_and_flues',
    );

    return SelectLibraryItem({
        title: 'Intentional Vents and Flues',
        libraries: filteredLibraries,
        displayItem: displayIntentionalVent,
        onSelect,
        onClose,
        currentSelectedItemTag,
    });
};

const displayIntentionalVentMeasure = (item: IntentionalVentMeasure): Row[] => [
    ...displayIntentionalVent(item),
    ...addMeasureLines(item),
];

export const SelectIntentionalVentMeasure = ({
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SpecificLibrarySelector<IntentionalVentMeasure>): ReactElement => {
    const { libraries } = useContext(AppContext);

    const filteredLibraries = libraries.filter(
        (lib): lib is IntentionalVentsAndFluesMeasuresLibrary =>
            lib.type === 'intentional_vents_and_flues_measures',
    );

    return SelectLibraryItem({
        title: 'Intentional Vents and Flues measures',
        libraries: filteredLibraries,
        displayItem: displayIntentionalVentMeasure,
        onSelect,
        onClose,
        currentSelectedItemTag,
    });
};

const displayClothesDryingItem = (item: ClothesDryingItem): Row[] => [
    { value: item.tag, title: 'Tag' },
    { value: item.name, title: 'Name' },
    { value: item.source, title: 'Source' },
    ...addMeasureLines(item),
];

export const SelectClothesDryingItem = ({
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SpecificLibrarySelector<ClothesDryingItem>): ReactElement => {
    const { libraries } = useContext(AppContext);

    const filteredLibraries = libraries.filter(
        (lib): lib is ClothesDryingFacilitiesLibrary =>
            lib.type === 'clothes_drying_facilities',
    );

    return SelectLibraryItem({
        title: 'Clothes drying measures',
        libraries: filteredLibraries,
        displayItem: displayClothesDryingItem,
        onSelect,
        onClose,
        currentSelectedItemTag,
    });
};

const displayDraughtProofingMeasure = (item: DraughtProofingMeasure): Row[] => [
    { value: item.tag, title: 'Tag' },
    { value: item.name, title: 'Name' },
    { value: `${item.q50} m³/h/m²`, title: 'q50' },
    ...addMeasureLines(item),
];

export const SelectDraughtProofingMeasure = ({
    onSelect,
    onClose,
    currentSelectedItemTag,
}: SpecificLibrarySelector<DraughtProofingMeasure>): ReactElement => {
    const { libraries } = useContext(AppContext);

    const filteredLibraries = libraries.filter(
        (lib): lib is DraughtProofingMeasuresLibrary =>
            lib.type === 'draught_proofing_measures',
    );

    return SelectLibraryItem({
        title: 'Draughtproofing Measures',
        libraries: filteredLibraries,
        displayItem: displayDraughtProofingMeasure,
        onSelect,
        onClose,
        currentSelectedItemTag,
    });
};

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
        (lib): lib is GenerationMeasuresLibrary => lib.type === 'generation_measures',
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
