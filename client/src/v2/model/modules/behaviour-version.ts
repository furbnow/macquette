type ModelBehaviourVersion = 'legacy' | 1;

export type ModelBehaviourFlags = {
    carbonCoopAppliancesCooking: {
        convertGainsToWatts: boolean; // Severe bug
        useWeightedMonthsForEnergyDemand: boolean; // Minor improvement
    };
};

export function constructModelBehaviourFlags(
    version: ModelBehaviourVersion,
): ModelBehaviourFlags {
    if (version === 'legacy') {
        return {
            carbonCoopAppliancesCooking: {
                convertGainsToWatts: false,
                useWeightedMonthsForEnergyDemand: false,
            },
        };
    }
    return {
        carbonCoopAppliancesCooking: {
            convertGainsToWatts: true,
            useWeightedMonthsForEnergyDemand: true,
        },
    };
}
