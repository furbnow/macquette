import fc from 'fast-check';

import { Occupancy } from '../../src/model/modules/occupancy';

function arbOccupancyInput() {
  return fc.record({
    customOccupancy: fc.option(fc.integer({ min: 0 })),
    legacyOutputMixin: fc.object(),
  });
}

function arbOccupancyFloorDependency() {
  return fc.record({
    totalFloorArea: fc.float({ min: 0 }),
  });
}

describe('occupancy', () => {
  test('if custom occupancy is specified, the returned occupancy is not dependent on the floor area', () => {
    const arb = fc
      .record({
        floors1: arbOccupancyFloorDependency(),
        floors2: arbOccupancyFloorDependency(),
        input: arbOccupancyInput().filter((i) => i.customOccupancy !== null),
      })
      .filter(
        ({ floors1, floors2 }) => floors1.totalFloorArea !== floors2.totalFloorArea,
      );
    fc.assert(
      fc.property(arb, ({ floors1, floors2, input }) => {
        const occupancy1 = new Occupancy(input, { floors: floors1 });
        const occupancy2 = new Occupancy(input, { floors: floors2 });
        expect(occupancy1.occupancy).toBe(occupancy2.occupancy);
      }),
    );
  });
});
