import { isEqual } from 'lodash';
import React, { ReactElement } from 'react';

import { HTTPClient } from '../../api/http';
import type { AddressSuggestion, ResolvedAddress } from '../../data-schemas/address';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { Result } from '../../helpers/result';
import { Region } from '../../model/enums/region';
import type { RegionName } from '../../model/enums/region';
import { FormGrid } from '../input-components/forms';
import { NumericInput } from '../input-components/numeric';
import { Select } from '../input-components/select';
import { TextInput } from '../input-components/text';
import type { UiModule } from '../module-management/module-type';

type WithOriginUserData<T, U = never> =
    | { type: 'user provided'; value: T | U }
    | { type: 'overridden'; value: T | U; dbValue: T };

type WithOrigin<T, U = never> =
    | { type: 'no data' }
    | { type: 'from database'; value: T }
    | WithOriginUserData<T, U>;

type Address = {
    line1: string;
    line2: string;
    line3: string;
    postTown: string;
    postcode: string;
    country: string;
};

type LocationDensity = 'urban' | 'suburban' | 'rural';
type Exposure = 'very severe' | 'severe' | 'moderate' | 'sheltered';
type FloodRiskReservoirs = 'WITHIN' | 'OUTWITH';
type FloodRisk = 'HIGH' | 'MED' | 'LOW' | 'VLOW';
type RadonRisk = 'LOW' | '1-3' | '3-5' | '5-10' | '10-30' | '30';

type FetchStatus = 'at rest' | 'in progress' | 'error';

type SearchStage = {
    stage: 'enter search text';
    searchText: string;
    suggestionFetchStatus: FetchStatus;
};
type ChooseStage = {
    stage: 'choosing suggestion';
    searchText: string;
    suggestions: AddressSuggestion[];
    selected: AddressSuggestion | null;
    suggestionFetchStatus: FetchStatus;
    resolveFetchStatus: FetchStatus;
};
type ResolvedStage = { stage: 'address resolved' };
type LookupState = SearchStage | ChooseStage | ResolvedStage;

type State = {
    lookup: LookupState;

    // We only use the first external update
    initialUpdateComplete: boolean;

    // Looked up fields
    address: WithOrigin<Address>;
    uniquePropertyReferenceNumber: WithOrigin<string>;
    localAuthority: WithOrigin<string>;
    region: WithOrigin<Region, null>;
    elevation: WithOrigin<number, null>;
    lowerLayerSuperOutputArea: WithOrigin<string>;

    // Manual input
    localPlanningAuthority: string;
    locationDensity: LocationDensity | null;
    exposure: Exposure | null;
    floodingRiversAndSea: FloodRisk | null;
    floodingSurfaceWater: FloodRisk | null;
    floodingReservoirs: FloodRiskReservoirs | null;
    radon: RadonRisk | null;
};

const initialLookupSearchText = {
    stage: 'enter search text' as const,
    searchText: '',
    suggestionFetchStatus: 'at rest' as const,
};

type ExternalDataAction = { type: 'external data update'; state: Partial<State> };

type Action =
    | { type: 'new search text'; value: string }
    | { type: 'find address suggestions' }
    | { type: 'error during suggestion fetching' }
    | { type: 'use address suggestions'; results: AddressSuggestion[] }
    | { type: 'select address suggestion'; address: AddressSuggestion }
    | { type: 'resolve selected suggestion' }
    | { type: 'use resolved data'; data: ResolvedAddress }
    | { type: 'error during address resolution' }
    | { type: 'new search' }
    | { type: 'merge data'; state: Partial<State> }
    | ExternalDataAction;

type Effect =
    | { type: 'suggest addresses'; lookupText: string }
    | { type: 'resolve suggestion'; id: string };

type Dispatcher = (action: Action) => void;

function hasUserData<T, U>(data: WithOrigin<T, U>): data is WithOriginUserData<T, U> {
    return data.type === 'user provided' || data.type === 'overridden';
}

function getWithOriginValue<T, U>(data: WithOrigin<T, U>): T | U | undefined {
    return data.type === 'no data' ? undefined : data.value;
}

function withUserData<T, U>(data: WithOrigin<T, U>, value: T | U): WithOrigin<T, U> {
    switch (data.type) {
        case 'no data':
            return { type: 'user provided', value };
        case 'user provided':
        case 'overridden':
            return { ...data, value };
        case 'from database':
            return { type: 'overridden', dbValue: data.value, value };
    }
}

