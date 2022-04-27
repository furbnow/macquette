import fc from 'fast-check';
import { pick } from 'lodash';

import { SolarHotWaterV1 } from '../../../../src/v2/data-schemas/scenario/solar-hot-water';
import { solarHotWaterOvershadingFactor } from '../../../../src/v2/model/datasets';
import { Orientation } from '../../../../src/v2/model/enums/orientation';
import {
    arbFloat,
    fcEnum,
    FcInfer,
    fcPartialRecord,
    merge,
    recordWith,
} from '../../../helpers/arbitraries';
import {
    arbitraryOrientation,
    arbitraryOvershading,
} from '../../../helpers/arbitrary-enums';
import { flatten } from '../../../helpers/object-flattening';
import { sensibleFloat, stringySensibleFloat } from './values';

const legacyInputs = fcPartialRecord({
    pump: fc.oneof(fc.constant('PV'), fc.constant('electric')),
    A: sensibleFloat,
    n0: sensibleFloat,
    a1: stringySensibleFloat(),
    a2: stringySensibleFloat(),
    orientation: fc.integer({
        min: 0,
        max: Orientation.names.length - 1,
    }),
    inclination: sensibleFloat,
    overshading: arbitraryOvershading.map(solarHotWaterOvershadingFactor),
    Vs: sensibleFloat,
    combined_cylinder_volume: sensibleFloat,
});

const v1Inputs: fc.Arbitrary<SolarHotWaterV1> = merge(
    fcPartialRecord({
        pump: fcEnum('PV' as const, 'electric' as const),
    }),
    fc.record({
        version: fc.constant(1 as const),
        input: fc.record({
            ...recordWith(fc.constant(null), {
                dedicatedSolarStorageVolume: arbFloat(),
                combinedCylinderVolume: arbFloat(),
            }),
            collector: fc.record({
                ...recordWith(fc.constant(null), {
                    parameterSource: fcEnum(
                        'test certificate' as const,
                        'estimate' as const,
                    ),
                    apertureArea: arbFloat(),
                    orientation: arbitraryOrientation.map((or) => or.name),
                    inclination: arbFloat(),
                    overshading: arbitraryOvershading.map((ov) => ov.name),
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
                        apertureAreaType: fcEnum('gross' as const, 'exact' as const),
                    }),
                ),
            }),
        }),
    }),
);

export function shwIsLegacy(
    SHW: FcInfer<typeof shwInputs>,
): SHW is FcInfer<typeof legacyInputs> {
    return !('version' in SHW);
}

export const shwInputs = fc.oneof(v1Inputs, legacyInputs);

export function shwInputIsComplete(SHW: FcInfer<typeof shwInputs>): boolean {
    if (shwIsLegacy(SHW)) {
        const inputs = pick(SHW, ...shwLegacyInputKeys);
        const isComplete = shwLegacyInputKeys.reduce(
            (allInputsWerePresent, key) =>
                allInputsWerePresent && inputs[key] !== undefined,
            true,
        );
        return isComplete;
    } else {
        switch (SHW.version) {
            case 1: {
                const flattened = flatten(SHW);
                const isIncomplete = Array.from(flattened.values()).some(
                    (value) => value === null,
                );
                return !isIncomplete;
            }
        }
    }
}

export const shwLegacyInputKeys = [
    'pump',
    'A',
    'n0',
    'a1',
    'a2',
    'orientation',
    'inclination',
    'overshading',
    'Vs',
    'combined_cylinder_volume',
] as const;
