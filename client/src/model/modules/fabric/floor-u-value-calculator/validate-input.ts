import {
  CustomFloorSpec,
  ExposedFloorSpec,
  FloorLayerSpec,
  FloorType,
  HeatedBasementFloorSpec,
  InsulationSpec,
  PerFloorTypeSpec,
  SolidFloorBS13370Spec,
  SolidFloorTablesSpec,
  SuspendedFloorSpec,
} from '../../../../data-schemas/scenario/fabric/floor-u-value';
import { assertNever } from '../../../../helpers/assert-never';
import { withPathPrefix } from '../../../../helpers/error-warning-path';
import { NonEmptyArray, assertNonEmpty } from '../../../../helpers/non-empty-array';
import { Result } from '../../../../helpers/result';
import { WarningCollector, WithWarnings } from '../../../../helpers/with-warnings';
import { FloorLayerInput } from './floor-layer-input';
import {
  CustomFloorInput,
  ExposedFloorInput,
  FloorUValueModelInput,
  HeatedBasementFloorInput,
  InsulationInput,
  SolidFloorBS13370Input,
  SolidFloorTablesInput,
  SuspendedFloorInput,
} from './input-types';
import {
  RequiredValueMissingError,
  UnnecessaryValueWarning,
  ValuePath,
} from './warnings';

type ValidationResult<T> = WithWarnings<
  Result<T, RequiredValueMissingError>,
  UnnecessaryValueWarning
>;

function valueMissingError(
  path: ValuePath,
): WithWarnings<Result<never, RequiredValueMissingError>, never> {
  return WithWarnings.empty(
    Result.err({
      type: 'required value missing' as const,
      path,
    }),
  );
}

type CommonSpec = {
  area: number;
  exposedPerimeter: number;
};
export function validate(
  selectedFloorType: FloorType,
  common: CommonSpec,
  spec: PerFloorTypeSpec,
): WithWarnings<
  FloorUValueModelInput,
  RequiredValueMissingError | UnnecessaryValueWarning
> {
  return validatePerFloorType(common, selectedFloorType, spec).chain((res) => {
    if (!res.isOk()) {
      return WithWarnings.single(
        {
          common: { area: common.area },
          perFloorType: {
            floorType: 'custom' as const,
            uValue: 0,
          },
        },
        res.unwrapErr(),
      );
    } else {
      return WithWarnings.empty({
        common: { area: common.area },
        perFloorType: res.coalesce(),
      });
    }
  });
}

function validatePerFloorType(
  common: CommonSpec,
  selectedFloorType: FloorType,
  spec: PerFloorTypeSpec,
): ValidationResult<FloorUValueModelInput['perFloorType']> {
  switch (selectedFloorType) {
    case 'custom':
      return validateCustomFloor(spec.custom);
    case 'solid':
      return validateSolidFloorTables(common, spec.solid);
    case 'solid (bs13370)':
      return validateSolidFloorBs13370(common, spec['solid (bs13370)']);
    case 'suspended':
      return validateSuspendedFloor(spec.suspended);
    case 'heated basement':
      return validateHeatedBasementFloor(common, spec['heated basement']);
    case 'exposed':
      return validateExposedFloor(spec.exposed);
  }
}

function validateCustomFloor(spec: CustomFloorSpec): ValidationResult<CustomFloorInput> {
  const { uValue } = spec;
  if (uValue === null) {
    return valueMissingError(['custom', 'uValue']);
  } else {
    return WithWarnings.empty(Result.ok({ floorType: 'custom', uValue }));
  }
}

