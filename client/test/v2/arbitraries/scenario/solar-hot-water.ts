import fc from 'fast-check';
import { pick } from 'lodash';
import { z } from 'zod';

import {
    solarHotWaterSchema,
    SolarHotWaterV1,
} from '../../../../src/v2/data-schemas/scenario/solar-hot-water';
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
import { sensibleFloat, stringySensibleFloat } from '../legacy-values';

const arbPump = fc.constantFrom(...(['PV', 'electric'] as const));
const legacyInputs = fcPartialRecord({
    pump: arbPump,
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
        pump: arbPump,
    }),
    fc.record({
        version: fc.constant(1 as const),
        input: fc.record({
            ...recordWith(fc.constant(null), {
                dedicatedSolarStorageVolume: arbFloat({ noNaN: true }),
                combinedCylinderVolume: arbFloat({ noNaN: true }),
            }),
            collector: fc.record({
                ...recordWith(fc.constant(null), {
                    parameterSource: fcEnum(
                        'test certificate' as const,
                        'estimate' as const,
                    ),
                    apertureArea: arbFloat({ noNaN: true }),
                    orientation: arbitraryOrientation.map((or) => or.name),
                    inclination: arbFloat({ noNaN: true }),
                    overshading: arbitraryOvershading.map((ov) => ov.name),
                }),
                testCertificate: fc.record(
                    recordWith(fc.constant(null), {
                        zeroLossEfficiency: arbFloat({ noNaN: true }),
                        linearHeatLossCoefficient: arbFloat({ noNaN: true }),
                        secondOrderHeatLossCoefficient: arbFloat({ noNaN: true }),
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

export const shwInputs: fc.Arbitrary<z.input<typeof solarHotWaterSchema>> = fc.oneof(
    v1Inputs,
    legacyInputs,
);

export function shwInputIsComplete(SHW: FcInfer<typeof shwInputs>): boolean {
    if (!('version' in SHW)) {
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