function withDatabaseData<T, U>(data: WithOrigin<T, U>, value: T): WithOrigin<T, U> {
    switch (data.type) {
        case 'no data':
            return { type: 'from database', value };
        case 'user provided':
            if (data.value === value) {
                return { type: 'from database', value: value };
            } else {
                return { type: 'overridden', value: data.value, dbValue: value };
            }
        case 'overridden':
            return { ...data, dbValue: value };
        case 'from database':
            return { ...data, value };
    }
}

function NewSearchSection({ dispatch }: { dispatch: Dispatcher }) {
    return (
        <section className="mb-30">
            <button className="btn" onClick={() => dispatch({ type: 'new search' })}>
                Search for new address
            </button>
        </section>
    );
}

function SearchTextSection({
    state,
    dispatch,
}: {
    state: SearchStage | ChooseStage;
    dispatch: Dispatcher;
}) {
    return (
        <div className="mb-15">
            <h3>Automatic search</h3>

            <label htmlFor="address_search">
                Find address by postcode or first line of address
            </label>
            <TextInput
                id="address_search"
                value={state.searchText}
                onChange={(value) => dispatch({ type: 'new search text', value })}
                onKeyDown={(evt) => {
                    // SAFETY: We know this is an <input>.
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    const target = evt.target as HTMLInputElement;
                    const searchText = target.value;
                    if (evt.key === 'Enter' && searchText !== '') {
                        dispatch({ type: 'new search text', value: searchText });
                        dispatch({ type: 'find address suggestions' });
                    }
                }}
                style={{ width: '20ch' }}
                className="mb-0"
            />
            <button
                className="btn btn-primary ml-7"
                onClick={() => {
                    if (state.searchText === '') {
                        alert('Please enter a postcode or the first line of an address.');
                    } else {
                        dispatch({ type: 'find address suggestions' });
                    }
                }}
            >
                Lookup
            </button>
            {state.suggestionFetchStatus === 'in progress' && (
                <span className="spinner ml-7"></span>
            )}
            {state.suggestionFetchStatus === 'error' && (
                <span className="ml-7">Error fetching suggestions; please try again</span>
            )}
        </div>
    );
}

function SuggestionsSection({
    state,
    dispatch,
}: {
    state: ChooseStage;
    dispatch: Dispatcher;
}) {
    if (state.suggestions.length === 0) {
        return (
            <span className="alert alert-warning pa-7 px-15">
                No results, plese try a different query
            </span>
        );
    }

    return (
        <div>
            <div className="mb-7">Select address:</div>
            <div className="addressoptions mb-7">
                {state.suggestions.map((suggestion) => (
                    // ACCESSIBILITY: The div can be safely ignored because
                    // it's just a big click area for the radio button.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                    <div
                        key={suggestion.id}
                        className="addressoptions-option"
                        onClick={() => {
                            dispatch({
                                type: 'select address suggestion',
                                address: suggestion,
                            });
                        }}
                    >
                        <input
                            type="radio"
                            className="ma-0"
                            id={`addr-result-${suggestion.id}`}
                            name="addr-result"
                            checked={suggestion.id === state.selected?.id}
                            onChange={() => {
                                dispatch({
                                    type: 'select address suggestion',
                                    address: suggestion,
                                });
                            }}
                        />{' '}
                        <label
                            className="d-ib ma-0"
                            htmlFor={`addr-result-${suggestion.id}`}
                        >
                            {suggestion.suggestion}
                        </label>
                    </div>
                ))}
            </div>
            <button
                disabled={state.selected === null}
                className="btn btn-primary"
                onClick={() => dispatch({ type: 'resolve selected suggestion' })}
            >
                Select
            </button>
            {state.resolveFetchStatus === 'in progress' && (
                <span className="spinner ml-7"></span>
            )}
            {state.resolveFetchStatus === 'error' && (
                <span className="ml-7">Error getting full data; please try again</span>
            )}
        </div>
    );
}

function LookupSection({ state, dispatch }: { state: State; dispatch: Dispatcher }) {
    if (state.lookup.stage === 'address resolved') {
        return <NewSearchSection dispatch={dispatch} />;
    } else {
        return (
            <section className="mb-15">
                <SearchTextSection state={state.lookup} dispatch={dispatch} />
                {state.lookup.stage === 'choosing suggestion' && (
                    <SuggestionsSection state={state.lookup} dispatch={dispatch} />
                )}
            </section>
        );
    }
}

