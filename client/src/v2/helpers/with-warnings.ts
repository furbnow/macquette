/** This module defines a pair of classes which work together to make passing
 * warnings around more ergonomic, much like the `Result` class makes pure
 * error handling more ergonomic.
 */

/** A class which contains a value and a Set of warnings.
 *
 * There are three ways of obtaining an instance of this class:
 * - Using the `.out()` method of a WarningCollector. This is the most common
 *   construction mechanism.
 * - Using the `WithWarnings.empty()` static method. This wraps a value with no
 *   warnings.
 * - Using the constructor directly. This is an escape hatch for if you want to
 *   deal with the plumbing yourself.
 *
 * There are also three ways of extracting the inner value:
 * - Using `.chain()` or `.map()`, in the standard monadic way (like in Result,
 *   Promise, etc.). This is useful for chaining a single value through
 *   functions, but becomes messy when writing a "compute many values, then
 *   combine" pattern.
 * - Using `.unwrap()`, which takes a parameter of a side-effectful function to
 *   handle the warnings somehow. It is common to use a WarningCollector and
 *   write `.unwrap(collector.sink())`, so the warnings can be returned later
 *   using `return collector.out(value);`.
 * - Using `.inner()`, which again is an escape hatch for if you want to deal
 *   with the plumbing yourself.
 */
export class WithWarnings<T, W> {
    constructor(private _value: T, private _warnings: Set<W>) {}

    /** Handle the warnings, one by one, using the provided function, then
     * return the inner value */
    unwrap(fn: (warning: W) => void): T {
        this._warnings.forEach(fn);
        return this._value;
    }

    map<OutT>(fn: (val: T) => OutT): WithWarnings<OutT, W> {
        return this.chain((val) => WithWarnings.empty(fn(val)));
    }

    inner(): [T, Set<W>] {
        return [this._value, this._warnings];
    }

    chain<NewT, NewW>(
        fn: (val: T) => WithWarnings<NewT, NewW>,
    ): WithWarnings<NewT, W | NewW> {
        const [fnResult, fnWarnings] = fn(this._value).inner();
        return new WithWarnings(fnResult, new Set([...this._warnings, ...fnWarnings]));
    }

    mapWarnings<OutW>(fn: (warning: W) => OutW): WithWarnings<T, OutW> {
        const newWarnings = new Set([...this._warnings].map(fn));
        return new WithWarnings(this._value, newWarnings);
    }

    static empty<T>(val: T): WithWarnings<T, never> {
        return new WithWarnings(val, new Set());
    }

    static single<T, W>(val: T, warning: W): WithWarnings<T, W> {
        return new WithWarnings(val, new Set([warning]));
    }

    static fromUnion<V1, V2, W>(val: V1 | WithWarnings<V2, W>): WithWarnings<V1 | V2, W> {
        if (val instanceof WithWarnings) {
            return val;
        } else {
            return WithWarnings.empty(val);
        }
    }
}

/** A class which collects warnings into a Set, and hands you them back exactly
 *  once, with a provided value.
 */
export class WarningCollector<W> {
    private _collected = false;
    private _warnings: Set<W> = new Set();

    log(warning: W): void {
        if (this._collected) {
            throw new Error('Do not re-use warning collectors');
        }
        this._warnings.add(warning);
    }

    sink<NarrowerW extends W>() {
        return (warning: NarrowerW) => this.log(warning);
    }

    out<T>(val: T): WithWarnings<T, W> {
        if (this._collected) {
            throw new Error('Do not re-use warning collectors');
        }
        this._collected = true;
        return new WithWarnings(val, this._warnings);
    }
}
