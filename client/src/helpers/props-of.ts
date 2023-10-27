import { ReactHTML } from 'react';

export type PropsOf<T extends keyof ReactHTML> = Exclude<
  Parameters<ReactHTML[T]>[0],
  null | undefined
>;
