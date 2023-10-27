export function safeIsArray(val: unknown): val is Array<unknown> {
  return Array.isArray(val);
}
