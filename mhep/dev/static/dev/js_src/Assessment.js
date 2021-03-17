// The Assessment class, a façade onto the underlying data structures with added behaviour
//
// As we transition over to React, we're splitting behaviour from presentation.
// Behaviour should live here.  You could call this approach Model-View-Behaviour.
//
// The existing design of a lot of the assessment data is sub-optimal and a façade
// lets us use a nicer interface to that data as well as providing us with an easy way
// to test behaviour that doesn't rely on loading the browser.  When most everything
// uses this API then we can start editing the underlying data structures to make more
// sense.  This will also ease the path to types and TypeScript at some point, should we
// make that transition.
//
// The intention here is that all data acess is done through the classes.  To this end
// there is a utility function, `properties`, which helps define properties of a class
// that façade onto another class (with type checking).  See more in its comments.
export default class Assessment {
    constructor(assessmentData, update) {
        this.metadata = assessmentData;
        this.data = assessmentData.data;
        this.update = update;

        this.commentary = new Commentary(this, update);
        this.report = new Report(this, update);
    }

    // Get a list of scenarios: ids, titles, number (as in 'scenario 1') and whether
    // they are the baseline.
    //
    // Not all of this data is stored in the same places or in a sane way so this
    // provides a nicer form of access.  Note it doesn't return the scenario data itself;
    // this would be done through assessment.getScenario(id) or similar.  (Which doesn't
    // yet exist.)
    //
    // 'excludeBase' is an attempt to avoid the word 'master' being used all over the
    // codebase, as its use is now archaic - we prefer the term 'baseline' but 'master'
    // is currently hardcoded all over the code.
    getScenarioList({ excludeBase = false } = {}) {
        let assessments = Object.keys(this.data).filter((key) => !key.startsWith('_'));

        if (excludeBase) {
            assessments = assessments.filter((id) => id !== 'master');
        }

        return assessments.map((id) => ({
            id,
            title: this.data[id].scenario_name,
            isBaseline: id === 'master',
            num: id === 'master' ? 0 : parseInt(id.replaceAll(/scenario/g, ''), 10),
        }));
    }

    getScenario(id) {
        return new Scenario(this, id, this.update);
    }
}

class Scenario {
    constructor(assessment, scenarioId, update) {
        this.data = assessment.data[scenarioId];
        this.solarHotWater = new SolarHotWater(this.data, update);
        this.waterHeating = new WaterHeating(this.data, update);
        this.currentEnergy = new CurrentEnergy(this.data, update);

        properties(this, this.data, {
            name: { type: String, field: 'scenario_name' },
            totalFloorArea: { type: Number, field: 'TFA' },
            totalBuildingVolume: { type: Number, field: 'volume' },
            region: { type: String },
            altitude: { type: Number },
            occupancy: { type: Number },
            occupancy_SAP_value: { type: Number },
            use_custom_occupancy: { type: Boolean },
            custom_occupancy: { type: Number },
        });

        this.update = update;
    }

    getFloors() {
        return this.data.floors.map(floor => new RoomFloor(floor, this.update));
    }

    deleteFloor(idx) {
        this.data.floors.splice(idx, 1);
        this.update();
    }

    addFloor() {
        let name = "";
        const n_floors = this.data.floors.length;
        if (n_floors == 0) {
            name = 'Ground Floor';
        }
        else if (n_floors == 1) {
            name = '1st Floor';
        }
        else if (n_floors == 2) {
            name = '2nd Floor';
        }
        else if (n_floors == 3) {
            name = '3rd Floor';
        }
        else if (n_floors > 3) {
            name = n_floors + 'th Floor';
        }
        this.data.floors.push({ name, area: 0, height: 0, volume: 0 });
        this.update();
    }
}

class RoomFloor {
    constructor(floor, update) {
        properties(this, floor, {
            area: { type: Number },
            name: { type: String },
            height: { type: Number },
            volume: { type: Number }
        });

        this.update = update;
    }
}

class Report {
    constructor(assessment, update) {
        if (!assessment.data._report) {
            assessment.data._report = {};
        }

        properties(this, assessment.data._report, {
            date: { type: String },
            version: { type: String },
        });

        this.update = update;
    }
}

class CurrentEnergy {
    constructor(scenarioData, update) {
        if (!scenarioData.currentenergy) {
            scenarioData.currentenergy = {};
        }

        properties(this, scenarioData.currentenergy, {
            primaryenergy_annual_kwh: { type: Number },
            total_co2: { type: Number },
            total_cost: { type: Number },
            annual_net_cost: { type: Number },
            primaryenergy_annual_kwhm2: { type: Number },
            total_co2m2: { type: Number },
            energyuseperperson: { type: Number },
            onsite_generation: { type: Boolean, default: false },
        });

        properties(this, scenarioData.currentenergy.generation, {
            generation_annual_kwh: { type: Number, field: 'annual_generation' },
            generation_annual_CO2: { type: Number, field: 'annual_CO2' },
            generation_primaryenergy: { type: Number, field: 'primaryenergy' },
            generation_fraction_used_onsite: { type: Number, field: 'fraction_used_onsite' },
            generation_annual_savings: { type: Number, field: 'annual_savings' },
            generation_annual_FIT_income: { type: Number, field: 'annual_FIT_income' },
        });

        this.scenarioData = scenarioData;
        this.update = update;
    }

    getAllFuelsList() {
        return Object.entries(this.scenarioData.fuels).map(
            ([name, data]) => Object.assign({ name }, data)
        );
    }