function WithOriginInput<T, U>({
    data,
    labelText,
    emptyText,
    displayComponent,
    inputComponent,
    inputId,
    onChange,
    initialValue,
}: {
    data: WithOrigin<T, U>;
    labelText: string;
    emptyText: string;
    displayComponent: (data: T) => ReactElement;
    inputComponent: (box: WithOrigin<T, U>, data: T | U) => ReactElement;
    inputId: string;
    onChange: (value: WithOrigin<T, U>) => void;
    initialValue: T | U;
}) {
    return (
        <>
            {hasUserData(data) ? (
                <label htmlFor={inputId}>{labelText}:</label>
            ) : (
                <>{labelText}:</>
            )}

            {data.type === 'no data' && (
                <div>
                    {emptyText}
                    <button
                        className="btn ml-7"
                        onClick={() => onChange(withUserData<T, U>(data, initialValue))}
                    >
                        Enter manually
                    </button>
                </div>
            )}
            {data.type === 'user provided' && (
                <div>{inputComponent(data, data.value)}</div>
            )}
            {data.type === 'from database' && (
                <div>
                    {displayComponent(data.value)}
                    <button
                        className="btn ml-7"
                        onClick={() => onChange(withUserData<T, U>(data, data.value))}
                    >
                        Override
                    </button>
                </div>
            )}
            {data.type === 'overridden' && (
                <div>
                    {inputComponent(data, data.value)}
                    <button
                        className="btn ml-7"
                        onClick={() =>
                            onChange({ type: 'from database', value: data.dbValue })
                        }
                    >
                        Remove override
                    </button>
                </div>
            )}
        </>
    );
}

