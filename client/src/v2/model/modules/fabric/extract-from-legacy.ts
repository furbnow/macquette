import { Scenario } from '../../../data-schemas/scenario';
import { coalesceEmptyString } from '../../../data-schemas/scenario/value-schemas';
import { findWithRest } from '../../../helpers/find-with-rest';
import { partition } from '../../../helpers/partition';
import { Orientation } from '../../enums/orientation';
import { Overshading } from '../../enums/overshading';
import { ModelError } from '../../error';
import type { FabricInput } from '../fabric';
import {
    DeductibleSpec,
    FloorSpec,
    MainElementSpec,
    WallLikeSpec,
} from './element-types';

type AnnotatedDeductibleSpec = DeductibleSpec & {
    subtractFrom: MainElementSpec['id'] | null;
};
type FlatElementSpec = WallLikeSpec<never> | FloorSpec | AnnotatedDeductibleSpec;

function isDeductibleSpec(element: FlatElementSpec): element is AnnotatedDeductibleSpec {
    return ['door', 'hatch', 'roof light', 'window'].includes(element.type);
}

export function extractFabricInputFromLegacy({ fabric }: Scenario): FabricInput {
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
                    element.l !== '' &&
                    element.l !== 0 &&
                    element.h !== '' &&
                    element.h !== 0
                ) {
                    area = element.l * element.h;
                } else {
                    area = coalesceEmptyString(element.area, 0);
                }
                return {
                    type: element.type,
                    id: element.id,
                    uValue: coalesceEmptyString(element.uvalue, 0),
                    kValue: coalesceEmptyString(element.kvalue, 0),
                    subtractFrom: element.subtractfrom,
                    gHeat: coalesceEmptyString(element.g, 0),
                    gLight: coalesceEmptyString(element.gL, 0),
                    frameFactor: coalesceEmptyString(element.ff, 0),
                    area,
                    overshading: Overshading.fromIndex0(
                        coalesceEmptyString(element.overshading, 0),
                    ),
                    orientation: Orientation.fromIndex0(
                        coalesceEmptyString(element.orientation, 0),
                    ),
                };
            }
            case 'hatch': {
                let area: number;
                if (
                    element.l !== '' &&
                    element.l !== 0 &&
                    element.h !== '' &&
                    element.h !== 0
                ) {
                    area = element.l * element.h;
                } else {
                    area = coalesceEmptyString(element.area, 0);
                }
                return {
                    type: element.type,
                    id: element.id,
                    uValue: coalesceEmptyString(element.uvalue, 0),
                    kValue: coalesceEmptyString(element.kvalue, 0),
                    subtractFrom: element.subtractfrom,
                    area,
                };
            }
            case 'external wall':
            case 'party wall':
            case 'roof':
            case 'loft': {
                let grossArea: number;
                if (
                    element.l !== '' &&
                    element.l !== 0 &&
                    element.h !== '' &&
                    element.h !== 0
                ) {
                    grossArea = element.l * element.h;
                } else {
                    grossArea = coalesceEmptyString(element.area, 0);
                }
                return {
                    type: element.type,
                    id: element.id,
                    uValue: coalesceEmptyString(element.uvalue, 0),
                    kValue: coalesceEmptyString(element.kvalue, 0),
                    grossArea,
                    deductions: [],
                };
            }
            case 'floor': {
                return {
                    type: element.type,
                    id: element.id,
                    uValue: coalesceEmptyString(element.uvalue, 0),
                    kValue: coalesceEmptyString(element.kvalue, 0),
                    area: coalesceEmptyString(element.area, 0),
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
            yValue: coalesceEmptyString(fabric?.thermal_bridging_yvalue, null) ?? null,
            thermalMassParameter: thermalMassParameterOverride,
        },
    };
}
