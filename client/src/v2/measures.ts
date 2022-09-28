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
