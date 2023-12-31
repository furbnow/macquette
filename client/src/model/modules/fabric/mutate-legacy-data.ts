import type { Fabric } from '.';
import { sum } from '../../../helpers/array-reducers';
import { Month } from '../../enums/month';
import { ModelError } from '../../error';
import { Floor, grossArea, Hatch, netArea, WallLike, WindowLike } from './element-types';

/* eslint-disable
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/no-unsafe-argument,
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/consistent-type-assertions,
*/
export function mutateLegacyData(fabric: Fabric, data: any) {
  if (data.fabric === undefined) {
    data.fabric = {};
  }
  if (data.fabric.elements === undefined) {
    data.fabric.elements = [];
  }
  if (data.fabric.thermal_bridging_yvalue === undefined) {
    data.fabric.thermal_bridging_yvalue = fabric.thermalBridgingAverageConductivity;
  }
  if (data.fabric.global_TMP === undefined) {
    data.fabric.global_TMP = fabric.input.overrides.thermalMassParameter !== null;
  }
  if (
    data.fabric.global_TMP_value === undefined ||
    data.fabric.global_TMP_value === null
  ) {
    data.fabric.global_TMP_value = fabric.input.overrides.thermalMassParameter ?? 250;
  }
  data.fabric_total_heat_loss_WK = fabric.heatLoss;
  data.fabric.total_heat_loss_WK = fabric.heatLoss;
  data.fabric.total_thermal_capacity = sum(
    fabric.flatElements.map((e) => e.thermalCapacity),
  );

  for (const legacyElement of data.fabric.elements) {
    const newStyleElement = fabric.getElementById(legacyElement.id);
    if (newStyleElement === null) {
      throw new ModelError('Failed to match legacy element with new-style element', {
        legacyElement,
        fabric,
      });
    }
    const legacyModelWouldCalculateArea =
      legacyElement.h !== undefined &&
      legacyElement.h !== '' &&
      legacyElement.h !== 0 &&
      legacyElement.l !== undefined &&
      legacyElement.l !== '' &&
      legacyElement.l !== 0;
    if (legacyModelWouldCalculateArea) {
      legacyElement.area = grossArea(newStyleElement);
    }
    legacyElement.netarea = netArea(newStyleElement);
    if (
      !(newStyleElement instanceof WindowLike) &&
      !(newStyleElement instanceof WallLike) &&
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
    if (newStyleElement instanceof Floor) {
      if (newStyleElement.spec.perFloorTypeSpec !== null) {
        legacyElement.uvalue = newStyleElement.uValue;
      }
    }
    legacyElement.wk = newStyleElement.heatLoss;
  }
  data.fabric.total_floor_WK = fabric.heatLossTotals.floor;
  data.fabric.total_wall_WK = fabric.heatLossTotals.externalWall;
  data.fabric.total_roof_WK = fabric.heatLossTotals.roof;
  data.fabric.total_window_WK = fabric.heatLossTotals.windowLike;
  data.fabric.total_party_wall_WK = fabric.heatLossTotals.partyWall;
  data.fabric.total_external_area = fabric.externalArea;
  data.fabric.total_wall_area = fabric.areaTotals.externalWall;
  data.fabric.total_floor_area = fabric.areaTotals.floor;
  data.fabric.total_roof_area = fabric.areaTotals.roof;
  data.fabric.total_window_area = fabric.areaTotals.windowLike;
  data.fabric.total_party_wall_area = fabric.areaTotals.partyWall;

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
}
/* eslint-enable */
