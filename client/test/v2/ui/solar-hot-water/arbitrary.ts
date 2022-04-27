import fc from 'fast-check';

import { Orientation } from '../../../../src/v2/model/enums/orientation';
import { Overshading } from '../../../../src/v2/model/enums/overshading';
import { SolarHotWaterState } from '../../../../src/v2/ui/modules/solar-hot-water';
import { noOutput } from '../../../../src/v2/ui/output-components/numeric';
import { arbFloat, fcEnum } from '../../../helpers/arbitraries';
import { recordWith } from '../../../helpers/arbitraries';

export function arbitraryState(): fc.Arbitrary<SolarHotWaterState> {
    const outputs: fc.Arbitrary<SolarHotWaterState['outputs']> = fc.oneof(
        fc.constant(null),
        fc.record({
            ...recordWith(fc.constant(noOutput), {
                aStar: arbFloat(),
                collectorPerformanceRatio: arbFloat(),
                annualSolarRadiation: arbFloat(),
                availableSolarEnergy: arbFloat(),
            }),
            utilisation: fc.record(
                recordWith(fc.constant(noOutput), {
                    load: arbFloat(),
                    solarToLoadRatio: arbFloat(),
                    utilisationFactor: arbFloat(),
                    collectorPerformanceFactor: arbFloat(),
                    effectiveSolarVolume: arbFloat(),
                    dailyHotWaterDemand: arbFloat(),
                    volumeRatio: arbFloat(),
                    solarStorageVolumeFactor: arbFloat(),
                    annualSolarInput: arbFloat(),
                }),
            ),
        }),
    );
    const inputs: fc.Arbitrary<SolarHotWaterState['inputs']> = fc.record({
        moduleEnabled: fc.boolean(),
        pumpType: fcEnum('PV' as const, 'electric' as const),
        collector: fc.record({
            ...recordWith(fc.constant(null), {
                apertureArea: arbFloat(),
                apertureAreaType: fcEnum('exact' as const, 'gross' as const),
                parameterSource: fcEnum('test certificate' as const, 'estimate' as const),
                orientation: fcEnum(...Orientation.names),
                inclination: arbFloat(),
                overshading: fcEnum(...Overshading.names),
            }),
            testCertificate: fc.record(
                recordWith(fc.constant(null), {
                    zeroLossEfficiency: arbFloat(),
                    linearHeatLossCoefficient: arbFloat(),
                    secondOrderHeatLossCoefficient: arbFloat(),
                }),
            ),
            estimate: fc.record(
                recordWith(fc.constant(null), {
                    collectorType: fcEnum(
                        'evacuated tube' as const,
                        'flat plate, glazed' as const,
                        'unglazed' as const,
                    ),
                    apertureAreaType: fcEnum('exact' as const, 'gross' as const),
                }),
            ),
        }),
        dedicatedSolarStorageVolume: arbFloat(),
        combinedCylinderVolume: arbFloat(),
    });

    return fc.record({
        outputs,
        inputs,
        doneFirstRun: fc.boolean(),
    });
}
