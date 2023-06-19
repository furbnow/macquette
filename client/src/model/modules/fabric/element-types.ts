import {
    FloorType,
    PerFloorTypeSpec,
} from '../../../data-schemas/scenario/fabric/floor-u-value';
import { mean, sum } from '../../../helpers/array-reducers';
import { assertNever } from '../../../helpers/assert-never';
import { cache, cacheMonth } from '../../../helpers/cache-decorators';
import { prependPath } from '../../../helpers/error-warning-path';
import { featureFlags } from '../../../helpers/feature-flags';
import { lightAccessFactor, solarAccessFactor } from '../../datasets';
import { Month } from '../../enums/month';
import { Orientation } from '../../enums/orientation';
import { Overshading } from '../../enums/overshading';
import { Region } from '../../enums/region';
import { calculateSolarRadiationMonthly } from '../../solar-flux';
import {
    CustomFloor,
    FloorUValueModel,
    constructFloorUValueModel,
} from './floor-u-value-calculator';
import { validate } from './floor-u-value-calculator/validate-input';
import { FloorUValueWarning } from './floor-u-value-calculator/warnings';

export type CommonSpec = {
    id: number;
    kValue: number;
    uValue: number;
};

export type WallLikeSpec = CommonSpec & {
    type: 'external wall' | 'roof' | 'party wall' | 'loft';
    deductions: Array<WindowLikeSpec | HatchSpec>;
    grossArea: number;
};

export class WallLike {
    constructor(public spec: WallLikeSpec, private dependencies: { region: Region }) {}

    get deductions(): Array<WindowLike | Hatch> {
        return this.spec.deductions.map((spec) =>
            constructDeductible(spec, this.dependencies.region),
        );
    }

    get type(): WallLike['spec']['type'] {
        return this.spec.type;
    }

    get deductibleArea(): number {
        const deductibleAreas = this.deductions.map((deductible) => deductible.spec.area);
        return sum(deductibleAreas);
    }

    get netArea(): number {
        return this.spec.grossArea - this.deductibleArea;
    }

    get heatLoss(): number {
        return this.spec.uValue * this.netArea;
    }

    get thermalCapacity(): number {
        return this.spec.kValue * this.spec.grossArea;
    }
}

export type FloorSpec = Omit<CommonSpec, 'uValue'> & {
    type: 'floor';
    area: number;
    exposedPerimeter: number;
    uValueLegacyField: number;
    selectedFloorType: FloorType | null;
    perFloorTypeSpec: PerFloorTypeSpec | null;
};

export class Floor {
    private _warnings: Array<FloorUValueWarning> = [];
    get warnings() {
        return this._warnings.map(prependPath(['floor']));
    }

    constructor(public spec: FloorSpec) {
        this.uValueModel;
        Object.freeze(this._warnings);
    }

    get type(): Floor['spec']['type'] {
        return this.spec.type;
    }

    get thermalCapacity(): number {
        return this.spec.kValue * this.spec.area;
    }

    @cache
    get uValueModel(): FloorUValueModel {
        if (
            !featureFlags.has('new-fuvc') ||
            this.spec.perFloorTypeSpec === null ||
            this.spec.selectedFloorType === null
        ) {
            return new CustomFloor({
                floorType: 'custom',
                uValue: this.spec.uValueLegacyField,
            });
        } else {
            const common = {
                area: this.spec.area,
                exposedPerimeter: this.spec.exposedPerimeter,
            };
            const input = validate(
                this.spec.selectedFloorType,
                common,
                this.spec.perFloorTypeSpec,
            )
                .mapWarnings(prependPath(['u-value-validation']))
                .unwrap((w) => this._warnings.push(w));
            return constructFloorUValueModel(input);
        }
    }

    get uValue(): number {
        return this.uValueModel.uValue;
    }

    get heatLoss(): number {
        return this.uValue * this.spec.area;
    }
}

export type HatchSpec = CommonSpec & {
    type: 'hatch';
    area: number;
};

export class Hatch {
    constructor(public spec: HatchSpec) {}

    get type(): Hatch['spec']['type'] {
        return this.spec.type;
    }

