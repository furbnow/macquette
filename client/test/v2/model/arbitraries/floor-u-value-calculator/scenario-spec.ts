import fc from 'fast-check';

import {
    FloorLayerSpec,
    InsulationSpec,
    PerFloorTypeSpec,
    SuspendedFloorSpec,
} from '../../../../../src/v2/data-schemas/scenario/fabric/floor-u-value';
import { Proportion } from '../../../../../src/v2/helpers/proportion';
import { fcNonEmptyArray, merge } from '../../../../helpers/arbitraries';
import { arbFloorInsulationMaterialItem } from '../libraries/floor-insulation-material';
import { sensibleFloat } from '../values';

export const arbFloorLayerSpec: fc.Arbitrary<FloorLayerSpec> = fc.record({
    thickness: fc.option(sensibleFloat),
    mainMaterial: fc.option(arbFloorInsulationMaterialItem()),
    bridging: fc.record({
        material: fc.option(arbFloorInsulationMaterialItem()),
        proportion: fc.option(
            fc
                .float({
                    min: 0,
                    max: 1,
                    noNaN: true,
                    noDefaultInfinity: true,
                    next: true,
                })
                .map((ratio) => Proportion.fromRatio(ratio).unwrap()),
        ),
    }),
});

const arbInsulationSpec: fc.Arbitrary<InsulationSpec> = fc.record({
    thickness: fc.option(sensibleFloat),
    material: fc.option(arbFloorInsulationMaterialItem()),
});

export const arbSuspendedFloorSpec: fc.Arbitrary<SuspendedFloorSpec> = fc.record({
    ventilationCombinedArea: fc.option(sensibleFloat),
    underFloorSpacePerimeter: fc.option(sensibleFloat),
    insulation: fc.record({
        enabled: fc.boolean(),
        layers: fcNonEmptyArray(arbFloorLayerSpec),
    }),
});

export const arbPerFloorTypeSpec: fc.Arbitrary<PerFloorTypeSpec> = fc.record({
    custom: fc.record({
        uValue: fc.option(sensibleFloat),
    }),
    solid: fc.record({
        allOverInsulation: merge(arbInsulationSpec, fc.record({ enabled: fc.boolean() })),
        edgeInsulation: fc.record({
            selected: fc.option(fc.constantFrom('horizontal', 'vertical')),
            vertical: merge(
                arbInsulationSpec,
                fc.record({ depth: fc.option(sensibleFloat) }),
            ),
            horizontal: merge(
                arbInsulationSpec,
                fc.record({ width: fc.option(sensibleFloat) }),
            ),
        }),
    }),
    suspended: arbSuspendedFloorSpec,
    'heated basement': fc.record({
        basementDepth: fc.option(sensibleFloat),
        insulation: merge(arbInsulationSpec, fc.record({ enabled: fc.boolean() })),
    }),
    exposed: fc.record({
        exposedTo: fc.option(fc.constantFrom('outside air', 'unheated space')),
        insulation: fc.record({
            enabled: fc.boolean(),
            layers: fcNonEmptyArray(arbFloorLayerSpec),
        }),
    }),
});

export const arbFloorType = fc.constantFrom(
    'custom' as const,
    'solid' as const,
    'suspended' as const,
    'heated basement' as const,
    'exposed' as const,
);

export const arbCommon = fc.record({
    area: sensibleFloat,
    exposedPerimeter: sensibleFloat,
});
