import assert from 'assert';
import { cloneDeep } from 'lodash';

import { FloorInsulationConductivityMaterial } from '../../../src/data-schemas/libraries/floor-insulation';
import { constructFloorUValueModel } from '../../../src/model/modules/fabric/floor-u-value-calculator';
import { FloorLayerInput } from '../../../src/model/modules/fabric/floor-u-value-calculator/floor-layer-input';
import {
  FloorUValueModelInput,
  SolidFloorBS13370Input,
} from '../../../src/model/modules/fabric/floor-u-value-calculator/input-types';

type TestCase<I, O> = { name: string; input: I; expected: O };

describe('solid floor (BS 13370)', () => {
  const basicNoEdgeInsulationInput: FloorUValueModelInput<SolidFloorBS13370Input> = {
    common: {
      area: 100,
    },
    perFloorType: {
      floorType: 'solid (bs13370)',
      exposedPerimeter: 50,
      wallThickness: 0.5,
      layers: [
        FloorLayerInput.validate({
          thickness: 0.1,
          mainMaterial: {
            mechanism: 'conductivity',
            name: 'Concrete',
            tags: [],
            description: '',
            tag: '',
            conductivity: 1,
          },
          bridging: { material: null, proportion: null },
        })
          .unwrap(() => undefined)
          .unwrap(),
      ],
      groundConductivity: 'unknown',
      edgeInsulation: { type: 'none' },
    },
  };

  /** Equivalent to Immer.js' produce function */
  function produce<T>(val: T, mut: (val: T) => void): T {
    const out = cloneDeep(val);
    mut(out);
    return out;
  }

  const withoutEdgeInsulationCases: Array<
    TestCase<FloorUValueModelInput<SolidFloorBS13370Input>, number>
  > = [
    {
      name: 'basic',
      input: basicNoEdgeInsulationInput,
      expected: 0.7316,
    },
    {
      name: 'change ground conductivity',
      input: produce(basicNoEdgeInsulationInput, (input) => {
        input.perFloorType.groundConductivity = 'clay or silt';
      }),
      expected: 0.5854,
    },
    {
      name: 'change area',
      input: produce(basicNoEdgeInsulationInput, (input) => {
        input.common.area = 200;
      }),
      expected: 0.4806,
    },
    {
      name: 'change exposed perimeter',
      input: produce(basicNoEdgeInsulationInput, (input) => {
        input.perFloorType.exposedPerimeter = 100;
      }),
      expected: 1.0204,
    },
    {
      name: 'change wall thickness',
      input: produce(basicNoEdgeInsulationInput, (input) => {
        input.perFloorType.wallThickness = 1.0;
      }),
      expected: 0.6118,
    },
    {
      name: 'change layers',
      input: produce(basicNoEdgeInsulationInput, (input) => {
        input.perFloorType.layers = [
          FloorLayerInput.validate({
            thickness: 0.1,
            mainMaterial: {
              mechanism: 'conductivity',
              name: 'Concrete',
              tags: [],
              description: '',
              tag: '',
              conductivity: 1,
            },
            bridging: { material: null, proportion: null },
          })
            .unwrap(() => undefined)
            .unwrap(),
          FloorLayerInput.validate({
            thickness: null,
            mainMaterial: {
              mechanism: 'resistance',
              name: 'Imaginary insulation',
              tags: [],
              description: '',
              tag: '',

              // Calculated such that d_t == B' (equivalent
              // thickness == characteristic dimension), thus
              // testing that path of the algorithm
              resistance: 1.44,
            },
            bridging: { material: null, proportion: null },
          })
            .unwrap(() => undefined)
            .unwrap(),
        ];
      }),
      expected: 0.3432,
    },
  ];
  test.each(withoutEdgeInsulationCases)(
    'without edge insulation: $name',
    ({ input, expected }) => {
      const model = constructFloorUValueModel(input);
      expect(model.uValue).toBeApproximately(expected);
      expect(model.warnings).toHaveLength(0);
    },
  );

  function insulationConductivityMaterial(
    conductivity: number,
  ): FloorInsulationConductivityMaterial {
    return {
      mechanism: 'conductivity',
      name: '',
      description: '',
      tag: '',
      conductivity,
    };
  }
  const basicWithEdgeInsulationInput: FloorUValueModelInput<SolidFloorBS13370Input> =
    produce(basicNoEdgeInsulationInput, (input) => {
      input.perFloorType.edgeInsulation = {
        type: 'vertical',
        depth: 1.0,
        mechanism: 'conductivity',
        thickness: 0.5,
        material: insulationConductivityMaterial(2.0),
      };
    });
  const withEdgeInsulationCases: Array<
    TestCase<FloorUValueModelInput<SolidFloorBS13370Input>, number>
  > = [
    {
      name: 'basic',

      // These parameters actually end up meaning the edge insulation has
      // no effect, so the expected U-value is the same as without it
      input: basicWithEdgeInsulationInput,

      expected: 0.7316,
    },
    {
      name: 'change insulation material and thickness',
      input: produce(basicWithEdgeInsulationInput, (input) => {
        assert(input.perFloorType.edgeInsulation.type === 'vertical');
        input.perFloorType.edgeInsulation.thickness = 1.0;
        input.perFloorType.edgeInsulation.material = insulationConductivityMaterial(0.25);
      }),
      expected: 0.4755,
    },
    {
      name: 'change to horizontal insulation',
      input: produce(basicWithEdgeInsulationInput, (input) => {
        input.perFloorType.edgeInsulation = {
          type: 'horizontal',

          // The only difference between the vertical and horizontal
          // edge insulation calcs is that horizontal insulation
          // width counts for half as much as vertical insulation
          // depth; so if we double the number, we expect the same
          // U-value as above.
          width: 2.0,

          thickness: 1.0,
          mechanism: 'conductivity',
          material: insulationConductivityMaterial(0.25),
        };
      }),
      expected: 0.4755,
    },
  ];
  test.each(withEdgeInsulationCases)(
    'with edge insulation: $name',
    ({ input, expected }) => {
      const model = constructFloorUValueModel(input);
      expect(model.uValue).toBeApproximately(expected);
      expect(model.warnings).toHaveLength(0);
    },
  );

  test('warnings', () => {
    const input = produce(basicNoEdgeInsulationInput, (input) => {
      input.perFloorType.exposedPerimeter = 0;
    });
    const model = constructFloorUValueModel(input);
    expect(model.uValue).toBe(0);
    expect(model.warnings).toHaveLength(1);
  });
});
