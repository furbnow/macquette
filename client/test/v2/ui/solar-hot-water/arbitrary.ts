import fc from 'fast-check';

import { Orientation } from '../../../../src/v2/model/enums/orientation';
import { Overshading } from '../../../../src/v2/model/enums/overshading';
import { LoadedState } from '../../../../src/v2/ui/modules/solar-hot-water';
import { noOutput } from '../../../../src/v2/ui/output-components/numeric';
import { arbFloat, fcEnum, merge } from '../../../helpers/arbitraries';
import { recordWith } from '../../../helpers/arbitraries';

export function arbModelInput(): fc.Arbitrary<
    Pick<LoadedState, 'pumpType' | 'moduleEnabled' | 'modelInput'>
> {
    return fc.record({
        moduleEnabled: fc.boolean(),
        pumpType: fcEnum('PV' as const, 'electric' as const),
        modelInput: fc.record({
            collector: fc.record({
                ...recordWith(fc.constant(null), {
                    apertureArea: arbFloat(),
                    apertureAreaType: fcEnum('exact' as const, 'gross' as const),
                    parameterSource: fcEnum(
                        'test certificate' as const,
                        'estimate' as const,
                    ),
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
        }),
    });
}

export function arbitraryState(): fc.Arbitrary<LoadedState | 'loading'> {
    const modelOutput: fc.Arbitrary<LoadedState['modelOutput']> = fc.oneof(
        fc.constant(null),
        fc.record({
            ...recordWith(fc.constant(noOutput), {
                aStar: arbFloat({ noNaN: true }),
                collectorPerformanceRatio: arbFloat({ noNaN: true }),
                annualSolarRadiation: arbFloat({ noNaN: true }),
                availableSolarEnergy: arbFloat({ noNaN: true }),
            }),
            utilisation: fc.record(
                recordWith(fc.constant(noOutput), {
                    load: arbFloat({ noNaN: true }),
                    solarToLoadRatio: arbFloat({ noNaN: true }),
                    utilisationFactor: arbFloat({ noNaN: true }),
                    collectorPerformanceFactor: arbFloat({ noNaN: true }),
                    effectiveSolarVolume: arbFloat({ noNaN: true }),
                    dailyHotWaterDemand: arbFloat({ noNaN: true }),
                    volumeRatio: arbFloat({ noNaN: true }),
                    solarStorageVolumeFactor: arbFloat({ noNaN: true }),
                    annualSolarInput: arbFloat({ noNaN: true }),
                }),
            ),
        }),
    );

    return fc.oneof(
        fc.constant('loading' as const),
        merge(
            fc.record({
                scenarioLocked: fc.boolean(),
                modelOutput,
            }),
            arbModelInput(),
        ),
    );
}
