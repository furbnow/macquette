import { Scenario } from '../../data-schemas/scenario';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { sum } from '../../helpers/array-reducers';
import { cacheMonth } from '../../helpers/cache-decorators';
import { Month } from '../enums/month';

export type WaterHeatingDependencies = {
  heatingSystems: {
    waterHeatingSystems: Array<{
      distributionLossMonthly: (m: Month) => number;
      combiLossMonthly: (m: Month) => number;
      primaryCircuitLossMonthly: (m: Month) => number;
      usefulOutputMonthly: (m: Month) => number;
      pipeworkInsulatedFraction: number | null;
    }>;
  };
  waterCommon: {
    annualEnergyContentOverride: false | number;
    hotWaterEnergyContentByMonth: (m: Month) => number;
    solarHotWater: boolean;
    dailyHotWaterUsageByMonth: (m: Month) => number;
  };
  solarHotWater: {
    solarInputMonthly: (m: Month) => number;
  };
};

export type WaterHeatingInput = {
  storage: StorageInput;
  communityHeating: boolean;
  hotWaterStoreInDwelling: boolean;
};

type StorageInput = null | (StorageCommon & StorageSpecific);
type StorageCommon = {
  volume: number;
  dedicatedSolarOrWWHRSStorage: false | number;
};
type StorageSpecific =
  | {
      type: 'declared loss factor';
      manufacturerLossFactor: number;
      temperatureFactor: number;
    }
  | {
      type: 'unknown loss factor';
      lossFactor: number;
      volumeFactor: number;
      temperatureFactor: number;
    };

export function extractWaterHeatingInputFromLegacy(
  scenario: Scenario,
): WaterHeatingInput {
  let storage: WaterHeatingInput['storage'];
  const { storage_type, contains_dedicated_solar_storage_or_WWHRS } =
    scenario?.water_heating ?? {};
  if (storage_type === undefined) {
    storage = null;
  } else {
    const volume = coalesceEmptyString(storage_type.storage_volume, 0) ?? 0;
    let dedicatedSolarOrWWHRSStorage: false | number;
    if (
      contains_dedicated_solar_storage_or_WWHRS === undefined ||
      contains_dedicated_solar_storage_or_WWHRS === '' ||
      contains_dedicated_solar_storage_or_WWHRS <= 0
    ) {
      dedicatedSolarOrWWHRSStorage = false;
    } else {
      dedicatedSolarOrWWHRSStorage = contains_dedicated_solar_storage_or_WWHRS;
    }
    let specific: StorageSpecific;
    if (storage_type.declared_loss_factor_known === true) {
      const { manufacturer_loss_factor } = storage_type;
      let manufacturerLossFactor: number;
      if (manufacturer_loss_factor === false) {
        manufacturerLossFactor = 0;
      } else {
        manufacturerLossFactor = coalesceEmptyString(manufacturer_loss_factor, 0) ?? 0;
      }
      specific = {
        type: 'declared loss factor',
        manufacturerLossFactor,
        temperatureFactor: coalesceEmptyString(storage_type.temperature_factor_a, 0) ?? 0,
      };
    } else {
      specific = {
        type: 'unknown loss factor',
        lossFactor: coalesceEmptyString(storage_type.loss_factor_b, 0) ?? 0,
        volumeFactor: coalesceEmptyString(storage_type.volume_factor_b, 0) ?? 0,
        temperatureFactor: coalesceEmptyString(storage_type.temperature_factor_b, 0) ?? 0,
      };
    }
    storage = {
      ...specific,
      volume,
      dedicatedSolarOrWWHRSStorage,
    };
  }
  const communityHeating = scenario?.water_heating?.community_heating ?? false;
  const hotWaterStoreInDwelling =
    scenario?.water_heating?.hot_water_store_in_dwelling ?? false;
  return {
    storage,
    communityHeating,
    hotWaterStoreInDwelling,
  };
}

export class WaterHeating {
  constructor(
    private input: WaterHeatingInput,
    private dependencies: WaterHeatingDependencies,
  ) {}

  private get systems(): WaterHeatingDependencies['heatingSystems']['waterHeatingSystems'] {
    // alias
    return this.dependencies.heatingSystems.waterHeatingSystems;
  }

  @cacheMonth
  distributionLossMonthly(month: Month): number {
    return sum(this.systems.map((system) => system.distributionLossMonthly(month)));
  }

  @cacheMonth
  combiLossMonthly(month: Month): number {
    return sum(this.systems.map((system) => system.combiLossMonthly(month)));
  }

  @cacheMonth
  primaryCircuitLossMonthly(month: Month): number {
    return sum(this.systems.map((system) => system.primaryCircuitLossMonthly(month)));
  }

