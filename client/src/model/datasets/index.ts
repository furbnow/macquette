import { Overshading, OvershadingName } from '../enums/overshading';

export { defaultFuels } from './default-fuels';
export * from './shims';

function reverseLookup<K extends string, V>(table: Record<K, V>) {
    return (val: V): K | null => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const entries = Object.entries(table) as [K, V][];
        const entry = entries.find((entry) => entry[1] === val);
        if (entry === undefined) {
            return null;
        }
        return entry[0];
    };
}

const tableH2: Record<OvershadingName, number> = {
    '>80%': 0.5,
    '60-80%': 0.65,
    '20-60%': 0.8,
    '<20%': 1,
};

export function solarHotWaterOvershadingFactor(
    overshading: Overshading | OvershadingName,
): number {
    if (typeof overshading === 'string') {
        return tableH2[overshading];
    } else {
        return tableH2[overshading.name];
    }
}

export function solarHotWaterOvershadingFactorReverse(
    factor: number,
): Overshading | null {
    const name = reverseLookup(tableH2)(factor);
    if (name === null) {
        return null;
    }
    return new Overshading(name);
}
