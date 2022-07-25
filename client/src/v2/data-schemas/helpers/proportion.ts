import { z } from 'zod';

import { Proportion } from '../../helpers/proportion';
import { zodUnwrapResult } from './zod-unwrap-result';

export const proportionSchema = zodUnwrapResult(
    z.number().transform((ratio) => Proportion.fromRatio(ratio)),
);