function validateSolidFloorTables(
  { exposedPerimeter }: CommonSpec,
  spec: SolidFloorTablesSpec,
): ValidationResult<SolidFloorTablesInput> {
  const wc = new WarningCollector<UnnecessaryValueWarning>();
  let allOverInsulation: SolidFloorTablesInput['allOverInsulation'];
  if (!spec.allOverInsulation.enabled) {
    allOverInsulation = null;
  } else {
    const res = withPathPrefix(
      ['solid (tables)', 'all-over-insulation'],
      validateInsulation(spec.allOverInsulation),
    ).unwrap(wc.sink());
    if (res.isErr()) {
      return wc.out(res);
    }
    allOverInsulation = res.unwrap();
  }
  let edgeInsulation: SolidFloorTablesInput['edgeInsulation'];
  switch (spec.edgeInsulation.selected) {
    case null:
      edgeInsulation = { type: 'none' };
      break;
    case 'vertical': {
      const res = withPathPrefix(
        ['solid (tables)', 'edge-insulation', 'vertical'],
        validateInsulation(spec.edgeInsulation.vertical),
      ).unwrap(wc.sink());
      if (res.isErr()) {
        return wc.out(res);
      }
      const verticalInsulation = res.unwrap();
      const { depth } = verticalInsulation;
      if (depth === null) {
        return valueMissingError([
          'solid (tables)',
          'edge-insulation',
          'vertical',
          'depth',
        ]);
      }
      edgeInsulation = {
        type: 'vertical',
        ...verticalInsulation,
        depth,
      };
      break;
    }
    case 'horizontal': {
      const res = withPathPrefix(
        ['solid (tables)', 'edge-insulation', 'horizontal'],
        validateInsulation(spec.edgeInsulation.horizontal),
      ).unwrap(wc.sink());
      if (res.isErr()) {
        return wc.out(res);
      }
      const horizontalInsulation = res.unwrap();
      const { width } = horizontalInsulation;
      if (width === null) {
        return valueMissingError([
          'solid (tables)',
          'edge-insulation',
          'horizontal',
          'width',
        ]);
      }
      edgeInsulation = {
        type: 'horizontal',
        ...horizontalInsulation,
        width,
      };
      break;
    }
  }
  return WithWarnings.empty(
    Result.ok({
      ...spec,
      exposedPerimeter,
      floorType: 'solid',
      allOverInsulation,
      edgeInsulation,
    }),
  );
}

function validateSolidFloorBs13370(
  { exposedPerimeter }: CommonSpec,
  spec: SolidFloorBS13370Spec,
): ValidationResult<SolidFloorBS13370Input> {
  const wc = new WarningCollector<UnnecessaryValueWarning>();
  let edgeInsulation: SolidFloorBS13370Input['edgeInsulation'];
  switch (spec.edgeInsulation.selected) {
    case null:
      edgeInsulation = { type: 'none' };
      break;
    case 'vertical': {
      const insulationR = withPathPrefix(
        ['solid (bs13370)', 'edge-insulation', 'vertical'],
        validateInsulation(spec.edgeInsulation.vertical),
      ).unwrap(wc.sink());
      if (insulationR.isErr()) {
        return wc.out(insulationR);
      }
      const verticalInsulation = insulationR.unwrap();
      const { depth, thickness } = verticalInsulation;
      if (depth === null) {
        return valueMissingError([
          'solid (bs13370)',
          'edge-insulation',
          'vertical',
          'depth',
        ]);
      }
      if (thickness === null) {
        return valueMissingError([
          'solid (bs13370)',
          'edge-insulation',
          'vertical',
          'thickness',
        ]);
      }
      edgeInsulation = {
        type: 'vertical',
        ...verticalInsulation,
        depth,
        thickness,
      };
      break;
    }
    case 'horizontal': {
      const insulationR = withPathPrefix(
        ['solid (bs13370)', 'edge-insulation', 'horizontal'],
        validateInsulation(spec.edgeInsulation.horizontal),
      ).unwrap(wc.sink());
      if (insulationR.isErr()) {
        return wc.out(insulationR);
      }
      const horizontalInsulation = insulationR.unwrap();
      const { width, thickness } = horizontalInsulation;
      if (width === null) {
        return valueMissingError([
          'solid (bs13370)',
          'edge-insulation',
          'horizontal',
          'width',
        ]);
      }
      if (thickness === null) {
        return valueMissingError([
          'solid (bs13370)',
          'edge-insulation',
          'horizontal',
          'thickness',
        ]);
      }
      edgeInsulation = {
        type: 'horizontal',
        ...horizontalInsulation,
        width,
        thickness,
      };
      break;
    }
  }

  const layersR = withPathPrefix(
    ['solid (bs13370)'],
    validateCombinedMethodLayers(spec.layers),
  ).unwrap(wc.sink());
  if (layersR.isErr()) {
    return wc.out(layersR);
  }

  let groundConductivity: SolidFloorBS13370Input['groundConductivity'];
  const { groundType } = spec.groundConductivity;
  if (groundType === 'custom') {
    const { customValue } = spec.groundConductivity;
    if (customValue === null) {
      return valueMissingError([
        'solid (bs13370)',
        'ground-conductivity',
        'custom-value',
      ]);
    }
    groundConductivity = customValue;
  } else {
    groundConductivity = groundType;
  }

  const { wallThickness } = spec;
  if (wallThickness === null) {
    return valueMissingError(['solid (bs13370)', 'wall-thickness']);
  }

  return WithWarnings.empty(
    Result.ok({
      ...spec,
      exposedPerimeter,
      floorType: 'solid (bs13370)',
      edgeInsulation,
      layers: layersR.unwrap(),
      groundConductivity,
      wallThickness,
    }),
  );
}

