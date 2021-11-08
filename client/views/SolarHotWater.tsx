import React, { ReactElement } from 'react';

import {
    NewAssessment,
    SolarHotWaterPump,
    SolarHotWaterOvershading,
    SolarHotWaterOrientation,
} from '../types/Assessment';
import { getScenario } from '../lib/scenarios';
import SelectField from '../components/SelectField';
import NumberField from '../components/NumberField';
import CheckboxField from '../components/CheckboxField';
import FormRow from '../components/FormRow';
import Result from '../components/Result';
import Tooltip from '../components/Tooltip';

// ??? - dedicated Volume vs total Volume - what's the calculation there?
// data.SHW.Veff = data.SHW.Vs + 0.3 * (data.SHW.combined_cylinder_volume - data.SHW.Vs);
// double check this is correct!

interface SolarHotWaterProps {
    assessment: NewAssessment;
    scenarioId: string;
}

function SolarHotWater({ assessment, scenarioId }: SolarHotWaterProps): ReactElement {
    const scenario = getScenario(assessment, scenarioId);

    return (
        <section>
            <h3>Solar Hot Water systems</h3>

            <FormRow>
                <label htmlFor="field_use_shw">Use solar hot water</label>

                <CheckboxField
                    id="use_shw"
                    value={scenario.water_heating.solar_water_heating}
                    setValue={(val) => (scenario.water_heating.solar_water_heating = val)}
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_pump_power_supply">Pump power supply</label>

                <SelectField
                    id="pump_power_supply"
                    options={[
                        { value: 'PV', display: 'PV powered' },
                        { value: 'electric', display: 'Mains powered' },
                    ]}
                    value={scenario.SHW.pump}
                    setValue={(val: SolarHotWaterPump) => (scenario.SHW.pump = val)}
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_aperture_area">
                    Aperture area of solar collector, <var>A</var>
                </label>

                <NumberField
                    id="aperture_area"
                    units="m²"
                    value={scenario.SHW.A}
                    setValue={(val) => (scenario.SHW.A = val)}
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_zeroloss_collector_efficiency">
                    Zero-loss collector efficiency, <var>η0</var>
                    <Tooltip>from test certificate or Table H1</Tooltip>
                </label>

                <NumberField
                    id="zeroloss_collector_efficiency"
                    value={scenario.SHW.n0}
                    setValue={(val) => (scenario.SHW.n0 = val)}
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_linear_heat_loss_coefficient">
                    Collector linear heat loss coefficient, <var>a1</var>
                    <Tooltip>from test certificate</Tooltip>
                </label>

                <NumberField
                    id="linear_heat_loss_coefficient"
                    value={scenario.SHW.a1}
                    setValue={(val) => (scenario.SHW.a1 = val)}
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_second_order_heat_loss_coefficient">
                    Collector 2nd order heat loss coefficient, <var>a2</var>
                    <Tooltip>from test certificate</Tooltip>
                </label>

                <NumberField
                    id="second_order_heat_loss_coefficient"
                    value={scenario.SHW.a2}
                    setValue={(val) => (scenario.SHW.a2 = val)}
                />
            </FormRow>

            <FormRow>
                <var>a* = 0.892 × (a1 + 45 × a2)</var>

                <Result val={scenario.SHW.a} />
            </FormRow>

            <FormRow>
                <span>
                    Collector performance ratio, <var>a*/η0</var>
                </span>

                <Result val={scenario.SHW.collector_performance_ratio} />
            </FormRow>

            <FormRow>
                <label htmlFor="field_orientation">Collector Orientation</label>

                <SelectField
                    id="orientation"
                    options={[
                        { value: 0, display: 'North' },
                        { value: 1, display: 'NE/NW' },
                        { value: 2, display: 'East/West' },
                        { value: 3, display: 'SE/SW' },
                        { value: 4, display: 'South' },
                    ]}
                    value={scenario.SHW.orientation}
                    setValue={(val: SolarHotWaterOrientation) =>
                        (scenario.SHW.orientation = val)
                    }
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_inclination">
                    Collector Inclination (i.e. 35 degrees)
                </label>

                <NumberField
                    id="inclination"
                    units="degrees"
                    value={scenario.SHW.inclination}
                    setValue={(val) => (scenario.SHW.inclination = val)}
                />
            </FormRow>

            <FormRow>
                <span>
                    Annual solar radiation per m²
                    <Tooltip>
                        from U3.3 in Appendix U for the orientation and tilt of the
                        collector
                    </Tooltip>
                </span>

                <Result val={scenario.SHW.annual_solar} dp={0} units="kWh" />
            </FormRow>

            <FormRow>
                <label htmlFor="field_overshading_factor">Overshading factor</label>

                <SelectField
                    id="overshading_factor"
                    options={[
                        { value: 'HEAVY', display: 'Heavy > 80%' },
                        { value: 'SIGNIFICANT', display: 'Significant 60% - 80%' },
                        { value: 'MODEST', display: 'Modest 20% - 60%' },
                        { value: 'NONE', display: 'None or very little, less than 20%' },
                    ]}
                    value={scenario.SHW.overshading}
                    setValue={(val: SolarHotWaterOvershading) =>
                        (scenario.SHW.overshading = val)
                    }
                />
            </FormRow>

            <FormRow>
                <span>Solar energy available</span>

                <Result val={scenario.SHW.solar_energy_available} dp={0} units="kWh" />
            </FormRow>

            <h4>Utilisation</h4>
            <p>
                The overall performance of solar water systems depends on how the hot
                water system is used, e.g. daily draw-off patterns and the use of other
                water heating devices such as a boiler or an immersion heater. The
                procedure described here is not suitable for detailed design in a
                particular case. It is intended to give a representative value of the
                solar contribution to domestic water heating over a range of users.
            </p>

            <FormRow>
                <span>Load</span>

                <Result
                    val={scenario.water_heating.annual_energy_content}
                    dp={0}
                    units="kWh"
                />
            </FormRow>

            <FormRow>
                <span>Solar-to-load ratio</span>

                <Result val={scenario.SHW.solar_load_ratio} />
            </FormRow>

            <FormRow>
                <span>Utilisation factor</span>

                <Result val={scenario.SHW.utilisation_factor} />
            </FormRow>

            <FormRow>
                <span>Collector performance factor</span>

                <Result val={scenario.SHW.collector_performance_factor} />
            </FormRow>

            <FormRow>
                <label htmlFor="field_dedicated_solar_storage_volume">
                    Dedicated solar storage volume, <var>Vs</var>
                </label>

                <NumberField
                    id="dedicated_solar_storage_volume"
                    units="litres"
                    value={scenario.SHW.Vs}
                    setValue={(val) => (scenario.SHW.Vs = val)}
                />
            </FormRow>

            <FormRow>
                <label htmlFor="field_total_cylinder_volume">
                    Total volume of cylinder (if combined cylinder)
                </label>

                <NumberField
                    id="total_cylinder_volume"
                    units="litres"
                    value={scenario.SHW.combined_cylinder_volume}
                    setValue={(val) => (scenario.SHW.combined_cylinder_volume = val)}
                />
            </FormRow>

            <FormRow>
                <span>
                    Effective solar volume, <var>Veff</var>
                </span>

                <Result val={scenario.SHW.Veff} dp={0} units="litres" />
            </FormRow>

            <FormRow>
                <span>
                    Daily hot water demand, <var>Vd</var>, average (from water heating)
                </span>

                <Result val={scenario.water_heating.Vd_average} dp={0} units="litres" />
            </FormRow>

            <FormRow>
                <span>
                    Volume ratio, <var>Veff/Vd</var>, (average)
                </span>

                <Result val={scenario.SHW.volume_ratio} />
            </FormRow>

            <FormRow>
                <span>
                    Solar storage volume factor,{' '}
                    <var>f2 = 1 + 0.2 × ln(Volume Ratio)</var>
                </span>

                <Result val={scenario.SHW.f2} />
            </FormRow>

            <FormRow>
                <span>
                    Annual solar input, <var>Qs</var>
                </span>

                <Result val={scenario.SHW.Qs} units="kWh" />
            </FormRow>
        </section>
    );
}

export default SolarHotWater;
