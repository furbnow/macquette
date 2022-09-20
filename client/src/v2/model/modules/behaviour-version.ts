type ModelBehaviourVersion = 'legacy' | 1;

export type ModelBehaviourFlags = {
    carbonCoopAppliancesCooking: {
        treatMonthlyGainAsPower: boolean; // Severe bug
        convertGainsToWatts: boolean; // Severe bug
        useFuelInputForFuelFraction: boolean; // Minor bug
        useWeightedMonthsForEnergyDemand: boolean; // Minor improvement
    };
};

export function constructModelBehaviourFlags(
    version: ModelBehaviourVersion,
): ModelBehaviourFlags {
    if (version === 'legacy') {
        return {
            carbonCoopAppliancesCooking: {
                treatMonthlyGainAsPower: false,
                convertGainsToWatts: false,
                useFuelInputForFuelFraction: false,
                useWeightedMonthsForEnergyDemand: false,
            },
        };
    }
    return {
        carbonCoopAppliancesCooking: {
            treatMonthlyGainAsPower: true,
            convertGainsToWatts: true,
            useFuelInputForFuelFraction: true,
            useWeightedMonthsForEnergyDemand: true,
        },
    };
}
