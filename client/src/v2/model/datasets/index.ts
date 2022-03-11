import { Overshading, OvershadingName } from '../enums/overshading';

export * from './shims';

const reverseLookup =
    <K extends string, V>(table: Record<K, V>) =>
    (val: V): K | null => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const entries = Object.entries(table) as [K, V][];
        const entry = entries.find((entry) => entry[1] === val);
        if (entry === undefined) {
            return null;
        }
        return entry[0];
    };

const tableH2: Record<OvershadingName, number> = {
    '>80%': 0.5,
    '60-80%': 0.65,
    '20-60%': 0.8,
    '<20%': 1,
};

export const solarHotWaterOvershadingFactor = (
    overshading: Overshading | OvershadingName,
): number => {
    if (typeof overshading === 'string') {
        return tableH2[overshading];
    } else {
        return tableH2[overshading.name];
    }
};

export const solarHotWaterOvershadingFactorReverse = (
    factor: number,
): Overshading | null => {
    const name = reverseLookup(tableH2)(factor);
    if (name === null) {
        return null;
    }
    return new Overshading(name);
};

export const defaultFuels = {
    'Mains Gas': {
        category: 'Gas' as const,
        standingcharge: 95,
        fuelcost: 3.63,
        co2factor: 0.21,
        primaryenergyfactor: 1.13,
        SAP_code: 1,
    },
    'Bulk LPG': {
        category: 'Gas' as const,
        standingcharge: 63,
        fuelcost: 6.79,
        co2factor: 0.241,
        primaryenergyfactor: 1.141,
        SAP_code: 2,
    },
    'Bottled LPG': {
        category: 'Gas' as const,
        standingcharge: 0,
        fuelcost: 11.33,
        co2factor: 0.241,
        primaryenergyfactor: 1.141,
        SAP_code: 3,
    },
    'Heating Oil': {
        category: 'Oil' as const,
        standingcharge: 0,
        fuelcost: 4.06,
        co2factor: 0.298,
        primaryenergyfactor: 1.18,
        SAP_code: 4,
    },
    'House Coal': {
        category: 'Solid fuel' as const,
        standingcharge: 0,
        fuelcost: 4.48,
        co2factor: 0.395,
        primaryenergyfactor: 1.064,
        SAP_code: 11,
    },
    Anthracite: {
        category: 'Solid fuel' as const,
        standingcharge: 0,
        fuelcost: 4.38,
        co2factor: 0.395,
        primaryenergyfactor: 1.064,
        SAP_code: 15,
    },
    'Manufactured smokeless fuel': {
        category: 'Solid fuel' as const,
        standingcharge: 0,
        fuelcost: 5.13,
        co2factor: 0.366,
        primaryenergyfactor: 1.261,
        SAP_code: 12,
    },
    'Wood Logs': {
        category: 'Solid fuel' as const,
        standingcharge: 0,
        fuelcost: 5.16,
        co2factor: 0.39,
        primaryenergyfactor: 1.046,
        SAP_code: 20,
    },
    'Wood Pellets secondary heating in bags': {
        category: 'Solid fuel' as const,
        standingcharge: 0,
        fuelcost: 6.09,
        co2factor: 0.39,
        primaryenergyfactor: 1.325,
        SAP_code: 22,
    },
    'Wood pellets main heating bulk supply': {
        category: 'Solid fuel' as const,
        standingcharge: 0,
        fuelcost: 5.51,
        co2factor: 0.39,
        primaryenergyfactor: 1.325,
        SAP_code: 23,
    },
    'Wood chips': {
        category: 'Solid fuel' as const,
        standingcharge: 0,
        fuelcost: 3.75,
        co2factor: 0.39,
        primaryenergyfactor: 1.046,
        SAP_code: 21,
    },
    'Dual Fuel Appliance': {
        category: 'Solid fuel' as const,
        standingcharge: 0,
        fuelcost: 4.81,
        co2factor: 0.39,
        primaryenergyfactor: 1.049,
        SAP_code: 10,
    },
    '7-Hour tariff - High Rate': {
        category: 'Electricity' as const,
        standingcharge: 0,
        fuelcost: 22.68,
        co2factor: 0.136,
        primaryenergyfactor: 1.501,
        SAP_code: 32,
    },
    '7 Hour tariff - Low Rate': {
        category: 'Electricity' as const,
        standingcharge: 0,
        fuelcost: 9.15,
        co2factor: 0.136,
        primaryenergyfactor: 1.501,
        SAP_code: 31,
    },
    '10-hour tariff - High Rate': {
        category: 'Electricity' as const,
        standingcharge: 1,
        fuelcost: 20.4,
        co2factor: 0.136,
        primaryenergyfactor: 1.501,
        SAP_code: 34,
    },
    '10-hour tariff - Low Rate': {
        category: 'Electricity' as const,
        standingcharge: 0,
        fuelcost: 11.74,
        co2factor: 0.136,
        primaryenergyfactor: 1.501,
        SAP_code: 33,
    },
    '24-hour heating tariff': {
        category: 'Electricity' as const,
        standingcharge: 8,
        fuelcost: 13.23,
        co2factor: 0.136,
        primaryenergyfactor: 1.501,
        SAP_code: 35,
    },
    'Standard Tariff': {
        category: 'Electricity' as const,
        standingcharge: 97,
        fuelcost: 19.44,
        co2factor: 0.136,
        primaryenergyfactor: 1.501,
        SAP_code: 30,
    },
    generation: {
        category: 'Generation' as const,
        standingcharge: 0,
        fuelcost: 0,
        co2factor: 0.136,
        primaryenergyfactor: 1.501,
        SAP_code: 0,
    },
};
