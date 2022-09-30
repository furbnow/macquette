import { FloorInsulationMaterial } from '../../../../data-schemas/libraries/floor-insulation';
import {
    FloorLayerSpec,
    FloorUValueWarning,
} from '../../../../data-schemas/scenario/fabric/floor-u-value';
import {
    RequiredValueMissingError,
    ValuePath,
} from '../../../../data-schemas/scenario/validation';
import { prependPath } from '../../../../helpers/error-warning-path';
import { assertNonEmpty } from '../../../../helpers/non-empty-array';
import { Proportion } from '../../../../helpers/proportion';
import { Result } from '../../../../helpers/result';
import { WarningCollector, WithWarnings } from '../../../../helpers/with-warnings';
import { calculateInsulationResistance } from './calculate-insulation-resistance';
import { CombinedMethodInput } from './combined-method';

type Bridging = null | {
    material: FloorInsulationMaterial;
    proportion: Proportion;
};
const whole = Proportion.fromRatio(1).unwrap();
export class FloorLayerInput {
    private constructor(
        private thickness: number | null,
        private mainMaterial: FloorInsulationMaterial,
        private bridging: Bridging,
    ) {
        // Invariant: if either mainMaterial or bridgingMaterial is a
        // conductivity material, then thickness is not null
    }

    asCombinedMethodLayer(): WithWarnings<
        CombinedMethodInput['layers'][number],
        FloorUValueWarning
    > {
        const wc = new WarningCollector<FloorUValueWarning>();
        const elements: CombinedMethodInput['layers'][number]['elements'][number][] = [];
        const { thickness, mainMaterial, bridging } = this;
        const mainMaterialResistance = calculateInsulationResistance(
            mainMaterial.mechanism === 'conductivity'
                ? {
                      mechanism: 'conductivity' as const,
                      material: mainMaterial,
                      // SAFETY: By the class invariant
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      thickness: thickness!,
                  }
                : { mechanism: 'resistance' as const, material: mainMaterial },
        )
            .mapWarnings(prependPath(['main-material']))
            .unwrap(wc.sink());
        elements.push({
            name: mainMaterial.name,
            resistance: mainMaterialResistance,
            proportion: bridging === null ? whole : bridging.proportion.complement,
        });
        if (bridging !== null) {
            const bridgingMaterialResistance = calculateInsulationResistance(
                bridging.material.mechanism === 'conductivity'
                    ? {
                          mechanism: 'conductivity' as const,
                          material: bridging.material,
                          // SAFETY: By the class invariant
                          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                          thickness: thickness!,
                      }
                    : {
                          mechanism: 'resistance' as const,
                          material: bridging.material,
                      },
            )
                .mapWarnings(prependPath(['bridging-material']))
                .unwrap(wc.sink());
            elements.push({
                name: bridging.material.name,
                resistance: bridgingMaterialResistance,
                proportion: bridging.proportion,
            });
        }
        return wc.out({ elements: assertNonEmpty(elements) });
    }

    static validate({
        thickness,
        mainMaterial,
        bridging,
    }: FloorLayerSpec): WithWarnings<
        Result<FloorLayerInput, RequiredValueMissingError>,
        FloorUValueWarning
    > {
        const wc = new WarningCollector<FloorUValueWarning>();
        // Check if everything required is present:
        // - Main material is required
        // - If bridging is specified, it must include a proportion
        // - If either main material or bridging (if present) is a
        //   conductivity material, then layer thickness is required,
        //   otherwise it is unnecessary

        function error(pathSuffix: ValuePath) {
            return wc.out(
                Result.err({
                    type: 'required value missing error' as const,
                    namespace: 'floor u-value calculator' as const,
                    path: pathSuffix,
                }),
            );
        }
        if (mainMaterial === null) {
            return error(['main-material']);
        }
        let validatedBridging: Bridging;
        if (bridging.material !== null) {
            if (bridging.proportion === null) {
                // Material was non-null but proportion was null
                return error(['bridging', 'proportion']);
            } else {
                validatedBridging = {
                    material: bridging.material,
                    proportion: bridging.proportion,
                };
            }
        } else {
            validatedBridging = null;
        }

        if (
            mainMaterial.mechanism === 'conductivity' ||
            validatedBridging?.material.mechanism === 'conductivity'
        ) {
            if (thickness === null) {
                return error(['thickness']);
            } else {
                return wc.out(
                    Result.ok(
                        new FloorLayerInput(thickness, mainMaterial, validatedBridging),
                    ),
                );
            }
        } else {
            if (thickness !== null) {
                wc.log({
                    type: 'unnecessary value',
                    namespace: 'floor u-value calculator',
                    path: ['thickness'],
                    value: thickness,
                });
            }
            return wc.out(
                Result.ok(
                    new FloorLayerInput(thickness, mainMaterial, validatedBridging),
                ),
            );
        }
    }
}
