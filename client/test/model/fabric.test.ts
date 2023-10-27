import fc from 'fast-check';

import { scenarioSchema } from '../../src/data-schemas/scenario';
import { mean, sum } from '../../src/helpers/array-reducers';
import { Month } from '../../src/model/enums/month';
import {
  Fabric,
  FabricDependencies,
  FabricInput,
  extractFabricInputFromLegacy,
} from '../../src/model/modules/fabric';
import {
  CommonSpec,
  DeductibleSpec,
  HatchSpec,
  MainElementSpec,
  WallLikeSpec,
  WindowLike,
  WindowLikeSpec,
  netArea,
} from '../../src/model/modules/fabric/element-types';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { arbFloorSpec } from '../arbitraries/scenario/floor-u-value-calculator/scenario-spec';
import { FcInfer, merge } from '../helpers/arbitraries';
import {
  arbitraryOrientation,
  arbitraryOvershading,
  arbitraryRegion,
} from '../helpers/arbitrary-enums';
import { legacyFabric } from './golden-master/fabric';

function arbitraryCommonSpec(): fc.Arbitrary<CommonSpec> {
  return fc.record({
    id: fc.uuidV(4),
    kValue: sensibleFloat,
    uValue: sensibleFloat,
  });
}

function arbitraryWallLikeSpec(): fc.Arbitrary<WallLikeSpec> {
  return merge(
    arbitraryCommonSpec(),
    fc.record({
      type: fc.oneof(
        fc.constant('external wall' as const),
        fc.constant('party wall' as const),
        fc.constant('roof' as const),
        fc.constant('loft' as const),
      ),
      grossArea: sensibleFloat,
      deductions: fc.array(fc.oneof(arbitraryWindowLikeSpec(), arbitraryHatchSpec())),
    }),
  );
}

function arbitraryWindowLikeSpec(): fc.Arbitrary<WindowLikeSpec> {
  return merge(
    arbitraryCommonSpec(),
    fc.record({
      type: fc.oneof(
        fc.constant('window' as const),
        fc.constant('door' as const),
        fc.constant('roof light' as const),
      ),
      area: sensibleFloat,
      orientation: arbitraryOrientation,
      overshading: arbitraryOvershading,
      gHeat: sensibleFloat,
      gLight: sensibleFloat,
      frameFactor: sensibleFloat,
    }),
  );
}

function arbitraryHatchSpec(): fc.Arbitrary<HatchSpec> {
  return merge(
    arbitraryCommonSpec(),
    fc.record({
      type: fc.constant('hatch' as const),
      area: sensibleFloat,
    }),
  );
}

function arbitraryDeductibleSpec(): fc.Arbitrary<DeductibleSpec> {
  return fc.oneof(arbitraryWindowLikeSpec(), arbitraryHatchSpec());
}

function arbitraryMainElementSpec(): fc.Arbitrary<MainElementSpec> {
  return fc.oneof(arbFloorSpec, arbitraryWallLikeSpec());
}

function arbitraryFabricInput(): fc.Arbitrary<FabricInput> {
  return fc.record({
    elements: fc.record({
      main: fc.array(arbitraryMainElementSpec()),
      floatingDeductibles: fc.array(arbitraryDeductibleSpec()),
    }),
    overrides: fc.record({
      thermalBridgingAverageConductivity: fc.option(sensibleFloat),
      thermalMassParameter: fc.option(sensibleFloat),
    }),
  });
}

function arbitraryFabricDependencies(): fc.Arbitrary<FabricDependencies> {
  return fc.record({
    region: arbitraryRegion,
    floors: fc.record({
      totalFloorArea: sensibleFloat,
    }),
  });
}

function arbitraryFabric(): fc.Arbitrary<Fabric> {
  return fc
    .tuple(arbitraryFabricInput(), arbitraryFabricDependencies())
    .map(([input, dependencies]) => new Fabric(input, dependencies));
}