function AddressSearch({ state, dispatch }: { state: State; dispatch: Dispatcher }) {
    function dispatchMerge(state: Partial<State>) {
        dispatch({
            type: 'merge data',
            state,
        });
    }

    return (
        <section>
            <LookupSection state={state} dispatch={dispatch} />

            <h3>Address data</h3>
            <FormGrid>
                <WithOriginInput
                    data={state.address}
                    labelText="Address"
                    emptyText="Enter a postcode for automatic lookup"
                    displayComponent={(address) => (
                        <>
                            {address.line1}
                            <br />
                            {address.line2 !== '' && (
                                <>
                                    {address.line2}
                                    <br />
                                </>
                            )}
                            {address.line3 !== '' && (
                                <>
                                    {address.line3}
                                    <br />
                                </>
                            )}
                            {address.postTown}
                            <br />
                            {address.postcode}
                            <br />
                            {address.country}
                        </>
                    )}
                    initialValue={{
                        line1: '',
                        line2: '',
                        line3: '',
                        postTown: '',
                        postcode: '',
                        country: '',
                    }}
                    onChange={(val) => dispatchMerge({ address: val })}
                    inputComponent={(box, address) => {
                        function updateLine(newLine: Partial<Address>): Address {
                            return {
                                ...address,
                                ...newLine,
                            };
                        }
                        function dispatchLineChange(newLine: Partial<Address>) {
                            dispatchMerge({
                                address: withUserData(box, updateLine(newLine)),
                            });
                        }
                        return (
                            <>
                                <TextInput
                                    id="address_1"
                                    className="mb-7"
                                    value={address.line1}
                                    onChange={(val) => {
                                        dispatchLineChange({ line1: val });
                                    }}
                                />
                                <br />
                                <TextInput
                                    id="line_2"
                                    className="mb-7"
                                    value={address.line2}
                                    onChange={(val) => {
                                        dispatchLineChange({ line2: val });
                                    }}
                                />
                                <br />
                                <TextInput
                                    id="line_3"
                                    className="mb-7"
                                    value={address.line3}
                                    onChange={(val) => {
                                        dispatchLineChange({ line3: val });
                                    }}
                                />
                                <br />
                                <TextInput
                                    id="post_town"
                                    placeholder="Town/City"
                                    className="mb-7"
                                    style={{ width: '18ch' }}
                                    value={address.postTown}
                                    onChange={(val) => {
                                        dispatchLineChange({ postTown: val });
                                    }}
                                />
                                <br />
                                <TextInput
                                    id="postcode"
                                    placeholder="Postcode"
                                    className="mb-7"
                                    style={{ width: '10ch' }}
                                    value={address.postcode}
                                    onChange={(val) => {
                                        dispatchLineChange({ postcode: val });
                                    }}
                                />
                                <br />
                                <TextInput
                                    id="country"
                                    placeholder="Country"
                                    className="mb-7"
                                    value={address.country}
                                    onChange={(val) => {
                                        dispatchLineChange({ country: val });
                                    }}
                                />
                                <br />
                            </>
                        );
                    }}
                    inputId="line_1"
                />

                {state.address.type !== 'no data' && (
                    <>
                        <span>Links:</span>
                        <span>
                            <a
                                href={`https://www.google.co.uk/maps/search/${state.address.value.line1},${state.address.value.line2},${state.address.value.line3},${state.address.value.postTown},${state.address.value.postcode}/`}
                                target="_blank"
                                rel="noreferrer noopener"
                            >
                                Google Maps
                            </a>
                            <br />
                            <a
                                href={`https://find-energy-certificate.service.gov.uk/find-a-certificate/search-by-postcode?postcode=${state.address.value.postcode}`}
                                target="_blank"
                                rel="noreferrer noopener"
                            >
                                List of EPCs for postcode
                            </a>
                        </span>
                    </>
                )}

                <WithOriginInput
                    data={state.uniquePropertyReferenceNumber}
                    labelText="UPRN"
                    emptyText="Enter a postcode for automatic lookup"
                    displayComponent={(uprn) => <>{uprn}</>}
                    initialValue={''}
                    onChange={(val) =>
                        dispatchMerge({ uniquePropertyReferenceNumber: val })
                    }
                    inputComponent={(box, uprn) => (
                        <TextInput
                            id="uprn"
                            value={uprn}
                            onChange={(val) =>
                                dispatchMerge({
                                    uniquePropertyReferenceNumber: withUserData(
                                        state.uniquePropertyReferenceNumber,
                                        val,
                                    ),
                                })
                            }
                            style={{ width: '14ch' }}
                        />
                    )}
                    inputId="uprn"
                />

                <WithOriginInput
                    data={state.localAuthority}
                    labelText="Local authority"
                    emptyText="Enter a postcode for automatic lookup"
                    displayComponent={(localAuthority) => <>{localAuthority}</>}
                    initialValue={''}
                    onChange={(val) => dispatchMerge({ localAuthority: val })}
                    inputComponent={(box, localAuthority) => (
                        <TextInput
                            id="localAuthority"
                            value={localAuthority}
                            onChange={(val) =>
                                dispatchMerge({
                                    localAuthority: withUserData(
                                        state.localAuthority,
                                        val,
                                    ),
                                })
                            }
                        />
                    )}
                    inputId="localAuthority"
                />

                <span>Local planning authority:</span>
                <span>
                    <TextInput
                        id="localPlanningAuthority"
                        value={state.localPlanningAuthority}
                        onChange={(val) => dispatchMerge({ localPlanningAuthority: val })}
                    />
                    <br />
                    <small>Only if different to local authority</small>
                </span>

                <WithOriginInput
                    data={state.lowerLayerSuperOutputArea}
                    labelText="LSOA"
                    emptyText="Enter a postcode for automatic lookup"
                    displayComponent={(lsoa) => <>{lsoa}</>}
                    initialValue={''}
                    onChange={(val) => dispatchMerge({ lowerLayerSuperOutputArea: val })}
                    inputComponent={(box, lsoa) => (
                        <TextInput
                            id="lsoa"
                            value={lsoa}
                            onChange={(val) =>
                                dispatchMerge({
                                    lowerLayerSuperOutputArea: withUserData(
                                        state.lowerLayerSuperOutputArea,
                                        val,
                                    ),
                                })
                            }
                        />
                    )}
                    inputId="lsoa"
                />

                <WithOriginInput
                    data={state.region}
                    labelText="SAP region"
                    emptyText="Enter a postcode for automatic lookup"
                    displayComponent={(region) => <>{region.name}</>}
                    initialValue={null}
                    onChange={(val) => dispatchMerge({ region: val })}
                    inputComponent={(box, region) => (
                        <Select<RegionName>
                            id="region"
                            className="input--auto-width"
                            options={Region.all.map((region) => ({
                                value: region.name,
                                display: region.name,
                            }))}
                            selected={region === null ? null : region.name}
                            callback={(val) =>
                                dispatchMerge({
                                    region: withUserData(box, new Region(val)),
                                })
                            }
                        />
                    )}
                    inputId="region"
                />
            </FormGrid>

            <h3>Geography</h3>
            <FormGrid>
                <WithOriginInput
                    data={state.elevation}
                    labelText="Elevation"
                    emptyText="Enter a postcode for automatic lookup"
                    displayComponent={(elevation) => <>{elevation}m</>}
                    initialValue={null}
                    onChange={(val) => dispatchMerge({ elevation: val })}
                    inputComponent={(box, elevation) => (
                        <NumericInput
                            id="elevation"
                            value={elevation}
                            unit="m"
                            callback={(val) =>
                                dispatchMerge({
                                    elevation: withUserData(state.elevation, val),
                                })
                            }
                        />
                    )}
                    inputId="elevation"
                />

                <label htmlFor="exposure">Exposure:</label>
                <div>
                    <Select<Exposure>
                        className="input--auto-width"
                        id="exposure"
                        options={[
                            { value: 'very severe', display: 'very severe' },
                            { value: 'severe', display: 'severe' },
                            { value: 'moderate', display: 'moderate' },
                            { value: 'sheltered', display: 'sheltered' },
                        ]}
                        selected={state.exposure}
                        callback={(val) => dispatchMerge({ exposure: val })}
                    />
                </div>

                <label htmlFor="density">Location type:</label>
                <div>
                    <Select<LocationDensity>
                        className="input--auto-width"
                        id="density"
                        options={[
                            { value: 'rural', display: 'Rural' },
                            {
                                value: 'suburban',
                                display:
                                    'Low rise urban / suburban (town or village situations with other buildings well spaced)',
                            },
                            {
                                value: 'urban',
                                display:
                                    'Dense urban (mostly closely spaced buildings of >3 storeys)',
                            },
                        ]}
                        selected={state.locationDensity}
                        callback={(val) => dispatchMerge({ locationDensity: val })}
                    />
                </div>
            </FormGrid>

            <h3>Risk of flooding</h3>

            <p>
                Please look this up using the{' '}
                <a
                    href="https://flood-warning-information.service.gov.uk/long-term-flood-risk/map"
                    rel="noreferrer"
                    target="_blank"
                    style={{ textDecoration: 'underline' }}
                >
                    uk.gov flood risk map
                </a>
                .
            </p>

            <FormGrid>
                <span>Rivers and sea:</span>
                <div>
                    <Select<FloodRisk>
                        id="rivers_and_sea"
                        options={[
                            { value: 'HIGH', display: 'high' },
                            { value: 'MED', display: 'medium' },
                            { value: 'LOW', display: 'low' },
                            { value: 'VLOW', display: 'very low' },
                        ]}
                        selected={state.floodingRiversAndSea}
                        callback={(val) => dispatchMerge({ floodingRiversAndSea: val })}
                    />
                </div>

                <span>Surface water:</span>
                <div>
                    <Select<FloodRisk>
                        id="surface_water"
                        options={[
                            { value: 'HIGH', display: 'high' },
                            { value: 'MED', display: 'medium' },
                            { value: 'LOW', display: 'low' },
                            { value: 'VLOW', display: 'very low' },
                        ]}
                        selected={state.floodingSurfaceWater}
                        callback={(val) =>
                            dispatchMerge({
                                floodingSurfaceWater: val,
                            })
                        }
                    />
                </div>

                <span>Reservoirs:</span>
                <span>
                    <Select<FloodRiskReservoirs>
                        id="reservoirs"
                        options={[
                            {
                                value: 'WITHIN',
                                display: 'within extent of flooding',
                            },
                            {
                                value: 'OUTWITH',
                                display: 'not within extent of flooding',
                            },
                        ]}
                        selected={state.floodingReservoirs}
                        callback={(val) =>
                            dispatchMerge({
                                floodingReservoirs: val,
                            })
                        }
                    />
                </span>
            </FormGrid>

            <h3>Radon</h3>

            <p>
                Please look this up using the{' '}
                <a
                    href="https://www.ukradon.org/information/ukmaps"
                    rel="noreferrer"
                    target="_blank"
                    style={{ textDecoration: 'underline' }}
                >
                    UK Radon map
                </a>
                .
            </p>

            <FormGrid>
                <span>Radon risk:</span>
                <span>
                    <Select<RadonRisk>
                        id="radon"
                        className="input--auto-width"
                        options={[
                            { value: 'LOW', display: 'less than 1%' },
                            { value: '1-3', display: '1-3%' },
                            { value: '3-5', display: '3-5%' },
                            { value: '5-10', display: '5-10%' },
                            { value: '10-30', display: '10-30%' },
                            { value: '30', display: 'greater than 30%' },
                        ]}
                        selected={state.radon}
                        callback={(val) => dispatchMerge({ radon: val })}
                    />{' '}
                    chance of a high level of radon
                </span>
            </FormGrid>
        </section>
    );
}

