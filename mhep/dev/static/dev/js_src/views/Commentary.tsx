import React, { ReactElement, useContext } from 'react';

import { UpdateFunction } from '../context/UpdateFunction';
import { getScenarioList } from '../lib/scenarios';
import { getOrphanedScenarioIds } from '../lib/commentary';
import { NewAssessment } from '../types/Assessment';
import Graphics, { GraphicsProps } from '../components/Graphics';
import LongTextField from '../components/LongTextField';

interface CommentaryProps {
    assessment: NewAssessment;
    scenarioId: string;
    overviewData: { [k: string]: GraphicsProps };
}

// Passing in overviewData like this is definitely suboptimal and should be refactored
// away later, in favour of getting the right fields off the assssment class.  (When
// the assessment type has the right fields.)  XXX
export default function Commentary({
    assessment,
    overviewData,
}: CommentaryProps): ReactElement {
    const updateFn = useContext(UpdateFunction);
    const orphans = getOrphanedScenarioIds(assessment);

    return (
        <section>
            <div className="mb-30">
                <label htmlFor="field_brief">
                    <b>Initial project brief and scope</b>:
                </label>
                <LongTextField
                    id="brief"
                    notes="You should note here your understanding of the project brief and
                    scope. It should include aims and priorities - how big the project is,
                    etc."
                    value={assessment._commentary.brief}
                    setValue={(val) => (assessment._commentary.brief = val)}
                />
            </div>

            <div className="mb-30">
                <label htmlFor="field_context">
                    <b>Current context + logic of scenarios</b>:
                </label>

                <LongTextField
                    id="context"
                    value={assessment._commentary.context}
                    setValue={(val) => (assessment._commentary.context = val)}
                />
            </div>

            <div className="mb-30">
                <label htmlFor="field_decisions">
                    <b>
                        Key decisions to be made / risks and constraints / areas for
                        further investigation and development
                    </b>
                    :
                </label>

                <LongTextField
                    id="decisions"
                    value={assessment._commentary.decisions}
                    setValue={(val) => (assessment._commentary.decisions = val)}
                />
            </div>

            <h2 className="mb-0">Scenarios</h2>

            {getScenarioList(assessment, true).map(({ id, title, num }) => (
                <section key={`commentary_${id}`} className="mb-30">
                    <h3>
                        Scenario {num}: {title}
                    </h3>

                    <Graphics
                        houseData={overviewData[id].houseData}
                        targetData={overviewData[id].targetData}
                        cost={overviewData[id].cost}
                    />

                    <label htmlFor={`field_commentary_for_${id}`}>
                        <b>Description</b>:
                    </label>

                    <LongTextField
                        id={`field_commentary_for_${id}`}
                        value={assessment._commentary.scenarios[id]}
                        setValue={(val) => (assessment._commentary.scenarios[id] = val)}
                    />
                </section>
            ))}

            {orphans.map((id) => (
                <div key={`commentary_for_${id}`} className="bg-lighter mb-30 pa-15">
                    <label htmlFor={`field_commentary_for_${id}`}>
                        <b>Orphaned commentary for &quot;{id}&quot;</b>:
                    </label>

                    <LongTextField
                        id={`field_commentary_for_${id}`}
                        value={assessment._commentary.scenarios[id]}
                        setValue={(val) => (assessment._commentary.scenarios[id] = val)}
                    />

                    <button
                        className="btn btn--icon"
                        onClick={() => {
                            delete assessment._commentary.scenarios[id];
                            updateFn();
                        }}
                    >
                        <svg viewBox="0 0 1792 1792">
                            <use xlinkHref="#iconset-trash"></use>
                        </svg>
                        Delete
                    </button>
                </div>
            ))}
        </section>
    );
}
