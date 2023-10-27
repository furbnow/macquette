import fc from 'fast-check';
import { Region } from '../../src/model/enums/region';
import { VentilationInfiltrationCommonInput } from '../../src/model/modules/ventilation-infiltration/common-input';
import { VentilationPoint } from '../../src/model/modules/ventilation-infiltration/common-types';
import {
  InfiltrationDependencies,
  InfiltrationInput,
} from '../../src/model/modules/ventilation-infiltration/infiltration';
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

export const arbInfiltrationInput: fc.Arbitrary<InfiltrationInput> = fc.record({
  estimateFrom: fc.oneof(
    fc.record({
      type: fc.constant('fabric elements' as const),
      numberOfFloorsOverride: fc.option(fc.nat()),
      walls: fc.constantFrom('timber' as const, 'masonry' as const),
      floor: fc.constantFrom(
        'suspended sealed' as const,
        'suspended unsealed' as const,
        'solid' as const,
      ),
      draughtProofedProportion: sensibleFloat,
      draughtLobby: fc.boolean(),
    }),
    fc.record({
      type: fc.constant('pressure test' as const),
      airPermeability: sensibleFloat,
    }),
  ),
  intentionalVentsFlues: fc.array(arbVentilationPoint),
});

export type VentilationInfiltrationTestDependencies = Omit<
  VentilationDependencies & InfiltrationDependencies,
  'ventilationInfiltrationCommon'
> & {
  region: Region;
};
export const arbDependencies: fc.Arbitrary<VentilationInfiltrationTestDependencies> =
  fc.record({
    region: arbitraryRegion,
    floors: fc.record({
      totalVolume: sensibleFloat.filter((v) => v !== 0),
      numberOfFloors: fc.nat(),
    }),
    fabric: fc.record({ envelopeArea: sensibleFloat }),
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
  ventilation['number_of_sides_sheltered'] = commonInput.numberOfSidesSheltered;
  return {
    ventilation,
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
export function makeLegacyDataForInfiltration(
  commonInput: VentilationInfiltrationCommonInput,
  infiltrationInput: InfiltrationInput,
  dependencies: VentilationInfiltrationTestDependencies,
  extras: { partyWallAreaProportionOfEnvelope: number },
): unknown {
  let ventilation: Record<string, unknown>;
  let num_of_floors_override: number | undefined = undefined;
  switch (infiltrationInput.estimateFrom.type) {
    case 'pressure test': {
      ventilation = {
        air_permeability_test: true,
        air_permeability_value: infiltrationInput.estimateFrom.airPermeability,
      };
      break;
    }
    case 'fabric elements': {
      let dwelling_construction: string;
      switch (infiltrationInput.estimateFrom.walls) {
        case 'timber':
          dwelling_construction = 'timberframe';
          break;
        case 'masonry':
          dwelling_construction = 'masonry';
          break;
      }
      let suspended_wooden_floor: string | number;
      switch (infiltrationInput.estimateFrom.floor) {
        case 'solid':
          suspended_wooden_floor = 0;
          break;
        case 'suspended sealed':
          suspended_wooden_floor = 'sealed';
          break;
        case 'suspended unsealed':
          suspended_wooden_floor = 'unsealed';
          break;
      }
      ventilation = {
        dwelling_construction,
        suspended_wooden_floor,
        percentage_draught_proofed:
          infiltrationInput.estimateFrom.draughtProofedProportion * 100,
        draught_lobby: infiltrationInput.estimateFrom.draughtLobby,
      };
      num_of_floors_override =
        infiltrationInput.estimateFrom.numberOfFloorsOverride ?? undefined;
      break;
    }
  }
  ventilation['IVF'] = infiltrationInput.intentionalVentsFlues.map(
    ({ ventilationRate }) => ({ ventilation_rate: ventilationRate }),
  );
  ventilation['number_of_sides_sheltered'] = commonInput.numberOfSidesSheltered;
  return {
    ventilation,
    num_of_floors_override,
    volume: dependencies.floors.totalVolume,
    num_of_floors: dependencies.floors.numberOfFloors,
    region: dependencies.region.index0,
    fabric: {
      total_external_area:
        dependencies.fabric.envelopeArea * (1 - extras.partyWallAreaProportionOfEnvelope),
      total_party_wall_area:
        dependencies.fabric.envelopeArea * extras.partyWallAreaProportionOfEnvelope,
    },
    losses_WK: {},
  };
}
