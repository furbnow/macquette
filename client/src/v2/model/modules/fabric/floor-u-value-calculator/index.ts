import { FloorUValueWarning } from '../../../../data-schemas/scenario/fabric/floor-u-value';
import {
    ValuePath,
    ValueRangeWarning,
} from '../../../../data-schemas/scenario/validation';
import { Proportion } from '../../../../helpers/proportion';
import { WarningCollector, WithWarnings } from '../../../../helpers/with-warnings';
import {
    basementFloorUninsulatedUValue,
    edgeInsulationFactorHorizontal,
    edgeInsulationFactorVertical,
    solidFloorUValue,
    suspendedFloorUninsulatedUValue,
} from '../../../datasets/building-act-appendix-c';
import { TabularFunctionRangeWarning } from '../../../datasets/tabular-function';
import { CombinedMethodInput, CombinedMethodModel } from './combined-method';
import {
    CommonInput,
    CustomFloorInput,
    ExposedFloorInput,
    FloorLayerInput,
    FloorUValueModelInput,
    HeatedBasementFloorInput,
    InsulationInput,
    SolidFloorInput,
    SuspendedFloorInput,
} from './input-types';

function transformTabularRangeWarning(xPath: ValuePath, yPath: ValuePath) {
    return (warning: TabularFunctionRangeWarning): ValueRangeWarning => ({
        type: 'value range warning',
        namespace: 'floor u-value calculator',
        path: warning.dimension === 'x' ? xPath : yPath,
        value: warning.value,
        resolution: {
            type: 'clamped',
            to: warning.clampedTo,
        },
    });
}

export function constructFloorUValueModel(
    input: FloorUValueModelInput,
): CustomFloor | SolidFloor | SuspendedFloor | HeatedBasementFloor | ExposedFloor {
    const { common, perFloorType } = input;
    switch (perFloorType.floorType) {
        case 'custom':
            return new CustomFloor(common, perFloorType);
        case 'solid':
            return new SolidFloor(common, perFloorType);
        case 'suspended':
            return new SuspendedFloor(common, perFloorType);
        case 'heated basement':
            return new HeatedBasementFloor(common, perFloorType);
        case 'exposed':
            return new ExposedFloor(common, perFloorType);
    }
}

abstract class FloorUValueModel {
    constructor(private common: CommonInput) {}
    get perimeterAreaRatio() {
        return this.common.exposedPerimeter / this.common.area;
    }

    abstract get uValue(): WithWarnings<number, FloorUValueWarning>;
}

export class CustomFloor extends FloorUValueModel {
    constructor(common: CommonInput, private floor: CustomFloorInput) {
        super(common);
    }
    get uValue() {
        return WithWarnings.empty(this.floor.uValue);
    }
}

function calculateInsulationResistance(insulation: InsulationInput | null): number {
    if (insulation === null) return 0;
    return insulation.thickness / insulation.material.conductivity;
}

export class SolidFloor extends FloorUValueModel {
    constructor(common: CommonInput, private floor: SolidFloorInput) {
        super(common);
    }

    get allOverInsulationResistance() {
        return calculateInsulationResistance(this.floor.allOverInsulation);
    }

    get uValueWithoutEdgeInsulation(): WithWarnings<number, FloorUValueWarning> {
        return solidFloorUValue(
            this.allOverInsulationResistance,
            this.perimeterAreaRatio,
        ).mapWarnings(
            transformTabularRangeWarning(
                ['solid', 'all-over-insulation', 'resistance'],
                ['common', 'perimeter-area-ratio'],
            ),
        );
    }

    // aka psi
    get edgeInsulationAdjustmentFactor(): WithWarnings<number, FloorUValueWarning> {
        switch (this.floor.edgeInsulation.type) {
            case 'none':
                return WithWarnings.empty(0);
            case 'horizontal':
                return edgeInsulationFactorHorizontal(
                    calculateInsulationResistance(this.floor.edgeInsulation),
                    this.floor.edgeInsulation.width,
                ).mapWarnings(
                    transformTabularRangeWarning(
                        ['solid', 'horizontal-insulation', 'resistance'],
                        ['solid', 'horizontal-insulation', 'width'],
                    ),
                );
            case 'vertical':
                return edgeInsulationFactorVertical(
                    calculateInsulationResistance(this.floor.edgeInsulation),
                    this.floor.edgeInsulation.depth,
                ).mapWarnings(
                    transformTabularRangeWarning(
                        ['solid', 'vertical-insulation', 'resistance'],
                        ['solid', 'vertical-insulation', 'depth'],
                    ),
                );
        }
    }

    get uValue() {
        const wc = new WarningCollector<FloorUValueWarning>();
        return wc.out(
            this.uValueWithoutEdgeInsulation.unwrap(wc.sink()) +
                this.edgeInsulationAdjustmentFactor.unwrap(wc.sink()) *
                    this.perimeterAreaRatio,
        );
    }
}

export class SuspendedFloor extends FloorUValueModel {
    constructor(common: CommonInput, private floor: SuspendedFloorInput) {
        super(common);
    }

    get ventilationRatio() {
        return this.floor.ventilationCombinedArea / this.floor.underFloorSpacePerimeter;
    }

