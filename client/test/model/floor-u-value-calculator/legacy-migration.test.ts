import fc from 'fast-check';
import { cloneDeep } from 'lodash';
import { z } from 'zod';

import { fabric, Floor } from '../../../src/data-schemas/scenario/fabric';
import { Region } from '../../../src/model/enums/region';
import { extractFabricInputFromLegacy, Fabric } from '../../../src/model/modules/fabric';
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
    test('mutates .uvalue according to the new properties', () => {
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
