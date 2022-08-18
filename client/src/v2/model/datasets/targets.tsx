export type Target = {
    label: string;
    value: number;
};

export const spaceHeatingDemand: Target[] = [
    { label: 'Min target', value: 20 },
    { label: 'Max target', value: 70 },
    { label: 'UK average', value: 120 },
];

export const primaryEnergyDemand: Target[] = [
    { label: 'Target', value: 120 },
    { label: 'UK average', value: 360 },
];

export const co2m2: Target[] = [
    { label: 'Zero Carbon', value: 0 },
    { label: '80% by 2050', value: 17 },
    { label: 'UK average', value: 50.3 },
];

export const energyUsePerPerson: Target[] = [
    { label: '70% heating saving', value: 8.6 },
    { label: 'UK average', value: 19.6 },
];
