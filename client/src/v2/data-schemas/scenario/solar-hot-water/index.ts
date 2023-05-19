import { z } from 'zod';
import { zodPredicateUnion } from '../../../data-schemas/helpers/zod-predicate-union';
import { isIndexable } from '../../../helpers/is-indexable';
import { shwLegacy } from './legacy';
import { migrateLegacyToV1, shwV1 } from './v1';
import { migrateV1ToV2, shwV2 } from './v2';

export const solarHotWaterSchema = zodPredicateUnion([
    {
        name: 'v2',
        predicate: (val) => isIndexable(val) && val['version'] === 2,
        schema: shwV2,
    },
    {
        name: 'v1',
        predicate: (val) => isIndexable(val) && val['version'] === 1,
        schema: shwV1.transform(migrateV1ToV2),
    },
    {
        name: 'legacy',
        predicate: (val) => isIndexable(val) && !('version' in val),
        schema: shwLegacy.transform(migrateLegacyToV1).transform(migrateV1ToV2),
    },
]);

export type SolarHotWaterSchema = z.infer<typeof solarHotWaterSchema>;
