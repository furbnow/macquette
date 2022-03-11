import { merge } from 'lodash';

/** Lodash merge with type checking that ensures Source extends Destination */
export const safeMerge = <Source extends Dest, Dest extends object>(
    dest: Dest,
    source: Partial<Source>,
): Dest & Partial<Source> => {
    return merge(dest, source);
};
