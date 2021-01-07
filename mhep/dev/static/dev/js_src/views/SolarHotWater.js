import React from 'react'
import OptionField from '../components/OptionField'
import NumberField from '../components/NumberField'
import Result from '../components/Result'

// ??? - dedicated Volume vs total Volume - what's the calculation there?
// data.SHW.Veff = data.SHW.Vs + 0.3 * (data.SHW.combined_cylinder_volume - data.SHW.Vs);
// double check this is correct!

function SolarHotWater({ scenario }) {
  return (
    <section>
      <h3>Solar Hot Water system</h3>

      <div className="row-fluid">
        <div className="span6">
          Pump power supply
          {/* Solar water heating pump */}
        </div>
        <div className="span6">
          <OptionField
            id="pump_power_supply"
            options={[
              { value: 'PV', display: 'PV powered' },
              { value: 'electric', display: 'Mains powered' },
              // { value: 'electric', display: 'Electrically powered' },
            ]}
            value={scenario.solarHotWater.pump}
            setValue={(val) => (scenario.solarHotWater.pump = val)}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Aperture area of solar collector, <var>A</var>
        </div>
        <div className="span6">
          <NumberField
            id="aperture_area"
            units="m²"
            value={scenario.solarHotWater.A}
            setValue={(val) => (scenario.solarHotWater.A = val)}
            type="text"
            className="input-mini"
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Zero-loss collector efficiency, <var>η0</var> <i className='icon-question-sign' title='from test certificate or Table H1'></i>
        </div>
        <div className="span6">
          <NumberField
            id="zeroloss_collector_efficiency"
            value={scenario.solarHotWater.n0}
            setValue={(val) => (scenario.solarHotWater.n0 = val)}
            type="text"
            className="input-mini"
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Collector linear heat loss coefficient, <var>a1</var> <i className='icon-question-sign' title='from test certificate'></i>
        </div>
        <div className="span6">
          <NumberField
            id="linear_heat_loss_coefficient"
            value={scenario.solarHotWater.a1}
            setValue={(val) => (scenario.solarHotWater.a1 = val)}
            type="text"
            className="input-mini"
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Collector 2nd order heat loss coefficient, <var>a2</var> <i className='icon-question-sign' title='from test certificate'></i>
        </div>
        <div className="span6">
          <NumberField
            id="second_order_heat_loss_coefficient"
            value={scenario.solarHotWater.a2}
            setValue={(val) => (scenario.solarHotWater.a2 = val)}
            type="text"
            className="input-mini"
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          <var>a* = 0.892 × (a1 + 45 × a2)</var>
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.a}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Collector performance ratio, <var>a*/η0</var>
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.collector_performance_ratio}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Collector Orientation
      </div>
        <div className="span6">
          <OptionField
            id="orientation"
            options={[
              { value: 0, display: 'North' },
              { value: 1, display: 'NE/NW' },
              { value: 2, display: 'East/West' },
              { value: 3, display: 'SE/SW' },
              { value: 4, display: 'South' }
            ]}
            value={scenario.solarHotWater.orientation}
            setValue={(val) => (scenario.solarHotWater.orientation = val)}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Collector Inclination (i.e. 35 degrees)
      </div>
        <div className="span6">
          <NumberField
            id="inclination"
            units="degrees"
            value={scenario.solarHotWater.inclination}
            setValue={(val) => (scenario.solarHotWater.inclination = val)}
            type="text"
            className="input-mini"
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Annual solar radiation per m² <i className='icon-question-sign' title='(from U3.3 in Appendix U for the orientation and tilt of the collector)'></i>
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.annual_solar}
            dp={0}
            units='kWh'
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Overshading factor
      </div>
        <div className="span6">
          <OptionField
            id="overshading_factor"
            options={[
              { value: 'HEAVY', display: 'Heavy > 80%' },
              { value: 'SIGNIFICANT', display: 'Significant 60% - 80%' },
              { value: 'MODEST', display: 'Modest 20% - 60%' },
              { value: 'NONE', display: 'None or very little, less than 20%' }
            ]}
            value={scenario.solarHotWater.overshading}
            setValue={(val) => (scenario.solarHotWater.overshading = val)}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Solar energy available
      </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.solar_energy_available}
            dp={0}
            units='kWh'
          />
        </div>
      </div>

      <h4>Utilisation</h4>
      <p>
        The overall performance of solar water systems depends on how the hot water system is used,
        e.g. daily draw-off patterns and the use of other water heating devices such as a boiler or an immersion heater.
        The procedure described here is not suitable for detailed design in a particular case.
        It is intended to give a representative value of the solar contribution to domestic water heating over a range of users.
      </p>

      <div className="row-fluid">
        <div className="span6">
          Load
        </div>
        <div className="span6">
          <Result
            val={scenario.waterHeating.annual_energy_content}
            dp={0}
            units='kWh'
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Solar-to-load ratio
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.solar_load_ratio}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Utilisation factor
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.utilisation_factor}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Collector performance factor
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.collector_performance_factor}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Dedicated solar storage volume, <var>Vs</var>
        </div>
        <div className="span6">
          <NumberField
            id="dedicated_solar_storage_volume"
            units="litres"
            value={scenario.solarHotWater.Vs}
            setValue={(val) => (scenario.solarHotWater.Vs = val)}
            type="text"
            className="input-mini"
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Total volume of cylinder (if combined cylinder)
        </div>
        <div className="span6">
          <NumberField
            id="total_cylinder_volume"
            units="litres"
            value={scenario.solarHotWater.combined_cylinder_volume}
            setValue={(val) => (scenario.solarHotWater.combined_cylinder_volume = val)}
            type="text"
            className="input-mini"
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Effective solar volume, <var>Veff</var>
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.Veff}
            dp={0}
            units='litres'
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Daily hot water demand, <var>Vd</var>, average (from water heating)
        </div>
        <div className="span6">
          <Result
            val={scenario.waterHeating.Vd_average}
            dp={0}
            units='litres'
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Volume ratio, <var>Veff/Vd</var>, (average)
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.volume_ratio}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Solar storage volume factor, <var>f2 = 1 + 0.2 × ln(Volume Ratio)</var>
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.f2}
          />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span6">
          Annual solar input, <var>Qs</var>
        </div>
        <div className="span6">
          <Result
            val={scenario.solarHotWater.Qs}
            units='kWh'
          />
        </div>
      </div>

    </section>
  )
}

export default SolarHotWater
