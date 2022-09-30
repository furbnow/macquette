/** Helper functions to deal with pure error and warning types that contain a
 * .path key for tracing */
import { Result } from './result';
import { WithWarnings } from './with-warnings';

/** Transform errors and warnings by prepending elements to their .path array,
 * to be used with .mapWarnings and .mapErr */
export function prependPath(prefix: (string | number)[]) {
    return <W extends { path: (string | number)[] }>(warning: W): W => {
        return { ...warning, path: [...prefix, ...warning.path] };
    };
}

/** Apply the same prefix to both warnings and errors from a nested
 * WithWarnings<Result<...>, ...> value */
export function withPathPrefix<
    W extends { path: (string | number)[] },
    E extends { path: (string | number)[] },
    T,
>(path: (string | number)[], val: WithWarnings<Result<T, E>, W>) {
    return val.map((res) => res.mapErr(prependPath(path))).mapWarnings(prependPath(path));
}
