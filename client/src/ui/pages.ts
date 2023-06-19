const standalonePageNames = [
    'householdquestionnaire',
    'commentary',
    'currentenergy',
    'imagegallery',
    'compare',
    'report',
    'scopeofworks',
    'export',
    'librariesmanager',
    'fuelsmanager',
    'sandbox',
    'address-search',
    'project',
] as const;

const scenarioPageNames = [
    'context',
    'ventilation',
    'elements',
    'LAC',
    'heating',
    'fuel_requirements',
    'generation',
    'solarhotwater',
    'worksheets',
] as const;

export type StandalonePageName = (typeof standalonePageNames)[number];
export type ScenarioPageName = (typeof scenarioPageNames)[number];

export function isStandalonePage(x: string): x is StandalonePageName {
    const names: readonly string[] = standalonePageNames;
    return names.includes(x);
}

export function isScenarioPage(x: string): x is ScenarioPageName {
    const names: readonly string[] = scenarioPageNames;
    return names.includes(x);
}

export const pageTitles: Record<StandalonePageName | ScenarioPageName, string> = {
    'address-search': 'Address Search',
    householdquestionnaire: 'Household Questionnaire',
    commentary: 'Commentary',
    currentenergy: 'Current Energy',
    imagegallery: 'Image Gallery',
    compare: 'Compare Scenarios',
    report: 'Generate Report',
    scopeofworks: 'Scope of Works',
    export: 'Import/Export',
    librariesmanager: 'Libraries Manager',
    fuelsmanager: 'Fuels Manager',
    sandbox: 'Sandbox',
    context: 'Basic Dwelling Data',
    ventilation: 'Ventilation & Infiltration',
    elements: 'Fabric',
    LAC: 'Lighting, Appliances & Cooking',
    heating: 'Heating',
    fuel_requirements: 'Fuel Requirements',
    generation: 'Generation',
    solarhotwater: 'Solar Hot Water Heating',
    worksheets: 'SAP worksheets',
    project: 'Project',
};
