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
        if (cls[key] === undefined) {
            cls[key] = data.default;
        }

        Object.defineProperty(cls, key, {
            enumerable: true,
            get: () => {
                return root[key];
            },
            set: (val) => {
                if (data.type === String && typeof val !== 'string') {
                    throw new TypeError(`${cls.name}.${key} must be a string`);
                } else if (data.type === Number && typeof val !== 'number') {
                    throw new TypeError(`${cls.name}.${key} must be a number`);
                } else if (data.type === Array && !(val instanceof Array)) {
                    throw new TypeError(`${cls.name}.${key} must be an array`);
                }

                root[key] = val;
                cls.update();
            },
        });
    }
}
