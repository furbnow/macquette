import { isIndexable } from './is-indexable';

/** Class to abstract over window.features, disallowing (permanent) mutation.
 *
 * Mutation is allowed temporarily to run a function in a given feature flag
 * context. This is intended to be used for testing.
 */
class FeatureFlags {
    // Use an ECMAScript private field, rather than TypeScript `private`, so
    // that access is checked at runtime (for legacy JS code).
    #features: Set<string>;

    constructor() {
        if (
            typeof window !== 'undefined' &&
            isIndexable(window) &&
            Array.isArray(window['features']) &&
            window['features'].every(
                (item: unknown): item is string => typeof item === 'string',
            )
        ) {
            this.#features = new Set(window['features']);
        } else {
            const defaults = new Set(['new-fuvc']);
            this.#features = defaults;
        }
    }

    has(feature: string): boolean {
        return this.#features.has(feature);
    }

    #setFeature(feature: string, value: boolean): void {
        if (value) {
            this.#features.add(feature);
        } else {
            this.#features.delete(feature);
        }
    }

    withFeature<T>(feature: string, value: boolean, fn: () => T): T {
        const previousFeatureValue = this.#features.has(feature);
        this.#setFeature(feature, value);
        try {
            return fn();
        } finally {
            this.#setFeature(feature, previousFeatureValue);
        }
    }

    all(): Set<string> {
        return new Set(this.#features);
    }
}

export const featureFlags = new FeatureFlags();
