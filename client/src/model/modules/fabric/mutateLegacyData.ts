import { sum } from '../../../helpers/sum';
import { Month } from '../../enums/month';
import { ModelError } from '../../error';
import { area, netArea, Fabric, WallLike, WindowLike, Hatch } from '../fabric';

/* eslint-disable
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/no-unsafe-argument,
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/consistent-type-assertions,
*/
export const mutateLegacyData = (fabric: Fabric, data: any) => {
    if (data.fabric === undefined) {
        data.fabric = {};
    }
    if (data.fabric.elements === undefined) {
        data.fabric.elements = [];
    }
    if (data.fabric.thermal_bridging_yvalue === undefined) {
        data.fabric.thermal_bridging_yvalue = fabric.yValue;
    }
    if (data.fabric.global_TMP === undefined) {
        data.fabric.global_TMP = fabric.input.overrides.thermalMassParameter !== null;
    }
    if (data.fabric.global_TMP_value === undefined) {
        data.fabric.global_TMP_value = fabric.input.overrides.thermalMassParameter ?? 250;
    }
    data.fabric_total_heat_loss_WK = fabric.heatLoss;
    data.fabric.total_heat_loss_WK = fabric.heatLoss;
    data.fabric.total_thermal_capacity = sum(
        fabric.flatElements.map((e) => e.thermalCapacity),
    );
    const totals = computeTotals(fabric);
    data.fabric.total_floor_WK = totals.floor.heatLoss;
    data.fabric.total_wall_WK = totals.externalWall.heatLoss;
    data.fabric.total_roof_WK = totals.roof.heatLoss;
    data.fabric.total_window_WK = totals.windowLike.heatLoss;
    data.fabric.total_party_wall_WK = totals.partyWall.heatLoss;
    data.fabric.total_external_area = fabric.externalArea;
    data.fabric.total_wall_area = totals.externalWall.area;
    data.fabric.total_floor_area = totals.floor.area;
    data.fabric.total_roof_area = totals.roof.area;
    data.fabric.total_window_area = totals.windowLike.area;
    data.fabric.total_party_wall_area = totals.partyWall.area;

    for (const legacyElement of data.fabric.elements) {
        const newStyleElement = fabric.getElementById(legacyElement.id);
        if (newStyleElement === null) {
            throw new ModelError(
                'Failed to match legacy element with new-style element',
                { legacyElement, fabric },
            );
        }
        if (
            legacyElement.h !== undefined &&
            legacyElement.h !== '' &&
            legacyElement.l !== undefined &&
            legacyElement.l !== ''
        ) {
            legacyElement.area = area(newStyleElement);
        }
        legacyElement.netarea = netArea(newStyleElement);
        if (
            !(newStyleElement instanceof WindowLike) &&
            !(newStyleElement instanceof Hatch)
        ) {
            legacyElement.windowarea = 0;
        }
        if (newStyleElement instanceof WindowLike) {
            legacyElement.gain = newStyleElement.meanSolarGain;
        }
        if (newStyleElement instanceof WallLike) {
            legacyElement.windowarea = newStyleElement.deductibleArea;
            if (newStyleElement.spec.deductions.length !== 0) {
                legacyElement.netarea = newStyleElement.netArea;
            }
        }
        legacyElement.wk = newStyleElement.heatLoss;
    }
    data.fabric.total_external_area = fabric.externalArea;
    data.fabric.total_thermal_capacity = fabric.fabricElementsThermalCapacity;
    data.fabric.annual_solar_gain = fabric.solarGainMeanAnnual;
    data.fabric.thermal_bridging_heat_loss = fabric.thermalBridgingHeatLoss;
    data.fabric.fabric_heat_loss_WK = fabric.fabricElementsHeatLoss;
    data.fabric.annual_solar_gain_kwh = (fabric.solarGainMeanAnnual * 365 * 24) / 1000;
    data.TMP = fabric.thermalMassParameter;
    data.losses_WK.fabric = new Array(12).fill(fabric.heatLoss);
    data.gains_W['solar'] = Month.all.map((month) => fabric.solarGainByMonth(month));
    data.GL = fabric.naturalLight;
};
/* eslint-enable */

type Totals = {
    floor: { heatLoss: number; area: number };
    externalWall: { heatLoss: number; area: number };
    roof: { heatLoss: number; area: number };
    windowLike: { heatLoss: number; area: number };
    partyWall: { heatLoss: number; area: number };
};

// This will eventually go in the view layer, since this grouping of element
// types is particular to the view
const computeTotals = (fabric: Fabric): Totals => {
    const initialTotals: Totals = {
        floor: { heatLoss: 0, area: 0 },
        externalWall: { heatLoss: 0, area: 0 },
        roof: { heatLoss: 0, area: 0 },
        windowLike: { heatLoss: 0, area: 0 },
        partyWall: { heatLoss: 0, area: 0 },
    };
    return fabric.flatElements.reduce((runningTotals, element) => {
        const out = { ...runningTotals };
        switch (element.type) {
            case 'floor': {
                out.floor = {
                    heatLoss: out.floor.heatLoss + element.heatLoss,
                    area: out.floor.area + element.spec.dimensions.area,
                };
                return out;
            }
            case 'external wall': {
                out.externalWall = {
                    heatLoss: out.externalWall.heatLoss + element.heatLoss,
                    area: out.externalWall.area + element.netArea,
                };
                return out;
            }
            case 'roof':
            case 'loft': {
                out.roof = {
                    heatLoss: out.roof.heatLoss + element.heatLoss,
                    area: out.roof.area + element.netArea,
                };
                return out;
            }
            case 'window':
            case 'door':
            case 'hatch':
            case 'roof light': {
                out.windowLike = {
                    heatLoss: out.windowLike.heatLoss + element.heatLoss,
                    area: out.windowLike.area + element.spec.area,
                };
                return out;
            }
            case 'party wall': {
                out.partyWall = {
                    heatLoss: out.partyWall.heatLoss + element.heatLoss,
                    area: out.partyWall.area + element.netArea,
                };
                return out;
            }
        }
    }, initialTotals);
};
