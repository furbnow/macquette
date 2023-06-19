import { z } from 'zod';
import { solarHotWaterOvershadingFactorReverse } from '../../../model/datasets';
import { Orientation } from '../../../model/enums/orientation';
import { Overshading } from '../../../model/enums/overshading';
import { zodNullableObject } from '../../helpers/nullable-object';
import { coalesceEmptyString } from '../../scenario/value-schemas';
import { SolarHotWaterLegacy } from './legacy';

export const shwV1 = z.object({
    version: z.literal(1),
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

export type SolarHotWaterV1 = z.infer<typeof shwV1>;

export function migrateLegacyToV1(legacy: SolarHotWaterLegacy): SolarHotWaterV1 {
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
        overshadingInput === undefined || overshadingInput === ''
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
                inclination: coalesceEmptyString(inclination, null) ?? null,
                overshading: overshading,
            },
            combinedCylinderVolume:
                coalesceEmptyString(combined_cylinder_volume, null) ?? null,
            dedicatedSolarStorageVolume: coalesceEmptyString(Vs, null) ?? null,
        },
    };
}
