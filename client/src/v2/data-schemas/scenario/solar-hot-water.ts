import { z } from 'zod';

import { isIndexable } from '../../helpers/is-indexable';
import { solarHotWaterOvershadingFactorReverse } from '../../model/datasets';
import { Orientation } from '../../model/enums/orientation';
import { Overshading } from '../../model/enums/overshading';
import { zodNullableObject } from '../helpers/nullable-object';
import { zodPredicateUnion } from '../helpers/zod-predicate-union';
import { coalesceEmptyString, numberWithNaN, stringyFloatSchema } from './value-schemas';

const outputsLegacy = z
    .object({
        a: numberWithNaN,
        collector_performance_ratio: numberWithNaN,
        annual_solar: numberWithNaN,
        solar_energy_available: numberWithNaN,
        solar_load_ratio: numberWithNaN,
        utilisation_factor: z.number(),
        collector_performance_factor: numberWithNaN,
        Veff: numberWithNaN,
        volume_ratio: numberWithNaN,
        f2: numberWithNaN,
        Qs: z.number().nullable(),
    })
    .partial();

const shwLegacy = outputsLegacy.merge(
    z
        .object({
            pump: z.enum(['PV', 'electric']),
            A: z.number(),
            n0: z.number(), // η != n 😠
            a1: stringyFloatSchema,
            a2: stringyFloatSchema,
            orientation: z.number().int().gte(0).lt(Orientation.names.length),
            inclination: z.number(),
            overshading: z.number(),
            Vs: z.number(),
            combined_cylinder_volume: z.number(),
        })
        .partial(),
);

const v1Inputs = z.object({
    // `pump` should go under the input object, but legacy parts of the model require it to be at the top level
    pump: z.enum(['PV', 'electric']).optional(),
    input: zodNullableObject({
        collector: zodNullableObject({
            parameterSource: z.enum(['test certificate', 'estimate']),
            apertureArea: z.number(),
            testCertificate: zodNullableObject({
                zeroLossEfficiency: z.number(),
                linearHeatLossCoefficient: z.number(),
                secondOrderHeatLossCoefficient: z.number(),
            }),
            estimate: zodNullableObject({
                collectorType: z.enum([
                    'evacuated tube',
                    'flat plate, glazed',
                    'unglazed',
                ]),
                apertureAreaType: z.enum(['gross', 'exact']),
            }),
            orientation: z.enum(Orientation.names),
            inclination: z.number(),
            overshading: z.enum(Overshading.names),
        }),
        dedicatedSolarStorageVolume: z.number(),
        combinedCylinderVolume: z.number(),
    }),
});

const shwV1 = outputsLegacy.merge(v1Inputs).extend({ version: z.literal(1) });
export type SolarHotWaterV1 = z.infer<typeof shwV1>;

function migrateLegacyToV1(legacy: z.infer<typeof shwLegacy>): z.infer<typeof shwV1> {
    const {
        pump,
        a1,
        a2,
        n0,
        orientation: orientationInput,
        overshading: overshadingInput,
        inclination,
        A,
        combined_cylinder_volume,
        Vs,
        ...outputs
    } = legacy;
    const overshading =
        overshadingInput === undefined
            ? null
            : solarHotWaterOvershadingFactorReverse(overshadingInput)?.name ?? null;
    const orientation =
        orientationInput === undefined
            ? null
            : Orientation.optionalFromIndex0(orientationInput)?.name ?? null;

    const apertureArea = A ?? null;
    const zeroLossEfficiency = n0 ?? null;
    const linearHeatLossCoefficient = coalesceEmptyString(a1, 0) ?? null;
    const secondOrderHeatLossCoefficient = coalesceEmptyString(a2, 0) ?? null;
    const testCertificateIsDefined =
        apertureArea !== undefined &&
        zeroLossEfficiency !== undefined &&
        linearHeatLossCoefficient !== undefined &&
        secondOrderHeatLossCoefficient !== undefined;

    return {
        version: 1,
        ...outputs,
        pump,
        input: {
            collector: {
                parameterSource: testCertificateIsDefined ? 'test certificate' : null,
                apertureArea,
                testCertificate: {
                    zeroLossEfficiency,
                    linearHeatLossCoefficient,
                    secondOrderHeatLossCoefficient,
                },
                estimate: {
                    collectorType: null,
                    apertureAreaType: null,
                },
                orientation: orientation,
                inclination: inclination ?? null,
                overshading: overshading,
            },
            combinedCylinderVolume: combined_cylinder_volume ?? null,
            dedicatedSolarStorageVolume: Vs ?? null,
        },
    };
}

export const solarHotWaterSchema = zodPredicateUnion([
    {
        name: 'v1',
        predicate: (val) => isIndexable(val) && val['version'] === 1,
        schema: shwV1,
    },
    {
        name: 'legacy',
        predicate: (val) => isIndexable(val) && !('version' in val),
        schema: shwLegacy.transform(migrateLegacyToV1),
    },
]);
