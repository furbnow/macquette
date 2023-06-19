import { inspect } from 'util';

import { HttpClientError } from '../../src/api/http';

export function finalErrorHandler(err: unknown) {
    if (!(err instanceof HttpClientError)) throw err;
    if (!err.causeIsAxiosError()) throw err;
    const status = err.cause.response?.status;
    if (status === undefined) throw err;
    if (status >= 400 && status < 500) {
        throw new Error(
            `API returned status ${status}. Have you run save-api-credentials.ts?\nData: ${inspect(
                err.cause.response?.data,
            )}`,
        );
    }
    throw err;
}
