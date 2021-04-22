interface LibraryBase {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    permissions: {
        can_write: boolean;
        can_share: boolean;
    };
    owner: {
        type: 'global' | 'organisation';
        id: string | null;
        name: string;
    };
}

interface MeasureBase {
    notes: string;
    who_by: string;
    benefits: string;
    key_risks: string;
    cost_units: string;
    disruption: string;
    description: string;
    maintenance: string;
    performance: string;
    associated_work: string;
}

export interface ElementsLibrary extends LibraryBase {
    type: 'elements';
}
export interface ElementsMeasuresLibrary extends LibraryBase {
    type: 'elements_measures';
}
export interface DraughtProofingMeasuresLibrary extends LibraryBase {
    type: 'draught_proofing_measures';
}
export interface VentilationSystemsMeasuresLibrary extends LibraryBase {
    type: 'ventilation_systems_measures';
}
export interface VentilationSystemsLibrary extends LibraryBase {
    type: 'ventilation_systems';
}
export interface ExtractVentilationPointsLibrary extends LibraryBase {
    type: 'extract_ventilation_points';
}
export interface IntentionalVentsAndFluesLibrary extends LibraryBase {
    type: 'intentional_vents_and_flues';
}
export interface IntentionalVentsAndFluesMeasuresLibrary extends LibraryBase {
    type: 'intentional_vents_and_flues_measures';
}
export interface WaterUsageLibrary extends LibraryBase {
    type: 'water_usage';
}
export interface StorageTypeLibrary extends LibraryBase {
    type: 'storage_type';
}
export interface StorageTypeMeasuresLibrary extends LibraryBase {
    type: 'storage_type_measures';
}
export interface AppliancesAndCookingLibrary extends LibraryBase {
    type: 'appliances_and_cooking';
}
export interface HeatingControlLibrary extends LibraryBase {
    type: 'heating_control';
}
export interface HeatingSystemsLibrary extends LibraryBase {
    type: 'heating_systems';
}
export interface HeatingSystemsMeasuresLibrary extends LibraryBase {
    type: 'heating_systems_measures';
}
export interface PipeworkInsulationLibrary extends LibraryBase {
    type: 'pipework_insulation';
}
export interface HotWaterControlTypeLibrary extends LibraryBase {
    type: 'hot_water_control_type';
}
export interface SpaceHeatingControlTypeLibrary extends LibraryBase {
    type: 'space_heating_control_type';
}
export interface ClothesDryingFacilitiesLibrary extends LibraryBase {
    type: 'clothes_drying_facilities';
}
export interface GenerationMeasuresLibrary extends LibraryBase {
    type: 'generation_measures';
    data: {
        [k: string]: GenerationMeasure;
    };
}
export interface GenerationMeasure extends MeasureBase {
    tag?: string;
    name: string;
    kWp: number;
    cost: number;
}

export type Library =
    | ElementsLibrary
    | ElementsMeasuresLibrary
    | DraughtProofingMeasuresLibrary
    | VentilationSystemsMeasuresLibrary
    | VentilationSystemsLibrary
    | ExtractVentilationPointsLibrary
    | IntentionalVentsAndFluesLibrary
    | IntentionalVentsAndFluesMeasuresLibrary
    | WaterUsageLibrary
    | StorageTypeLibrary
    | StorageTypeMeasuresLibrary
    | AppliancesAndCookingLibrary
    | HeatingControlLibrary
    | HeatingSystemsLibrary
    | HeatingSystemsMeasuresLibrary
    | PipeworkInsulationLibrary
    | HotWaterControlTypeLibrary
    | SpaceHeatingControlTypeLibrary
    | ClothesDryingFacilitiesLibrary
    | GenerationMeasuresLibrary;
