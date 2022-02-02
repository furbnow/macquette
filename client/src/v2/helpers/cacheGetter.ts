const cacheKey = Symbol.for('cached values for getters');

/** Cache the result of the target getter. Assumes the getter is pure and the values it closes over are immutable. */
export const cache = <T>(
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
) => {
    if (descriptor.get !== undefined) {
        const innerMethod = descriptor.get;
        descriptor.get = function () {
            /* eslint-disable */
            const obj: any = this;
            if (obj[cacheKey] === undefined) {
                obj[cacheKey] = {};
            }
            if (obj[cacheKey][propertyKey] === undefined) {
                obj[cacheKey][propertyKey] = innerMethod.apply(obj);
            }
            return obj[cacheKey][propertyKey];
            /* eslint-enable */
        };
    } else {
        throw new Error('cache must only be used on getters');
    }
};
