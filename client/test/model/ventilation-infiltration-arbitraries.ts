import fc from 'fast-check';
import { Region } from '../../src/model/enums/region';
import { VentilationInfiltrationCommonInput } from '../../src/model/modules/ventilation-infiltration/common-input';
import { VentilationPoint } from '../../src/model/modules/ventilation-infiltration/common-types';
import {
  VentilationDependencies,
  VentilationInput,
} from '../../src/model/modules/ventilation-infiltration/ventilation';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { arbitraryRegion } from '../helpers/arbitrary-enums';

export const arbCommonInput: fc.Arbitrary<VentilationInfiltrationCommonInput> = fc.record(
  {
    numberOfSidesSheltered: fc.nat(),
  },
);

const arbVentilationPoint: fc.Arbitrary<VentilationPoint> = fc.record({
  ventilationRate: sensibleFloat,
});

export const arbVentilationInput: fc.Arbitrary<VentilationInput> = fc.oneof(
  fc.record({ type: fc.constant('unplanned/natural ventilation' as const) }),
  fc.record({
    type: fc.constant('intermittent extract' as const),
    extractVentilationPoints: fc.array(arbVentilationPoint),
  }),
  fc.record({
    type: fc.constant('positive input or mechanical extract' as const),
    systemAirChangeRate: sensibleFloat,
    systemSpecificFanPower: sensibleFloat,
  }),
  fc.record({
    type: fc.constant('passive stack' as const),
    extractVentilationPoints: fc.array(arbVentilationPoint),
  }),
  fc.record({
    type: fc.constant('mechanical ventilation with heat recovery' as const),
    efficiencyProportion: sensibleFloat,
    systemAirChangeRate: sensibleFloat,
  }),
  fc.record({
    type: fc.constant('mechanical ventilation' as const),
    systemAirChangeRate: sensibleFloat,
    systemSpecificFanPower: sensibleFloat,
  }),
);

export type VentilationInfiltrationTestDependencies = Omit<
  VentilationDependencies,
  'ventilationInfiltrationCommon'
> & {
  region: Region;
};
export const arbDependencies: fc.Arbitrary<VentilationInfiltrationTestDependencies> =
  fc.record({
    region: arbitraryRegion,
    floors: fc.record({ totalVolume: sensibleFloat.filter((v) => v !== 0) }),
  });

export function makeLegacyDataForVentilation(
  commonInput: VentilationInfiltrationCommonInput,
  ventilationInput: VentilationInput,
  dependencies: VentilationInfiltrationTestDependencies,
  extras: { mechanicalExtractVentilationIsDecentralised: boolean },
): unknown {
  let ventilation: Record<string, unknown>;
  switch (ventilationInput.type) {
    case 'unplanned/natural ventilation':
      ventilation = { ventilation_type: 'NV' };
      break;
    case 'intermittent extract':
      ventilation = {
        ventilation_type: 'IE',
        EVP: ventilationInput.extractVentilationPoints.map(({ ventilationRate }) => ({
          ventilation_rate: ventilationRate,
        })),
      };
      break;
    case 'positive input or mechanical extract':
      if (extras.mechanicalExtractVentilationIsDecentralised) {
        ventilation = {
          ventilation_type: 'DEV',
          system_air_change_rate: ventilationInput.systemAirChangeRate,
          system_specific_fan_power: ventilationInput.systemSpecificFanPower,
        };
      } else {
        ventilation = {
          ventilation_type: 'MEV',
          system_air_change_rate: ventilationInput.systemAirChangeRate,
          system_specific_fan_power: ventilationInput.systemSpecificFanPower,
        };
      }
      break;
    case 'passive stack':
      ventilation = {
        ventilation_type: 'PS',
        EVP: ventilationInput.extractVentilationPoints.map(({ ventilationRate }) => ({
          ventilation_rate: ventilationRate,
        })),
      };
      break;
    case 'mechanical ventilation with heat recovery':
      ventilation = {
        ventilation_type: 'MVHR',

        system_air_change_rate: ventilationInput.systemAirChangeRate,
        balanced_heat_recovery_efficiency: ventilationInput.efficiencyProportion * 100,
      };
      break;
    case 'mechanical ventilation':
      ventilation = {
        ventilation_type: 'MV',
        system_air_change_rate: ventilationInput.systemAirChangeRate,
        system_specific_fan_power: ventilationInput.systemSpecificFanPower,
      };
      break;
  }
  return {
    ventilation: {
      ...ventilation,
      number_of_sides_sheltered: commonInput.numberOfSidesSheltered,
    },
    volume: dependencies.floors.totalVolume,
    region: dependencies.region.index0,
    num_of_floors: 0,
    fabric: {
      total_external_area: 0,
      total_party_wall_area: 0,
    },
    losses_WK: {},
  };
}
