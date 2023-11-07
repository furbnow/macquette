import fc from 'fast-check';
import { MiscellaneousInternalGains } from '../../src/model/modules/internal-gains/miscellaneous';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { legacyMetabolicLossesFansAndPumpsGains } from './golden-master/metabolic-losses-fans-and-pumps-gains';

describe('miscellaneous internal gains', () => {
  test('golden master', () => {
    fc.assert(
      fc.property(sensibleFloat, (occupancy) => {
        const miscellaneousInternalGains = new MiscellaneousInternalGains(null, {
          occupancy: { occupancy },
        });
        const legacyData: any = {
          occupancy,
          gains_W: {},
          heating_systems: [],
          ventilation: {},
          space_heating: {
            // In legacy, this property is set to true on scenario initialisation and
            // never changed
            use_utilfactor_forgains: true,
          },
        };
        legacyMetabolicLossesFansAndPumpsGains(legacyData);
        expect(miscellaneousInternalGains.metabolicHeatGainPower).toBeApproximately(
          legacyData.gains_W.metabolic[0],
        );
        expect(miscellaneousInternalGains.miscellaneousHeatLossPower).toBeApproximately(
          -legacyData.gains_W.losses[0],
        );
      }),
    );
  });
});