function validateCombinedMethodLayers(
  layersSpec: NonEmptyArray<FloorLayerSpec>,
): ValidationResult<NonEmptyArray<FloorLayerInput>> {
  const wc = new WarningCollector<UnnecessaryValueWarning>();
  return wc.out(
    Result.mapArray<FloorLayerSpec, FloorLayerInput, RequiredValueMissingError>(
      layersSpec,
      (spec, index) =>
        withPathPrefix(
          ['combined-method-layers', index],
          FloorLayerInput.validate(spec),
        ).unwrap(wc.sink()),
    ).map(assertNonEmpty),
  );
}

function validateSuspendedFloor(
  spec: SuspendedFloorSpec,
): ValidationResult<SuspendedFloorInput> {
  const wc = new WarningCollector<UnnecessaryValueWarning>();
  const { ventilationCombinedArea, underFloorSpacePerimeter } = spec;
  if (ventilationCombinedArea === null) {
    return valueMissingError(['suspended', 'ventilation-combined-area']);
  }
  if (underFloorSpacePerimeter === null) {
    return valueMissingError(['suspended', 'under-floor-space-perimeter']);
  }
  const layersR = withPathPrefix(
    ['suspended'],
    validateCombinedMethodLayers(spec.layers),
  );
  return wc.out(
    layersR.unwrap(wc.sink()).map((layers) => ({
      floorType: 'suspended',
      ventilationCombinedArea,
      underFloorSpacePerimeter,
      layers,
    })),
  );
}

function validateHeatedBasementFloor(
  { exposedPerimeter }: CommonSpec,
  spec: HeatedBasementFloorSpec,
): ValidationResult<HeatedBasementFloorInput> {
  const wc = new WarningCollector<UnnecessaryValueWarning>();
  const { basementDepth } = spec;
  if (basementDepth === null) {
    return valueMissingError(['heated-basement', 'depth']);
  }
  if (!spec.insulation.enabled) {
    return WithWarnings.empty(
      Result.ok({
        floorType: 'heated basement',
        exposedPerimeter,
        basementDepth,
        insulation: null,
      }),
    );
  }
  const res = withPathPrefix(
    ['heated-basement'],
    validateInsulation(spec.insulation),
  ).unwrap(wc.sink());
  if (res.isErr()) {
    return wc.out(res);
  }
  const insulation = res.unwrap();
  return WithWarnings.empty(
    Result.ok({
      floorType: 'heated basement',
      exposedPerimeter,
      basementDepth,
      insulation,
    }),
  );
}

function validateExposedFloor(
  spec: ExposedFloorSpec,
): ValidationResult<ExposedFloorInput> {
  const wc = new WarningCollector<UnnecessaryValueWarning>();
  const { exposedTo } = spec;
  if (exposedTo === null) {
    return valueMissingError(['exposed', 'exposed-to']);
  }
  const layersR: ValidationResult<ExposedFloorInput['layers']> = withPathPrefix(
    ['exposed'],
    validateCombinedMethodLayers(spec.layers),
  );
  return wc.out(
    layersR.unwrap(wc.sink()).map((layers) => ({
      floorType: 'exposed',
      exposedTo,
      layers,
    })),
  );
}

function validateInsulation<T extends InsulationSpec>(
  spec: T,
): ValidationResult<T & InsulationInput> {
  const { thickness, material } = spec;
  if (material === null) {
    return valueMissingError(['insulation', 'material']);
  }
  if (material.mechanism === 'conductivity') {
    if (thickness === null) {
      return valueMissingError(['insulation', 'thickness']);
    }
    return WithWarnings.empty(
      Result.ok({ ...spec, mechanism: 'conductivity', thickness, material }),
    );
  } else if (material.mechanism === 'resistance') {
    return WithWarnings.empty(Result.ok({ ...spec, mechanism: 'resistance', material }));
  } else {
    return assertNever(material);
  }
}
