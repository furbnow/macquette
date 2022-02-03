/* eslint-disable import/no-cycle */

/* There are a number of problems with the legacy implementation of these
 * calculations. We reproduce them here for the sake of keeping fidelity
 * through the refactor, but at some point we should fix them. The ones I have
 * noticed are as follows:
 *
 * - We assume all windows are vertical (90-degree incline), even if they
 *   are roof windows.
 *
 * - We use the gross area, not the net area of walls etc. in the calculation
 *   of their heat capacity.
 *
 * - We use an element having a u-value of 0 as a heuristic for it not being an
 *   external element.
 */

import { cache } from '../../helpers/cacheGetter';
import { sum } from '../../helpers/sum';
import { Orientation } from '../enums/orientation';
import { Overshading } from '../enums/overshading';
import { Month, MonthName } from '../enums/month';
import { mean } from '../../helpers/mean';
import { Region } from '../enums/region';
import { lightAccessFactor, solarAccessFactor } from '../datasets';
import { calculateSolarFlux } from '../solar-flux';
import { assertNever } from '../../helpers/assertNever';
import { mutateLegacyData } from './fabric/mutateLegacyData';

export { extractFabricInputFromLegacy } from './fabric/extractFromLegacy';

export type CommonSpec = {
    id: number;
    kValue: number;
    uValue: number;
};

export type WallLikeSpec<DeductibleT> = CommonSpec & {
    type: 'external wall' | 'roof' | 'party wall' | 'loft';
    deductions: DeductibleT[];
    grossArea: number;
};

export class WallLike {
    constructor(public spec: WallLikeSpec<WindowLike | Hatch>) {}

    get type(): WallLike['spec']['type'] {
        return this.spec.type;
    }

