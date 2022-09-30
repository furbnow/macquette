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

export type StandalonePageName = typeof standalonePageNames[number];
export type ScenarioPageName = typeof scenarioPageNames[number];

export function isStandalonePage(x: string): x is StandalonePageName {
    const names: readonly string[] = standalonePageNames;
    return names.includes(x);
}

export function isScenarioPage(x: string): x is ScenarioPageName {
    const names: readonly string[] = scenarioPageNames;
    return names.includes(x);
}
