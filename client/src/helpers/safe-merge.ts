import { cloneDeep, merge } from 'lodash';

export type DeepPartial<T> = T extends Record<string, unknown>
  ? {
      [K in keyof T]?: DeepPartial<T[K]>;
    }
  : T;

export type DeepWith<U, T> = T extends Record<string, unknown>
  ? {
      [K in keyof T]: DeepWith<U, T[K]>;
    }
  : T | U;

/** Lodash merge, but with stricter type checking and does not mutate its inputs
 *
 * @warning This will merge arrays, which is often not the desired behaviour.
 */
export function safeMerge<
  Source extends Dest,
  Dest extends Record<string | symbol, unknown>,
>(dest: Dest, source: DeepPartial<Source>): Dest {
  return merge(cloneDeep(dest), source);
}
