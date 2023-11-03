import fc from 'fast-check';
import { merge } from 'lodash';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import { assertNever } from '../../src/helpers/assert-never';
import { Orientation } from '../../src/model/enums/orientation';
import { Overshading } from '../../src/model/enums/overshading';
import {
  Generation,
  GenerationDependencies,
  GenerationInput,
  extractGenerationInputFromLegacy,
  generationInput,
  overshadingFactor,
} from '../../src/model/modules/generation';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { arbitraryRegion } from '../helpers/arbitrary-enums';
import { makeArbitrary } from '../helpers/make-arbitrary';
import { legacyGeneration } from './golden-master/generation';

const arbGenerationInput = makeArbitrary(generationInput);
type TestDependencies = Omit<GenerationDependencies, 'modelBehaviourFlags'>;
const arbGenerationDependencies: fc.Arbitrary<TestDependencies> = fc.record({
  region: arbitraryRegion,
  fuels: fc.record({
    generation: fc.record({
      carbonEmissionsFactor: sensibleFloat,
      primaryEnergyFactor: sensibleFloat,
    }),
  }),
});

function makeLegacyDataForGeneration(
  input: GenerationInput,
  dependencies: TestDependencies,
) {
  const generation = {};
  merge(generation, {
    wind_annual_kwh: input.wind.annualEnergy,
    wind_fraction_used_onsite: input.wind.fractionUsedOnsite,
    wind_FIT: input.wind.feedInTariff.generationUnitPrice,
    wind_export_FIT: input.wind.feedInTariff.exportUnitPrice,
  });
  merge(generation, {
    hydro_annual_kwh: input.hydro.annualEnergy,
    hydro_fraction_used_onsite: input.hydro.fractionUsedOnsite,
    hydro_FIT: input.hydro.feedInTariff.generationUnitPrice,
    hydro_export_FIT: input.hydro.feedInTariff.exportUnitPrice,
  });
  merge(generation, {
    solar_fraction_used_onsite: input.solar.fractionUsedOnsite,
    solar_FIT: input.solar.feedInTariff.generationUnitPrice,
    solar_export_FIT: input.solar.feedInTariff.exportUnitPrice,
  });
  merge(generation, {
    use_PV_calculator: false,
    solarpv_kwp_installed: '',
    solarpv_orientation: '',
    solarpv_inclination: '',
    solarpv_overshading: '',
  });
  switch (input.solar.type) {
    case 'generic fuel': {
      merge(generation, {
        solar_annual_kwh: input.solar.annualEnergy,
      });
      break;
    }
    case 'solar calculator input': {
      merge(generation, {
        use_PV_calculator: true,
        solarpv_kwp_installed: input.solar.annualEnergy.capacity,
        solarpv_orientation: new Orientation(input.solar.annualEnergy.orientation).index0,
        solarpv_inclination: input.solar.annualEnergy.inclination,
        solarpv_overshading: overshadingFactor(
          new Overshading(input.solar.annualEnergy.overshading),
        ),
      });
      break;
    }
    default:
      assertNever(input.solar);
  }
  return {
    generation,
    region: dependencies.region.index0,
    fuels: {
      generation: {
        category: 'generation',
        co2factor: dependencies.fuels.generation.carbonEmissionsFactor,
        primaryenergyfactor: dependencies.fuels.generation.primaryEnergyFactor,
        standingcharge: '',
        fuelcost: '',
      },
    },
    total_income: 0,
  };
}
describe('generation', () => {
  test('golden master', () => {
    fc.assert(
      fc.property(
        arbGenerationInput,
        arbGenerationDependencies,
        (input, dependencies) => {
          const generation = new Generation(input, {
            ...dependencies,
            modelBehaviourFlags: {
              generation: { includeAllSystemsInPrimaryEnergyTotal: false },
            },
          });
          const legacyData: any = makeLegacyDataForGeneration(input, dependencies);
          legacyGeneration(legacyData);
          expect(generation.energyAnnual).toBeApproximately(
            legacyData.generation.total_generation,
          );
          expect(generation.incomeAnnual).toBeApproximately(legacyData.total_income ?? 0);
          expect(generation.energyUsedOnsiteAnnual).toBeApproximately(
            legacyData.generation.total_used_onsite,
          );
          expect(generation.carbonEmissionsAnnual).toBeApproximately(
            legacyData.generation.total_CO2,
          );
          expect(generation.primaryEnergyAnnual).toBeApproximately(
            legacyData.generation.total_primaryenergy,
          );
          expect(generation.energyExportedAnnual).toBeApproximately(
            legacyData.generation.total_exported,
          );
        },
      ),
    );
  });

  test('extractor', () => {
    fc.assert(
      fc.property(
        arbGenerationInput,
        arbGenerationDependencies,
        (input, dependencies) => {
          const roundTripped = extractGenerationInputFromLegacy(
            scenarioSchema.parse(makeLegacyDataForGeneration(input, dependencies)),
          );
          expect(roundTripped).toEqual(input);
        },
      ),
    );
  });
});
