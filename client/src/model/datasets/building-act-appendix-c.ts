import {
  ParameterClampWarning,
  ValuePath,
} from '../modules/fabric/floor-u-value-calculator/warnings';
import { TabularFunction, TabularFunctionRangeWarning } from './tabular-function';

const tableC1 = (() => {
  const xValues = [0, 0.5, 1, 1.5, 2];
  const yValues = [
    0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75,
    0.8, 0.85, 0.9, 0.95, 1.0,
  ];
  const table = [
    [0.13, 0.11, 0.1, 0.09, 0.08],
    [0.22, 0.18, 0.16, 0.14, 0.13],
    [0.3, 0.24, 0.21, 0.18, 0.17],
    [0.37, 0.29, 0.25, 0.22, 0.19],
    [0.44, 0.34, 0.28, 0.24, 0.22],
    [0.49, 0.38, 0.31, 0.27, 0.23],
    [0.55, 0.41, 0.34, 0.29, 0.25],
    [0.6, 0.44, 0.36, 0.3, 0.26],
    [0.65, 0.47, 0.38, 0.32, 0.27],
    [0.7, 0.5, 0.4, 0.33, 0.28],
    [0.74, 0.52, 0.41, 0.34, 0.28],
    [0.78, 0.55, 0.43, 0.35, 0.29],
    [0.82, 0.57, 0.44, 0.35, 0.3],
    [0.86, 0.59, 0.45, 0.36, 0.3],
    [0.89, 0.61, 0.46, 0.37, 0.31],
    [0.93, 0.62, 0.47, 0.37, 0.32],
    [0.96, 0.64, 0.47, 0.38, 0.32],
    [0.99, 0.65, 0.48, 0.39, 0.32],
    [1.02, 0.66, 0.49, 0.39, 0.33],
    [1.05, 0.68, 0.5, 0.4, 0.33],
  ];
  return TabularFunction.newChecked(xValues, yValues, table).unwrap();
})();

/** Estimate the U-value of a solid floor with no edge insulation.
 *
 * The floor may have all-over insulation. */
export function solidFloorUValue(
  allOverInsulationResistance: number,
  perimeterAreaRatio: number,
) {
  return tableC1
    .interpolateAtClamped(allOverInsulationResistance, perimeterAreaRatio)
    .mapWarnings(
      transformTabularRangeWarning(
        ['all-over-insulation', 'resistance'],
        ['perimeter-area-ratio'],
      ),
    );
}

const tableC2 = (() => {
  const xValues = [0.5, 1.0, 1.5, 2.0];
  const yValues = [0.5, 1.0, 1.5];
  const table = [
    [-0.13, -0.18, -0.21, -0.22],
    [-0.2, -0.27, -0.32, -0.34],
    [-0.23, -0.33, -0.39, -0.42],
  ];
  return TabularFunction.newChecked(xValues, yValues, table).unwrap();
})();

/** Estimate the edge insulation factor (Ψ) for horizontal edge insulation on a
 * solid floor. */
export function edgeInsulationFactorHorizontal(
  insulationResistance: number,
  insulationWidth: number,
) {
  return tableC2
    .interpolateAtClamped(insulationResistance, insulationWidth)
    .mapWarnings(
      transformTabularRangeWarning(
        ['horizontal-insulation', 'resistance'],
        ['horizontal-insulation', 'width'],
      ),
    );
}

const tableC3 = (() => {
  const xValues = [0.5, 1.0, 1.5, 2.0];
  const yValues = [0.25, 0.5, 0.75, 1.0];
  const table = [
    [-0.13, -0.18, -0.21, -0.22],
    [-0.2, -0.27, -0.32, -0.34],
    [-0.23, -0.33, -0.39, -0.42],
    [-0.26, -0.37, -0.43, -0.48],
  ];
  return TabularFunction.newChecked(xValues, yValues, table).unwrap();
})();

/** Estimate the edge insulation factor (Ψ) for vertical edge insulation on a
 * solid floor. */
export function edgeInsulationFactorVertical(
  insulationResistance: number,
  insulationDepth: number,
) {
  return tableC3
    .interpolateAtClamped(insulationResistance, insulationDepth)
    .mapWarnings(
      transformTabularRangeWarning(
        ['vertical-insulation', 'resistance'],
        ['vertical-insulation', 'depth'],
      ),
    );
}

const tableC4 = (() => {
  const xValues = [0.0015, 0.003];
  const yValues = [
    0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75,
    0.8, 0.85, 0.9, 0.95, 1.0,
  ];
  const table = [
    [0.15, 0.15],
    [0.25, 0.26],
    [0.33, 0.35],
    [0.4, 0.42],
    [0.46, 0.48],
    [0.51, 0.53],
    [0.55, 0.58],
    [0.59, 0.62],
    [0.63, 0.66],
    [0.66, 0.7],
    [0.69, 0.73],
    [0.72, 0.76],
    [0.75, 0.79],
    [0.77, 0.81],
    [0.8, 0.84],
    [0.82, 0.86],
    [0.84, 0.88],
    [0.86, 0.9],
    [0.88, 0.92],
    [0.89, 0.93],
  ];
  return TabularFunction.newChecked(xValues, yValues, table).unwrap();
})();

/** Estimate the U-value of an uninsulated suspended floor */
export function suspendedFloorUninsulatedUValue(
  ventilationAreaPerimeterRatio: number,
  perimeterAreaRatio: number,
) {
  return tableC4
    .interpolateAtClamped(ventilationAreaPerimeterRatio, perimeterAreaRatio)
    .mapWarnings(
      transformTabularRangeWarning(
        ['under-floor-ventilation-perimeter-ratio'],
        ['perimeter-area-ratio'],
      ),
    );
}

const tableC5 = (() => {
  const xValues = [0.5, 1, 1.5, 2, 2.5];
  const yValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const table = [
    [0.2, 0.19, 0.18, 0.17, 0.16],
    [0.34, 0.31, 0.29, 0.27, 0.26],
    [0.44, 0.41, 0.38, 0.35, 0.33],
    [0.53, 0.48, 0.44, 0.41, 0.38],
    [0.61, 0.55, 0.5, 0.46, 0.43],
    [0.68, 0.61, 0.55, 0.5, 0.46],
    [0.74, 0.65, 0.59, 0.53, 0.49],
    [0.79, 0.7, 0.62, 0.56, 0.51],
    [0.84, 0.73, 0.65, 0.58, 0.53],
    [0.89, 0.77, 0.68, 0.6, 0.54],
  ];
  return TabularFunction.newChecked(xValues, yValues, table).unwrap();
})();

/** Estimate the U-value of an uninsulated basement floor */
export function basementFloorUninsulatedUValue(
  basementDepth: number,
  perimeterAreaRatio: number,
) {
  return tableC5
    .interpolateAtClamped(basementDepth, perimeterAreaRatio)
    .mapWarnings(transformTabularRangeWarning(['depth'], ['perimeter-area-ratio']));
}

function transformTabularRangeWarning(xPath: ValuePath, yPath: ValuePath) {
  return (warning: TabularFunctionRangeWarning): ParameterClampWarning => ({
    type: 'parameter clamped',
    path: warning.dimension === 'x' ? xPath : yPath,
    value: warning.value,
    clampedTo: warning.clampedTo,
  });
}
