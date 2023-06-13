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
    organisation: null,
    permissions: { can_share: false, can_reassign: false },
    access: [{ roles: ['owner' as const], id: '1', name: '', email: '' }],
    images: [],
};

describe('solar hot water update action extractor', () => {
    test.each(scenarios)(
        'extractUpdateAction does not return an error ($displayName)',
        (scenario) => {
            const oldConsoleWarn = console.warn;
            let currentModel: AppContext['currentModel'];
            try {
                console.warn = () => undefined;
                currentModel = CombinedModules.fromLegacy(scenario.data);
            } finally {
                console.warn = oldConsoleWarn;
            }
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
                currentModel,
                scenarioId,
                appName: 'some app name',
            };
            const result = extractUpdateAction(fakeContext, '', {
                inputs: true,
                outputs: true,
            });
            expect(() => result.unwrap()).not.toThrow();
        },
    );
});
