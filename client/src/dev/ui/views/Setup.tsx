import React, { ReactElement, useState, useContext } from 'react';

import FormRow from '../components/FormRow';
import NumberField from '../components/NumberField';
import SelectField from '../components/SelectField';
import TextField from '../components/TextField';
import { AppContext } from '../context/AppContext';
import { regions, getRegionFromPostcode } from '../data/regions';
import { getScenarioList, getScenario } from '../lib/scenarios';
import { AssessmentMeta } from '../types/Assessment';

interface SetupProps {
    data: AssessmentMeta;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace mhep_helper {
    function set_name(id: string, name: string): void;
    function set_description(id: string, description: string): void;
}

declare global {
    function redraw_sidebar(): void;
}

/**** Fetch postcode data ****/

type PostcodeDataError = {
    status: number;
    error: string;
};

type PostcodeDataResult = {
    status: number;
    result: {
        longitude: number;
        latitude: number;
        lsoa: string;
        admin_district: string;
    };
};

const getPostcodeData = async (
    postcode: string,
): Promise<PostcodeDataResult | PostcodeDataError> => {
    const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
    if (response.ok) {
        const result = (await response.json()) as PostcodeDataResult | PostcodeDataError;
        return result;
    } else {
        return {
            status: -1,
            error: 'Failed fetching',
        };
    }
};

/**** Fetch latitude data ****/

type ElevationError = {
    error: string;
};
type ElevationResult = {
    results: [{ elevation: number }, ...{ elevation: number }[]];
};

const getElevationData = async (
    lat: number,
    long: number,
): Promise<ElevationResult | ElevationError> => {
    const response = await fetch(
        `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${long}`,
    );
    if (response.ok) {
        const result = (await response.json()) as ElevationResult | ElevationError;
        return result;
    } else {
        return {
            error: 'Failed fetching',
        };
    }
};

export default function Setup({ data }: SetupProps): ReactElement {
    const { update } = useContext(AppContext);
    const [badPostcode, setBadPostcode] = useState(false);

    const [waitingFor, setWaitingFor] = useState<'both' | 'elevation' | 'none'>('none');

    const scenario = getScenario(data.data, 'master');

    const getDeets = async (postcode: string) => {
        /*
         * To avoid editing the schema right now we set every scenario's bit of data
         * individually.  Yes it's horrible.  TODO: Only hold this data in one place.
         * Once we have a migrations framework.
         */
        const scenarioList = getScenarioList(data.data);

        setWaitingFor('both');

        const postcodeData = await getPostcodeData(postcode);

        if ('error' in postcodeData) {
            setBadPostcode(true);
            setWaitingFor('none');
            return;
        } else {
            setBadPostcode(false);
        }

        const region = getRegionFromPostcode(postcode);

        for (const { id } of scenarioList) {
            const scene = getScenario(data.data, id);
            scene.household.address_la = postcodeData.result.admin_district;
            scene.household.address_lsoa = postcodeData.result.lsoa;
            if (region !== null) {
                scene.region = region;
            }
        }

        setWaitingFor('elevation');
        update();

        const elevationData = await getElevationData(
            postcodeData.result.latitude,
            postcodeData.result.longitude,
        );
        if ('results' in elevationData) {
            for (const { id } of scenarioList) {
                const scene = getScenario(data.data, id);
                scene.altitude = Math.round(elevationData.results[0].elevation);
            }
        }

        setWaitingFor('none');

        update();
    };

    return (
        <section>
            <FormRow narrow>
                <label htmlFor="field_name">Name</label>
                <TextField
                    id="name"
                    value={data.name}
                    setValue={(val) => {
                        data.name = val;
                        mhep_helper.set_name(data.id, val);
                        redraw_sidebar();
                    }}
                    updateModel={false}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_name">Description</label>
                <TextField
                    id="name"
                    value={data.description}
                    setValue={(val) => {
                        data.description = val;
                        mhep_helper.set_description(data.id, val);
                    }}
                    updateModel={false}
                />
            </FormRow>

            <FormRow narrow>
                <span>Status</span>
                <span>{data.status}</span>
            </FormRow>

            <FormRow narrow>
                <span>Created</span>
                <span>{new Date(data.created_at).toLocaleString('en-GB')}</span>
            </FormRow>

            <FormRow narrow>
                <span>Last updated</span>
                <span>{new Date(data.updated_at).toLocaleString('en-GB')}</span>
            </FormRow>

            <h3>Assessor Info</h3>

            <FormRow narrow>
                <label htmlFor="field_assessor_name">Name</label>
                <TextField
                    id="assessor_name"
                    value={scenario.household.assessor_name}
                    setValue={(val) => {
                        scenario.household.assessor_name = val;
                    }}
                />
            </FormRow>

            {data.organisation && (
                <FormRow narrow>
                    <span>For</span>
                    <span>{data.organisation.name}</span>
                </FormRow>
            )}

            <h3>Location</h3>

            <FormRow narrow>
                <label htmlFor="field_householder_name">Householder&apos;s name</label>
                <TextField
                    id="assessor_name"
                    value={scenario.household.householder_name}
                    setValue={(val) => {
                        scenario.household.householder_name = val;
                    }}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_address_1">Address:</label>

                <div>
                    <TextField
                        id="address_1"
                        className="mb-7"
                        value={scenario.household.address_1}
                        setValue={(val) => {
                            scenario.household.address_1 = val;
                        }}
                    />
                    <TextField
                        id="address_2"
                        className="mb-7"
                        value={scenario.household.address_2}
                        setValue={(val) => {
                            scenario.household.address_2 = val;
                        }}
                    />
                    <TextField
                        id="address_3"
                        className="mb-7"
                        value={scenario.household.address_3}
                        setValue={(val) => {
                            scenario.household.address_3 = val;
                        }}
                    />
                </div>
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_address_town">Town/city:</label>

                <TextField
                    id="address_town"
                    className="width-130"
                    value={scenario.household.address_town}
                    setValue={(val) => {
                        scenario.household.address_town = val;
                    }}
                />
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_address_postcode">Postcode:</label>

                <div>
                    <TextField
                        id="address_postcode"
                        className="width-130"
                        value={scenario.household.address_postcode}
                        setValue={(val) => {
                            scenario.household.address_postcode = val;
                            void getDeets(scenario.household.address_postcode);
                        }}
                    />

                    {badPostcode && (
                        <div className="bg-warning-300 border-warning-700 pa-7 mb-15 mt-7 width-max-content">
                            <span role="img" aria-label="Warning">
                                ⚠️
                            </span>
                            Couldn&apos;t find this postcode. Please check it is correct.
                        </div>
                    )}
                </div>
            </FormRow>

            <FormRow narrow>
                <label htmlFor="address_la">Local authority:</label>

                <TextField
                    id="address_la"
                    value={scenario.household.address_la}
                    setValue={(val) => {
                        scenario.household.address_la = val;
                    }}
                />

                {waitingFor === 'both' && <span className="ml-7">Fetching...</span>}
            </FormRow>

            <FormRow narrow>
                <label htmlFor="address_lsoa">
                    <abbr title="Lower Super Output Area">LSOA</abbr>:
                </label>

                <TextField
                    id="address_la"
                    value={scenario.household.address_lsoa}
                    setValue={(val) => {
                        scenario.household.address_lsoa = val;
                    }}
                />

                {waitingFor === 'both' && <span className="ml-7">Fetching...</span>}
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_region">SAP region:</label>
                {
                    <SelectField
                        id="region"
                        options={regions}
                        value={scenario.region}
                        setValue={(val) => (scenario.region = val)}
                    />
                }

                {waitingFor === 'both' && <span className="ml-7">Fetching...</span>}
            </FormRow>

            <FormRow narrow>
                <label htmlFor="field_altitude">Altitude:</label>
                <NumberField
                    id="altitude"
                    units="m"
                    value={scenario.altitude}
                    setValue={(val) => (scenario.altitude = val)}
                />

                {waitingFor !== 'none' && <span className="ml-7">Fetching...</span>}
            </FormRow>
        </section>
    );
}
