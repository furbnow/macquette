export type ValuePath = (string | number)[];

export type RequiredValueMissingError = {
  type: 'required value missing';
  path: ValuePath;
};

export type ParameterClampWarning = {
  type: 'parameter clamped';
  path: ValuePath;
  value: number;
  clampedTo: number;
};

export type NonFiniteNumberReplacementError = {
  type: 'non-finite number replaced';
  path: ValuePath;
  replacedWith: number;
};

export type UnnecessaryValueWarning = {
  type: 'unnecessary value';
  path: ValuePath;
  value: number;
};

export type FloorUValueWarning =
  | RequiredValueMissingError
  | ParameterClampWarning
  | NonFiniteNumberReplacementError
  | UnnecessaryValueWarning;

export function severity(warning: FloorUValueWarning): 'high' | 'low' {
  switch (warning.type) {
    case 'required value missing':
    case 'non-finite number replaced':
      return 'high';
    case 'parameter clamped':
    case 'unnecessary value':
      return 'low';
  }
}
