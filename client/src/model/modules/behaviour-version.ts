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
  currentEnergy: {
    countSavingsCorrectlyInUsage: boolean; // Minor bug
    calculateSavingsIncorporatingOnsiteUse: boolean; // Minor improvement
  };
  heatingSystems: {
    fansAndPumps: {
      fixUndefinedSpecificFanPowerInWarmAirSystems: boolean; // Minor bug
      warmAirSystemsZeroGainInSummer: boolean; // SAP 9 vs 10
    };
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
    currentEnergy: {
      countSavingsCorrectlyInUsage: false,
      calculateSavingsIncorporatingOnsiteUse: false,
    },
    heatingSystems: {
      fansAndPumps: {
        fixUndefinedSpecificFanPowerInWarmAirSystems: false,
        warmAirSystemsZeroGainInSummer: false,
      },
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
  const v3Flags = safeMerge(v2Flags, {
    currentEnergy: {
      countSavingsCorrectlyInUsage: true,
      calculateSavingsIncorporatingOnsiteUse: true,
    },
  });
  const v4Flags = safeMerge(v3Flags, {
    heatingSystems: {
      fansAndPumps: {
        fixUndefinedSpecificFanPowerInWarmAirSystems: true,
        warmAirSystemsZeroGainInSummer: true,
      },
    },
  });
  switch (version) {
    case 'legacy':
      return legacyFlags;
    case 1:
      return v1Flags;
    case 2:
      return v2Flags;
    case 3:
      return v3Flags;
    case 4:
      return v4Flags;
  }
}
