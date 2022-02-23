import fc from 'fast-check';
import { mean } from '../../../src/v2/helpers/mean';
import { sum } from '../../../src/v2/helpers/sum';
import { Month } from '../../../src/v2/model/enums/month';
import {
    CommonSpec,
    DeductibleSpec,
    Fabric,
    FabricDependencies,
    FabricInput,
    FloorSpec,
    HatchSpec,
    MainElementSpec,
    netArea,
    WallLikeSpec,
    WindowLike,
    WindowLikeSpec,
} from '../../../src/v2/model/modules/fabric';
import { FcInfer, merge } from '../../helpers/arbitraries';
import {
    arbitraryOrientation,
    arbitraryOvershading,
    arbitraryRegion,
} from '../../helpers/arbitrary-enums';
import { sensibleFloat } from './arbitraries/values';

const arbitraryCommonSpec = (): fc.Arbitrary<CommonSpec> =>
    fc.record({
        id: fc.nat(),
        kValue: sensibleFloat,
        uValue: sensibleFloat,
    });

const arbitraryFloorSpec = (): fc.Arbitrary<FloorSpec> =>
    merge(
        arbitraryCommonSpec(),
        fc.record({
            type: fc.constant('floor' as const),
            area: sensibleFloat,
        }),
    );

const arbitraryWallLikeSpec = <T>(
    deductibleSpec: fc.Arbitrary<T>,
): fc.Arbitrary<WallLikeSpec<T>> =>
    merge(
        arbitraryCommonSpec(),
        fc.record({
            type: fc.oneof(
                fc.constant('external wall' as const),
                fc.constant('party wall' as const),
                fc.constant('roof' as const),
                fc.constant('loft' as const),
            ),
            grossArea: sensibleFloat,
            deductions: fc.array(deductibleSpec),
        }),
    );

const arbitraryWindowLikeSpec = (): fc.Arbitrary<WindowLikeSpec> =>
    merge(
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

const arbitraryHatchSpec = (): fc.Arbitrary<HatchSpec> =>
    merge(
        arbitraryCommonSpec(),
        fc.record({
            type: fc.constant('hatch' as const),
            area: sensibleFloat,
        }),
    );

const arbitraryDeductibleSpec = (): fc.Arbitrary<DeductibleSpec> =>
    fc.oneof(arbitraryWindowLikeSpec(), arbitraryHatchSpec());

const arbitraryMainElementSpec = (): fc.Arbitrary<MainElementSpec> =>
    fc.oneof(arbitraryFloorSpec(), arbitraryWallLikeSpec(arbitraryDeductibleSpec()));

const arbitraryFabricInput = (): fc.Arbitrary<FabricInput> =>
    fc.record({
        elements: fc.record({
            main: fc.array(arbitraryMainElementSpec()),
            floatingDeductibles: fc.array(arbitraryDeductibleSpec()),
        }),
        overrides: fc.record({
            yValue: fc.option(sensibleFloat),
            thermalMassParameter: fc.option(sensibleFloat),
        }),
    });

const arbitraryFabricDependencies = (): fc.Arbitrary<FabricDependencies> =>
    fc.record({
        region: arbitraryRegion,
        floors: fc.record({
            totalFloorArea: sensibleFloat,
        }),
    });

const arbitraryFabric = (): fc.Arbitrary<Fabric> =>
    fc
        .tuple(arbitraryFabricInput(), arbitraryFabricDependencies())
        .map(([input, dependencies]) => new Fabric(input, dependencies));

describe('fabric model module', () => {
    test('average annual solar gains = mean(sum(elements)) = sum(mean(elements))', () => {
        fc.assert(
            fc.property(arbitraryFabric(), (fabric) => {
                const sumOfMeans = sum(
                    fabric.flatElements
                        .filter(WindowLike.isWindowLike)
                        .map((w) => w.meanSolarGain),
                );
                const meanOfSums = mean(
                    Month.all.map((month) => fabric.solarGainByMonth(month)),
                );
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
                fc.pre(fabric.flatElements.every((e) => e.spec.uValue !== 0));

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
                const combinedCategories = Object.values(
                    fabric.elementsByCategory,
                ).flatMap(identity);
                // Arrays contain each other => they are equal up to ordering
                expect(combinedCategories).toEqual(arrayContaining(fabric.flatElements));
                expect(fabric.flatElements).toEqual(arrayContaining(combinedCategories));
            }),
            { examples },
        );
    });
});

const identity = <T>(val: T) => val;
const arrayContaining = expect.arrayContaining.bind(expect);
