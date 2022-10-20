import { ModelBehaviourVersion } from '../../data-schemas/scenario';
import { safeMerge } from '../../helpers/safe-merge';

export type ModelBehaviourFlags = {
    carbonCoopAppliancesCooking: {
        treatMonthlyGainAsPower: boolean; // Severe bug
        convertGainsToWatts: boolean; // Severe bug
        useFuelInputForFuelFraction: boolean; // Minor bug
        useWeightedMonthsForEnergyDemand: boolean; // Minor improvement
    };
    generation: {
        includeAllSystemsInPrimaryEnergyTotal: boolean; // Minor bug
    };
};

export function constructModelBehaviourFlags(
    version: ModelBehaviourVersion,
): ModelBehaviourFlags {
    const legacyFlags = {
        carbonCoopAppliancesCooking: {
            treatMonthlyGainAsPower: false,
            convertGainsToWatts: false,
            useFuelInputForFuelFraction: false,
            useWeightedMonthsForEnergyDemand: false,
        },
        generation: {
            includeAllSystemsInPrimaryEnergyTotal: false,
        },
    };
    const v1Flags = safeMerge(legacyFlags, {
        carbonCoopAppliancesCooking: {
            treatMonthlyGainAsPower: true,
            convertGainsToWatts: true,
            useFuelInputForFuelFraction: true,
            useWeightedMonthsForEnergyDemand: true,
        },
    });
    const v2Flags = safeMerge(v1Flags, {
        generation: {
            includeAllSystemsInPrimaryEnergyTotal: true,
        },
    });
    switch (version) {
        case 'legacy':
            return legacyFlags;
        case 1:
            return v1Flags;
        case 2:
            return v2Flags;
    }
}