export const addressSearchModule: UiModule<State, Action, Effect> = {
    name: 'address search',
    component: AddressSearch,
    initialState: (): State => {
        return {
            initialUpdateComplete: false,
            lookup: initialLookupSearchText,
            address: { type: 'no data' },
            localPlanningAuthority: '',
            locationDensity: null,
            exposure: null,
            floodingRiversAndSea: null,
            floodingSurfaceWater: null,
            floodingReservoirs: null,
            radon: null,
            region: { type: 'no data' },
            uniquePropertyReferenceNumber: { type: 'no data' },
            localAuthority: { type: 'no data' },
            lowerLayerSuperOutputArea: { type: 'no data' },
            elevation: { type: 'no data' },
        };
    },
    reducer: (state: State, action: Action): [State, Effect[]?] => {
        switch (action.type) {
            case 'new search text': {
                if (state.lookup.stage === 'address resolved') {
                    return [state];
                } else {
                    return [
                        {
                            ...state,
                            lookup: { ...state.lookup, searchText: action.value },
                        },
                    ];
                }
            }

            case 'find address suggestions': {
                if (state.lookup.stage === 'address resolved') {
                    return [state];
                } else {
                    return [
                        {
                            ...state,
                            lookup: {
                                ...state.lookup,
                                suggestionFetchStatus: 'in progress',
                            },
                        },
                        [
                            {
                                type: 'suggest addresses',
                                lookupText: state.lookup.searchText,
                            },
                        ],
                    ];
                }
            }

            case 'error during suggestion fetching': {
                if (state.lookup.stage === 'address resolved') {
                    return [state];
                } else {
                    return [
                        {
                            ...state,
                            lookup: {
                                ...state.lookup,
                                suggestionFetchStatus: 'error',
                            },
                        },
                    ];
                }
            }

            case 'use address suggestions': {
                if (state.lookup.stage === 'address resolved') {
                    return [state];
                } else {
                    return [
                        {
                            ...state,
                            lookup: {
                                stage: 'choosing suggestion',
                                searchText: state.lookup.searchText,
                                suggestions: action.results,
                                selected: null,
                                suggestionFetchStatus: 'at rest',
                                resolveFetchStatus: 'at rest',
                            },
                        },
                    ];
                }
            }

            case 'select address suggestion': {
                if (state.lookup.stage !== 'choosing suggestion') {
                    return [state];
                } else {
                    return [
                        {
                            ...state,
                            lookup: {
                                ...state.lookup,
                                selected: action.address,
                            },
                        },
                    ];
                }
            }

            case 'resolve selected suggestion': {
                if (
                    state.lookup.stage === 'choosing suggestion' &&
                    state.lookup.selected !== null
                ) {
                    return [
                        {
                            ...state,
                            lookup: {
                                ...state.lookup,
                                resolveFetchStatus: 'in progress',
                            },
                        },
                        [{ type: 'resolve suggestion', id: state.lookup.selected.id }],
                    ];
                } else {
                    return [state];
                }
            }

            case 'use resolved data': {
                const { address, localAuthority, uprn, lsoa, elevation } = action.data;
                return [
                    {
                        ...state,
                        lookup: { stage: 'address resolved' },
                        address: withDatabaseData(state.address, address),
                        lowerLayerSuperOutputArea:
                            lsoa !== null
                                ? withDatabaseData(state.lowerLayerSuperOutputArea, lsoa)
                                : state.lowerLayerSuperOutputArea,
                        elevation:
                            elevation !== null
                                ? withDatabaseData(state.elevation, elevation)
                                : state.elevation,
                        uniquePropertyReferenceNumber: withDatabaseData(
                            state.uniquePropertyReferenceNumber,
                            uprn,
                        ),
                        localAuthority: withDatabaseData(
                            state.localAuthority,
                            localAuthority,
                        ),
                        region: withDatabaseData(
                            state.region,
                            Region.fromPostcode(address.postcode).unwrap(),
                        ),
                    },
                ];
            }

            case 'error during address resolution': {
                if (state.lookup.stage !== 'choosing suggestion') {
                    return [state];
                } else {
                    return [
                        {
                            ...state,
                            lookup: {
                                ...state.lookup,
                                resolveFetchStatus: 'in progress',
                            },
                        },
                    ];
                }
            }

            case 'new search': {
                return [{ ...state, lookup: initialLookupSearchText }];
            }

            case 'merge data': {
                return [
                    {
                        ...state,
                        ...action.state,
                    },
                ];
            }

            case 'external data update': {
                if (state.initialUpdateComplete) {
                    return [state];
                } else {
                    return [
                        {
                            ...state,
                            ...action.state,
                            initialUpdateComplete: true,
                        },
                    ];
                }
            }
        }
    },
    effector: async (effect, dispatch) => {
        const apiClient = new HTTPClient();

        switch (effect.type) {
            case 'suggest addresses': {
                const result = await apiClient.suggestAddresses(effect.lookupText);
                if (!result.isErr()) {
                    dispatch({
                        type: 'use address suggestions',
                        results: result.unwrap(),
                    });
                } else {
                    dispatch({ type: 'error during suggestion fetching' });
                }
                break;
            }

            case 'resolve suggestion': {
                const result = await apiClient.resolveAddress(effect.id);
                if (!result.isErr()) {
                    dispatch({
                        type: 'use resolved data',
                        data: result.unwrap(),
                    });
                } else {
                    dispatch({ type: 'error during address resolution' });
                }
                break;
            }
        }
    },
    shims: {
        extractUpdateAction: ({ project }) => {
            const baselineScenario = project.data['master'];
            const household = baselineScenario?.household;

            // This handles the case where the feature flag is turned on for some,
            // not turned on for others. Legacy pages might update the non _full version
            // of these values but not the original; this handles these two getting out
            // of sync by preserving the legacy value as a user-selected value.
            // When the feature flag is turned on permanently, this can be removed.
            function fromValues<T, U>(
                legacyVal: T | U | null,
                withOriginVal: WithOrigin<T, U> | null,
            ): WithOrigin<T, U> {
                if (withOriginVal === null) {
                    if (legacyVal === null) {
                        return { type: 'no data' };
                    } else {
                        return { type: 'user provided', value: legacyVal };
                    }
                } else if (
                    withOriginVal.type === 'no data' &&
                    typeof legacyVal === 'number' &&
                    legacyVal === 0
                ) {
                    // This handles the fact that region and elevation are both set
                    // to '0' by the model initialisation code, but neither of them are
                    // user-entered. So we need to ignore the 0, it counts as no data.
                    return withOriginVal;
                } else if (
                    hasUserData(withOriginVal) &&
                    !isEqual(withOriginVal.value, legacyVal)
                ) {
                    if (legacyVal === null) {
                        // The legacyVal will in practice never be null, since the old
                        // code never outputs null.
                        return withOriginVal;
                    } else {
                        return withUserData(withOriginVal, legacyVal);
                    }
                } else {
                    return withOriginVal;
                }
            }

            const action: ExternalDataAction = {
                type: 'external data update',
                state: {
                    elevation: fromValues<number, null>(
                        coalesceEmptyString(baselineScenario?.altitude, null) ?? null,
                        baselineScenario?.altitude_full ?? null,
                    ),
                    uniquePropertyReferenceNumber:
                        household?.uniquePropertyReferenceNumber ?? { type: 'no data' },
                    localAuthority: fromValues<string, never>(
                        household?.address_la ?? null,
                        household?.address_la_full ?? null,
                    ),
                    lowerLayerSuperOutputArea: fromValues<string, never>(
                        household?.address_lsoa ?? null,
                        household?.address_lsoa_full ?? null,
                    ),
                    localPlanningAuthority: household?.local_planning_authority ?? '',
                    locationDensity: household?.location_density ?? null,
                    exposure: household?.exposure ?? null,
                    floodingRiversAndSea: household?.flooding_rivers_sea ?? null,
                    floodingSurfaceWater: household?.flooding_surface_water ?? null,
                    floodingReservoirs: household?.flooding_reservoirs ?? null,
                    radon: household?.radon_risk ?? null,
                },
            };

            const addressLegacy = {
                line1: household?.address_1 ?? '',
                line2: household?.address_2 ?? '',
                line3: household?.address_3 ?? '',
                postTown: household?.address_town ?? '',
                postcode: household?.address_postcode ?? '',
                country: household?.address_country ?? '',
            };
            const ignoreAddress = Object.values(addressLegacy).every((val) => val === '');
            action.state.address = ignoreAddress
                ? { type: 'no data' }
                : household?.address_full === undefined
                ? { type: 'user provided', value: addressLegacy }
                : fromValues<Address, never>(
                      addressLegacy,
                      household?.address_full ?? null,
                  );

            const regionNumbered = fromValues<number, null>(
                baselineScenario?.region ?? null,
                baselineScenario?.region_full ?? null,
            );
            switch (regionNumbered.type) {
                case 'no data':
                    action.state.region = regionNumbered;
                    break;
                case 'user provided':
                    action.state.region = {
                        ...regionNumbered,
                        value:
                            regionNumbered.value !== null
                                ? Region.fromIndex0(regionNumbered.value)
                                : null,
                    };
                    break;
                case 'from database':
                    action.state.region = {
                        ...regionNumbered,
                        value: Region.fromIndex0(regionNumbered.value),
                    };
                    break;
                case 'overridden':
                    action.state.region = {
                        ...regionNumbered,
                        value:
                            regionNumbered.value !== null
                                ? Region.fromIndex0(regionNumbered.value)
                                : null,
                        dbValue: Region.fromIndex0(regionNumbered.dbValue),
                    };
                    break;
            }

            if (household?.looked_up === true) {
                action.state.lookup = { stage: 'address resolved' };
            }

            return Result.ok(action);
        },

        mutateLegacyData: ({ project }: { project: unknown }, state: State) => {
            const manual = {
                local_planning_authority: state.localPlanningAuthority,
                location_density: state.locationDensity ?? undefined,
                exposure: state.exposure ?? undefined,
                flooding_rivers_sea: state.floodingRiversAndSea ?? undefined,
                flooding_surface_water: state.floodingSurfaceWater ?? undefined,
                flooding_reservoirs: state.floodingReservoirs ?? undefined,
                radon_risk: state.radon ?? undefined,
            };

            /* eslint-disable
               @typescript-eslint/consistent-type-assertions,
               @typescript-eslint/no-explicit-any,
               @typescript-eslint/no-unsafe-assignment,
               @typescript-eslint/no-unsafe-member-access,
               @typescript-eslint/no-unsafe-call,
               @typescript-eslint/no-unsafe-argument,
            */
            const dataAny = (project as any).data;
            for (const scenario of Object.values(dataAny)) {
                const scenarioAny = scenario as any;
                scenarioAny.household = scenarioAny.household ?? {};

                const householdAny = scenarioAny.household;

                scenarioAny.altitude = getWithOriginValue(state.elevation) ?? undefined;
                scenarioAny.altitude_full = state.elevation;

                scenarioAny.region =
                    getWithOriginValue(state.region)?.index0 ?? undefined;
                switch (state.region.type) {
                    case 'no data':
                        scenarioAny.region_full = state.region;
                        break;
                    case 'user provided':
                    case 'from database':
                        scenarioAny.region_full = {
                            ...state.region,
                            value: state.region.value?.index0 ?? null,
                        };
                        break;
                    case 'overridden':
                        scenarioAny.region_full = {
                            ...state.region,
                            value: state.region.value?.index0 ?? null,
                            dbValue: state.region.dbValue.index0,
                        };
                        break;
                }

                householdAny.uprn = state.uniquePropertyReferenceNumber;

                householdAny.address_la = getWithOriginValue(state.localAuthority);
                householdAny.address_la_full = state.localAuthority;

                householdAny.address_lsoa = getWithOriginValue(
                    state.lowerLayerSuperOutputArea,
                );
                householdAny.address_lsoa_full = state.lowerLayerSuperOutputArea;

                if (householdAny.looked_up !== true) {
                    householdAny.looked_up = state.lookup.stage === 'address resolved';
                }

                const address = getWithOriginValue(state.address);
                if (address !== undefined) {
                    householdAny.address_1 = address.line1;
                    householdAny.address_2 = address.line2;
                    householdAny.address_3 = address.line3;
                    householdAny.address_town = address.postTown;
                    householdAny.address_postcode = address.postcode;
                    householdAny.address_country = address.country;
                }
                householdAny.address_full = state.address;

                Object.assign(householdAny, manual);
            }
            /* eslint-enable */
        },
    },
};