    get deductibleArea(): number {
        const deductibleAreas = this.spec.deductions.map(
            (deductible) => deductible.spec.area,
        );
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

export type FloorSpec = CommonSpec & {
    type: 'floor';
    area: number;
};

export class Floor {
    constructor(public spec: FloorSpec) {}

    get type(): Floor['spec']['type'] {
        return this.spec.type;
    }

    get thermalCapacity(): number {
        return this.spec.kValue * this.spec.area;
    }

    get heatLoss(): number {
        return this.spec.uValue * this.spec.area;
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

    private solarGainsCache: Partial<Record<MonthName, number>> = {};
    solarGainByMonth(month: Month): number {
        const cachedValue = this.solarGainsCache[month.name];
        if (cachedValue !== undefined) {
            return cachedValue;
        } else {
            const solarFlux = calculateSolarFlux(
                this.dependencies.region,
                this.spec.orientation,
                90,
                month,
            );
            const season = 'winter'; // For heating, use winter values all year round (as per note in Table 6d)
            const accessFactor = solarAccessFactor(this.spec.overshading, season);
            const gain =
                0.9 *
                this.spec.area *
                solarFlux *
                this.spec.gHeat *
                this.spec.frameFactor *
                accessFactor;
            this.solarGainsCache[month.name] = gain;
            return gain;
        }
    }

    get meanSolarGain(): number {
        const gainsByMonth = Month.all.map((month) => this.solarGainByMonth(month));
        return mean(gainsByMonth);
    }

    get naturalLight(): number {
        // Summand of numerator of G_L in SAP Appendix L
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

export type MainElementSpec = WallLikeSpec<DeductibleSpec> | FloorSpec;
export type DeductibleSpec = WindowLikeSpec | HatchSpec;
export type ElementType = MainElementSpec['type'] | DeductibleSpec['type'];

type MainElement = WallLike | Floor;
type Deductible = WindowLike | Hatch;
type FabricElement = MainElement | Deductible;

const constructDeductible = (spec: DeductibleSpec, region: Region): Deductible => {
    switch (spec.type) {
        case 'hatch':
            return new Hatch(spec);
        default:
            return new WindowLike(spec, { region });
    }
};

export type FabricInput = {
    elements: {
        // Walls etc. from which deductible elements may be subtracted; these
        // contain the nested specs for their deductibles
        main: Array<MainElementSpec>;

        // For deductible elements like windows etc., whose heat losses we want
        // to compute, but which have not been assigned to any wall etc. in the
        // main elements
        floatingDeductibles: Array<DeductibleSpec>;
    };
    overrides: {
        yValue: number | null;
        thermalMassParameter: number | null;
    };
};

export type FabricDependencies = {
    region: Region;
    floors: { totalFloorArea: number };
};

export class Fabric {
    public elements: {
        main: Array<WallLike | Floor>;
        floatingDeductibles: Array<Deductible>;
    };

    private floors: FabricDependencies['floors'];

    constructor(public input: FabricInput, { region, floors }: FabricDependencies) {
        this.floors = floors;
        const mainElements = input.elements.main.map((elementSpec): Floor | WallLike => {
            switch (elementSpec.type) {
                case 'floor': {
                    return new Floor(elementSpec);
                }
                case 'loft':
                case 'roof':
                case 'party wall':
                case 'external wall': {
                    const deductions = elementSpec.deductions.map((deductibleSpec) =>
                        constructDeductible(deductibleSpec, region),
                    );
                    return new WallLike({
                        ...elementSpec,
                        deductions,
                    });
                }
            }
        });
        const floatingDeductibleElements = input.elements.floatingDeductibles.map(
            (deductibleSpec) => constructDeductible(deductibleSpec, region),
        );
        this.elements = {
            main: mainElements,
            floatingDeductibles: floatingDeductibleElements,
        };
    }

    @cache
    get yValue(): number {
        // SAP Appendix K says default y-value is 0.15 W/m^2K, however it also
        // has a table of different default y-values for different
        // ages/building types in table S13. 🤷
        return this.input.overrides.yValue ?? 0.15;
    }

    @cache
    get externalArea(): number {
        // We include floatingDeductibles here - is this correct?
        const areas = this.flatElements
            .filter((e) => e.type !== 'party wall')
            .filter((e) => e.spec.uValue !== 0) // Legacy
            .map(netArea);
        return sum(areas);
    }

    @cache
    get thermalBridgingHeatLoss(): number {
        return this.yValue * this.externalArea;
    }

    @cache
    get fabricElementsHeatLoss(): number {
        const losses = this.flatElements.map((e) => e.heatLoss);
        return sum(losses);
    }

    @cache
    get fabricElementsThermalCapacity(): number {
        return sum(this.flatElements.map((e) => e.thermalCapacity));
    }

    @cache
    get heatLoss(): number {
        return this.thermalBridgingHeatLoss + this.fabricElementsHeatLoss;
    }

    @cache
    get thermalMassParameter(): number {
        if (this.input.overrides.thermalMassParameter !== null) {
            return this.input.overrides.thermalMassParameter;
        } else {
            return this.fabricElementsThermalCapacity / this.floors.totalFloorArea;
        }
    }

    private solarGainByMonthCache: Partial<Record<MonthName, number>> = {};
    solarGainByMonth(month: Month): number {
        const cachedValue = this.solarGainByMonthCache[month.name];
        if (cachedValue !== undefined) {
            return cachedValue;
        } else {
            const gain = sum(
                this.flatElements
                    .filter(WindowLike.isWindowLike)
                    .map((w) => w.solarGainByMonth(month)),
            );
            this.solarGainByMonthCache[month.name] = gain;
            return gain;
        }
    }

    @cache
    get solarGainMeanAnnual(): number {
        return sum(
            this.flatElements.filter(WindowLike.isWindowLike).map((w) => w.meanSolarGain),
        );
    }

    @cache
    get naturalLight(): number {
        // G_L in SAP Appendix L
        const elementsSum = sum(
            this.flatElements.filter(WindowLike.isWindowLike).map((w) => w.naturalLight),
        );
        return elementsSum / this.floors.totalFloorArea;
    }

    /** A flat list of all elements
     *
     * Note: elements nested inside WallLike objects etc. are duplicates (by
     * reference) of elements in the top level of the list
     */
    @cache
    get flatElements(): FabricElement[] {
        return [...this.elements.floatingDeductibles, ...flatten(this.elements.main)];
    }

    getElementById(id: CommonSpec['id']): FabricElement | null {
        return this.flatElements.find((e) => e.spec.id === id) ?? null;
    }

    mutateLegacyData(data: unknown) {
        mutateLegacyData(this, data);
    }
}

export const area = (element: FabricElement): number => {
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
};

export const netArea = (element: FabricElement): number => {
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
};

const flatten = (elements: FabricElement[]): FabricElement[] => {
    return elements.flatMap((element): FabricElement[] => {
        if (element instanceof WallLike) {
            return [element, ...element.spec.deductions];
        } else {
            return [element];
        }
    });
};