describe('fabric model module', () => {
  test('average annual solar gains = mean(sum(elements)) = sum(mean(elements))', () => {
    fc.assert(
      fc.property(arbitraryFabric(), (fabric) => {
        const sumOfMeans = sum(
          fabric.flatElements.filter(WindowLike.isWindowLike).map((w) => w.meanSolarGain),
        );
        const meanOfSums = mean(Month.all.map((month) => fabric.solarGainByMonth(month)));
        expect(sumOfMeans).toBeApproximately(meanOfSums);
        expect(fabric.solarGainMeanAnnual).toBeApproximately(meanOfSums);
      }),
    );
  });

  test('sum of areaTotals === sum of element areas', () => {
    const arb = fc.record({
      input: arbitraryFabricInput(),
      dependencies: arbitraryFabricDependencies(),
    });
    const examples: Array<[FcInfer<typeof arb>]> = [];
    fc.assert(
      fc.property(arb, ({ input, dependencies }) => {
        const fabric = new Fabric(input, dependencies);
        const elementWiseArea = sum(fabric.flatElements.map(netArea));
        const totalsArea = sum(Object.values(fabric.areaTotals));
        expect(totalsArea).toBeApproximately(elementWiseArea);
      }),
      { examples },
    );
  });

  test('external area === external wall net area + windowlike area + roof area + floor area', () => {
    const arb = fc.record({
      input: arbitraryFabricInput(),
      dependencies: arbitraryFabricDependencies(),
    });
    const examples: Array<[FcInfer<typeof arb>]> = [];
    fc.assert(
      fc.property(arb, ({ input, dependencies }) => {
        const fabric = new Fabric(input, dependencies);

        // Skip if some element has a u-value of 0, as this triggers
        // legacy behaviour replication
        fc.pre(
          fabric.flatElements.every((e) => {
            if (e.type === 'floor') return e.spec.uValueLegacyField !== 0;
            else return e.spec.uValue !== 0;
          }),
        );

        expect(fabric.externalArea).toBeApproximately(
          fabric.areaTotals.externalWall +
            fabric.areaTotals.windowLike +
            fabric.areaTotals.floor +
            fabric.areaTotals.roof,
        );
      }),
      { examples },
    );
  });

  test('every element of flatElements should occur in exactly one category of elementsByCategory', () => {
    const arb = fc.record({
      input: arbitraryFabricInput(),
      dependencies: arbitraryFabricDependencies(),
    });
    const examples: Array<[FcInfer<typeof arb>]> = [];
    fc.assert(
      fc.property(arb, ({ input, dependencies }) => {
        const fabric = new Fabric(input, dependencies);
        const combinedCategories = Object.values(fabric.elementsByCategory).flatMap(
          identity,
        );
        // Arrays contain each other => they are equal up to ordering
        expect(combinedCategories).toEqual(expect.arrayContaining(fabric.flatElements));
        expect(fabric.flatElements).toEqual(expect.arrayContaining(combinedCategories));
      }),
      { examples },
    );
  });

  test('golden master', () => {
    fc.assert(
      fc.property(
        arbitraryFabricInput().filter(({ elements }) =>
          elements.main.every(
            (element) => element.type !== 'floor' || element.selectedFloorType === null,
          ),
        ),
        arbitraryFabricDependencies(),
        (input, dependencies) => {
          const fabricModule = new Fabric(input, dependencies);
          const legacyData: any = makeLegacyDataForFabric(input, dependencies);
          legacyFabric(legacyData);
          expect(fabricModule.heatLoss).toBeApproximately(
            legacyData.fabric.total_heat_loss_WK,
          );
          expect(fabricModule.solarGainMeanAnnual).toBeApproximately(
            legacyData.fabric.annual_solar_gain,
          );
          for (const month of Month.all) {
            expect(fabricModule.solarGainByMonth(month)).toBeApproximately(
              legacyData.gains_W['solar'][month.index0],
            );
          }
          expect(fabricModule.fabricElementsThermalCapacity).toBeApproximately(
            legacyData.fabric.total_thermal_capacity,
          );
          for (const legacyElement of legacyData.fabric.elements) {
            const modelElement = fabricModule.getElementById(legacyElement.id);
            expect(modelElement).not.toBeNull();
            expect(modelElement!.heatLoss).toEqual(legacyElement.wk);
            if (['window', 'door', 'roof light'].includes(modelElement!.type)) {
              // eslint-disable-next-line jest/no-conditional-expect
              expect((modelElement as WindowLike).meanSolarGain).toBeApproximately(
                legacyElement.gain,
              );
            }
          }
          expect(fabricModule.naturalLight).toBeApproximately(legacyData.GL);
        },
      ),
    );
  });

  test('extractor', () => {
    fc.assert(
      fc.property(
        arbitraryFabricInput(),
        arbitraryFabricDependencies(),
        (input, dependencies) => {
          const roundTripped = extractFabricInputFromLegacy(
            scenarioSchema.parse(makeLegacyDataForFabric(input, dependencies)),
          );
          // Populate cached getters on orientation and overshading structs
          function populate(element: any) {
            if ('orientation' in element) element.orientation.index0;
            if ('overshading' in element) element.overshading.index0;
          }
          roundTripped.elements.main.forEach((element) => {
            populate(element);
            if ('deductions' in element) element.deductions.forEach(populate);
          });
          roundTripped.elements.floatingDeductibles.forEach(populate);
          function sortElements(input: FabricInput) {
            function compareIds(
              a: { id: string | number },
              b: { id: string | number },
            ): number {
              return a.id < b.id ? -1 : a.id === b.id ? 0 : 1;
            }
            input.elements.main.sort(compareIds);
            input.elements.main.forEach((element) => {
              if ('deductions' in element) {
                element.deductions.sort(compareIds);
              }
            });
          }
          sortElements(roundTripped);
          sortElements(input);
          expect(roundTripped).toEqual(input);
        },
      ),
    );
  });
});

