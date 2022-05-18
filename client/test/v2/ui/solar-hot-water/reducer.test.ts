import { ExternalDataUpdateAction } from '../../../../src/v2/ui/module-management';
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
};

describe('solar hot water UI reducer', () => {
    describe('external data update', () => {
        test.each(scenarios)('reducer does not throw ($displayName)', (scenario) => {
            const { reducer, initialState } = solarHotWaterModule;
            const action: ExternalDataUpdateAction = {
                type: 'external data update',
                project: {
                    ...FAKE_PROJECT_DATA,
                    data: { ['some scenario name']: scenario.data as any },
                },
                currentScenario: scenario.data as any,
                currentScenarioId: 'some scenario name',
            };
            expect(() => reducer(initialState, action)).not.toThrow();
        });
    });
});
