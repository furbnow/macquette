import React from "react";
import House from "../components/House";
import TargetBar from "./../components/TargetBar";
import targets from "../data/targets";

const fmtPrice = (price) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(price);

export default function Graphics({ houseData, targetData, cost }) {
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
