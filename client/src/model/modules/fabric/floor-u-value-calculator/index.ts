import { cache } from '../../../../helpers/cache-decorators';
import { prependPath } from '../../../../helpers/error-warning-path';
import { Proportion } from '../../../../helpers/proportion';
import { WithWarnings } from '../../../../helpers/with-warnings';
import {
  basementFloorUninsulatedUValue,
  edgeInsulationFactorHorizontal,
  edgeInsulationFactorVertical,
  solidFloorUValue,
  suspendedFloorUninsulatedUValue,
} from '../../../datasets/building-act-appendix-c';
import { calculateInsulationResistance } from './calculate-insulation-resistance';
import { CombinedMethodInput, CombinedMethodModel } from './combined-method';
import type { FloorLayerInput } from './floor-layer-input';
import {
  CommonInput,
  CustomFloorInput,
  ExposedFloorInput,
  FloorUValueModelInput,
  HeatedBasementFloorInput,
  SolidFloorBS13370Input,
  SolidFloorTablesInput,
  SuspendedFloorInput,
} from './input-types';
import { FloorUValueWarning, NonFiniteNumberReplacementError } from './warnings';

export type FloorUValueModel =
  | CustomFloor
  | SolidFloorTables
  | SolidFloorBS13370
  | SuspendedFloor
  | HeatedBasementFloor
  | ExposedFloor;
export function constructFloorUValueModel(
  input: FloorUValueModelInput,
): FloorUValueModel {
  const { common, perFloorType } = input;
  switch (perFloorType.floorType) {
    case 'custom':
      return new CustomFloor(perFloorType);
    case 'solid':
      return new SolidFloorTables(common, perFloorType);
    case 'solid (bs13370)':
      return new SolidFloorBS13370(common, perFloorType);
    case 'suspended':
      return new SuspendedFloor(common, perFloorType);
    case 'heated basement':
      return new HeatedBasementFloor(common, perFloorType);
    case 'exposed':
      return new ExposedFloor(perFloorType);
  }
}

export class CustomFloor {
  constructor(private floor: CustomFloorInput) {}

  get warnings(): Array<never> {
    return [];
  }

  get uValue() {
    return this.floor.uValue;
  }
}

export class SolidFloorTables {
  private _warnings: Array<FloorUValueWarning> = [];
  get warnings() {
    return this._warnings.map(prependPath(['solid (tables)']));
  }

  constructor(
    private common: CommonInput,
    private floor: SolidFloorTablesInput,
  ) {
    this.uValue;
    Object.freeze(this._warnings);
  }

  get allOverInsulationResistance() {
    return calculateInsulationResistance(this.floor.allOverInsulation);
  }

  get perimeterAreaRatio() {
    return this.floor.exposedPerimeter / this.common.area;
  }

  @cache
  get uValueWithoutEdgeInsulation(): number {
    return solidFloorUValue(
      this.allOverInsulationResistance,
      this.perimeterAreaRatio,
    ).unwrap((w) => this._warnings.push(w));
  }

  // aka psi
  @cache
  get edgeInsulationAdjustmentFactor(): number {
    switch (this.floor.edgeInsulation.type) {
      case 'none':
        return 0;
      case 'horizontal':
        return edgeInsulationFactorHorizontal(
          calculateInsulationResistance(this.floor.edgeInsulation),
          this.floor.edgeInsulation.width,
        ).unwrap((w) => this._warnings.push(w));
      case 'vertical':
        return edgeInsulationFactorVertical(
          calculateInsulationResistance(this.floor.edgeInsulation),
          this.floor.edgeInsulation.depth,
        ).unwrap((w) => this._warnings.push(w));
    }
  }

  @cache
  get uValue() {
    const uValueWithoutEdgeInsulation = this.uValueWithoutEdgeInsulation;
    const edgeInsulationAdjustmentFactor = this.edgeInsulationAdjustmentFactor;
    return warnForNonFinite(
      uValueWithoutEdgeInsulation +
        edgeInsulationAdjustmentFactor * this.perimeterAreaRatio,
    ).unwrap((w) => this._warnings.push(w));
  }
}

export class SolidFloorBS13370 {
  private _warnings: Array<FloorUValueWarning> = [];
  get warnings(): Array<FloorUValueWarning> {
    return this._warnings.map(prependPath(['solid (bs13370)']));
  }

  constructor(
    private common: CommonInput,
    private floor: SolidFloorBS13370Input,
  ) {
    this.uValue;
    Object.freeze(this._warnings);
  }

  get edgeInsulationAdjustmentFactor(): number {
    if (this.floor.edgeInsulation.type === 'none') {
      return 0;
    }
    const insulationResistance = calculateInsulationResistance(this.floor.edgeInsulation);
    const additionalEquivalentThickness =
      insulationResistance * this.groundConductivity -
      this.floor.edgeInsulation.thickness;
    let equivalentWidth: number;
    switch (this.floor.edgeInsulation.type) {
      case 'horizontal':
        equivalentWidth = this.floor.edgeInsulation.width;
        break;
      case 'vertical':
        equivalentWidth = 2 * this.floor.edgeInsulation.depth;
        break;
    }

    return (
      -(this.groundConductivity / Math.PI) *
      (Math.log(equivalentWidth / this.equivalentThickness + 1) -
        Math.log(
          equivalentWidth / (this.equivalentThickness + additionalEquivalentThickness) +
            1,
        ))
    );
  }

  get characteristicDimension(): number {
    return (2 * this.common.area) / this.floor.exposedPerimeter;
  }

  get combinedMethodLayerModel(): CombinedMethodModel {
    return new CombinedMethodModel(
      transformFloorLayersToCombinedMethodInput(this.floor.layers, {
        internal: 0.17,
        external: 0.04,
      }),
    );
  }

