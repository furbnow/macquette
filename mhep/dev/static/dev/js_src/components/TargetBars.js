import React from "react";
import TargetBar from "./TargetBar";
import targets from "../data/targets";

export default function TargetBars({
    width,
    space_heating_demand,
    primary_energy,
    co2,
    energyuse,
}) {
    return (
        <div>
            <TargetBar
                name="Space heating demand"
                width={width}
                value={space_heating_demand}
                units="kWh/m²"
                targets={targets.space_heating_demand}
            />
            <TargetBar
                name="Primary energy demand"
                width={width}
                value={primary_energy}
                units="kWh/m²"
                targets={targets.primary_energy_demand}
            />
            <TargetBar
                name="CO2 Emission rate"
                width={width}
                value={co2}
                units="kgCO₂/m²"
                targets={targets.co2_per_m2}
            />
            <TargetBar
                name="Per person energy use"
                width={width}
                value={energyuse}
                units="kWh/day"
                targets={targets.energy_use_per_person}
            />
        </div>
    );
}
