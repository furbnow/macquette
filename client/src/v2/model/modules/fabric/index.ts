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

import {
    FloorUValueError,
    FloorUValueWarning,
} from '../../../data-schemas/scenario/fabric/floor-u-value';
import { sum } from '../../../helpers/array-reducers';
import { cache, cacheMonth } from '../../../helpers/cache-decorators';
import { Result } from '../../../helpers/result';
import { WarningCollector, WithWarnings } from '../../../helpers/with-warnings';
import { Month } from '../../enums/month';
import { Region } from '../../enums/region';
import {
    CommonSpec,
    constructDeductible,
    Deductible,
    DeductibleSpec,
    FabricElement,
    Floor,
    MainElementSpec,
    netArea,
    WallLike,
    WindowLike,
} from './element-types';
import { mutateLegacyData } from './mutate-legacy-data';

export { extractFabricInputFromLegacy } from './extract-from-legacy';

export type FabricWarning = FloorUValueWarning | 'unspecified fabric warning';
export type FabricError = FloorUValueError | 'unspecified fabric error';

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
            .filter((e) => {
                // Replicate legacy behaviour
                if (e.type === 'floor') {
                    return e.spec.uValueLegacyField !== 0;
                } else {
                    return e.spec.uValue !== 0;
                }
            })
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
    get heatLossTotals(): WithWarnings<
        Record<ElementCategory, Result<number, FabricError>>,
        FabricWarning
    > {
        const wc = new WarningCollector<FabricWarning>();
        return wc.out(
            mapValues(this.elementsByCategory, (elements) => {
                const lossesR = Result.mapArray(elements, (element) =>
                    Result.fromUnion(
                        WithWarnings.fromUnion(element.heatLoss).unwrap(wc.sink()),
                    ),
                );
                return lossesR.mapOk((losses) => sum(losses));
            }),
        );
    }

    @cache
    get thermalBridgingHeatLoss(): number {
        return this.yValue * this.externalArea;
    }

    @cache
    get fabricElementsHeatLoss(): WithWarnings<
        Result<number, FabricError>,
        FabricWarning
    > {
        const wc = new WarningCollector<FabricWarning>();
        const lossesR = Result.mapArray(this.flatElements, (element) =>
            Result.fromUnion(WithWarnings.fromUnion(element.heatLoss).unwrap(wc.sink())),
        );
        return wc.out(lossesR.mapOk((losses) => sum(losses)));
    }

    @cache
    get fabricElementsThermalCapacity(): number {
        return sum(this.flatElements.map((e) => e.thermalCapacity));
    }

    @cache
    get heatLoss(): WithWarnings<Result<number, FabricError>, FabricWarning> {
        return this.fabricElementsHeatLoss.map((fabricElementsHeatLoss) =>
            fabricElementsHeatLoss.map(
                (fabricElementsHeatLoss) =>
                    this.thermalBridgingHeatLoss + fabricElementsHeatLoss,
            ),
        );
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

function flatten(elements: FabricElement[]): FabricElement[] {
    return elements.flatMap((element): FabricElement[] => {
        if (element instanceof WallLike) {
            return [element, ...element.spec.deductions];
        } else {
            return [element];
        }
    });
}
