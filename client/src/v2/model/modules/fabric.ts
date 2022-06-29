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
import { mapValues } from 'lodash';

import { assertNever } from '../../helpers/assert-never';
import { cache, cacheMonth } from '../../helpers/cache-decorators';
import { mean } from '../../helpers/mean';
import { sum } from '../../helpers/sum';
import { lightAccessFactor, solarAccessFactor } from '../datasets';
import { Month } from '../enums/month';
import { Orientation } from '../enums/orientation';
import { Overshading } from '../enums/overshading';
import { Region } from '../enums/region';
import { calculateSolarRadiationMonthly } from '../solar-flux';
import { mutateLegacyData } from './fabric/mutate-legacy-data';

export { extractFabricInputFromLegacy } from './fabric/extract-from-legacy';

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

export type MainElementSpec = WallLikeSpec<DeductibleSpec> | FloorSpec;
export type DeductibleSpec = WindowLikeSpec | HatchSpec;
export type ElementType = MainElementSpec['type'] | DeductibleSpec['type'];

type MainElement = WallLike | Floor;
type Deductible = WindowLike | Hatch;
type FabricElement = MainElement | Deductible;

function constructDeductible(spec: DeductibleSpec, region: Region): Deductible {
    switch (spec.type) {
        case 'hatch':
            return new Hatch(spec);
        default:
            return new WindowLike(spec, { region });
    }
}

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

type ElementCategory = 'floor' | 'externalWall' | 'roof' | 'windowLike' | 'partyWall';
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

        // We also include the areas of deductible elements which may be being
        // deducted from party walls (e.g. a fire door to a neighbouring
        // building). This is almost certainly not correct but is the legacy
        // behaviour.
        const areas = this.flatElements
            .filter((e) => e.type !== 'party wall')
            .filter((e) => e.spec.uValue !== 0) // Legacy
            .map(netArea);
        return sum(areas);
    }

    @cache
    get envelopeArea(): number {
        return this.externalArea + this.areaTotals.partyWall;
    }

    @cache
    get elementsByCategory(): Record<ElementCategory, Array<FabricElement>> {
        // We could do this in a single pass through flatElements, but this
        // reads better. Fix it if it becomes a problem.
        const elemsOfType = (types: Array<FabricElement['type']>) =>
            this.flatElements.filter((element) => types.includes(element.type));
        return {
            floor: elemsOfType(['floor']),
            externalWall: elemsOfType(['external wall']),
            roof: elemsOfType(['roof', 'loft']),
            windowLike: elemsOfType(['window', 'door', 'roof light', 'hatch']),
            partyWall: elemsOfType(['party wall']),
        };
    }

    /** Net areas */
    @cache
    get areaTotals(): Record<ElementCategory, number> {
        return mapValues(this.elementsByCategory, (elements) =>
            sum(elements.map(netArea)),
        );
    }

    @cache
    get heatLossTotals(): Record<ElementCategory, number> {
        return mapValues(this.elementsByCategory, (elements) =>
            sum(elements.map((elements) => elements.heatLoss)),
        );
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

    @cacheMonth
    solarGainByMonth(month: Month): number {
        const gain = sum(
            this.flatElements
                .filter(WindowLike.isWindowLike)
                .map((w) => w.solarGainByMonth(month)),
        );
        return gain;
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

function flatten(elements: FabricElement[]): FabricElement[] {
    return elements.flatMap((element): FabricElement[] => {
        if (element instanceof WallLike) {
            return [element, ...element.spec.deductions];
        } else {
            return [element];
        }
    });
}
