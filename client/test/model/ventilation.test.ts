import fc from 'fast-check';
import { Month } from '../../src/model/enums/month';
import { VentilationInfiltrationCommon } from '../../src/model/modules/ventilation-infiltration/common-input';
import { Ventilation } from '../../src/model/modules/ventilation-infiltration/ventilation';
import { legacyVentilation } from './golden-master/ventilation';
import {
  arbCommonInput,
  arbDependencies,
  arbVentilationInput,
  makeLegacyDataForVentilation,
} from './ventilation-infiltration-arbitraries';

describe('ventilation', () => {
  test('golden master (legacy ventilation module)', () => {
    fc.assert(
      fc.property(
        arbCommonInput,
        arbVentilationInput,
        arbDependencies,
        fc.record({ mechanicalExtractVentilationIsDecentralised: fc.boolean() }),
        (commonInput, ventilationInput, dependencies, extras) => {
          const common = new VentilationInfiltrationCommon(commonInput, dependencies);
          const ventilation = new Ventilation(ventilationInput, {
            ...dependencies,
            ventilationInfiltrationCommon: common,
          });
          const legacyData: any = makeLegacyDataForVentilation(
            commonInput,
            ventilationInput,
            dependencies,
            extras,
          );
          legacyVentilation(legacyData);
          expect(ventilation.heatLossAverage).toBeApproximately(
            legacyData.ventilation.average_ventilation_WK,
          );
          for (const month of Month.all) {
            expect(ventilation.heatLossMonthly(month)).toBeApproximately(
              legacyData.losses_WK.ventilation[month.index0],
            );
            expect(ventilation.airChangesPerHour(month)).toBeApproximately(
              legacyData.ventilation.effective_air_change_rate[month.index0] -
                legacyData.ventilation.adjusted_infiltration[month.index0],
            );
          }
        },
      ),
    );
  });
});
