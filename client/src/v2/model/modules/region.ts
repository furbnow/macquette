import { Scenario } from '../../data-schemas/scenario';
import { Region } from '../enums/region';

export const extractRegionFromLegacy = ({ region: code }: Scenario) => {
    if (code === undefined) {
        return new Region('UK average');
    }
    return Region.fromIndex0(code);
};
