import { HeatLoss, HeatLossDependencies } from '../../src/model/modules/heat-loss';

describe('HeatLoss', () => {
    it('correctly calculates peak heat load', () => {
        const deps: HeatLossDependencies = {
            geography: {
                externalDesignTemperature: -4,
            },
            floors: {
                totalFloorArea: 100,
            },
            ventilation: {
                heatLossAverage: 25,
                heatLossMonthly: () => 25,
            },
            infiltration: {
                heatLossAverage: 25,
                heatLossMonthly: () => 25,
            },
            fabric: {
                heatLoss: 250,
            },
        };
        const heatLoss = new HeatLoss(null, deps);
        expect(heatLoss.totalAverageHeatLoss).toBe(
            deps.fabric.heatLoss +
                deps.ventilation.heatLossAverage +
                deps.infiltration.heatLossAverage,
        ); // 300
        expect(heatLoss.peakHeatLoad).toBe(
            300 * (20 - deps.geography.externalDesignTemperature),
        );
        expect(heatLoss.peakHeatLoadPerArea).toBe(
            (300 * 24) / deps.floors.totalFloorArea,
        );
    });
});
