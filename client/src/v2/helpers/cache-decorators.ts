import type { Month } from '../model/enums/month';

const cacheKey = Symbol.for('cached values for getters');

/** Cache the result of the target getter. Assumes the getter is pure and the values it closes over are immutable. */
export function cache<T>(
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
) {
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
}

const cacheMonthKey = Symbol.for('cache tables for month methods');
export function cacheMonth<OutT>(
    _target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(month: Month) => OutT>,
) {
    if (descriptor.value !== undefined) {
        const innerMethod = descriptor.value;
        descriptor.value = function (month: Month) {
            /* eslint-disable */
            const obj: any = this;
            obj[cacheMonthKey] = obj[cacheMonthKey] ?? {};
            obj[cacheMonthKey][propertyKey] = obj[cacheMonthKey][propertyKey] ?? {};
            const cacheTable = obj[cacheMonthKey][propertyKey];
            if (cacheTable[month.name] === undefined) {
                cacheTable[month.name] = innerMethod.apply(obj, [month]);
            }
            return cacheTable[month.name];
            /* eslint-enable */
        };
    }
}
