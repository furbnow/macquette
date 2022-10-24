import { scenarioSchema } from '../../../../src/v2/data-schemas/scenario';
import {
    CombinedModules,
    extractInputFromLegacy,
} from '../../../../src/v2/model/combined-modules';
import { ShimContext } from '../../../../src/v2/ui/module-management/shim';
import { solarHotWaterModule } from '../../../../src/v2/ui/modules/solar-hot-water';
import { scenarios } from '../../fixtures';

const FAKE_PROJECT_DATA = {
    id: '1',
    name: 'Test',
    description: 'Test project',
    status: 'In progress' as const,
    created_at: new Date(),
    updated_at: new Date(),
    owner: { id: '1', name: 'Fred' },
    organisation: null,
    images: [],
};

describe('solar hot water update action extractor', () => {
    test.each(scenarios)(
        'extractUpdateAction does not return an error ($displayName)',
        (scenario) => {
            const input = extractInputFromLegacy(scenario.data);
            const model = new CombinedModules(input);
            const { extractUpdateAction } = solarHotWaterModule.shims;
            const shimContext: ShimContext = {
                project: {
                    ...FAKE_PROJECT_DATA,
                    data: { ['some scenario name']: scenarioSchema.parse(scenario.data) },
                },
                currentScenario: scenario.data as any,
                scenarioId: 'some scenario name',
                currentModel: model,
            };
            const result = extractUpdateAction(shimContext, '');
            expect(() => result.unwrap()).not.toThrow();
        },
    );
});
