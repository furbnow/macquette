import fc from 'fast-check';

import { FloorLayerInput } from '../../../../src/model/modules/fabric/floor-u-value-calculator/floor-layer-input';
import {
  CommonInput,
  CustomFloorInput,
  ExposedFloorInput,
  FloorUValueModelInput,
  HeatedBasementFloorInput,
  InsulationInput,
  PerFloorTypeInput,
  SolidFloorBS13370Input,
  SolidFloorTablesInput,
  SuspendedFloorInput,
} from '../../../../src/model/modules/fabric/floor-u-value-calculator/input-types';
import { fcNonEmptyArray, merge } from '../../../helpers/arbitraries';
import { sensibleFloat } from '../../legacy-values';
import {
  arbFloorInsulationConductivityMaterialItem,
  arbFloorInsulationMaterialItem,
  arbFloorInsulationResistanceMaterialItem,
} from '../libraries/floor-insulation-material';
import { arbProportion } from '../proportion';

export function arbCustomFloorInput(): fc.Arbitrary<CustomFloorInput> {
  return fc.record({
    floorType: fc.constant('custom' as const),
    uValue: sensibleFloat,
  });
}

export function arbInsulationInput(): fc.Arbitrary<InsulationInput> {
  return fc.oneof(
    fc.record({
      mechanism: fc.constant('conductivity' as const),
      thickness: sensibleFloat,
      material: arbFloorInsulationConductivityMaterialItem(),
    }),
    fc.record({
      mechanism: fc.constant('resistance' as const),
      material: arbFloorInsulationResistanceMaterialItem(),
    }),
  );
}

export function arbSolidFloorTablesInput(): fc.Arbitrary<SolidFloorTablesInput> {
  return fc.record({
    floorType: fc.constant('solid' as const),
    exposedPerimeter: sensibleFloat,
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

export function arbSolidFloorBs13370Input(): fc.Arbitrary<SolidFloorBS13370Input> {
  return fc.record({
    floorType: fc.constant('solid (bs13370)' as const),
    exposedPerimeter: sensibleFloat,
    wallThickness: sensibleFloat,
    layers: fcNonEmptyArray(arbFloorLayerInput()),
    groundConductivity: fc.oneof(
      fc.constant('clay or silt' as const),
      fc.constant('sand or gravel' as const),
      fc.constant('homogenous rock' as const),
      fc.constant('unknown' as const),
      sensibleFloat,
    ),
    edgeInsulation: fc.oneof(
      fc.record({ type: fc.constant('none' as const) }),
      merge(
        fc.record({
          type: fc.constant('vertical' as const),
          depth: sensibleFloat,
          thickness: sensibleFloat,
        }),
        arbInsulationInput(),
      ),
      merge(
        fc.record({
          type: fc.constant('horizontal' as const),
          width: sensibleFloat,
          thickness: sensibleFloat,
        }),
        arbInsulationInput(),
      ),
    ),
  });
}

export function arbFloorLayerInput(): fc.Arbitrary<FloorLayerInput> {
  return fc
    .record({
      mainMaterial: arbFloorInsulationMaterialItem(),
      bridging: fc.option(
        fc.record({
          material: arbFloorInsulationMaterialItem(),
          proportion: arbProportion(),
        }),
      ),
    })
    .chain(({ mainMaterial, bridging }) => {
      let thickness: fc.Arbitrary<number | null>;
      if (
        mainMaterial.mechanism === 'conductivity' ||
        bridging?.material.mechanism === 'conductivity'
      ) {
        thickness = sensibleFloat;
      } else {
        thickness = fc.constant(null);
      }
      return fc.record({
        mainMaterial: fc.constant(mainMaterial),
        bridging: fc.constant(bridging),
        thickness,
      });
    })
    .map(({ mainMaterial, bridging, thickness }) => {
      return FloorLayerInput.validate({
        mainMaterial,
        bridging: {
          material: bridging?.material ?? null,
          proportion: bridging?.proportion ?? null,
        },
        thickness,
      })
        .unwrap(() => undefined)
        .unwrap();
    });
}

export function arbSuspendedFloorInput(): fc.Arbitrary<SuspendedFloorInput> {
  return fc.record({
    floorType: fc.constant('suspended' as const),
    ventilationCombinedArea: sensibleFloat,
    underFloorSpacePerimeter: sensibleFloat,
    layers: fcNonEmptyArray(arbFloorLayerInput()),
  });
}

export function arbHeatedBasementFloorInput(): fc.Arbitrary<HeatedBasementFloorInput> {
  return fc.record({
    floorType: fc.constant('heated basement' as const),
    exposedPerimeter: sensibleFloat,
    basementDepth: sensibleFloat,
    insulation: fc.option(arbInsulationInput()),
  });
}

export function arbExposedFloorInput(): fc.Arbitrary<ExposedFloorInput> {
  return fc.record({
    floorType: fc.constant('exposed' as const),
    exposedTo: fc.constantFrom('outside air', 'unheated space'),
    layers: fcNonEmptyArray(arbFloorLayerInput()),
  });
}

export function arbCommonInput(): fc.Arbitrary<CommonInput> {
  return fc.record({
    area: sensibleFloat,
  });
}

export function arbPerFloorTypeInput(): fc.Arbitrary<PerFloorTypeInput> {
  return fc.oneof(
    arbCustomFloorInput(),
    arbSolidFloorTablesInput(),
    arbSolidFloorBs13370Input(),
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