  @cacheMonth
  usefulOutputMonthly(month: Month): number {
    return sum(this.systems.map((system) => system.usefulOutputMonthly(month)));
  }

  get energyLossFromWaterStorageDaily(): number {
    const { storage } = this.input;
    if (storage === null) {
      return 0;
    }
    switch (storage.type) {
      case 'declared loss factor':
        return storage.manufacturerLossFactor * storage.temperatureFactor;
      case 'unknown loss factor':
        return (
          storage.volume *
          storage.lossFactor *
          storage.volumeFactor *
          storage.temperatureFactor
        );
    }
  }

  storageLossMonthly(month: Month): number {
    const { storage } = this.input;
    if (storage === null) {
      return 0;
    }
    let dedicatedStorageLossFactor;
    if (storage.dedicatedSolarOrWWHRSStorage !== false && storage.volume > 0) {
      dedicatedStorageLossFactor =
        1.0 - storage.dedicatedSolarOrWWHRSStorage / storage.volume;
    } else {
      dedicatedStorageLossFactor = 1.0;
    }
    return month.days * this.energyLossFromWaterStorageDaily * dedicatedStorageLossFactor;
  }

  @cacheMonth
  totalHeatRequiredMonthly(month: Month): number {
    return (
      this.usefulOutputMonthly(month) +
      this.distributionLossMonthly(month) +
      this.primaryCircuitLossMonthly(month) +
      this.combiLossMonthly(month) +
      this.storageLossMonthly(month)
    );
  }

  /** Note that this is after applying the SHW discount - so this is just the
   * output from the non-solar water heating systems */
  @cacheMonth
  heatOutputMonthly(month: Month): number {
    const solarDiscount = this.dependencies.solarHotWater.solarInputMonthly(month); // Should be a negative value or 0
    return Math.max(0, this.totalHeatRequiredMonthly(month) + solarDiscount);
  }

  get heatOutputAnnual(): number {
    return sum(Month.all.map((m) => this.heatOutputMonthly(m)));
  }

  @cacheMonth
  gainsMonthly(month: Month): { kWhPerMonth: number; watts: number } {
    let storageLoss: number;
    if (this.input.hotWaterStoreInDwelling || this.input.communityHeating) {
      storageLoss = this.storageLossMonthly(month);
    } else {
      storageLoss = 0;
    }
    const kWhPerMonth =
      0.25 *
        (0.85 * this.dependencies.waterCommon.hotWaterEnergyContentByMonth(month) +
          this.combiLossMonthly(month)) +
      0.8 *
        (this.distributionLossMonthly(month) +
          storageLoss +
          this.primaryCircuitLossMonthly(month));
    const watts = (1000 * kWhPerMonth) / (month.days * 24);
    return {
      kWhPerMonth,
      watts,
    };
  }

  /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
  mutateLegacyData(data: any) {
    data.water_heating = data.water_heating ?? {};
    const { water_heating } = data;
    water_heating.distribution_loss = Month.all.map((m) =>
      this.distributionLossMonthly(m),
    );
    water_heating.primary_circuit_loss = Month.all.map((m) =>
      this.primaryCircuitLossMonthly(m),
    );
    water_heating.combi_loss = Month.all.map((m) => this.combiLossMonthly(m));
    water_heating.total_heat_required = Month.all.map((m) =>
      this.totalHeatRequiredMonthly(m),
    );
    water_heating.monthly_storage_loss = Month.all.map((m) => this.storageLossMonthly(m));
    water_heating.energy_lost_from_water_storage = this.energyLossFromWaterStorageDaily;
    water_heating.hot_water_heater_output = Month.all.map((m) =>
      this.heatOutputMonthly(m),
    );
    water_heating.annual_waterheating_demand = this.heatOutputAnnual;
    water_heating.heat_gains_from_water_heating = Month.all.map(
      (m) => this.gainsMonthly(m).kWhPerMonth,
    );
    data.gains_W['waterheating'] = Month.all.map((m) => this.gainsMonthly(m).watts);
    data.energy_requirements.waterheating = {
      name: 'Water Heating',
      quantity: this.heatOutputAnnual,
      monthly: Month.all.map((m) => this.heatOutputMonthly(m)),
    };
    const primaryCircuitPipeworkInsulationFraction = this.systems
      .map((system) => system.pipeworkInsulatedFraction)
      .find((val) => val !== null);
    if (primaryCircuitPipeworkInsulationFraction !== undefined) {
      water_heating.pipework_insulated_fraction =
        primaryCircuitPipeworkInsulationFraction;
    }
  }
  /* eslint-enable */
}
