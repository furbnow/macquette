/**
 * All libraries look like this; they come from the API this way.
 */
export interface LibraryOf<T> {
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
    data: {
        [k: string]: T;
    };
}

/*
 * That which is shared across library items generally.
 */
export interface ItemBase {
    name: string;
}

/**
 * That which is shared across measures.
 */
export interface MeasureBase {
    notes: string;
    who_by: string;
    benefits: string;
    key_risks: string;
    cost: string;
    cost_units: string;
    disruption: string;
    description: string;
    maintenance: string;
    performance: string;
    associated_work: string;
}

/*** Appliance and cooking items ***/

export interface AppliancesAndCookingLibrary extends LibraryOf<Appliance> {
    type: 'appliances_and_cooking';
}

export interface Appliance extends ItemBase {
    tag: string;
    tags: null[];
    units: ApplianceUnit;
    category: string;
    frequency: string;
    efficiency: string;
    norm_demand: string;
    type_of_fuel: ApplianceFuel;
    reference_quantity: string;
    utilisation_factor: string;
}

export enum ApplianceFuel {
    Electricity = 'Electricity',
    Gas = 'Gas',
    Oil = 'Oil',
}

export enum ApplianceUnit {
    KWh = 'kWh',
    KWhPerDay = 'kWh per day',
    KWhPerUse = 'kWh per use',
    KWhPerWeek = 'kWh per week',
    KWhPerYear = 'kWh per year',
}

/*** Clothes drying ***/

export interface ClothesDryingFacilitiesLibrary extends LibraryOf<ClothesDryingItem> {
    type: 'clothes_drying_facilities';
}

export interface ClothesDryingItem extends ItemBase, MeasureBase {
    tag: string;
    tags: null[];
    source: string;
}

/*** Draughtproofing ***/

export interface DraughtProofingMeasuresLibrary
    extends LibraryOf<DraughtProofingMeasure> {
    type: 'draught_proofing_measures';
}

export interface DraughtProofingMeasure extends ItemBase, MeasureBase {
    q50: string;
    tag: string;
    tags: null[];
    source: string;
}

/*** Building fabric elements ***/

export interface ElementsLibrary extends LibraryOf<FabricElement> {
    type: 'elements';
}

export type FabricElement =
    | FloorElement
    | LoftElement
    | PartyWallElement
    | RoofElement
    | WallElement
    | DoorElement
    | HatchElement
    | RoofLightElement
    | WindowElement;

interface ElementBase extends ItemBase {
    // TODO: Ensure tag always set.  At the moment, the production
    // library has a few elements without a tag set.
    tag: string;
    kvalue: string;
    source: string;
    uvalue: number | string;
    description: string;
}

interface GlazedElementBase extends ElementBase {
    g: string;
    ff: string;
    gL: string;
    tag: string;
}

export interface FloorElement extends ElementBase {
    tags: ['Floor'];
}
export interface LoftElement extends ElementBase {
    tags: ['Loft'];
}
export interface PartyWallElement extends ElementBase {
    tags: ['Party_wall'];
}
export interface RoofElement extends ElementBase {
    tags: ['Roof'];
}
export interface WallElement extends ElementBase {
    tags: ['Wall'];
}
export interface DoorElement extends GlazedElementBase {
    tags: ['Door'];
}
export interface HatchElement extends GlazedElementBase {
    tags: ['Hatch'];
}
export interface RoofLightElement extends GlazedElementBase {
    tags: ['Roof_light'];
}
export interface WindowElement extends GlazedElementBase {
    tags: ['Window'];
}

/*** Building fabric element measures ***/

export interface ElementsMeasuresLibrary extends LibraryOf<FabricMeasure> {
    type: 'elements_measures';
}

export type FabricMeasure =
    | FloorMeasure
    | LoftMeasure
    | PartyWallMeasure
    | RoofMeasure
    | WallMeasure
    | DoorMeasure
    | HatchMeasure
    | RoofLightMeasure
    | WindowMeasure;

export interface FloorMeasure extends FloorElement, MeasureBase {}
export interface LoftMeasure extends LoftElement, MeasureBase {}
export interface PartyWallMeasure extends PartyWallElement, MeasureBase {}
export interface RoofMeasure extends RoofElement, MeasureBase {}
export interface WallMeasure extends WallElement, MeasureBase {}
export interface DoorMeasure extends DoorElement, MeasureBase {}
export interface HatchMeasure extends HatchElement, MeasureBase {}
export interface RoofLightMeasure extends RoofLightElement, MeasureBase {}
export interface WindowMeasure extends WindowElement, MeasureBase {}

/*** Extract ventilation points ***/

export interface ExtractVentilationPointsLibrary
    extends LibraryOf<ExtractVentilationMeasure> {
    type: 'extract_ventilation_points';
}

export interface ExtractVentilationMeasure extends ItemBase, MeasureBase {
    tag: string;
    tags: null[];
    type: string;
    source: string;
    ventilation_rate: string;
}

/*** Onsite electricity generation ***/

export interface GenerationMeasuresLibrary extends LibraryOf<GenerationMeasure> {
    type: 'generation_measures';
}

export interface GenerationMeasure extends ItemBase, MeasureBase {
    kWp: string;
    tag: string;
    tags: null[];
}

/*** Heating systems ***/

export interface HeatingSystemsLibrary extends LibraryOf<HeatingSystem> {
    type: 'heating_systems';
}

