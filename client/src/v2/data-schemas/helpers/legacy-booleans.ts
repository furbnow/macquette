import { z } from 'zod';

export const stringyBoolean = z.union([
    z.boolean(),
    z.literal('1').transform(() => true),
    z.literal('').transform(() => false),
    z.literal('true').transform(() => true),
    z.literal('false').transform(() => false),
]);
