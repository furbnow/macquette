import { LegacyScenario } from '../../legacy-state-validators/scenario';
import { Region } from '../enums/region';

export const extractRegionFromLegacy = ({ region: code }: LegacyScenario) => {
    if (code === undefined) {
        return new Region('UK average');
    }
    return Region.fromIndex0(code);
};
