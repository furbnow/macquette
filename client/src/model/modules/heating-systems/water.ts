import type { LegacyHeatingSystem } from '.';
import { Scenario } from '../../../data-schemas/scenario';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { TypeOf, t } from '../../../data-schemas/visitable-types';
import { solarHotWaterPrimaryCircuitLossFactor } from '../../datasets';
import { Month } from '../../enums/month';
import { ModelError } from '../../error';

export const waterHeatingSystemInput = t.struct({
  fractionWaterHeating: t.number(),
  distributionLoss: t.boolean(),
  combiLoss: t.nullable(
    t.discriminatedUnion('type', [
      t.struct({
        type: t.literal('instantaneous'),
        keepHotFacility: t.nullable(
          t.struct({
            controlledByTimeClock: t.boolean(),
          }),
        ),
      }),
      t.struct({
        type: t.literal('storage'),
        capacity: t.union([t.literal('>= 55 litres'), t.number()]),
      }),
    ]),
  ),
  primaryCircuitLoss: t.nullable(
    t.struct({
      pipeworkInsulation: t.union([
        t.literal('uninsulated'),
        t.literal('first metre'),
        t.literal('all accessible'),
        t.literal('fully insulated'),
      ]),
      hotWaterControl: t.discriminatedUnion('type', [
        t.struct({ type: t.literal('no control') }),
        t.struct({
          type: t.literal('cylinder thermostat'),
          separatelyTimedWaterHeating: t.boolean(),
        }),
      ]),
    }),
  ),
});
export type WaterHeatingSystemInput = TypeOf<typeof waterHeatingSystemInput>;

export type WaterHeatingSystemDependencies = {
  waterCommon: {
    hotWaterEnergyContentByMonth: (m: Month) => number;
    dailyHotWaterUsageLitresByMonth: (m: Month) => number;
    annualEnergyContentOverride: false | number;
    solarHotWater: boolean;
  };
};

export class WaterHeatingSystem {
  constructor(
    private input: WaterHeatingSystemInput,
    private dependencies: WaterHeatingSystemDependencies,
  ) {
    if (input.distributionLoss === false && input.combiLoss !== null) {
      console.warn(
        'Water heating system specified no distribution loss, but combi loss, but combi boilers must incur distribution loss',
      );
    }
    if (input.distributionLoss === false && input.primaryCircuitLoss !== null) {
      console.warn(
        'Water heating system specified no distribution loss, but primary circuit loss, but primary circuit systems must incur distribution loss',
      );
    }
    if (input.combiLoss !== null && input.primaryCircuitLoss !== null) {
      console.warn(
        'Water heating system specified both combi and primary circuit loss, but combi boilers do not have a primary circuit',
      );
    }
  }

  distributionLossMonthly(month: Month) {
    if (this.input.distributionLoss) {
      return (
        0.15 *
        this.input.fractionWaterHeating *
        this.dependencies.waterCommon.hotWaterEnergyContentByMonth(month)
      );
    } else {
      return 0;
    }
  }

  combiLossMonthly(month: Month) {
    if (this.input.combiLoss === null) return 0;
    if (this.input.fractionWaterHeating === 0) {
      // Used instead of deleting systems in non-baseline scenarios
      return 0;
    }
    const usage = this.dependencies.waterCommon.dailyHotWaterUsageLitresByMonth(month);
    let usageFactor: number;
    if (this.dependencies.waterCommon.annualEnergyContentOverride !== false) {
      // Reproducing buggy? behaviour in water heating model
      usageFactor = 1;
    } else {
      usageFactor = Math.min(usage / 100.0, 1.0);
    }
    switch (this.input.combiLoss.type) {
      case 'instantaneous': {
        if (this.input.combiLoss.keepHotFacility === null) {
          return (600 * usageFactor * month.days) / 365;
        }
        if (this.input.combiLoss.keepHotFacility.controlledByTimeClock) {
          return (600 * month.days) / 365;
        } else {
          return (900 * month.days) / 365;
        }
      }
      case 'storage': {
        if (this.input.combiLoss.capacity === '>= 55 litres') {
          return 0;
        } else {
          return (
            ((600 - (this.input.combiLoss.capacity - 15) * 15) *
              usageFactor *
              month.days) /
            365
          );
        }
      }
    }
  }

  get pipeworkInsulatedFraction(): number | null {
    if (this.input.primaryCircuitLoss === null) {
      return null;
    }
    switch (this.input.primaryCircuitLoss.pipeworkInsulation) {
      case 'uninsulated':
        return 0;
      case 'first metre':
        return 0.1;
      case 'all accessible':
        return 0.3;
      case 'fully insulated':
        return 1.0;
    }
  }

  primaryCircuitLossMonthly(month: Month) {
    if (this.input.fractionWaterHeating === 0) {
      // Used instead of deleting systems in non-baseline scenarios
      return 0;
    }
    const pipeworkInsulatedFraction = this.pipeworkInsulatedFraction;
    if (this.input.primaryCircuitLoss === null || pipeworkInsulatedFraction === null) {
      return 0;
    }

    let heatingHoursPerDay: number;
    switch (month.season) {
      case 'summer':
        heatingHoursPerDay = 3;
        break;
      case 'winter':
        if (this.input.primaryCircuitLoss.hotWaterControl.type === 'no control') {
          heatingHoursPerDay = 11;
        } else if (
          !this.input.primaryCircuitLoss.hotWaterControl.separatelyTimedWaterHeating
        ) {
          heatingHoursPerDay = 5;
        } else {
          heatingHoursPerDay = 3;
        }
        break;
    }

    // SAP 2012, table 3, page 199
    const basicLoss =
      month.days *
      14 *
      ((0.0091 * pipeworkInsulatedFraction + 0.0245 * (1 - pipeworkInsulatedFraction)) *
        heatingHoursPerDay +
        0.0263);
    let solarHotWaterFactor: number;
    if (this.dependencies.waterCommon.solarHotWater) {
      solarHotWaterFactor = solarHotWaterPrimaryCircuitLossFactor(month);
    } else {
      solarHotWaterFactor = 1;
    }
    return solarHotWaterFactor * basicLoss;
  }

