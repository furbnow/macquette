import type { CompleteWallMeasure } from '../../input-components/libraries';

type AreaSpecSpecific = {
  area: number | null;
};
type AreaSpecDimensions = {
  area: number | null;
  length: number | null;
  height: number | null;
};
export type AreaSpec = {
  type: 'specific' | 'dimensions';
  specific: AreaSpecSpecific;
  dimensions: AreaSpecDimensions;
};

type MeasureData = {
  associated_work: string;
  benefits: string;
  min_cost: number;
  cost: number;
  cost_units: 'sqm';
  disruption: string;
  EWI: boolean;
  key_risks: string;
  maintenance: string;
  notes: string;
  performance: string;
  who_by: string;
};
type MeasureOutputs = {
  costQuantity: number;
  costTotal: number;
};

export type WallType = 'external wall' | 'party wall' | 'loft' | 'roof';
type WallLibraryElement = {
  tag: string;
  type: WallType;
  name: string;
  description: string | null;
  source: string;
  uvalue: number;
  kvalue: number;
};
type WallLibraryMeasure = WallLibraryElement & MeasureData;
type AppliedWallBase = {
  id: string | number;
  inputs: {
    location: string;
    area: AreaSpec;
  };
  revertTo: WallLike | null;
};
type AppliedWallElement = AppliedWallBase & {
  type: 'element';
  element: WallLibraryElement | WallLibraryMeasure;
  outputs: {
    windowArea: number | null;
    netArea: number | null;
    heatLoss: number | null;
  };
};
export type AppliedWallMeasure = AppliedWallBase & {
  type: 'measure';
  element: WallLibraryMeasure;
  outputs: AppliedWallElement['outputs'] & MeasureOutputs;
};
export type WallLike = AppliedWallElement | AppliedWallMeasure;

export type State = {
  thermalMassParameter: 'no override' | 'low' | 'medium' | 'high';

  walls: WallLike[];

  bulkMeasures: { id: string | number; appliesTo: (string | number)[] }[];
  maxId: number;
  deletedElement: string | number | null;
  justInserted: string | number | null;

  currentScenarioIsBaseline: boolean;
  modal:
    | {
        type: 'add wall' | 'select wall bulk measure';
        elementType: WallType;
      }
    | {
        type: 'replace wall' | 'apply wall measure';
        elementType: WallType;
        id: string | number;
      }
    | {
        type: 'select wall bulk measure elements';
        measure: CompleteWallMeasure;
      }
    | null;
  locked: boolean;
};

export function initialState(): State {
  return {
    thermalMassParameter: 'no override',
    maxId: 0,
    walls: [],
    deletedElement: null,
    justInserted: null,
    currentScenarioIsBaseline: false,
    bulkMeasures: [],
    modal: null,
    locked: false,
  };
}