    get uninsulatedUValue(): WithWarnings<number, FloorUValueWarning> {
        return suspendedFloorUninsulatedUValue(
            this.ventilationRatio,
            this.perimeterAreaRatio,
        ).mapWarnings(
            transformTabularRangeWarning(
                ['suspended', 'under-floor-ventilation-perimeter-ratio'],
                ['common', 'perimeter-area-ratio'],
            ),
        );
    }

    get combinedMethodLayerModel(): CombinedMethodModel | null {
        if (this.floor.insulationLayers === null) return null;

        /* The Building Act 1984 Appendix C specifies that in this case, we are
         * to compute the U-value of the floor using the Combined Method,
         * taking both the internal and external surface resistances to be
         * 0.17, and then use the following forumula to convert it into the
         * basic floor resistance (aka R_f):
         *
         * R_f = (1 / U_f) - 0.17 - 0.17
         *
         * At a glance, what it looks like this is doing is reverse-engineering
         * the Combined Method, so as to discount the internal and external
         * surface resistances. However in fact, the equations do not cancel as
         * expected, due to the fact that the surface resistances are
         * incorprated into the Upper Limit formula in the Combined Method by
         * taking the inverse of sums of inverses. (In the case where none of
         * the layers are bridged, the formulas do in fact cancel as expected.)
         *
         * The calculation used here is as specified.
         */
        const input = transformFloorLayersToCombinedMethodInput(
            this.floor.insulationLayers,
            { internal: 0.17, external: 0.17 },
        );
        return new CombinedMethodModel(input);
    }

    get uValue(): WithWarnings<number, FloorUValueWarning> {
        if (this.combinedMethodLayerModel === null) return this.uninsulatedUValue;
        const wc = new WarningCollector<FloorUValueWarning>();
        return wc.out(
            1 /
                (1 / this.uninsulatedUValue.unwrap(wc.sink()) -
                    0.2 +
                    this.combinedMethodLayerModel.resistance -
                    0.17 -
                    0.17),
        );
    }
}

const whole = Proportion.fromRatio(1).unwrap();
function transformFloorLayersToCombinedMethodInput(
    layers: FloorLayerInput[],
    surfaceResistances: {
        internal: number;
        external: number;
    },
): CombinedMethodInput {
    const internalSurface: CombinedMethodInput[0] = {
        calculationType: 'resistance' as const,
        elements: [
            {
                name: 'internal surface',
                resistance: surfaceResistances.internal,
                proportion: whole,
            },
        ],
    };
    const externalSurface: CombinedMethodInput[0] = {
        calculationType: 'resistance' as const,
        elements: [
            {
                name: 'external surface',
                resistance: surfaceResistances.external,
                proportion: whole,
            },
        ],
    };
    return [
        internalSurface,
        ...layers.map(
            ({ thickness, mainMaterial, bridging }): CombinedMethodInput[0] => ({
                thickness,
                calculationType: 'conductivity' as const,
                elements: [
                    {
                        name: mainMaterial.name,
                        conductivity: mainMaterial.conductivity,
                        proportion:
                            bridging === null ? whole : bridging.proportion.complement,
                    },
                    ...(bridging === null
                        ? []
                        : [
                              {
                                  name: bridging.material.name,
                                  conductivity: bridging.material.conductivity,
                                  proportion: bridging.proportion,
                              },
                          ]),
                ],
            }),
        ),
        externalSurface,
    ];
}

export class HeatedBasementFloor extends FloorUValueModel {
    constructor(common: CommonInput, private floor: HeatedBasementFloorInput) {
        super(common);
    }

    get uninsulatedUValue(): WithWarnings<number, FloorUValueWarning> {
        return basementFloorUninsulatedUValue(
            this.floor.basementDepth,
            this.perimeterAreaRatio,
        ).mapWarnings(
            transformTabularRangeWarning(
                ['heated-basement', 'depth'],
                ['common', 'perimeter-area-ratio'],
            ),
        );
    }

    get insulationResistance(): number {
        return calculateInsulationResistance(this.floor.insulation);
    }

    get uValue(): WithWarnings<number, FloorUValueWarning> {
        const wc = new WarningCollector<FloorUValueWarning>();
        return wc.out(
            1 /
                (1 / this.uninsulatedUValue.unwrap(wc.sink()) +
                    this.insulationResistance),
        );
    }
}

export class ExposedFloor extends FloorUValueModel {
    constructor(common: CommonInput, private floor: ExposedFloorInput) {
        super(common);
    }

    get combinedMethodLayerModel(): CombinedMethodModel {
        const input = transformFloorLayersToCombinedMethodInput(
            this.floor.insulationLayers ?? [],
            {
                internal: this.internalSurfaceResistance,
                external: this.externalSurfaceResistance,
            },
        );
        return new CombinedMethodModel(input);
    }

    get internalSurfaceResistance() {
        return 0.17;
    }

    get externalSurfaceResistance() {
        switch (this.floor.exposedTo) {
            case 'unheated space':
                return 0.17;
            case 'outside air':
                return 0.04;
        }
    }

    get uValue(): WithWarnings<number, never> {
        return WithWarnings.empty(1 / this.combinedMethodLayerModel.resistance);
    }
}