function identity<T>(val: T) {
  return val;
}

const genericMeasureMixin = {
  name: '',
  lib: '',
  who_by: '',
  performance: '',
  notes: '',
  maintenance: '',
  disruption: '',
  cost: 0,
  benefits: '',
  associated_work: '',
  description: '',
};
function makeLegacyDataForFabric(input: FabricInput, dependencies: FabricDependencies) {
  function typeToLegacyType(
    type: MainElementSpec['type'] | DeductibleSpec['type'],
  ): string {
    switch (type) {
      case 'external wall':
        return 'Wall';
      case 'party wall':
        return 'Party_wall';
      case 'loft':
        return 'Loft';
      case 'roof':
        return 'Roof';
      case 'door':
        return 'Door';
      case 'roof light':
        return 'Roof_light';
      case 'window':
        return 'Window';
      case 'hatch':
        return 'Hatch';
      case 'floor':
        return 'Floor';
    }
  }
  function makeLegacyDeductible(subtractfrom: unknown, element: DeductibleSpec) {
    const legacyDeductionElement = {
      id: element.id,
      type: typeToLegacyType(element.type),
      area: element.area,
      l: '',
      h: '',
      subtractfrom,
      uvalue: element.uValue,
      kvalue: element.kValue,
      ...genericMeasureMixin,
    };
    if (element.type !== 'hatch') {
      return {
        ...legacyDeductionElement,
        orientation: element.orientation.index0,
        overshading: element.overshading.index0,
        g: element.gHeat,
        gL: element.gLight,
        ff: element.frameFactor,
      };
    } else return legacyDeductionElement;
  }
  const { elements } = input;
  const legacyElements = [
    ...elements.main.flatMap((element) => {
      if (element.type !== 'floor') {
        const legacyElement = {
          id: element.id,
          type: typeToLegacyType(element.type),
          area: element.grossArea,
          h: '',
          l: '',
          uvalue: element.uValue,
          kvalue: element.kValue,
          ...genericMeasureMixin,
        };
        const legacyDeductions = element.deductions.map((element) =>
          makeLegacyDeductible(legacyElement.id, element),
        );
        return [legacyElement, ...legacyDeductions];
      } else {
        return [
          {
            id: element.id,
            type: typeToLegacyType(element.type),
            area: element.area,
            perimeter: element.exposedPerimeter,
            h: '',
            l: '',
            uvalue: element.uValueLegacyField,
            selectedFloorType: element.selectedFloorType ?? undefined,
            perFloorTypeSpec: element.perFloorTypeSpec ?? undefined,
            kvalue: element.kValue,
            ...genericMeasureMixin,
          },
        ];
      }
    }),
    ...elements.floatingDeductibles.map((element) => makeLegacyDeductible('', element)),
  ];
  return {
    fabric: {
      elements: legacyElements,
      thermal_bridging_yvalue:
        input.overrides.thermalBridgingAverageConductivity ?? undefined,
      global_TMP: input.overrides.thermalMassParameter !== null,
      global_TMP_value: input.overrides.thermalMassParameter ?? undefined,
    },
    TFA: dependencies.floors.totalFloorArea,
    region: dependencies.region.index0,
    losses_WK: {},
    gains_W: {},
  };
}
