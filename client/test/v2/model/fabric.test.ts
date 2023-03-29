import fc from 'fast-check';

import { mean, sum } from '../../../src/v2/helpers/array-reducers';
import { Month } from '../../../src/v2/model/enums/month';
import {
    Fabric,
    FabricDependencies,
    FabricInput,
} from '../../../src/v2/model/modules/fabric';
import {
    CommonSpec,
    DeductibleSpec,
    HatchSpec,
    MainElementSpec,
    netArea,
    WallLikeSpec,
    WindowLike,
    WindowLikeSpec,
} from '../../../src/v2/model/modules/fabric/element-types';
import { FcInfer, merge } from '../../helpers/arbitraries';
import {
    arbitraryOrientation,
    arbitraryOvershading,
    arbitraryRegion,
} from '../../helpers/arbitrary-enums';
import { sensibleFloat } from '../arbitraries/legacy-values';
import { arbFloorSpec } from '../arbitraries/scenario/floor-u-value-calculator/scenario-spec';

function arbitraryCommonSpec(): fc.Arbitrary<CommonSpec> {
    return fc.record({
        id: fc.nat(),
        kValue: sensibleFloat,
        uValue: sensibleFloat,
    });
}

function arbitraryWallLikeSpec<T>(
    deductibleSpec: fc.Arbitrary<T>,
): fc.Arbitrary<WallLikeSpec<T>> {
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
            deductions: fc.array(deductibleSpec),
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
    return fc.oneof(arbFloorSpec, arbitraryWallLikeSpec(arbitraryDeductibleSpec()));
}

function arbitraryFabricInput(): fc.Arbitrary<FabricInput> {
    return fc.record({
        elements: fc.record({
            main: fc.array(arbitraryMainElementSpec()),
            floatingDeductibles: fc.array(arbitraryDeductibleSpec()),
        }),
        overrides: fc.record({
            yValue: fc.option(sensibleFloat),
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

function identity<T>(val: T) {
    return val;
}
const arrayContaining = expect.arrayContaining.bind(expect);
