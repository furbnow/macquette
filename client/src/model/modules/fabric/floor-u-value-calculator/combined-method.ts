import { product, sum } from '../../../../helpers/array-reducers';
import { cache } from '../../../../helpers/cache-decorators';
import { compareFloats } from '../../../../helpers/fuzzy-float-equality';
import { NonEmptyArray } from '../../../../helpers/non-empty-array';
import { Proportion } from '../../../../helpers/proportion';

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
    get lowerBoundResistance(): number {
        return sum(this.layers.map((layer) => layer.lowerBoundResistance));
    }

    private get resistanceSlices(): Slice[] {
        const resistanceElements = this.layers.map((layer) => layer.spec.elements);
        return cartesianProduct(resistanceElements);
    }

    @cache
    get upperBoundResistance(): number {
        return (
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
            )
        );
    }

    get resistance(): number {
        return (this.lowerBoundResistance + this.upperBoundResistance) / 2;
    }

    get uValue(): number {
        return 1 / this.resistance;
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
