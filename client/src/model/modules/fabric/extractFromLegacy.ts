import * as z from 'zod';
import { findWithRest } from '../../../helpers/findWithRest';
import { partition } from '../../../helpers/partition';
import { Orientation } from '../../enums/orientation';
import { Overshading } from '../../enums/overshading';
import { ModelError } from '../../error';
import {
    MainElementSpec,
    DeductibleSpec,
    FabricInput,
    FloorSpec,
    WallLikeSpec,
} from '../fabric';

type AnnotatedDeductibleSpec = DeductibleSpec & {
    subtractFrom: MainElementSpec['id'] | null;
};
type FlatElementSpec = WallLikeSpec<never> | FloorSpec | AnnotatedDeductibleSpec;

const isDeductibleSpec = (
    element: FlatElementSpec,
): element is AnnotatedDeductibleSpec => {
    return ['door', 'hatch', 'roof light', 'window'].includes(element.type);
};

const stringyIntegerSchema = z.union([
    z.number(),
    z
        .string()
        .transform((s) => (s === '' ? null : parseInt(s)))
        .refine((n) => n === null || Number.isSafeInteger(n)),
]);
const stringyFloatSchema = z.union([
    z.number(),
    z
        .string()
        .transform((s) => (s === '' ? null : parseFloat(s)))
        .refine((n) => n === null || Number.isFinite(n)),
]);
const subtractFromSchema = z.union([
    z.number(),
    z.literal('no').transform(() => null),
    z.literal(undefined).transform(() => null),
    z.string().transform((s) => parseInt(s)),
]);
const commonElementSchema = z.object({
    id: z.number(),
    uvalue: z.number(),
    kvalue: stringyFloatSchema,
    area: z.number(),
});
const legacyWallLikeSchema = commonElementSchema.extend({
    type: z.union([
        z.literal('Wall').transform(() => 'external wall' as const),
        z.literal('Party_wall').transform(() => 'party wall' as const),
        z.literal('Loft').transform(() => 'loft' as const),
        z.literal('Roof').transform(() => 'roof' as const),
    ]),
    l: stringyFloatSchema,
    h: stringyFloatSchema,
});
const legacyWindowLikeSchema = commonElementSchema.extend({
    type: z.union([
        z.literal('Door').transform(() => 'door' as const),
        z.literal('Roof_light').transform(() => 'roof light' as const),
        z.literal('window').transform(() => 'window' as const),
        z.literal('Window').transform(() => 'window' as const),
    ]),
    subtractfrom: subtractFromSchema,
    g: stringyFloatSchema,
    gL: stringyFloatSchema,
    ff: stringyFloatSchema,
    l: stringyFloatSchema,
    h: stringyFloatSchema,
    orientation: stringyIntegerSchema,
    overshading: stringyIntegerSchema,
});
const legacyHatchSchema = commonElementSchema.extend({
    type: z.literal('Hatch').transform(() => 'hatch' as const),
    subtractfrom: subtractFromSchema,
    l: stringyFloatSchema,
    h: stringyFloatSchema,
});
const legacyFloorSchema = commonElementSchema.extend({
    type: z.literal('Floor').transform(() => 'floor' as const),
});

const legacyInputSchema = z.object({
    fabric: z
        .object({
            elements: z
                .array(
                    z.union([
                        legacyWallLikeSchema,
                        legacyWindowLikeSchema,
                        legacyHatchSchema,
                        legacyFloorSchema,
                    ]),
                )
                .optional(),
            thermal_bridging_yvalue: stringyFloatSchema,
            global_TMP: z
                .union([
                    z.boolean(),
                    z.literal(1).transform(() => true),
                    z.literal(0).transform(() => false),
                ])
                .optional(),
            global_TMP_value: z.number().optional(),
        })
        .optional(),
});

export const extractFabricInputFromLegacy = (
    data: Record<string, unknown>,
): FabricInput => {
    const { fabric } = legacyInputSchema.parse(data);
    let thermalMassParameterOverride: number | null = null;
    if (fabric?.global_TMP === true) {
        if (typeof fabric.global_TMP_value !== 'number') {
            throw new ModelError(
                'data.fabric.global_TMP was specified but data.fabric.global_TMP_value was not a number',
                { fabric },
            );
        }
        thermalMassParameterOverride = fabric.global_TMP_value;
    }
    const elementSpecs = (fabric?.elements ?? []).map((element): FlatElementSpec => {
        switch (element.type) {
            case 'door':
            case 'roof light':
            case 'window': {
                let area: number;
                if (
                    element.l !== null &&
                    element.l !== 0 &&
                    element.h !== null &&
                    element.h !== 0
                ) {
                    area = element.l * element.h;
                } else {
                    area = element.area;
                }
                return {
                    type: element.type,
                    id: element.id,
                    uValue: element.uvalue,
                    kValue: element.kvalue ?? 0,
                    subtractFrom: element.subtractfrom,
                    gHeat: element.g ?? 0,
                    gLight: element.gL ?? 0,
                    frameFactor: element.ff ?? 0,
                    area,
                    overshading: Overshading.fromIndex0(element.overshading ?? 0),
                    orientation: Orientation.fromIndex0(element.orientation ?? 0),
                };
            }
            case 'hatch': {
                return {
                    type: element.type,
                    id: element.id,
                    uValue: element.uvalue,
                    kValue: element.kvalue ?? 0,
                    subtractFrom: element.subtractfrom,
                    area: (element.l ?? 0) * (element.h ?? 0),
                };
            }
            case 'external wall':
            case 'party wall':
            case 'roof':
            case 'loft': {
                let grossArea: number;
                if (
                    element.l !== null &&
                    element.l !== 0 &&
                    element.h !== null &&
                    element.h !== 0
                ) {
                    grossArea = element.l * element.h;
                } else {
                    grossArea = element.area;
                }
                return {
                    type: element.type,
                    id: element.id,
                    uValue: element.uvalue,
                    kValue: element.kvalue ?? 0,
                    grossArea,
                    deductions: [],
                };
            }
            case 'floor': {
                return {
                    type: element.type,
                    id: element.id,
                    uValue: element.uvalue,
                    kValue: element.kvalue ?? 0,
                    dimensions: {
                        area: element.area,
                    },
                };
            }
        }
    });
    const [deductibeElements, parentElements] = partition<
        FlatElementSpec,
        AnnotatedDeductibleSpec
    >(elementSpecs, isDeductibleSpec);
    const initialElements: FabricInput['elements'] = {
        main: parentElements,
        floatingDeductibles: [],
    };
    const stitchedUpElements = deductibeElements.reduce((elements, deductible) => {
        const [parent, otherMainElements] = findWithRest(
            elements.main,
            (e) => e.id === deductible.subtractFrom,
        );
        if (parent?.type === 'floor') {
            throw new ModelError(
                'Attempted to deduct a deductible element from a floor',
                { parent, deductible },
            );
        }
        if (parent === null) {
            return {
                ...elements,
                floatingDeductibles: [...elements.floatingDeductibles, deductible],
            };
        }
        return {
            ...elements,
            main: [
                ...otherMainElements,
                {
                    ...parent,
                    deductions: [...parent.deductions, deductible],
                },
            ],
        };
    }, initialElements);
    return {
        elements: stitchedUpElements,
        overrides: {
            yValue: fabric?.thermal_bridging_yvalue ?? null,
            thermalMassParameter: thermalMassParameterOverride,
        },
    };
};
