import objectInspect from 'object-inspect';

export class ResultUnwrapError<E> extends Error {
  constructor(public subError: E) {
    super(`Called .unwrap on an error value: ${objectInspect(subError)}`);
  }
}

export class ResultUnwrapErrError<T> extends Error {
  constructor(public value: T) {
    super(`Called .unwrapErr on an ok value: ${objectInspect(value)}`);
  }
}

/** Error handling in pure code, a-la Rust's `Result`, Haskell's `Either`, etc.
 *
 * This is useful for a few reasons:
 * 1. Since TS cannot statically analyse thrown exceptions, unnecessary runtime
 *    type-checking or assertions must often be done in `catch` statements.
 * 2. Unchecked exceptions for non-"stop the world" error cases are hard to
 *    handle correctly and often appear in surprising places. Functions should
 *    be annotated as potentially-fallible if they can return error conditions.
 * 3. Constructing and throwing native `Error` objects causes deoptimisation
 *    within V8 due to the need to generate and manipulate stack traces. Code
 *    which uses this `Result` type will be substantially faster, at the cost
 *    of losing stack traces.
 */
export class Result<T, E> {
  private constructor(
    private _inner: { type: 'ok'; value: T } | { type: 'err'; error: E },
  ) {}

  toJSON(): unknown {
    if (this.isOk()) {
      return { type: 'result/ok', value: this.coalesce() };
    } else {
      return { type: 'result/err', value: this.coalesce() };
    }
  }

  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>({ type: 'ok', value });
  }

  static err<E>(error: E): Result<never, E> {
    return new Result<never, E>({ type: 'err', error });
  }

  map<NewT>(fn: (value: T) => NewT): Result<NewT, E> {
    return this.chain((value) => Result.ok(fn(value)));
  }

  /** Alias for .map to stop React complaining about no `key` prop */
  mapOk<NewT>(fn: (value: T) => NewT): Result<NewT, E> {
    return this.map(fn);
  }

  mapErr<NewE>(fn: (value: E) => NewE): Result<T, NewE> {
    switch (this._inner.type) {
      case 'ok': {
        return Result.ok(this._inner.value);
      }
      case 'err': {
        return Result.err(fn(this._inner.error));
      }
    }
  }

  /** Unwrap and feed into a Result-y function, like a Promise's `.then` or
   * fast-check's `.chain`. The function is not executed if `this` is an
   * error value. */
  chain<NewT, NewE>(fn: (value: T) => Result<NewT, NewE>): Result<NewT, E | NewE> {
    switch (this._inner.type) {
      case 'ok': {
        return fn(this._inner.value);
      }
      case 'err': {
        return Result.err(this._inner.error);
      }
    }
  }

  unwrap(): T {
    return this.mapErr((error) => {
      throw new ResultUnwrapError<E>(error);
    }).coalesce();
  }

  unwrapErr(): E {
    return this.map((value) => {
      throw new ResultUnwrapErrError<T>(value);
    }).coalesce();
  }

  isOk(): this is Result<T, never> {
    return this._inner.type === 'ok';
  }

  isErr(): this is Result<never, E> {
    return this._inner.type === 'err';
  }

  /** Return either the value or the error. This is mostly useful when you
   * have done a transform on one or both of the value or error using .map or
   * .mapErr, such that the types of T and E are the same.
   *
   * For example:
   * ```
   * const display = lookupSomething() // type Result<number, null>
   *   .map(val => `Here it is: ${val}!`) // -> Result<string, null>
   *   .mapErr(() => 'Didn't find it :(') // -> Result<string, string>
   *   .coalesce(); // -> string | string -> string
   * ```
   * */
  coalesce(): T | E {
    switch (this._inner.type) {
      case 'ok': {
        return this._inner.value;
      }
      case 'err': {
        return this._inner.error;
      }
    }
  }

  /** Map a Result-y function over an array, returning early if one of the
   * Results was an error. */
  static mapArray<InT, OutT, ErrT>(
    input: InT[],
    fn: (val: InT, index: number) => Result<OutT, ErrT>,
  ): Result<OutT[], ErrT> {
    const out: OutT[] = [];
    for (let idx = 0; idx < input.length; idx++) {
      // SAFETY: Bounds checked by loop condition
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = fn(input[idx]!, idx);
      if (result.isOk()) {
        out.push(result.coalesce());
      } else {
        return Result.err(result.unwrapErr());
      }
    }
    return Result.ok(out);
  }

  /** Map a Result-y function over the values of an object, returning early
   * if one of the Results was an error. */
  static mapValues<ObjT extends object, OutT, ErrT>(
    input: ObjT,
    fn: (val: ObjT[keyof ObjT], key: keyof ObjT) => Result<OutT, ErrT>,
  ): Result<Record<keyof ObjT, OutT>, ErrT> {
    const outEntries: Array<[keyof ObjT, OutT]> = [];
    // SAFETY: We are assuming that the type ObjT fully describes the
    // runtime value of input.  Breaking this assumption when calling this
    // function will result in runtime TypeErrors. This is the same
    // behaviour as Lodash mapValues.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const keys = Object.keys(input) as Array<keyof ObjT>;
    for (const key of keys) {
      const result = fn(input[key], key);
      if (result.isOk()) {
        outEntries.push([key, result.coalesce()]);
      } else {
        return Result.err(result.unwrapErr());
      }
    }
    // SAFETY: As above.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const out = Object.fromEntries(outEntries) as Record<keyof ObjT, OutT>;
    return Result.ok(out);
  }

  /** Transform a function which throws into a function which returns a
   * Result. */
  static fromThrowing<ArgsT extends unknown[], OutT>(
    fn: (...args: ArgsT) => OutT,
  ): (...args: ArgsT) => Result<OutT, unknown> {
    return (...args) => {
      try {
        return Result.ok(fn(...args));
      } catch (err) {
        return Result.err(err);
      }
    };
  }

  /* Turns a Promise which might reject into a Promise which always resolves
   * with a Result */
  static fromPromise<T>(p: Promise<T>): Promise<Result<T, unknown>> {
    return p.then((v) => Result.ok(v)).catch((e) => Result.err(e));
  }

  /** For use with `Promise.allSettled()` */
  static fromPromiseSettledResult<T>(val: PromiseSettledResult<T>): Result<T, unknown> {
    switch (val.status) {
      case 'fulfilled':
        return Result.ok(val.value);
      case 'rejected':
        return Result.err(val.reason);
    }
  }

  static fromUnion<V1, V2, E>(val: V1 | Result<V2, E>): Result<V1 | V2, E> {
    if (val instanceof Result) {
      return val;
    } else {
      return Result.ok(val);
    }
  }

  static fromNullable<V>(val: V | null): Result<V, null> {
    if (val === null) return Result.err(null);
    else return Result.ok(val);
  }
}
