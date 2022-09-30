import { product, sum } from '../../../../helpers/array-reducers';
import { cache } from '../../../../helpers/cache-decorators';
import { compareFloats } from '../../../../helpers/fuzzy-float-equality';
import { NonEmptyArray } from '../../../../helpers/non-empty-array';
import { Proportion } from '../../../../helpers/proportion';
import { Result } from '../../../../helpers/result';

export type ResistanceElement = {
    name: string;
    resistance: number;
    proportion: Proportion;
};
export type LayerSpec = {
    elements: NonEmptyArray<ResistanceElement>;
};
export type CombinedMethodInput = {
    layers: NonEmptyArray<LayerSpec>;
};

/** Model for the "Combined Method" of calculating U-values, as specified in BS
 *  ISO EN 13370
 *
 * Note that this model has a complexity of O(n^m), where n is the number of
 * elements in the layers, and m is the number of layers, so make sure that one
 * of those numbers is small!
 */
export class CombinedMethodModel {
    private layers: Array<Layer>;

    constructor({ layers }: CombinedMethodInput) {
        this.layers = layers.map((layerSpec) => new Layer(layerSpec));
    }

    @cache
    get lowerBoundResistance(): Result<number, 'zero division error'> {
        const out = sum(this.layers.map((layer) => layer.lowerBoundResistance));
        if (!Number.isFinite(out)) {
            return Result.err('zero division error');
        } else {
            return Result.ok(out);
        }
    }

    private get resistanceSlices(): Slice[] {
        const resistanceElements = this.layers.map((layer) => layer.spec.elements);
        return cartesianProduct(resistanceElements);
    }

    @cache
    get upperBoundResistance(): Result<number, 'zero division error'> {
        const out =
            1 /
            sum(
                this.resistanceSlices.map((slice) => {
                    const sliceProportion = product(
                        slice.map((element) => element.proportion.asRatio),
                    );
                    const sliceResistance = sum(
                        slice.map((element) => element.resistance),
                    );
                    return sliceProportion / sliceResistance;
                }),
            );
        return !Number.isFinite(out) ? Result.err('zero division error') : Result.ok(out);
    }

    get resistance(): Result<number, 'zero division error'> {
        if (!this.lowerBoundResistance.isOk()) {
            return Result.err('zero division error');
        }
        if (!this.upperBoundResistance.isOk()) {
            return Result.err('zero division error');
        }
        return Result.ok(
            (this.lowerBoundResistance.coalesce() +
                this.upperBoundResistance.coalesce()) /
                2,
        );
    }

    get uValue(): Result<number, 'zero division error'> {
        return this.resistance.chain((resistance) =>
            resistance === 0
                ? Result.err('zero division error')
                : Result.ok(1 / resistance),
        );
    }
}

type Slice = Array<{ resistance: number; proportion: Proportion }>;

/** Cartesian product of many arrays */
function cartesianProduct<T>(sets: T[][]): T[][] {
    const [firstSet, ...restSets] = sets;
    if (firstSet === undefined) {
        return [[]];
    } else {
        const subProduct = cartesianProduct(restSets);
        return firstSet.flatMap((element) =>
            subProduct.map((subProductItem) => [element, ...subProductItem]),
        );
    }
}

class Layer {
    constructor(public spec: LayerSpec) {
        const proportions = spec.elements.map((e) => e.proportion.asRatio);
        if (!compareFloats(sum(proportions), 1)) {
            console.error('Proportions do not add up to 1');
        }
    }

    get lowerBoundResistance(): number {
        return (
            1 /
            sum(
                this.spec.elements.map(
                    ({ proportion, resistance }) => proportion.asRatio / resistance,
                ),
            )
        );
    }
}
