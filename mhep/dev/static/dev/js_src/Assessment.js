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
    }
}

class CurrentEnergy {
    constructor(scenarioData, update) {
        if (!scenarioData.currentenergy) {
            scenarioData.currentenergy = {};
        }

        properties(this, scenarioData.currentenergy, {
            primaryenergy_annual_kwh: { type: Number, default: null },
            total_co2: { type: Number, default: null },
            total_cost: { type: Number, default: null },
            annual_net_cost: { type: Number, default: null },
            primaryenergy_annual_kwhm2: { type: Number, default: null },
            total_co2m2: { type: Number, default: null },
            energyuseperperson: { type: Number, default: null },
            // onsite_generation: { type: Number, default: null },
            onsite_generation: { type: Boolean, default: false },
        });

        properties(this, scenarioData.currentenergy.generation, {
            annual_generation: { type: Number, default: null },
            annual_CO2: { type: Number, default: null },
            primaryenergy: { type: Number, default: null },
            fraction_used_onsite: { type: Number, default: null },
            annual_savings: { type: Number, default: null },
            annual_FIT_income: { type: Number, default: null },
        });

        this.scenarioData = scenarioData;
        this.update = update;
    }

    getAllFuelsList() {
        return Object.entries(this.scenarioData.fuels).map(
            ([name, data]) => new Fuels(name, data)
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

class Fuels {
    constructor(name, data, update) {
        properties(this, data, {
            SAP_code: { type: Number, default: null },
            category: { type: String, default: '' },
            fuelcost: { type: Number, default: null },
            co2factor: { type: Number, default: null },
            standingcharge: { type: Number, default: null },
            primaryenergyfactor: { type: Number, default: null },
        });

        this.name = name;
        this.update = update;
    }
}
class FuelUse {
    constructor(name, data, update) {
        properties(this, data, {
            annual_co2: { type: Number, default: null },
            annual_use: { type: Number, default: null },
            annualcost: { type: Number, default: null },
            primaryenergy: { type: Number, default: null },
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
            annual_energy_content: { type: Number, default: null },
            Vd_average: { type: Number, default: null },
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
            pump: { type: String, default: '' },
            A: { type: Number, default: null },
            n0: { type: Number, default: null },
            a1: { type: Number, default: null },
            a2: { type: Number, default: null },
            a: { type: Number, default: null },
            Vs: { type: Number, default: null },
            collector_performance_ratio: { type: Number, default: null },
            orientation: { type: String, default: '' },
            inclination: { type: Number, default: null },
            annual_solar: { type: Number, default: null },
            overshading: { type: String, default: '' },
            solar_energy_available: { type: Number, default: null },
            solar_load_ratio: { type: Number, default: null },
            utilisation_factor: { type: Number, default: null },
            collector_performance_factor: { type: Number, default: null },
            combined_cylinder_volume: { type: Number, default: null },
            Veff: { type: Number, default: null },
            volume_ratio: { type: Number, default: null },
            f2: { type: Number, default: null },
            Qs: { type: Number, default: null },
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
            brief: { type: String, default: '' },
            context: { type: String, default: '' },
            decisions: { type: String, default: '' },
            scenarios: { type: Object, default: {} },
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
//      "brief": { type: String, default: '' }
//   })
//   commentary.brief = "The best retrofit available"
//
// And it will:
// * Initialise project.data._commentary.brief to '' if it is undefined
// * Check the new value is a string
// * Update project.data._commentary.brief with that string
// * Call commentary.update() to save the change to the server
function properties(cls, root, props) {
    for (let [key, data] of Object.entries(props)) {
        if (root[key] === undefined) {
            root[key] = data.default;
        }

        Object.defineProperty(cls, key, {
            enumerable: true,
            get: () => {
                return root[key];
            },
            set: (val) => {
                if (data.type === String && typeof val !== 'string') {
                    throw new TypeError(
                        `${cls.constructor.name}.${key} must be a string`
                    );
                } else if (data.type === Number && typeof val !== 'number') {
                    throw new TypeError(
                        `${cls.constructor.name}.${key} must be a number`
                    );
                } else if (data.type === Array && !(val instanceof Array)) {
                    throw new TypeError(
                        `${cls.constructor.name}.${key} must be an array`
                    );
                } else if (data.type == Boolean && typeof val !== 'boolean') {
                    throw new TypeError(
                        `${cls.constructor.name}.${key} must be a boolean`
                    );
                }

                root[key] = val;
                cls.update();
            },
        });
    }
}
