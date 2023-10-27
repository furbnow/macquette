import type { Scenario } from './data-schemas/scenario';
import type { GenericMeasure } from './data-schemas/scenario/measures';

type CalcInputs =
  | {
      costUnits: 'sqm';
      area: number;
      costPerUnit: number;
      baseCost: number;
      isExternalWallInsulation: boolean;
    }
  | {
      perimeter: number;
      costUnits: 'ln m';
      costPerUnit: number;
      baseCost: number;
    }
  | {
      costUnits: 'unit';
      costPerUnit: number;
      baseCost: number;
    };

export function calcMeasureQtyAndCost(inputs: CalcInputs): [number, number] {
  let quantity = 1;

  if (inputs.costUnits === 'sqm') {
    // We use area rather than net area here, the idea being that the cost of the
    // area where the windows are, which you're not covering with EWI, is roughly
    // equivalent to the costs of the detailing around the windows - beads, trims,
    // cills etc.
    if (inputs.isExternalWallInsulation === true) {
      // We apply a multiple here because surveys use the internal dimensions of
      // the house, but EWI is applied to the external surface, and should also
      // run past at floor junctions etc.
      quantity = 1.15 * inputs.area;
    } else {
      quantity = inputs.area;
    }
  } else if (inputs.costUnits === 'ln m') {
    quantity = inputs.perimeter;
  }

  let totalCost = inputs.baseCost + quantity * inputs.costPerUnit;
  totalCost = parseFloat(totalCost.toFixed(2));

  return [quantity, totalCost];
}

export function reverseCalcQuantity(
  baseCost: number,
  costPerUnit: number,
  totalCost: number,
) {
  if (costPerUnit === 0) {
    return 0;
  }

  const withoutBaseCost = totalCost - baseCost;
  const result = withoutBaseCost / costPerUnit;

  if (result < 0) {
    return 1;
  } else {
    return result;
  }
}

function normalisePerformance(performance: string) {
  return performance
    .replace('WK.m2', 'W/m²·K')
    .replace('W/K.m2', 'W/m²·K')
    .replace('m3m2.hr50pa', 'm³/m²·hr50pa')
    .replace('m3/m2.hr50pa', 'm³/m²·hr50pa')
    .replace('W/msup2/sup.K', ' W/m²·K')
    .replace('msup3/sup/msup2/sup.hr50pa', 'm³/m²·hr50pa')
    .replace('na', 'n/a');
}

function normaliseLocation(location: string) {
  if (location === '') {
    return 'Whole house';
  }

  // Due to a historical mess, sometimes measure.location includes either '<br>' or
  // 'br'.  This should be normalised to whitespace.
  // This used to happen on bulk measures.
  location = location.replace(/,br/g, ', ').replace(/,<br>/g, ', ').trim();

  // The code used to also put excess commas at the ends of things.
  if (location[location.length - 1] === ',') {
    location = location.substring(0, location.length - 1);
  }

  return location;
}

function normaliseDisruption(disruption: string) {
  return disruption.replace('MEDIUMHIGH', 'MEDIUM / HIGH');
}

function normaliseCost(cost: number) {
  function roundToNearest(val: number, to: number) {
    return Math.ceil(val / to) * to;
  }

  if (cost < 500) {
    return roundToNearest(cost, 5);
  } else if (cost < 5000) {
    return roundToNearest(cost, 50);
  } else {
    return roundToNearest(cost, 500);
  }
}

function single(measure: GenericMeasure | undefined) {
  if (measure === undefined) {
    return [];
  } else {
    return [measure];
  }
}

function nested(measures: Record<string, { measure: GenericMeasure }> | undefined) {
  if (measures === undefined) {
    return [];
  } else {
    return Object.values(measures).map((row) => row.measure);
  }
}

function fabric(scenario: Scenario): GenericMeasure[] {
  const measures = scenario?.fabric?.measures;
  if (measures === undefined) {
    return [];
  } else {
    return Object.values(measures).map((row) => ({
      ...row.measure,
      cost_total: row.measure.cost_total ?? 0,
      quantity: row.measure.quantity ?? 0,
    }));
  }
}

function getScenarioMeasures(scenario: Scenario): GenericMeasure[] {
  const measures = [
    ...fabric(scenario),
    ...nested(scenario?.measures?.ventilation?.extract_ventilation_points),
    ...nested(scenario?.measures?.ventilation?.intentional_vents_and_flues_measures),
    ...single(scenario?.measures?.ventilation?.draught_proofing_measures?.measure),
    ...single(scenario?.measures?.ventilation?.ventilation_systems_measures?.measure),
    ...nested(scenario?.measures?.ventilation?.clothes_drying_facilities),
    ...nested(scenario?.measures?.water_heating?.water_usage),
    ...single(scenario?.measures?.water_heating?.storage_type_measures?.measure),
    ...single(scenario?.measures?.water_heating?.pipework_insulation?.measure),
    ...single(scenario?.measures?.water_heating?.hot_water_control_type?.measure),
    ...single(scenario?.measures?.LAC?.lighting?.measure),
    ...single(
      scenario?.use_generation === true
        ? scenario?.measures?.PV_generation?.measure
        : undefined,
    ),
    ...nested(scenario?.measures?.space_heating_control_type),
    ...nested(scenario?.measures?.heating_systems),
  ];

  return measures.map((measure, idx) => ({
    num: idx + 1,
    associated_work: measure.associated_work,
    benefits: measure.benefits,
    cost: measure.cost,
    cost_total: normaliseCost(measure.cost_total),
    cost_units: measure.cost_units,
    min_cost: measure.min_cost,
    description: measure.description,
    disruption: normaliseDisruption(measure.disruption),
    key_risks: measure.key_risks,
    location: normaliseLocation(measure.location),
    maintenance: measure.maintenance,
    name: measure.name,
    notes: measure.notes,
    performance: normalisePerformance(measure.performance),
    quantity: measure.quantity,
    who_by: measure.who_by,
  }));
}

export function totalCostOfMeasures(scenario: Scenario) {
  return getScenarioMeasures(scenario)
    .map((row) => row.cost_total)
    .reduce((prev, curr) => prev + curr, 0);
}
