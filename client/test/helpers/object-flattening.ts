export type Opaque =
  | string
  | number
  | bigint
  | boolean
  | undefined
  | symbol
  | null
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Function;

function isIndexable(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function isOpaque(val: unknown): val is Opaque {
  return (
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'bigint' ||
    typeof val === 'boolean' ||
    val === undefined ||
    typeof val === 'symbol' ||
    val === null ||
    typeof val === 'function'
  );
}

export type KeySequence = string;
type Pair = [KeySequence, Opaque];
export type FlattenedObject = Map<KeySequence, Opaque>;

export function flatten(input: unknown): FlattenedObject {
  return new Map(flattenInner(input, ''));
}

function flattenInner(input: unknown, prefix: string): Pair[] {
  if (isOpaque(input)) {
    return [[prefix, input]];
  } else if (isIndexable(input)) {
    return Object.entries(input).flatMap(([key, val]) =>
      flattenInner(val, `${prefix === '' ? '' : prefix + '.'}${key}`),
    );
  } else {
    throw new Error('unreachable');
  }
}