    getFuelsInUseList() {
        return Object.entries(this.scenarioData.currentenergy.use_by_fuel).map(
            ([name, data]) => new FuelUse(name, data, this.update)
        );
    }

    addFuelInUse(name) {
        if (name === '') {
            return
        }

        this.scenarioData.currentenergy.use_by_fuel[name] =
            { annual_co2: 0, annual_use: 0, annualcost: 0, primaryenergy: 0 }
        this.update()
    }

    deleteFuelInUse(name) {
        if (!(name in this.scenarioData.currentenergy.use_by_fuel)) {
            return
        }

        delete this.scenarioData.currentenergy.use_by_fuel[name]
        this.update()
    }
}

class FuelUse {
    constructor(name, data, update) {
        properties(this, data, {
            annual_co2: { type: Number },
            annual_use: { type: Number },
            annualcost: { type: Number },
            primaryenergy: { type: Number },
        });

        this.name = name;
        this.update = update;
    }
}

class WaterHeating {
    constructor(scenarioData, update) {
        if (!scenarioData.water_heating) {
            scenarioData.water_heating = {};
        }

        properties(this, scenarioData.water_heating, {
            solar_water_heating: { type: Boolean, default: false },
            annual_energy_content: { type: Number },
            Vd_average: { type: Number },
        });

        this.scenarioData = scenarioData;
        this.update = update;
    }
}

class SolarHotWater {
    constructor(scenarioData, update) {
        if (!scenarioData.SHW) {
            scenarioData.SHW = {};
        }

        properties(this, scenarioData.SHW, {
            pump: { type: String },
            A: { type: Number },
            n0: { type: Number },
            a1: { type: Number },
            a2: { type: Number },
            a: { type: Number },
            Vs: { type: Number },
            collector_performance_ratio: { type: Number },
            orientation: { type: String },
            inclination: { type: Number },
            annual_solar: { type: Number },
            overshading: { type: String },
            solar_energy_available: { type: Number },
            solar_load_ratio: { type: Number },
            utilisation_factor: { type: Number },
            collector_performance_factor: { type: Number },
            combined_cylinder_volume: { type: Number },
            Veff: { type: Number },
            volume_ratio: { type: Number },
            f2: { type: Number },
            Qs: { type: Number },
        });

        this.scenarioData = scenarioData;
        this.update = update;
    }
}

class Commentary {
    constructor(assessment, update) {
        if (!assessment.data._commentary) {
            assessment.data._commentary = {};
        }

        properties(this, assessment.data._commentary, {
            brief: { type: String },
            context: { type: String },
            decisions: { type: String },
            scenarios: { type: Object },
        });

        this.assessment = assessment;
        this.update = update;
    }

    // List scenario commentaries that for scenarios that don't exist in the assessment
    //
    // This can happen when an assessor creates a scenario, writes a commentary and then
    // deletes the scenario.  Quite a lot of work goes into commentaries so it's good to
    // preserve them; because they are all entered on a single page it's not necessarily
    // expected they are tightly bound to the actual scenarios.
    getOrphanedScenarioIds() {
        let allScenarioIds = this.assessment
            .getScenarioList({ excludeBase: true })
            .map(({ id }) => id);
        let commentaryScenarioIds = Object.keys(this.scenarios);

        return commentaryScenarioIds.filter((id) => !allScenarioIds.includes(id));
    }

    getText(id) {
        return this.scenarios[id] || '';
    }
    setText(id, text) {
        this.scenarios[id] = text;
        this.update();
    }
    deleteText(id) {
        delete this.scenarios[id];
        this.update();
    }
}

// Proxy the properties `props` from object `root` as properties of `cls`
//
// This is so we can write, e.g.
//   properties(commentary, project.data._commentary, {
//      "brief": { type: String' }
//   })
//   commentary.brief = "The best retrofit available"
//
// And it will:
// * Initialise project.data._commentary.brief to '' if it is undefined
// * Check the new value is a string
// * Update project.data._commentary.brief with that string
// * Call commentary.update() to save the change to the server
function properties(cls, root, props) {
    const DEFAULTS_FOR_TYPE = [
        { type: String, default: () => '' },
        { type: Number, default: () => null },
        { type: Array, default: () => [] },
        { type: Object, default: () => ({}) },
    ];

    for (let [key, data] of Object.entries(props)) {
        let accessField = key;
        let destinationField = data.field || key;

        if (root[destinationField] === undefined) {
            let defaultForType = DEFAULTS_FOR_TYPE.find(row => row.type === data.type);
            if (defaultForType) {
                defaultForType = defaultForType.default();
            }
            root[destinationField] = data.default || defaultForType;
        }

        Object.defineProperty(cls, accessField, {
            enumerable: true,
            get: () => {
                return root[destinationField];
            },
            set: (val) => {
                if (data.type === String && typeof val !== 'string') {
                    throw new TypeError(
                        `${cls.constructor.name}.${accessField} must be a string`
                    );
                } else if (data.type === Number && typeof val !== 'number') {
                    throw new TypeError(
                        `${cls.constructor.name}.${accessField} must be a number`
                    );
                } else if (data.type === Array && !(val instanceof Array)) {
                    throw new TypeError(
                        `${cls.constructor.name}.${accessField} must be an array`
                    );
                } else if (data.type === Boolean && typeof val !== 'boolean') {
                    throw new TypeError(
                        `${cls.constructor.name}.${accessField} must be a boolean`
                    );
                }

                root[destinationField] = val;
                cls.update();
            },
        });
    }
}
