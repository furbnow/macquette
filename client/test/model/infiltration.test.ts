import fc from 'fast-check';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import { Month } from '../../src/model/enums/month';
import { VentilationInfiltrationCommon } from '../../src/model/modules/ventilation-infiltration/common-input';
import {
  Infiltration,
  extractInfiltrationInputFromLegacy,
} from '../../src/model/modules/ventilation-infiltration/infiltration';
import { legacyVentilation } from './golden-master/ventilation';
import {
  arbCommonInput,
  arbDependencies,
  arbInfiltrationInput,
  makeLegacyDataForInfiltration,
} from './ventilation-infiltration-arbitraries';

const arbExtras = fc.record({
  partyWallAreaProportionOfEnvelope: fc.float({
    min: 0,
    max: 1,
    noNaN: true,
  }),
});

describe('infiltration', () => {
  test('golden master', () => {
    fc.assert(
      fc.property(
        arbCommonInput,
        arbInfiltrationInput,
        arbDependencies,
        arbExtras,
        (commonInput, infiltrationInput, dependencies, extras) => {
          const common = new VentilationInfiltrationCommon(commonInput, dependencies);
          const infiltration = new Infiltration(infiltrationInput, {
            ...dependencies,
            ventilationInfiltrationCommon: common,
          });
          const legacyData: any = makeLegacyDataForInfiltration(
            commonInput,
            infiltrationInput,
            dependencies,
            extras,
          );
          legacyVentilation(legacyData);
          expect(infiltration.heatLossAverage).toBeApproximately(
            legacyData.ventilation.average_infiltration_WK,
          );
          for (const month of Month.all) {
            expect(infiltration.heatLossMonthly(month)).toBeApproximately(
              legacyData.ventilation.infiltration_WK[month.index0],
            );
            expect(infiltration.airChangesPerHour(month)).toBeApproximately(
              legacyData.ventilation.adjusted_infiltration[month.index0],
            );
          }
        },
      ),
    );
  });
  test('extractor', () => {
    fc.assert(
      fc.property(
        arbCommonInput,
        arbInfiltrationInput,
        arbDependencies,
        arbExtras,
        (commonInput, infiltrationInput, dependencies, extras) => {
          const roundTripped = extractInfiltrationInputFromLegacy(
            scenarioSchema.parse(
              makeLegacyDataForInfiltration(
                commonInput,
                infiltrationInput,
                dependencies,
                extras,
              ),
            ),
          );
          expect(roundTripped).toEqual(infiltrationInput);
        },
      ),
    );
  });
});
