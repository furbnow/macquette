import * as z from 'zod';
import { Region } from '../enums/region';

export const extractRegionFromLegacy = (data: Record<string, unknown>) => {
    const { region: code } = z.object({ region: z.number().optional() }).parse(data);
    if (code === undefined) {
        return new Region('UK average');
    }
    return Region.fromIndex0(code);
};
