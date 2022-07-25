import fc from 'fast-check';

import {
    CommonInput,
    CustomFloorInput,
    ExposedFloorInput,
    FloorLayerInput,
    FloorUValueModelInput,
    HeatedBasementFloorInput,
    InsulationInput,
    PerFloorTypeInput,
    SolidFloorInput,
    SuspendedFloorInput,
} from '../../../../../src/v2/model/modules/fabric/floor-u-value-calculator/input-types';
import { fcNonEmptyArray, merge } from '../../../../helpers/arbitraries';
import { arbFloorInsulationMaterialItem } from '../libraries/floor-insulation-material';
import { arbProportion } from '../proportion';
import { sensibleFloat } from '../values';

export function arbCustomFloorInput(): fc.Arbitrary<CustomFloorInput> {
    return fc.record({
        floorType: fc.constant('custom' as const),
        uValue: sensibleFloat,
    });
}

export function arbInsulationInput(): fc.Arbitrary<InsulationInput> {
    return fc.record({
        thickness: sensibleFloat,
        material: arbFloorInsulationMaterialItem(),
    });
}

export function arbSolidFloorInput(): fc.Arbitrary<SolidFloorInput> {
    return fc.record({
        floorType: fc.constant('solid' as const),
        allOverInsulation: fc.option(arbInsulationInput()),
        edgeInsulation: fc.oneof(
            fc.record({ type: fc.constant('none' as const) }),
            merge(
                fc.record({
                    type: fc.constant('vertical' as const),
                    depth: sensibleFloat,
                }),
                arbInsulationInput(),
            ),
            merge(
                fc.record({
                    type: fc.constant('horizontal' as const),
                    width: sensibleFloat,
                }),
                arbInsulationInput(),
            ),
        ),
    });
}

function arbFloorLayerInput(): fc.Arbitrary<FloorLayerInput> {
    return fc.record({
        thickness: sensibleFloat,
        mainMaterial: arbFloorInsulationMaterialItem(),
        bridging: fc.option(
            fc.record({
                material: arbFloorInsulationMaterialItem(),
                proportion: arbProportion(),
            }),
        ),
    });
}

export function arbSuspendedFloorInput(): fc.Arbitrary<SuspendedFloorInput> {
    return fc.record({
        floorType: fc.constant('suspended' as const),
        ventilationCombinedArea: sensibleFloat,
        underFloorSpacePerimeter: sensibleFloat,
        insulationLayers: fc.option(fcNonEmptyArray(arbFloorLayerInput())),
    });
}

export function arbHeatedBasementFloorInput(): fc.Arbitrary<HeatedBasementFloorInput> {
    return fc.record({
        floorType: fc.constant('heated basement' as const),
        basementDepth: sensibleFloat,
        insulation: fc.option(arbInsulationInput()),
    });
}

export function arbExposedFloorInput(): fc.Arbitrary<ExposedFloorInput> {
    return fc.record({
        floorType: fc.constant('exposed' as const),
        exposedTo: fc.constantFrom('outside air', 'unheated space'),
        insulationLayers: fc.option(fcNonEmptyArray(arbFloorLayerInput())),
    });
}

export function arbCommonInput(): fc.Arbitrary<CommonInput> {
    return fc.record({
        area: sensibleFloat,
        exposedPerimeter: sensibleFloat,
    });
}

export function arbPerFloorTypeInput(): fc.Arbitrary<PerFloorTypeInput> {
    return fc.oneof(
        arbCustomFloorInput(),
        arbSolidFloorInput(),
        arbSuspendedFloorInput(),
        arbHeatedBasementFloorInput(),
        arbExposedFloorInput(),
    );
}

export function arbFloorUValueModelInput(): fc.Arbitrary<FloorUValueModelInput> {
    return fc.record({
        common: arbCommonInput(),
        perFloorType: arbPerFloorTypeInput(),
    });
}