export interface HeatingSystem extends ItemBase {
    tag?: string;
    tags?: null[];
    source: string;
    category: HeatingSystemCategory;
    combi_loss: string;
    responsiveness: string;
    summer_efficiency: string;
    winter_efficiency: string;
    central_heating_pump: string;
    primary_circuit_loss: 'Yes' | 'No';
    fans_and_supply_pumps: string;
    sfp?: string;
}

export enum HeatingSystemCategory {
    CombiBoilers = 'Combi boilers',
    HeatPumps = 'Heat pumps',
    HotWaterOnly = 'Hot water only',
    RoomHeaters = 'Room heaters',
    SystemBoilers = 'System boilers',
    WarmAirSystems = 'Warm air systems',
}

/*** Heating systems measures ***/

export interface HeatingSystemsMeasuresLibrary extends LibraryOf<HeatingSystemMeasure> {
    type: 'heating_systems_measures';
}

export interface HeatingSystemMeasure extends HeatingSystem, MeasureBase {}

/*** Hot water controls ***/

export interface HotWaterControlTypeLibrary extends LibraryOf<HotWaterControlMeasure> {
    type: 'hot_water_control_type';
}

export interface HotWaterControlMeasure extends ItemBase, MeasureBase {
    source: string;
    control_type: string;
}

/*** Vents and flues ***/

export interface IntentionalVentsAndFluesLibrary extends LibraryOf<IntentionalVent> {
    type: 'intentional_vents_and_flues';
}

export interface IntentionalVent extends ItemBase {
    tag: string;
    tags: null[];
    type: string;
    source: string;
    ventilation_rate: string;
}

/*** Vents and flues measures ***/

export interface IntentionalVentsAndFluesMeasuresLibrary
    extends LibraryOf<IntentionalVentMeasure> {
    type: 'intentional_vents_and_flues_measures';
}

export interface IntentionalVentMeasure extends IntentionalVent, MeasureBase {}

/*** Pipework insulation measures ***/

export interface PipeworkInsulationLibrary extends LibraryOf<PipeworkInsulationMeasure> {
    type: 'pipework_insulation';
}

export interface PipeworkInsulationMeasure extends ItemBase, MeasureBase {
    tag: string;
    tags: null[];
    notes: string;
    // TODO: this looks wrong; what's going on here?
    SELECT: string;
    source: string;
}

/*** Space heating control measures ***/

export interface SpaceHeatingControlTypeLibrary
    extends LibraryOf<SpaceHeatingControlType> {
    type: 'space_heating_control_type';
}

export interface SpaceHeatingControlType extends ItemBase, MeasureBase {
    tag?: string;
    tags?: null[];
    source: string;
    control_type: string;
}

/*** Heat storage systems ***/

export interface HeatStorageLibrary extends LibraryOf<HeatStorage> {
    type: 'storage_type';
}

export interface HeatStorage extends ItemBase {
    tag: string;
    tags: null[];
    source: string;
    category: HeatStorageCategory;
    loss_factor_b: string;
    storage_volume: string;
    volume_factor_b: string;
    temperature_factor_b: string;
    manufacturer_loss_factor: boolean;
}

export enum HeatStorageCategory {
    // TODO: Should be 'cylinders with immersion'
    CylindersWithInmersion = 'Cylinders with inmersion',
    IndirectlyHeatedCylinders = 'Indirectly heated cylinders',
}

/*** Heat storage system measures ***/

export interface HeatStorageMeasuresLibrary extends LibraryOf<HeatStorageMeasure> {
    type: 'storage_type_measures';
}

export interface HeatStorageMeasure extends HeatStorage, MeasureBase {}

/*** Ventilation systems ***/

export interface VentilationSystemsLibrary extends LibraryOf<VentilationSystem> {
    type: 'ventilation_systems';
}

export interface VentilationSystem extends ItemBase {
    tag: string;
    tags: null[];
    source: string;
    ventilation_type: string;
    specific_fan_power: string;
    system_air_change_rate: string;
    balanced_heat_recovery_efficiency: string;
}

/*** Ventilation system measures ***/

export interface VentilationSystemsMeasuresLibrary
    extends LibraryOf<VentilationSystemMeasure> {
    type: 'ventilation_systems_measures';
}

export interface VentilationSystemMeasure extends VentilationSystem, MeasureBase {}

/*** Water usage measures ***/

export interface WaterUsageLibrary extends LibraryOf<WaterUsageMeasure> {
    type: 'water_usage';
}

export interface WaterUsageMeasure extends ItemBase, MeasureBase {
    tag: string;
    tags: null[];
    source: string;
}

export type Library =
    | AppliancesAndCookingLibrary
    | ClothesDryingFacilitiesLibrary
    | DraughtProofingMeasuresLibrary
    | ElementsLibrary
    | ElementsMeasuresLibrary
    | ExtractVentilationPointsLibrary
    | GenerationMeasuresLibrary
    | HeatingSystemsLibrary
    | HeatingSystemsMeasuresLibrary
    | HotWaterControlTypeLibrary
    | IntentionalVentsAndFluesLibrary
    | IntentionalVentsAndFluesMeasuresLibrary
    | PipeworkInsulationLibrary
    | SpaceHeatingControlTypeLibrary
    | HeatStorageLibrary
    | HeatStorageMeasuresLibrary
    | VentilationSystemsLibrary
    | VentilationSystemsMeasuresLibrary
    | WaterUsageLibrary;
