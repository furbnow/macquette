import React from 'react';
import Graphics from '../components/Graphics';
import LongTextField from '../components/LongTextField';

// Passing in overviewData like this is definitely suboptimal and should be refactored
// away later, in favour of getting the right fields off the assssment class.  (When
// the assessment class has the right fields.)  XXX
export default function Commentary({ assessment, overviewData }) {
    // It's possible for scenarios to be deleted.  In this case, the assessor might
    // legit expect the commentary for it to be kept, because it's entered on a view
    // that is not inside a scenario.  (We know this from user data.)
    //
    // Under the Reactified view + Assessment class we do keep it, but we don't display
    // it.  For extra credit, we could detect when assessment.commentary.scenarios has
    // entries in it for deleted scenarios and display then for the assessor to see -
    // but not allow editing, only deleting. XXX

    // I very much doubt that having the scenario graphics at the bottom of the page
    // is the most useful arrangement.  XXX

    return (
        <div>
            <LongTextField
                id="brief"
                className="mb-30"
                notes="You should note here your understanding of the project brief and
                scope. It should include aims and priorities - how big the project is,
                etc."
                value={assessment.commentary.brief}
                setValue={(val) => (assessment.commentary.brief = val)}
            >
                <b>Initial project brief and scope</b>
            </LongTextField>

            <LongTextField
                id="context"
                className="mb-30"
                value={assessment.commentary.context}
                setValue={(val) => (assessment.commentary.context = val)}
            >
                <b>Current context + logic of scenarios</b>
            </LongTextField>

            {assessment
                .getScenarioList({ excludeBase: true })
                .map(({ id, title, num }) => (
                    <LongTextField
                        key={`commentary_for_${id}`}
                        id={`commentary_for_${id}`}
                        className="mb-30"
                        value={assessment.commentary.getText(id)}
                        setValue={(val) => assessment.commentary.setText(id, val)}
                    >
                        <b>
                            Description for scenario {num} ({title})
                        </b>
                    </LongTextField>
                ))}

            <LongTextField
                id="decisions"
                className="mb-30"
                value={assessment.commentary.decisions}
                setValue={(val) => (assessment.commentary.decisions = val)}
            >
                <b>
                    Key decisions to be made / risks and constraints / areas for further
                    investigation and development
                </b>
            </LongTextField>

            <h2 className="mb-0">Overview of scenarios</h2>

            {overviewData.map(({ id, title, num, houseData, targetData, cost }) => (
                <div key={`graphics_${id}`}>
                    <h3>
                        Scenario {num}: {title}
                    </h3>
                    <Graphics houseData={houseData} targetData={targetData} cost={cost} />
                </div>
            ))}
        </div>
    );
}
