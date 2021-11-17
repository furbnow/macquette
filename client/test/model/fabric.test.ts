import fc from 'fast-check';
import { mean } from '../../src/helpers/mean';
import { sum } from '../../src/helpers/sum';
import { Month } from '../../src/model/enums/month';
import { Orientation } from '../../src/model/enums/orientation';
import { Overshading } from '../../src/model/enums/overshading';
import { Region } from '../../src/model/enums/region';
import {
    CommonSpec,
    DeductibleSpec,
    Fabric,
    FabricDependencies,
    FabricInput,
    FloorSpec,
    HatchSpec,
    MainElementSpec,
    WallLikeSpec,
    WindowLike,
    WindowLikeSpec,
} from '../../src/model/modules/fabric';
import { arbFloat, merge } from '../helpers/arbitraries';

const arbitraryCommonSpec = (): fc.Arbitrary<CommonSpec> =>
    fc.record({
        id: fc.nat(),
        kValue: arbFloat(),
        uValue: arbFloat(),
    });

const arbitraryFloorSpec = (): fc.Arbitrary<FloorSpec> =>
    arbitraryCommonSpec().chain(
        merge(
            fc.record({
                type: fc.constant('floor' as const),
                dimensions: fc.record({
                    exposedPerimeter: arbFloat(),
                    area: arbFloat(),
                }),
            }),
        ),
    );

const arbitraryWallLikeSpec = <T>(
    deductibleSpec: fc.Arbitrary<T>,
): fc.Arbitrary<WallLikeSpec<T>> =>
    arbitraryCommonSpec().chain(
        merge(
            fc.record({
                type: fc.oneof(
                    fc.constant('external wall' as const),
                    fc.constant('party wall' as const),
                    fc.constant('roof' as const),
                    fc.constant('loft' as const),
                ),
                grossArea: arbFloat(),
                deductions: fc.array(deductibleSpec),
            }),
        ),
    );

const arbitraryOrientation = fc.oneof(...Orientation.all.map(fc.constant));
const arbitraryOvershading = fc.oneof(...Overshading.all.map(fc.constant));
const arbitraryRegion = fc.oneof(...Region.all.map(fc.constant));

const arbitraryWindowLikeSpec = (): fc.Arbitrary<WindowLikeSpec> =>
    arbitraryCommonSpec().chain(
        merge(
            fc.record({
                type: fc.oneof(
                    fc.constant('window' as const),
                    fc.constant('door' as const),
                    fc.constant('roof light' as const),
                ),
                area: arbFloat(),
                orientation: arbitraryOrientation,
                overshading: arbitraryOvershading,
                gHeat: arbFloat(),
                gLight: arbFloat(),
                frameFactor: arbFloat(),
            }),
        ),
    );

const arbitraryHatchSpec = (): fc.Arbitrary<HatchSpec> =>
    arbitraryCommonSpec().chain(
        merge(
            fc.record({
                type: fc.constant('hatch' as const),
                area: arbFloat(),
            }),
        ),
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
            yValue: fc.option(arbFloat()),
            thermalMassParameter: fc.option(arbFloat()),
        }),
    });

const arbitraryFabricDependencies = (): fc.Arbitrary<FabricDependencies> =>
    fc.record({
        region: arbitraryRegion,
        floors: fc.record({
            totalFloorArea: arbFloat(),
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
});
