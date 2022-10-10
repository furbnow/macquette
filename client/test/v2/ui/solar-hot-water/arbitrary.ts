import fc from 'fast-check';

import { Orientation } from '../../../../src/v2/model/enums/orientation';
import { Overshading } from '../../../../src/v2/model/enums/overshading';
import { LoadedState } from '../../../../src/v2/ui/modules/solar-hot-water';
import { arbFloat, merge } from '../../../helpers/arbitraries';
import { recordWith } from '../../../helpers/arbitraries';
import { sensibleFloat } from '../../model/arbitraries/values';

export function arbModelInput(): fc.Arbitrary<
    Pick<LoadedState, 'pumpType' | 'moduleEnabled' | 'modelInput'>
> {
    return fc.record({
        moduleEnabled: fc.boolean(),
        pumpType: fc.constantFrom('PV' as const, 'electric' as const),
        modelInput: fc.record({
            collector: fc.record({
                ...recordWith(fc.constant(null), {
                    apertureArea: sensibleFloat,
                    apertureAreaType: fc.constantFrom('exact' as const, 'gross' as const),
                    parameterSource: fc.constantFrom(
                        'test certificate' as const,
                        'estimate' as const,
                    ),
                    orientation: fc.constantFrom(...Orientation.names),
                    inclination: sensibleFloat,
                    overshading: fc.constantFrom(...Overshading.names),
                }),
                testCertificate: fc.record(
                    recordWith(fc.constant(null), {
                        zeroLossEfficiency: sensibleFloat,
                        linearHeatLossCoefficient: sensibleFloat,
                        secondOrderHeatLossCoefficient: sensibleFloat,
                    }),
                ),
                estimate: fc.record(
                    recordWith(fc.constant(null), {
                        collectorType: fc.constantFrom(
                            'evacuated tube' as const,
                            'flat plate, glazed' as const,
                            'unglazed' as const,
                        ),
                        apertureAreaType: fc.constantFrom(
                            'exact' as const,
                            'gross' as const,
                        ),
                    }),
                ),
            }),
            dedicatedSolarStorageVolume: arbFloat({ noNaN: true }),
            combinedCylinderVolume: arbFloat({ noNaN: true }),
        }),
    });
}

export function arbitraryState(): fc.Arbitrary<LoadedState | 'loading'> {
    const modelOutput: fc.Arbitrary<LoadedState['modelOutput']> = fc.oneof(
        fc.constant(null),
        fc.record({
            aStar: arbFloat(),
            collectorPerformanceRatio: arbFloat(),
            annualSolarRadiation: arbFloat(),
            availableSolarEnergy: arbFloat(),
            utilisation: fc.record({
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
