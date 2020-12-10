import React from 'react';
import Graphics from '../components/Graphics';
import LongTextField from '../components/LongTextField';

// Passing in overviewData like this is definitely suboptimal and should be refactored
// away later, in favour of getting the right fields off the assssment class.  (When
// the assessment class has the right fields.)  XXX
export default function Commentary({ assessment, overviewData }) {
    const orphans = assessment.commentary.getOrphanedScenarioIds();

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

            <h2 className="mb-0">Scenarios</h2>

            {assessment
                .getScenarioList({ excludeBase: true })
                .map(({ id, title, num }) => {
                    let { houseData, targetData, cost } = overviewData[id];

                    return (
                        <section key={`commentary_${id}`}>
                            <h3>
                                Scenario {num}: {title}
                            </h3>

                            <Graphics
                                houseData={houseData}
                                targetData={targetData}
                                cost={cost}
                            />

                            <LongTextField
                                id={`commentary_for_${id}`}
                                className="mb-30"
                                value={assessment.commentary.getText(id)}
                                setValue={(val) => assessment.commentary.setText(id, val)}
                            >
                                <b>Description</b>
                            </LongTextField>
                        </section>
                    );
                })}

            {orphans
                ? orphans.map((id) => (
                      <div
                          key={`commentary_for_${id}`}
                          className="bg-lighter mb-30 pa-15"
                      >
                          <LongTextField
                              key={`commentary_for_${id}`}
                              id={`commentary_for_${id}`}
                              value={assessment.commentary.getText(id)}
                              setValue={(val) => assessment.commentary.setText(id, val)}
                          >
                              <b>Orphaned commentary for &quot;{id}&quot;</b>
                          </LongTextField>
                          <button
                              className="btn btn--icon"
                              onClick={() => assessment.commentary.deleteText(id)}
                          >
                              <svg viewBox="0 0 1792 1792">
                                  <use xlinkHref="#iconset-trash"></use>
                              </svg>
                              Delete
                          </button>
                      </div>
                  ))
                : null}
        </div>
    );
}
