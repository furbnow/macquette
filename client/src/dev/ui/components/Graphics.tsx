import React, { ReactElement } from 'react';

import House, { HouseProps } from '../components/House';
import targets from '../data/targets';
import TargetBar from './../components/TargetBar';

const fmtPrice = (price: number): string =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(price);

export interface GraphicsProps {
    houseData: HouseProps;
    targetData: {
        width: number;
        space_heating_demand: number;
        primary_energy: number;
        co2: number;
        energyuse: number;
    };
    cost: number;
}

export default function Graphics({
    houseData,
    targetData,
    cost,
}: GraphicsProps): ReactElement {
    return (
        <div className="d-flex align-items-center justify-content-between pb-30">
            <div className="mr-30">
                <House {...houseData} />
                {cost ? <div>Measures cost: {fmtPrice(cost)}</div> : null}
            </div>

            {!targetData ? null : (
                <div id="targetbars">
                    <TargetBar
                        name="Space heating demand"
                        width={targetData.width}
                        value={targetData.space_heating_demand}
                        units="kWh/m²"
                        targets={targets.space_heating_demand}
                    />
                    <TargetBar
                        name="Primary energy demand"
                        width={targetData.width}
                        value={targetData.primary_energy}
                        units="kWh/m²"
                        targets={targets.primary_energy_demand}
                    />
                    <TargetBar
                        name="CO2 Emission rate"
                        width={targetData.width}
                        value={targetData.co2}
                        units="kgCO₂/m²"
                        targets={targets.co2_per_m2}
                    />
                    <TargetBar
                        name="Per person energy use"
                        width={targetData.width}
                        value={targetData.energyuse}
                        units="kWh/day"
                        targets={targets.energy_use_per_person}
                    />
                </div>
            )}
        </div>
    );
}
