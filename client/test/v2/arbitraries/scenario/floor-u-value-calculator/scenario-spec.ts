import fc from 'fast-check';

import {
    FloorLayerSpec,
    InsulationSpec,
    PerFloorTypeSpec,
    SuspendedFloorSpec,
} from '../../../../../src/v2/data-schemas/scenario/fabric/floor-u-value';
import { Proportion } from '../../../../../src/v2/helpers/proportion';
import { FloorSpec } from '../../../../../src/v2/model/modules/fabric/element-types';
import { fcNonEmptyArray, merge } from '../../../../helpers/arbitraries';
import { sensibleFloat } from '../../legacy-values';
import { arbFloorInsulationMaterialItem } from '../libraries/floor-insulation-material';

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
    version: fc.constant(2),
    ventilationCombinedArea: fc.option(sensibleFloat),
    underFloorSpacePerimeter: fc.option(sensibleFloat),
    layers: fcNonEmptyArray(arbFloorLayerSpec),
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
    'solid (bs13370)': fc.record({
        edgeInsulation: fc.record({
            selected: fc.option(fc.constantFrom('horizontal', 'vertical')),
            vertical: merge(
                arbInsulationSpec,
                fc.record({
                    depth: fc.option(sensibleFloat),
                    thickness: fc.option(sensibleFloat),
                }),
            ),
            horizontal: merge(
                arbInsulationSpec,
                fc.record({
                    width: fc.option(sensibleFloat),
                    thickness: fc.option(sensibleFloat),
                }),
            ),
        }),
        layers: fcNonEmptyArray(arbFloorLayerSpec),
        groundConductivity: fc.record({
            groundType: fc.constantFrom(
                'clay or silt' as const,
                'sand or gravel' as const,
                'homogenous rock' as const,
                'unknown' as const,
                'custom' as const,
            ),
            customValue: fc.option(sensibleFloat),
        }),
        wallThickness: fc.option(sensibleFloat),
    }),
    suspended: arbSuspendedFloorSpec,
    'heated basement': fc.record({
        basementDepth: fc.option(sensibleFloat),
        insulation: merge(arbInsulationSpec, fc.record({ enabled: fc.boolean() })),
    }),
    exposed: fc.record({
        version: fc.constant(2),
        exposedTo: fc.option(fc.constantFrom('outside air', 'unheated space')),
        layers: fcNonEmptyArray(arbFloorLayerSpec),
    }),
});

export const arbFloorType = fc.constantFrom(
    'custom' as const,
    'solid' as const,
    'suspended' as const,
    'heated basement' as const,
    'exposed' as const,
    'solid (bs13370)' as const,
);

export const arbFloorSpec: fc.Arbitrary<FloorSpec> = fc.record({
    id: fc.integer(),
    kValue: sensibleFloat,
    type: fc.constant('floor'),
    area: sensibleFloat,
    exposedPerimeter: sensibleFloat,
    uValueLegacyField: sensibleFloat,
    selectedFloorType: fc.option(arbFloorType),
    perFloorTypeSpec: fc.option(arbPerFloorTypeSpec),
});
