import v from 'validator';
import { z } from 'zod';

export const dateSchema = z.union([
    z.date(),
    z
        .string()
        .refine(v.isRFC3339, {
            // Although the date-time string format that ECMA 262 specifies for
            // the Date constructor does not quite match RFC 3339, V8's Date
            // implementation accepts almost all RFC 3339-valid date-time
            // strings, the only exception being leap seconds.
            //
            // Django gives us date-time strings with nanosecond precision,
            // which RFC 3339 allows, but ECMA 262 does not, so we use the RFC
            // 3339 validator here.
            message: 'date string was not valid RFC 3339',
        })
        .transform((s) => new Date(s)),
]);
