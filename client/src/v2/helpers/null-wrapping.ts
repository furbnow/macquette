export const throwForNull =
    <ArgsT extends Array<unknown>, OutT>(
        fn: (..._: ArgsT) => OutT | null,
        errorConstructor?: (..._: ArgsT) => Error,
    ) =>
    (...args: ArgsT): OutT => {
        const resolvedErrorConstructor =
            errorConstructor ?? (() => new Error('function returned null'));
        const out = fn(...args);
        if (out === null) {
            throw resolvedErrorConstructor(...args);
        }
        return out;
    };

export const nanToNull = <T>(val: T): T | null => {
    if (typeof val === 'number' && Number.isNaN(val)) {
        return null;
    } else {
        return val;
    }
};

export const orNullish =
    <InT, OutT>(fn: (_: InT) => OutT) =>
    (input: InT | null | undefined): OutT | null | undefined => {
        if (input === null) {
            return null;
        }
        if (input === undefined) {
            return undefined;
        }
        return fn(input);
    };
