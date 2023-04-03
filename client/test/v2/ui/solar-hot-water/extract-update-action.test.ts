import { scenarioSchema } from '../../../../src/v2/data-schemas/scenario';
import { CombinedModules } from '../../../../src/v2/model/combined-modules';
import { AppContext } from '../../../../src/v2/ui/module-management/module-type';
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
            const model = CombinedModules.fromLegacy(scenario.data);
            const { extractUpdateAction } = solarHotWaterModule.shims;
            const scenarioId = 'some scenario name';
            const fakeContext: AppContext = {
                route: {
                    type: 'with scenario',
                    page: 'solarhotwater',
                    scenarioId,
                },
                project: {
                    ...FAKE_PROJECT_DATA,
                    data: { [scenarioId]: scenarioSchema.parse(scenario.data) },
                },
                currentScenario: scenario.data as any,
                currentModel: model,
                scenarioId,
                appName: 'some app name',
            };
            const result = extractUpdateAction(fakeContext, '');
            expect(() => result.unwrap()).not.toThrow();
        },
    );
});
