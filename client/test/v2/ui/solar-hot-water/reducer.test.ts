import { ExternalDataUpdateAction } from '../../../../src/v2/ui/module-management';
import { solarHotWaterModule } from '../../../../src/v2/ui/modules/solar-hot-water';
import { scenarios } from '../../fixtures';

describe('solar hot water UI reducer', () => {
    describe('external data update', () => {
        for (const scenario of scenarios) {
            test(`reducer does not throw (${scenario.name})`, () => {
                const { reducer, initialState } = solarHotWaterModule;
                const action: ExternalDataUpdateAction = {
                    type: 'external data update',
                    data: scenario.data as any,
                };
                expect(() => reducer(initialState, action)).not.toThrow();
            });
        }
    });
});