  get groundConductivity(): number {
    switch (this.floor.groundConductivity) {
      case 'clay or silt':
        return 1.5;
      case 'unknown':
      case 'sand or gravel':
        return 2.0;
      case 'homogenous rock':
        return 3.5;
    }
    return this.floor.groundConductivity;
  }

  get equivalentThickness(): number {
    return (
      this.floor.wallThickness +
      this.groundConductivity * this.combinedMethodLayerModel.resistance
    );
  }

  @cache
  get uValue(): number {
    let unadjustedUValue: number;
    if (this.equivalentThickness < this.characteristicDimension) {
      unadjustedUValue =
        ((2 * this.groundConductivity) /
          (Math.PI * this.characteristicDimension + this.equivalentThickness)) *
        Math.log((Math.PI * this.characteristicDimension) / this.equivalentThickness + 1);
    } else {
      unadjustedUValue =
        this.groundConductivity /
        (0.457 * this.characteristicDimension + this.equivalentThickness);
    }
    const uValue =
      unadjustedUValue +
      (2 * this.edgeInsulationAdjustmentFactor) / this.characteristicDimension;
    return warnForNonFinite(uValue).unwrap((w) => this._warnings.push(w));
  }
}

export class SuspendedFloor {
  private _warnings: Array<FloorUValueWarning> = [];
  get warnings() {
    return this._warnings.map(prependPath(['suspended']));
  }

  constructor(
    private common: CommonInput,
    private floor: SuspendedFloorInput,
  ) {
    this.uValue;
    Object.freeze(this._warnings);
  }

  get perimeterAreaRatio() {
    return this.floor.underFloorSpacePerimeter / this.common.area;
  }

  get ventilationRatio() {
    return this.floor.ventilationCombinedArea / this.floor.underFloorSpacePerimeter;
  }

  @cache
  get uninsulatedUValue(): number {
    return suspendedFloorUninsulatedUValue(
      this.ventilationRatio,
      this.perimeterAreaRatio,
    ).unwrap((w) => this._warnings.push(w));
  }

  @cache
  get combinedMethodLayerModel(): CombinedMethodModel | null {
    if (this.floor.layers === null) return null;

    /* The Building Act 1984 Appendix C specifies that in this case, we are
     * to compute the U-value of the floor using the Combined Method,
     * taking both the internal and external surface resistances to be
     * 0.17, and then use the following formula to convert it into the
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
    return new CombinedMethodModel(
      transformFloorLayersToCombinedMethodInput(this.floor.layers, {
        internal: 0.17,
        external: 0.17,
      }),
    );
  }

  @cache
  get uValue(): number {
    let uValue: number;
    if (this.combinedMethodLayerModel === null) {
      uValue = this.uninsulatedUValue;
    } else {
      uValue =
        1 /
        (1 / this.uninsulatedUValue -
          0.2 +
          this.combinedMethodLayerModel.resistance -
          0.17 -
          0.17);
    }
    return warnForNonFinite(uValue).unwrap((w) => this._warnings.push(w));
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
  const internalSurface: CombinedMethodInput['layers'][number] = {
    elements: [
      {
        name: 'internal surface',
        resistance: surfaceResistances.internal,
        proportion: whole,
      },
    ],
  };
  const externalSurface: CombinedMethodInput['layers'][number] = {
    elements: [
      {
        name: 'external surface',
        resistance: surfaceResistances.external,
        proportion: whole,
      },
    ],
  };
  return {
    layers: [
      internalSurface,
      ...layers.map((inputLayer) => inputLayer.asCombinedMethodLayer()),
      externalSurface,
    ],
  };
}

export class HeatedBasementFloor {
  private _warnings: Array<FloorUValueWarning> = [];
  get warnings() {
    return this._warnings.map(prependPath(['heated-basement']));
  }

  constructor(
    private common: CommonInput,
    private floor: HeatedBasementFloorInput,
  ) {
    this.uValue;
    Object.freeze(this._warnings);
  }

  get perimeterAreaRatio() {
    return this.floor.exposedPerimeter / this.common.area;
  }

  @cache
  get uninsulatedUValue(): number {
    return basementFloorUninsulatedUValue(
      this.floor.basementDepth,
      this.perimeterAreaRatio,
    ).unwrap((w) => this._warnings.push(w));
  }

  get insulationResistance() {
    return calculateInsulationResistance(this.floor.insulation);
  }

  @cache
  get uValue(): number {
    return warnForNonFinite(
      1 / (1 / this.uninsulatedUValue + this.insulationResistance),
    ).unwrap((w) => this._warnings.push(w));
  }
}

export class ExposedFloor {
  private _warnings: Array<FloorUValueWarning> = [];
  get warnings() {
    return this._warnings.map(prependPath(['exposed']));
  }

  constructor(private floor: ExposedFloorInput) {
    this.uValue;
    Object.freeze(this._warnings);
  }

  get combinedMethodLayerModel(): CombinedMethodModel {
    return new CombinedMethodModel(
      transformFloorLayersToCombinedMethodInput(this.floor.layers, {
        internal: this.internalSurfaceResistance,
        external: this.externalSurfaceResistance,
      }),
    );
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

  @cache
  get uValue(): number {
    return warnForNonFinite(this.combinedMethodLayerModel.uValue).unwrap((w) =>
      this._warnings.push(w),
    );
  }
}

function warnForNonFinite(
  val: number,
  default_ = 0,
): WithWarnings<number, NonFiniteNumberReplacementError> {
  if (!Number.isFinite(val)) {
    return WithWarnings.single(default_, {
      type: 'non-finite number replaced',
      path: [],
      replacedWith: default_,
    });
  } else {
    return WithWarnings.empty(val);
  }
}
