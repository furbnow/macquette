import assert from 'assert';
import fc from 'fast-check';

import {
    constructSolarHotWater,
    SolarHotWaterDependencies,
    SolarHotWaterInput,
} from '../../../src/v2/model/modules/solar-hot-water';
import { arbFloat, fcEnum } from '../../helpers/arbitraries';
import {
    arbitraryOrientation,
    arbitraryOvershading,
    arbitraryRegion,
} from '../../helpers/arbitrary-enums';

function arbitraryInput() {
    type CompleteEnabledInput = Exclude<
        SolarHotWaterInput,
        'module disabled' | 'incomplete input'
    >;
    const collectorParameters: fc.Arbitrary<
        CompleteEnabledInput['collector']['parameters']
    > = fc.oneof(
        fc.record({
            source: fc.constant('test certificate' as const),
            zeroLossEfficiency: arbFloat(),
            linearHeatLossCoefficient: arbFloat(),
            secondOrderHeatLossCoefficient: arbFloat(),
        }),
        fc.record({
            source: fc.constant('estimate' as const),
            apertureAreaType: fcEnum('exact' as const, 'gross' as const),
            collectorType: fc.oneof(
                ...(['evacuated tube', 'flat plate, glazed', 'unglazed'] as const).map(
                    (v) => fc.constant(v),
                ),
            ),
        }),
    );
    const completeEnabledInput: fc.Arbitrary<CompleteEnabledInput> = fc.record({
        collector: fc.record({
            apertureArea: arbFloat(),
            parameters: collectorParameters,
            orientation: arbitraryOrientation,
            inclination: arbFloat(),
            overshading: arbitraryOvershading,
        }),
        dedicatedSolarStorageVolume: arbFloat(),
        combinedCylinderVolume: arbFloat(),
    });
    return fc.oneof(
        fc.constant('module disabled' as const),
        fc.constant('incomplete input' as const),
        completeEnabledInput,
    );
}

function arbitraryDependencies(): fc.Arbitrary<SolarHotWaterDependencies> {
    return fc.record({
        region: arbitraryRegion,
        waterCommon: fc.record({
            dailyHotWaterUsageMeanAnnual: arbFloat(),
            hotWaterEnergyContentByMonth: fc.func(arbFloat()),
            hotWaterEnergyContentAnnual: arbFloat(),
        }),
    });
}

describe('solar hot water module', () => {
    test('the result of an estimate is equal to the result of the same input but with the values from the table', () => {
        fc.assert(
            fc.property(
                arbitraryInput().filter(
                    (input) =>
                        typeof input === 'object' &&
                        input.collector.parameters.source === 'estimate' &&
                        input.collector.parameters.apertureAreaType === 'gross',
                ),
                arbitraryDependencies(),
                (input, dependencies) => {
                    assert(typeof input === 'object');
                    assert(input.collector.parameters.source === 'estimate');
                    const { apertureArea } = input.collector;
                    let desiredAStar: number;
                    let desiredZeroLossEfficiency: number;
                    let desiredExactApertureArea: number;
                    switch (input.collector.parameters.collectorType) {
                        case 'evacuated tube': {
                            desiredAStar = 3;
                            desiredZeroLossEfficiency = 0.6;
                            desiredExactApertureArea = 0.72 * apertureArea;
                            break;
                        }
                        case 'flat plate, glazed': {
                            desiredAStar = 6;
                            desiredZeroLossEfficiency = 0.75;
                            desiredExactApertureArea = 0.9 * apertureArea;
                            break;
                        }
                        case 'unglazed': {
                            desiredAStar = 20;
                            desiredZeroLossEfficiency = 0.9;
                            desiredExactApertureArea = apertureArea;
                            break;
                        }
                    }
                    const fakeLinearCoefficient = desiredAStar / 0.892;
                    const supposedlyEquivalentInput: typeof input = {
                        ...input,
                        collector: {
                            ...input.collector,
                            apertureArea: desiredExactApertureArea,
                            parameters: {
                                source: 'test certificate',
                                linearHeatLossCoefficient: fakeLinearCoefficient,
                                secondOrderHeatLossCoefficient: 0,
                                zeroLossEfficiency: desiredZeroLossEfficiency,
                            },
                        },
                    };
                    const estimateModel = constructSolarHotWater(input, dependencies);
                    const equivalentExactModel = constructSolarHotWater(
                        supposedlyEquivalentInput,
                        dependencies,
                    );
                    expect(equivalentExactModel.solarInputAnnual).toBe(
                        estimateModel.solarInputAnnual,
                    );
                },
            ),
        );
    });
});
