import {
    latitudeRadians,
    meanGlobalSolarIrradianceHorizontal,
    monthlyHotWaterTemperatureRise,
    monthlyHotWaterUseFactor,
    solarAccessFactor,
    solarDeclinationRadians,
    solarFluxK,
} from '../../../src/v2/model/datasets';
import { Month } from '../../../src/v2/model/enums/month';
import { Orientation } from '../../../src/v2/model/enums/orientation';
import { Overshading } from '../../../src/v2/model/enums/overshading';
import { Region } from '../../../src/v2/model/enums/region';

describe('datasets shims', () => {
    describe('solarFluxK', () => {
        it('gets an expected value', () => {
            expect(solarFluxK(1, new Orientation('North'))).toBe(26.3);
        });
    });
    describe('latitudeRadians', () => {
        it('gets an expected value', () => {
            expect(latitudeRadians(new Region('UK average'))).toBeApproximately(
                0.9337511,
            );
        });
    });
    describe('solarDeclinationRadians', () => {
        it('gets an expected value', () => {
            expect(solarDeclinationRadians(new Month('January'))).toBeApproximately(
                -0.3612832,
            );
        });
    });
    describe('meanGlobalSolarIrradianceHorizontal', () => {
        it('gets an expected value', () => {
            expect(
                meanGlobalSolarIrradianceHorizontal(
                    new Region('UK average'),
                    new Month('January'),
                ),
            ).toBe(26);
        });
    });
    describe('solarAccessFactor', () => {
        it('gets an expected value', () => {
            expect(solarAccessFactor(new Overshading('>80%'), 'winter')).toBe(0.3);
        });
    });

    describe('monthlyHotWaterUsefactor', () => {
        it('gets an expected value', () => {
            expect(monthlyHotWaterUseFactor(new Month('December'))).toBe(1.1);
        });
    });

    describe('monthlyHotWaterTemperatureRise', () => {
        it('gets an expected value', () => {
            expect(monthlyHotWaterTemperatureRise(new Month('December'))).toBe(39.9);
        });
    });
});
