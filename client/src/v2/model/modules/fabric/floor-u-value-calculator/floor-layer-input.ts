import { FloorInsulationMaterial } from '../../../../data-schemas/libraries/floor-insulation';
import { FloorLayerSpec } from '../../../../data-schemas/scenario/fabric/floor-u-value';
import { assertNonEmpty } from '../../../../helpers/non-empty-array';
import { Proportion } from '../../../../helpers/proportion';
import { Result } from '../../../../helpers/result';
import { WarningCollector, WithWarnings } from '../../../../helpers/with-warnings';
import { calculateInsulationResistance } from './calculate-insulation-resistance';
import { CombinedMethodInput } from './combined-method';
import {
    RequiredValueMissingError,
    UnnecessaryValueWarning,
    ValuePath,
} from './warnings';

type Bridging = null | {
    material: FloorInsulationMaterial;
    proportion: Proportion;
};
const whole = Proportion.fromRatio(1).unwrap();
export class FloorLayerInput {
    private constructor(
        public readonly thickness: number | null,
        public readonly mainMaterial: FloorInsulationMaterial,
        public readonly bridging: Bridging,
    ) {
        // Invariant: if either mainMaterial or bridgingMaterial is a
        // conductivity material, then thickness is not null
    }

    asCombinedMethodLayer(): CombinedMethodInput['layers'][number] {
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
        );
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
            );
            elements.push({
                name: bridging.material.name,
                resistance: bridgingMaterialResistance,
                proportion: bridging.proportion,
            });
        }
        return { elements: assertNonEmpty(elements) };
    }

    static validate({
        thickness,
        mainMaterial,
        bridging,
    }: FloorLayerSpec): WithWarnings<
        Result<FloorLayerInput, RequiredValueMissingError>,
        UnnecessaryValueWarning
    > {
        const wc = new WarningCollector<UnnecessaryValueWarning>();
        // Check if everything required is present:
        // - Main material is required
        // - If bridging is specified, it must include a proportion
        // - If either main material or bridging (if present) is a
        //   conductivity material, then layer thickness is required,
        //   otherwise it is unnecessary

        function error(pathSuffix: ValuePath) {
            return wc.out(
                Result.err({
                    type: 'required value missing' as const,
                    path: ['floor-layer-input', ...pathSuffix],
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
                    path: ['floor-layer-input', 'thickness'],
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