    get thermalCapacity(): number {
        return this.spec.kValue * this.spec.area;
    }

    get heatLoss(): number {
        return this.spec.uValue * this.spec.area;
    }
}

export type WindowLikeSpec = CommonSpec & {
    type: 'window' | 'door' | 'roof light';
    area: number;
    orientation: Orientation;
    overshading: Overshading;
    gHeat: number; // g_⟂ in SAP (Section 6)
    gLight: number; // g_L in SAP (Appendix L)
    frameFactor: number; // FF in SAP (Section 6)
};

export class WindowLike {
    constructor(public spec: WindowLikeSpec, private dependencies: { region: Region }) {}

    static isWindowLike(this: void, val: unknown): val is WindowLike {
        return val instanceof WindowLike;
    }

    get type(): WindowLike['spec']['type'] {
        return this.spec.type;
    }

    get heatLoss(): number {
        switch (this.spec.type) {
            case 'window':
            case 'roof light': {
                // SAP assumes we are using curtains: paragraph 3.2, p. 15, SAP2012
                const curtainAdjustedUValue = 1 / (1 / this.spec.uValue + 0.04);
                return curtainAdjustedUValue * this.spec.area;
            }
            case 'door': {
                return this.spec.uValue * this.spec.area;
            }
        }
    }

    get thermalCapacity(): number {
        return this.spec.kValue * this.spec.area;
    }

    @cacheMonth
    solarGainByMonth(month: Month): number {
        const solarFlux = calculateSolarRadiationMonthly(
            this.dependencies.region,
            this.spec.orientation,
            90,
            month,
        );
        const season = 'winter'; // For heating, use winter values all year round (as per note in Table 6d)

        // We apply the same solar access factor to roof lights as any other windows.
        // This is a deviation from SAP2012 (p.216, table 6d, note 2) where solar
        // access factors for roof lights are always 1, independent of overshading.
        const accessFactor = solarAccessFactor(this.spec.overshading, season);
        const gain =
            0.9 *
            this.spec.area *
            solarFlux *
            this.spec.gHeat *
            this.spec.frameFactor *
            accessFactor;
        return gain;
    }

    get meanSolarGain(): number {
        const gainsByMonth = Month.all.map((month) => this.solarGainByMonth(month));
        return mean(gainsByMonth);
    }

    get naturalLight(): number {
        // Summand of numerator of G_L in SAP Appendix L

        // We apply the same light access factor to roof lights as any other windows.
        // This is a deviation from SAP2012 (p.216, table 6d, note 2) where light
        // access factors for roof lights are always 1, independent of overshading.
        const accessFactor = lightAccessFactor(this.spec.overshading);
        const light =
            0.9 *
            this.spec.area *
            this.spec.gLight *
            this.spec.frameFactor *
            accessFactor;
        return light;
    }
}

export type MainElementSpec = WallLikeSpec | FloorSpec;
export type DeductibleSpec = WindowLikeSpec | HatchSpec;
export type ElementType = MainElementSpec['type'] | DeductibleSpec['type'];

export type MainElement = WallLike | Floor;
export type Deductible = WindowLike | Hatch;
export type FabricElement = MainElement | Deductible;

export function constructDeductible(spec: DeductibleSpec, region: Region): Deductible {
    switch (spec.type) {
        case 'hatch':
            return new Hatch(spec);
        default:
            return new WindowLike(spec, { region });
    }
}

export function grossArea(element: FabricElement): number {
    if (element instanceof WindowLike) {
        return element.spec.area;
    } else if (element instanceof Hatch) {
        return element.spec.area;
    } else if (element instanceof Floor) {
        return element.spec.area;
    } else if (element instanceof WallLike) {
        return element.spec.grossArea;
    }
    return assertNever(element);
}

export function netArea(element: FabricElement): number {
    if (element instanceof WindowLike) {
        return element.spec.area;
    } else if (element instanceof Hatch) {
        return element.spec.area;
    } else if (element instanceof Floor) {
        return element.spec.area;
    } else if (element instanceof WallLike) {
        return element.netArea;
    }
    return assertNever(element);
}
