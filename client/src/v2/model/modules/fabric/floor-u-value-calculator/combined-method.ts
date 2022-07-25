import { product, sum } from '../../../../helpers/array-reducers';
import { cache } from '../../../../helpers/cache-decorators';
import { compareFloats } from '../../../../helpers/fuzzy-float-equality';
import { NonEmptyArray } from '../../../../helpers/non-empty-array';
import { Proportion } from '../../../../helpers/proportion';

type ConductivityElement = {
    name: string;
    conductivity: number;
    proportion: Proportion;
};
type ResistanceElement = {
    name: string;
    resistance: number;
    proportion: Proportion;
};
export type CombinedMethodInput = NonEmptyArray<
    | {
          calculationType: 'conductivity';
          thickness: number;
          elements: NonEmptyArray<ConductivityElement>;
      }
    | {
          calculationType: 'resistance';
          elements: NonEmptyArray<ResistanceElement>;
      }
>;

/** Model for the "Combined Method" of calculating U-values, as specified in BS
 *  ISO EN 13370
 */
export class CombinedMethodModel {
    private layers: Array<Layer>;

    constructor(layers: CombinedMethodInput) {
        this.layers = layers.map((layerSpec) => new Layer(layerSpec));
    }

    @cache
    get lowerBoundResistance(): number {
        return sum(this.layers.map((layer) => layer.lowerBoundResistance));
    }

    private get resistanceSlices(): Slice[] {
        const resistances = this.layers.map((layer) => layer.elementResistances);
        return cartesianProduct(resistances);
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
    constructor(public spec: CombinedMethodInput[0]) {
        const proportions = spec.elements.map((e) => e.proportion.asRatio);
        if (!compareFloats(sum(proportions), 1)) {
            console.error('Proportions do not add up to 1');
        }
    }

    get lowerBoundResistance(): number {
        return (
            1 /
            sum(
                this.elementResistances.map(
                    ({ proportion, resistance }) => proportion.asRatio / resistance,
                ),
            )
        );
    }

    @cache
    get elementResistances(): Array<{
        name: string;
        proportion: Proportion;
        resistance: number;
    }> {
        const { spec } = this;
        switch (spec.calculationType) {
            case 'resistance': {
                return spec.elements;
            }
            case 'conductivity': {
                return spec.elements.map((element) => ({
                    name: element.name,
                    proportion: element.proportion,
                    resistance: spec.thickness / element.conductivity,
                }));
            }
        }
    }
}
