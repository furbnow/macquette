import { z } from 'zod';

import { projectSchema } from '../../../data-schemas/project';
import { Scenario } from '../../../data-schemas/scenario';
import { Floor as FloorData } from '../../../data-schemas/scenario/fabric';
import { Result } from '../../../helpers/result';
import { CombinedModules } from '../../../model/combined-modules';
import { Floor as FloorModel } from '../../../model/modules/fabric/element-types';
import { Externals } from '../../../shims/typed-globals';

export function extractFloorDataElement(
    scenario: Scenario,
    elementId: string,
): Result<FloorData, Error> {
    const parsedElementId = parseFloat(elementId);
    const element = scenario?.fabric?.elements?.find(
        (elem) => elem.id === parsedElementId,
    );
    if (element === undefined) {
        return Result.err(
            new Error(
                `Could not find a fabric data element with the provided ID: ${elementId}`,
            ),
        );
    }
    if (element.type !== 'floor') {
        return Result.err(
            new Error(`Fabric data element with ID ${elementId} was not a floor`),
        );
    }

    return Result.ok(element);
}

export function extractFloorModelElement(
    model: CombinedModules,
    elementId: string,
): Result<FloorModel, Error> {
    const parsedElementId = parseFloat(elementId);
    const element = model.fabric.getElementById(parsedElementId);
    if (element === null) {
        return Result.err(
            new Error(
                `Could not find a fabric model element with the provided ID: ${elementId}`,
            ),
        );
    }
    if (!(element instanceof FloorModel)) {
        return Result.err(
            new Error(`Fabric model element with ID ${elementId} was not a floor`),
        );
    }
    return Result.ok(element);
}

export function extractRawFloorElement(
    { project, scenarioId }: Pick<Externals, 'project' | 'scenarioId'>,
    elementId: string,
) {
    /* eslint-disable
       @typescript-eslint/consistent-type-assertions,
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-assignment,
       @typescript-eslint/no-unsafe-member-access,
    */
    const element = (project as z.input<typeof projectSchema>).data[
        scenarioId as string
    ]?.fabric?.elements?.find((elem) => elem.id.toString(10) === elementId);
    if (element === undefined) {
        throw new Error(
            `Could not find a fabric element with the provided ID: ${elementId}`,
        );
    }
    if (element.type !== 'floor' && element.type !== 'Floor') {
        throw new Error(`Fabric element with ID ${elementId} was not a floor`);
    }
    return element;
    /* eslint-enable */
}
