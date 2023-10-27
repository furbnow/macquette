import objectInspect from 'object-inspect';

export function handleNonErrorError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  } else {
    return new Error('non-Error value: ' + objectInspect(error));
  }
}
