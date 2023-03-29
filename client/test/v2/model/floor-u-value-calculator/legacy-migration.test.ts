import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { z } from 'zod';

import { fabric, Floor } from '../../../../src/v2/data-schemas/scenario/fabric';
import { featureFlags } from '../../../../src/v2/helpers/feature-flags';
import { Region } from '../../../../src/v2/model/enums/region';
import {
    extractFabricInputFromLegacy,
    Fabric,
} from '../../../../src/v2/model/modules/fabric';
import { sensibleFloat } from '../../arbitraries/legacy-values';
import {
    arbFloorType,
    arbPerFloorTypeSpec,
} from '../../arbitraries/scenario/floor-u-value-calculator/scenario-spec';

const arbCompleteFloorElement = fc
    .record({
        uvalue: sensibleFloat,
        area: sensibleFloat,
        perimeter: sensibleFloat,
        selectedFloorType: arbFloorType,
        perFloorTypeSpec: arbPerFloorTypeSpec,
    })
    .map(({ uvalue, area, perimeter, selectedFloorType, perFloorTypeSpec }): Floor => {
        return {
            type: 'floor',
            source: '',
            name: '',
            description: '',
            location: '',
            lib: '',
            id: 1,
            kvalue: 1,
            uvalue,
            area,
            perimeter,
            selectedFloorType,
            perFloorTypeSpec,
        };
    });

describe('the Floor fabric element class', () => {
    describe('when the feature flag is enabled', () => {
        test('mutates .uvalue according to the new properties', () => {
            featureFlags.withFeature('new-fuvc', true, () => {
                fc.assert(
                    fc.property(arbCompleteFloorElement, (floor) => {
                        const fabricScenarioSection: z.infer<typeof fabric> = {
                            thermal_bridging_yvalue: 0,
                            elements: [floor],
                        };
                        const fabricModelInput = extractFabricInputFromLegacy({
                            fabric: fabricScenarioSection,
                        });
                        const fabricModel = new Fabric(fabricModelInput, {
                            region: Region.all[0]!,
                            floors: {
                                totalFloorArea: 0,
                            },
                        });
                        const scenario = {
                            losses_WK: {},
                            gains_W: {},
                            fabric: fabricScenarioSection,
                        };
                        const toMutate = cloneDeep(scenario);
                        delete (toMutate as any).fabric.elements[0].uvalue;
                        fabricModel.mutateLegacyData(toMutate);
                        expect(toMutate.fabric.elements![0]!.uvalue).toBeDefined();
                    }),
                );
            });
        });
    });
    describe('when the feature flag is disabled', () => {
        test('sets .uvalue according to input element .uvalue', () => {
            featureFlags.withFeature('new-fuvc', false, () => {
                fc.assert(
                    fc.property(arbCompleteFloorElement, (floor) => {
                        const fabricScenarioSection: z.infer<typeof fabric> = {
                            thermal_bridging_yvalue: 0,
                            elements: [floor],
                        };
                        const fabricModelInput = extractFabricInputFromLegacy({
                            fabric: fabricScenarioSection,
                        });
                        const fabricModel = new Fabric(fabricModelInput, {
                            region: Region.all[0]!,
                            floors: {
                                totalFloorArea: 0,
                            },
                        });
                        const scenario = {
                            losses_WK: {},
                            gains_W: {},
                            fabric: fabricScenarioSection,
                        };
                        const toMutate = cloneDeep(scenario);
                        delete (toMutate as any).fabric.elements[0].uvalue;
                        fabricModel.mutateLegacyData(toMutate);
                        expect(toMutate.fabric.elements![0]!.uvalue).toBe(
                            scenario.fabric.elements![0]!.uvalue,
                        );
                    }),
                );
            });
        });
    });
});
