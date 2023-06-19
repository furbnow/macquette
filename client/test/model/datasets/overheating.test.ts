import { hasHighOverheatingRisk } from '../../../src/model/datasets/overheating';

describe('hasHighOverheatingRisk', () => {
    it('returns a correct positive', () => {
        expect(hasHighOverheatingRisk('CR44BX')).toBe(true);
    });

    it('returns a correct negative', () => {
        expect(hasHighOverheatingRisk('SK30PQ')).toBe(false);
    });
});
