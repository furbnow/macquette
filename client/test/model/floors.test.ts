import * as fc from 'fast-check';

import { cloneDeep } from 'lodash';
import { scenarioSchema } from '../../src/data-schemas/scenario';
import {
  Floor,
  Floors,
  extractFloorsInputFromLegacy,
} from '../../src/model/modules/floors';
import { legacyFloors } from './golden-master/floors';

function positiveRationalFloat() {
  return fc
    .float({
      min: 0,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .filter((x) => x !== 0);
}
function arbFloorSpec() {
  return fc.record({
    area: positiveRationalFloat(),
    height: positiveRationalFloat(),
    name: fc.string(),
  });
}
function arbFloorsInput() {
  return fc.record({
    floors: fc.array(arbFloorSpec()),
  });
}
function arbShuffle<T>(arr: T[]) {
  return fc.shuffledSubarray(arr, { minLength: arr.length, maxLength: arr.length });
}

describe('floors', () => {
  describe('floor', () => {
    test('the volume is proportional to the area', () => {
      const arb = fc.record({
        area1: positiveRationalFloat(),
        area2: positiveRationalFloat(),
        floorSpec: arbFloorSpec(),
      });
      fc.assert(
        fc.property(arb, ({ area1, area2, floorSpec }) => {
          const volume1 = new Floor({ ...floorSpec, area: area1 }).volume;
          const volume2 = new Floor({ ...floorSpec, area: area2 }).volume;
          expect(volume1 / volume2).toBeApproximately(area1 / area2);
        }),
      );
    });
    test('the volume is proportional to the height', () => {
      const arb = fc.record({
        height1: positiveRationalFloat(),
        height2: positiveRationalFloat(),
        floorSpec: arbFloorSpec(),
      });
      fc.assert(
        fc.property(arb, ({ height1, height2, floorSpec }) => {
          const volume1 = new Floor({ ...floorSpec, height: height1 }).volume;
          const volume2 = new Floor({ ...floorSpec, height: height2 }).volume;
          expect(volume1 / volume2).toBeApproximately(height1 / height2);
        }),
      );
    });
  });

  describe('floors', () => {
    test('total floor area and volume are 0 with no floors (base case)', () => {
      fc.assert(
        fc.property(arbFloorsInput(), (floorsInput) => {
          const floors = new Floors({ ...floorsInput, floors: [] });
          expect(floors.totalFloorArea).toBe(0);
          expect(floors.totalVolume).toBe(0);
        }),
      );
    });
    test('total floor area and volume increase by the area and volume of the additional floor when a new floor is added (inductive case)', () => {
      const arb = fc
        .record({
          initialInput: arbFloorsInput(),
          extraFloor: arbFloorSpec(),
        })
        .chain(({ initialInput, extraFloor }) => {
          const secondaryInput = arbShuffle([...initialInput.floors, extraFloor]).map(
            (shuffledWithExtraFloor) => ({
              ...initialInput,
              floors: shuffledWithExtraFloor,
            }),
          );
          return fc.record({
            initialInput: fc.constant(initialInput),
            extraFloor: fc.constant(extraFloor),
            secondaryInput: secondaryInput,
          });
        });
      fc.assert(
        fc.property(arb, ({ initialInput, extraFloor, secondaryInput }) => {
          const initialFloors = new Floors(initialInput);
          const secondaryFloors = new Floors(secondaryInput);
          expect(secondaryFloors.totalFloorArea).toBeApproximately(
            initialFloors.totalFloorArea + new Floor(extraFloor).spec.area,
          );
          expect(secondaryFloors.totalVolume).toBeApproximately(
            initialFloors.totalVolume + new Floor(extraFloor).volume,
          );
        }),
      );
    });
    test('area and volume are always non-negative', () => {
      fc.assert(
        fc.property(arbFloorsInput(), (floorsInput) => {
          const floors = new Floors(floorsInput);
          expect(floors.totalVolume).toBeGreaterThanOrEqual(0);
          expect(floors.totalFloorArea).toBeGreaterThanOrEqual(0);
        }),
      );
    });
    test('area and volume are always positive for non-empty floors array', () => {
      fc.assert(
        fc.property(
          arbFloorsInput().filter((i) => i.floors.length !== 0),
          (floorsInput) => {
            const floors = new Floors(floorsInput);
            expect(floors.totalVolume).toBeGreaterThan(0);
            expect(floors.totalFloorArea).toBeGreaterThan(0);
          },
        ),
      );
    });
  });

  test('golden master', () => {
    fc.assert(
      fc.property(arbFloorsInput(), (floorsInput) => {
        const floorsModel = new Floors(floorsInput);
        const legacyData: any = {
          floors: cloneDeep(floorsInput.floors),
          num_of_floors: 0,
          TFA: 0,
          volume: 0,
        };
        legacyFloors(legacyData);
        expect(floorsModel.numberOfFloors).toEqual(legacyData.num_of_floors);
        expect(floorsModel.totalFloorArea).toEqual(legacyData.TFA);
        expect(floorsModel.totalVolume).toEqual(legacyData.volume);
      }),
    );
  });

  // eslint-disable-next-line jest/expect-expect
  test('extractor', () => {
    fc.assert(
      fc.property(arbFloorsInput(), (input) => {
        const roundTripped = extractFloorsInputFromLegacy(
          scenarioSchema.parse({
            floors: input.floors,
            num_of_floors: 0,
            TFA: 0,
            volume: 0,
          }),
        );
        expect(roundTripped).toEqual(input);
      }),
    );
  });
});
