export function throwForNull<ArgsT extends Array<unknown>, OutT>(
  fn: (..._: ArgsT) => OutT | null,
  errorConstructor?: (..._: ArgsT) => Error,
) {
  return (...args: ArgsT): OutT => {
    const resolvedErrorConstructor =
      errorConstructor ?? (() => new Error('function returned null'));
    const out = fn(...args);
    if (out === null) {
      throw resolvedErrorConstructor(...args);
    }
    return out;
  };
}

export function nanToNull<T>(val: T): T | null {
  if (typeof val === 'number' && Number.isNaN(val)) {
    return null;
  } else {
    return val;
  }
}

export function orNullish<InT, OutT>(fn: (_: InT) => OutT) {
  return (input: InT | null | undefined): OutT | null | undefined => {
    if (input === null) {
      return null;
    }
    if (input === undefined) {
      return undefined;
    }
    return fn(input);
  };
}
