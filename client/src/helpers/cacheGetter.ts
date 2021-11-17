/** Cache the result of the target getter. Assumes the getter is pure and the values it closes over are immutable. */
export const cache = <T>(
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
) => {
    const cachedValueKey = Symbol.for(`cached value for getter ${propertyKey}`);
    if (descriptor.get !== undefined) {
        const innerMethod = descriptor.get;
        descriptor.get = function () {
            /* eslint-disable */
            const obj: any = this;
            if (obj[cachedValueKey] === undefined) {
                obj[cachedValueKey] = innerMethod.apply(obj);
            }
            return obj[cachedValueKey];
            /* eslint-enable */
        };
    } else {
        throw new Error('cache must only be used on getters');
    }
};