  usefulOutputMonthly(month: Month) {
    return (
      0.85 *
      this.input.fractionWaterHeating *
      this.dependencies.waterCommon.hotWaterEnergyContentByMonth(month)
    );
  }
}

export function extractWaterHeatingSystemInput(
  legacySystem: LegacyHeatingSystem,
  scenario: Scenario,
): WaterHeatingSystemInput | null {
  if (
    !(legacySystem.provides === 'heating_and_water' || legacySystem.provides === 'water')
  ) {
    return null;
  }
  if (
    legacySystem.fraction_water_heating === undefined ||
    legacySystem.fraction_water_heating === '' ||
    legacySystem.fraction_water_heating <= 0
  ) {
    return null;
  }
  const isInstantaneous = legacySystem.instantaneous_water_heating ?? false;
  let combiLoss: WaterHeatingSystemInput['combiLoss'];
  if (isInstantaneous) {
    combiLoss = null;
  } else {
    switch (legacySystem.combi_loss) {
      case '0':
      case 0:
      case undefined:
        // Category was "Combi boilers" but `combi_loss` was 0. This
        // does not make sense, but occurs in some library items as a
        // hack for skipping the combi loss calcs.
        combiLoss = null;
        break;
      case 'Instantaneous, without keep hot-facility':
        combiLoss = {
          type: 'instantaneous',
          keepHotFacility: null,
        };
        break;
      case 'Instantaneous, with keep-hot facility controlled by time clock':
        combiLoss = {
          type: 'instantaneous',
          keepHotFacility: { controlledByTimeClock: true },
        };
        break;
      case 'Instantaneous, with keep-hot facility not controlled by time clock':
        combiLoss = {
          type: 'instantaneous',
          keepHotFacility: { controlledByTimeClock: false },
        };
        break;
      case 'Storage combi boiler < 55 litres':
      case 'Storage combi boiler  55 litres':
        if (legacySystem.combi_loss === 'Storage combi boiler  55 litres') {
          // 'Storage combi boiler  55 litres' is a value produced by the
          // old PHP backend applying HTML santisation to the original
          // string 'Storage combi boiler < 55 litres'. It occurs in some
          // very old assessments.
          console.warn(
            "Encountered 'Storage combi boiler  55 litres' when extracting combi boiler loss input",
          );
        }
        console.warn(
          'Extracting combi boiler capacity from legacy Vc value, but this is likely to be wrong as there is no way to set this input in the UI',
        );
        combiLoss = {
          type: 'storage',
          capacity: scenario?.water_heating?.Vc ?? 0,
        };
        break;
      case 'Storage combi boiler >= 55 litres':
        combiLoss = {
          type: 'storage',
          capacity: '>= 55 litres',
        };
        break;
    }
  }
  if (combiLoss !== null && legacySystem.category !== 'Combi boilers') {
    console.warn(
      'Combi loss was specified but system was not a combi boiler',
      legacySystem,
    );
  }
  let primaryCircuitLoss: WaterHeatingSystemInput['primaryCircuitLoss'];
  if (isInstantaneous) {
    primaryCircuitLoss = null;
  } else {
    switch (legacySystem.primary_circuit_loss) {
      case 'No':
      case undefined:
        primaryCircuitLoss = null;
        break;
      case 'Yes': {
        type PrimaryCircuitLoss = Exclude<
          WaterHeatingSystemInput['primaryCircuitLoss'],
          null
        >;
        let pipeworkInsulation: PrimaryCircuitLoss['pipeworkInsulation'];
        switch (scenario?.water_heating?.pipework_insulation) {
          case 'Uninsulated primary pipework':
            pipeworkInsulation = 'uninsulated';
            break;
          case 'First 1m from cylinder insulated':
            pipeworkInsulation = 'first metre';
            break;
          case 'All accesible piperwok insulated':
            pipeworkInsulation = 'all accessible';
            break;
          case 'Fully insulated primary pipework':
            pipeworkInsulation = 'fully insulated';
            break;
          case undefined:
            throw new ModelError(
              'Heating system was eligible for primary circuit loss but no pipework insulation provided',
            );
        }
        let hotWaterControl: PrimaryCircuitLoss['hotWaterControl'];
        switch (scenario.water_heating?.hot_water_control_type) {
          case 'no_cylinder_thermostat':
            hotWaterControl = { type: 'no control' };
            break;
          case 'Cylinder thermostat, water heating not separately timed':
            hotWaterControl = {
              type: 'cylinder thermostat',
              separatelyTimedWaterHeating: false,
            };
            break;
          case 'Cylinder thermostat, water heating separately timed':
            hotWaterControl = {
              type: 'cylinder thermostat',
              separatelyTimedWaterHeating: true,
            };
            break;
          case undefined:
            throw new ModelError(
              'Heating system eligible for primary circuit loss but no hot water controls specified',
            );
        }
        primaryCircuitLoss = {
          pipeworkInsulation,
          hotWaterControl,
        };
        break;
      }
    }
  }
  return {
    fractionWaterHeating:
      coalesceEmptyString(legacySystem.fraction_water_heating, 0) ?? 0,
    combiLoss,
    primaryCircuitLoss,
    distributionLoss: !isInstantaneous,
  };
}
