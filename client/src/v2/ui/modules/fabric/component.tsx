import React, { useLayoutEffect, useState } from 'react';

import type { PropsOf } from '../../../helpers/props-of';
import type { Shadow } from '../../../helpers/shadow-object-type';
import { DeleteIcon, UndoIcon, HammerIcon, PlusIcon } from '../../icons';
import type { Icon } from '../../icons';
import { CheckboxInput } from '../../input-components/checkbox';
import {
    SelectWallLike,
    CompleteWall,
    SelectWallLikeMeasure,
    CompleteWallMeasure,
} from '../../input-components/libraries';
import { NumericInput, NumericInputProps } from '../../input-components/numeric';
import type { RadioGroupProps } from '../../input-components/radio-group';
import { RadioGroup } from '../../input-components/radio-group';
import { TextualInput, TextualInputProps } from '../../input-components/textual';
import { LockedWarning } from '../../output-components/locked-warning';
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from '../../output-components/modal';
import { noOutput } from '../../output-components/numeric';
import { NumericOutput } from '../../output-components/numeric';
import type { Action } from './reducer';
import type { State, WallLike } from './state';

type Dispatcher = (action: Action) => void;

type PageContextInterface = {
    locked: boolean;
};

export const PageContext = React.createContext<PageContextInterface>({
    locked: false,
});

function MyNumericInput(props: Omit<NumericInputProps, 'readOnly' | 'style'>) {
    const { locked } = React.useContext(PageContext);

    return (
        <NumericInput
            {...props}
            readOnly={locked}
            style={{ width: '50px', marginBottom: 0 }}
        />
    );
}

function MyTextualInput(props: Omit<TextualInputProps, 'readOnly' | 'style'>) {
    const { locked } = React.useContext(PageContext);

    return <TextualInput {...props} readOnly={locked} style={{ marginBottom: 0 }} />;
}

function MyRadioGroup<T extends string>(props: Omit<RadioGroupProps<T>, 'disabled'>) {
    const { locked } = React.useContext(PageContext);

    return <RadioGroup {...props} disabled={locked} />;
}

type BasicButtonProps = {
    icon?: Icon;
    className?: string;
    title: string;
};
type ButtonProps = Shadow<PropsOf<'button'>, BasicButtonProps>;

function Button({ className = '', icon, title, ...passthroughProps }: ButtonProps) {
    const { locked } = React.useContext(PageContext);

    return (
        <button
            disabled={locked}
            className={`btn d-iflex align-items-center ${className}`}
            {...passthroughProps}
        >
            {icon !== undefined && React.createElement(icon, { className: 'mr-7' })}
            {title}
        </button>
    );
}

type SelectBulkElementsParams = {
    onClose: () => void;
    onSelect: (ids: number[]) => void;
    measureToApply: { tag: string; name: string };
    items: {
        id: number;
        element: { tag: string; name: string };
        inputs: { location: string | null };
    }[];
};

function SelectBulkElements({
    onClose,
    onSelect,
    measureToApply,
    items,
}: SelectBulkElementsParams): JSX.Element {
    const [selected, setSelected] = useState<number[]>([]);
    function toggleSelected(id: number) {
        if (selected.includes(id)) {
            setSelected(selected.filter((element) => element !== id));
        } else {
            setSelected([...selected, id]);
        }
    }

    return (
        <Modal onClose={onClose} headerId="modal-header">
            <ModalHeader title="Select elements" onClose={onClose}>
                <div>
                    Applying <b>{measureToApply.tag}</b>: {measureToApply.name}
                </div>
            </ModalHeader>
            <ModalBody>
                <p>Apply to:</p>
                <table className="table">
                    <tbody>
                        {items.map((item, idx) => (
                            <tr
                                key={idx}
                                onClick={() => toggleSelected(item.id)}
                                className="clickable clickable-hover"
                            >
                                <td>
                                    <CheckboxInput
                                        checked={selected.includes(item.id)}
                                        callback={() => toggleSelected(item.id)}
                                    />
                                </td>
                                <td className="text-nowrap" style={{ width: 0 }}>
                                    {item.element.tag}
                                </td>
                                <td
                                    title={item.element.name}
                                    style={{
                                        maxWidth: '240px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {item.element.name}
                                </td>
                                <td style={{ minWidth: '100px' }}>
                                    {item.inputs.location}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ModalBody>
            <ModalFooter>
                <button className="btn btn-primary" onClick={() => onSelect(selected)}>
                    Apply
                </button>
            </ModalFooter>
        </Modal>
    );
}

type ModalsParams = {
    state: State;
    dispatch: Dispatcher;
};

function Modals({ state, dispatch }: ModalsParams): JSX.Element | null {
    const modal = state.modal;
    function closeModal() {
        dispatch({
            type: 'fabric/show modal',
            value: null,
        });
    }

    if (modal === null) {
        return null;
    } else if (modal.type === 'add wall') {
        return (
            <SelectWallLike
                type={modal.elementType}
                onClose={closeModal}
                onSelect={(item: CompleteWall) => {
                    dispatch({
                        type: 'fabric/add wall',
                        item,
                    });
                }}
            />
        );
    } else if (modal.type === 'replace wall') {
        const currentWall = state.walls.find((wall) => wall.id === modal.id);
        return (
            <SelectWallLike
                type={modal.elementType}
                onClose={closeModal}
                onSelect={(item: CompleteWall) => {
                    dispatch({
                        type: 'fabric/replace wall',
                        id: modal.id,
                        item,
                    });
                }}
                currentItemTag={currentWall?.element.tag ?? null}
            />
        );
    } else if (modal.type === 'apply wall measure') {
        const currentWall = state.walls.find((wall) => wall.id === modal.id);
        return (
            <SelectWallLikeMeasure
                type={modal.elementType}
                onClose={closeModal}
                onSelect={(item: CompleteWallMeasure) => {
                    dispatch({
                        type: 'fabric/apply wall measures',
                        ids: [modal.id],
                        item,
                    });
                }}
                currentItemTag={currentWall?.element.tag ?? null}
                areaSqm={
                    currentWall !== undefined
                        ? currentWall.inputs.area[currentWall.inputs.area.type].area
                        : null
                }
            />
        );
    } else if (modal.type === 'select wall bulk measure') {
        // If we reversed the order of bulk measure selection, i.e. choose the fabric
        // elements to apply to and then the measure, we could provide the areaSqm.
        return (
            <SelectWallLikeMeasure
                type={modal.elementType}
                onClose={closeModal}
                onSelect={(item: CompleteWallMeasure) => {
                    dispatch({
                        type: 'fabric/show modal',
                        value: {
                            type: 'select wall bulk measure elements',
                            measure: item,
                        },
                    });
                }}
                currentItemTag={null}
                areaSqm={null}
            />
        );
    } else if (modal.type === 'select wall bulk measure elements') {
        return (
            <SelectBulkElements
                onClose={closeModal}
                onSelect={(ids) =>
                    dispatch({
                        type: 'fabric/apply wall measures',
                        item: modal.measure,
                        ids,
                    })
                }
                measureToApply={modal.measure}
                items={state.walls}
            />
        );
    }

    return null;
}

function showModal(dispatch: Dispatcher, value: State['modal']) {
    return () =>
        dispatch({
            type: 'fabric/show modal',
            value,
        });
}

function ThermalMassParameter({ state, dispatch }: SubProps) {
    return (
        <section className="line-top mb-45">
            <h3 className="mt-0 mb-15">Thermal Mass Parameter (TMP)</h3>

            <p>
                The thermal mass parameter (TMP) gives an indication of how quickly a
                structure will absorb and release heat. You can choose to ignore the k
                value of individual elements and use a global TMP value instead.
            </p>

            <p>
                In multi-layered constructions - e.g. timber frame with external masonry
                leaf - the construction of the inner leaf is the more important factor.
            </p>

            <p>Use:</p>

            <MyRadioGroup
                options={[
                    {
                        value: 'no override',
                        display: 'the k value of individual elements',
                    },
                    {
                        value: 'low',
                        display:
                            'timber or steel frame with lightweight infill (low TMP)',
                    },
                    {
                        value: 'medium',
                        display:
                            'masonry walls with timber floors or other mixed structure (medium TMP)',
                    },
                    {
                        value: 'high',
                        display: 'masonry walls and solid floors (high TMP)',
                    },
                ]}
                labelClasses={['mb-7']}
                radioClasses={['mr-7', 'big-checkbox']}
                selected={state.thermalMassParameter}
                callback={(value) =>
                    dispatch({
                        type: 'fabric/set thermal mass parameter',
                        value,
                    })
                }
            />
        </section>
    );
}

type WallProps = SubProps & { wall: WallLike };

function WallRow({ state, dispatch, wall }: WallProps) {
    return (
        <div
            className="card"
            style={{
                borderLeft:
                    wall.type === 'measure'
                        ? '10px solid var(--green-5)'
                        : wall.element.tag.includes('-M')
                        ? '10px solid var(--blue-5)'
                        : '10px solid var(--gray)',
            }}
        >
            <div className="d-flex justify-content-between align-items-center mb-15">
                <div>
                    <b>{wall.element.name}</b>
                    <div className="d-flex">
                        <span>{wall.element.tag}</span>
                        <span className="ml-15">
                            U value: {wall.element.uvalue} W/K·m²
                        </span>
                        <span className="ml-15">
                            k value: {wall.element.kvalue} kJ/K·m²
                        </span>
                        {wall.type === 'measure' ? (
                            <span className="ml-15">
                                Measure cost: £
                                <NumericOutput value={wall.outputs.costTotal} dp={0} />
                            </span>
                        ) : null}
                    </div>
                </div>

                <div>
                    {state.currentScenarioIsBaseline ? (
                        <Button
                            title="Delete"
                            icon={DeleteIcon}
                            className="ml-15"
                            onClick={() =>
                                dispatch({
                                    type: 'fabric/delete wall',
                                    id: wall.id,
                                })
                            }
                        />
                    ) : wall.type === 'measure' && wall.revertTo !== null ? (
                        <Button
                            title="Revert"
                            icon={UndoIcon}
                            className="ml-15"
                            onClick={() =>
                                dispatch({
                                    type: 'fabric/revert wall measure',
                                    id: wall.id,
                                })
                            }
                        />
                    ) : null}

                    {state.currentScenarioIsBaseline ? (
                        <Button
                            title="Replace"
                            className="ml-15"
                            onClick={showModal(dispatch, {
                                type: 'replace wall',
                                elementType: wall.element.type,
                                id: wall.id,
                            })}
                        />
                    ) : (
                        <Button
                            title={
                                wall.type === 'measure'
                                    ? 'Replace measure'
                                    : 'Apply measure'
                            }
                            icon={HammerIcon}
                            className="ml-15"
                            onClick={showModal(dispatch, {
                                type: 'apply wall measure',
                                elementType: wall.element.type,
                                id: wall.id,
                            })}
                        />
                    )}
                </div>
            </div>
            <div className="d-flex flex-wrap">
                <div className="mr-30">
                    <label className="d-i small-caps" htmlFor={`e${wall.id}-location`}>
                        Location
                    </label>
                    <br />
                    <MyTextualInput
                        id={`e${wall.id}-location`}
                        value={wall.inputs.location}
                        callback={(location) =>
                            dispatch({
                                type: 'fabric/merge wall input',
                                id: wall.id,
                                value: { location },
                            })
                        }
                        className={wall.id === state.justInserted ? 'just-inserted' : ''}
                    />
                </div>

                <div
                    className="d-flex mr-30"
                    style={{ flexDirection: 'column', alignSelf: 'end' }}
                >
                    <MyRadioGroup<'dimensions' | 'specific'>
                        options={[
                            {
                                value: 'dimensions',
                                display: ' L x H',
                            },
                            { value: 'specific', display: 'Area' },
                        ]}
                        labelClasses={['mb-0']}
                        radioClasses={['mr-3']}
                        selected={wall.inputs.area.type}
                        callback={(value) => {
                            dispatch({
                                type: 'fabric/merge wall input',
                                id: wall.id,
                                value: {
                                    area: { type: value },
                                },
                            });
                        }}
                    />
                </div>

                {wall.inputs.area.type === 'dimensions' && (
                    <div className="d-flex align-items-center mr-15">
                        <div>
                            <label
                                className="d-i small-caps"
                                htmlFor={`e${wall.id}-length`}
                            >
                                Length
                            </label>{' '}
                            <span className="text-units">m</span>
                            <br />
                            <MyNumericInput
                                id={`e${wall.id}-length`}
                                value={wall.inputs.area.dimensions.length}
                                callback={(length) =>
                                    dispatch({
                                        type: 'fabric/merge wall input',
                                        id: wall.id,
                                        value: { area: { dimensions: { length } } },
                                    })
                                }
                            />
                        </div>

                        <span
                            style={{
                                fontSize: '1.5rem',
                                margin: '0 0.2rem',
                            }}
                        >
                            <br />⨯
                        </span>

                        <div>
                            <label
                                className="d-i small-caps"
                                htmlFor={`e${wall.id}-height`}
                            >
                                Height
                            </label>{' '}
                            <span className="text-units">m</span>
                            <br />
                            <MyNumericInput
                                id={`e${wall.id}-height`}
                                value={wall.inputs.area.dimensions.height}
                                callback={(height) =>
                                    dispatch({
                                        type: 'fabric/merge wall input',
                                        id: wall.id,
                                        value: { area: { dimensions: { height } } },
                                    })
                                }
                            />
                        </div>
                    </div>
                )}

                <div className="d-flex align-items-center mr-15">
                    {wall.inputs.area.type === 'dimensions' && (
                        <span
                            style={{
                                fontSize: '1.5rem',
                                margin: '0 0.2rem',
                            }}
                        >
                            <br />=
                        </span>
                    )}

                    {wall.inputs.area.type === 'specific' ? (
                        <div className="mr-15">
                            <label
                                className="d-i small-caps"
                                htmlFor={`e${wall.id}-area`}
                            >
                                Area
                            </label>{' '}
                            <span className="text-units">m²</span>
                            <br />
                            <MyNumericInput
                                id={`e${wall.id}-area`}
                                value={wall.inputs.area.specific.area}
                                callback={(area) =>
                                    dispatch({
                                        type: 'fabric/merge wall input',
                                        id: wall.id,
                                        value: { area: { specific: { area } } },
                                    })
                                }
                            />
                        </div>
                    ) : (
                        <div>
                            <label
                                className="d-i small-caps"
                                htmlFor={`e${wall.id}-area`}
                            >
                                Area
                            </label>
                            <br />
                            <NumericOutput
                                value={
                                    wall.inputs.area[wall.inputs.area.type].area ??
                                    noOutput
                                }
                                unit="m²"
                            />
                        </div>
                    )}

                    <span style={{ fontSize: '1.5rem', margin: '0 0.2rem' }}>
                        <br />-
                    </span>
                    <div>
                        <span className="small-caps">Windows</span> <br />
                        <NumericOutput value={wall.outputs.windowArea} unit="m²" />
                    </div>

                    <span style={{ fontSize: '1.5rem', margin: '0 0.2rem' }}>
                        <br />=
                    </span>

                    <div>
                        <span className="small-caps">Net area</span> <br />
                        <NumericOutput value={wall.outputs.netArea} unit="m²" />
                    </div>

                    <div className="ml-30">
                        <span className="small-caps">Heat loss</span> <br />
                        <NumericOutput value={wall.outputs.heatLoss} unit="W/K" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Walls({ state, dispatch }: SubProps) {
    return (
        <section className="line-top mb-45">
            <h3 className="mt-0 mb-15">Walls</h3>

            <div className="rounded-cards mb-15">
                {state.walls
                    .filter((wall) => wall.element.type === 'external wall')
                    .map((wall) => (
                        <WallRow
                            wall={wall}
                            key={wall.id}
                            state={state}
                            dispatch={dispatch}
                        />
                    ))}
            </div>

            <Button
                title="New wall"
                icon={PlusIcon}
                onClick={showModal(dispatch, {
                    type: 'add wall',
                    elementType: 'external wall',
                })}
            />

            {state.currentScenarioIsBaseline || (
                <Button
                    title="Apply bulk measure"
                    icon={HammerIcon}
                    onClick={showModal(dispatch, {
                        type: 'select wall bulk measure',
                        elementType: 'external wall',
                    })}
                    className={'ml-15'}
                />
            )}
        </section>
    );
}

function PartyWalls({ state, dispatch }: SubProps) {
    return (
        <section className="line-top mb-45">
            <h3 className="mt-0 mb-15">Party walls</h3>

            <div className="rounded-cards mb-15">
                {state.walls
                    .filter((wall) => wall.element.type === 'party wall')
                    .map((wall) => (
                        <WallRow
                            wall={wall}
                            key={wall.id}
                            state={state}
                            dispatch={dispatch}
                        />
                    ))}
            </div>

            <Button
                title="New wall"
                icon={PlusIcon}
                onClick={showModal(dispatch, {
                    type: 'add wall',
                    elementType: 'party wall',
                })}
            />

            {state.currentScenarioIsBaseline || (
                <Button
                    title="Apply bulk measure"
                    icon={HammerIcon}
                    onClick={showModal(dispatch, {
                        type: 'select wall bulk measure',
                        elementType: 'party wall',
                    })}
                    className={'ml-15'}
                />
            )}
        </section>
    );
}

function RoofsAndLofts({ state, dispatch }: SubProps) {
    return (
        <section className="line-top mb-45">
            <h3 className="mt-0 mb-15">Roofs and lofts</h3>
            <p className="mb-15 text-italic">
                Note: When creating a roof or loft element only add that area which forms
                part of the thermal envelope of the building. Do not add a
                &lsquo;roof&rsquo; where it sits above a loft which is insulated at
                ceiling level. Do not add a &lsquo;loft&rsquo; where it sits below a roof
                which is insulated at rafter level.
            </p>

            <div className="rounded-cards mb-15">
                {state.walls
                    .filter(
                        (wall) =>
                            wall.element.type === 'roof' || wall.element.type === 'loft',
                    )
                    .map((wall) => (
                        <WallRow
                            wall={wall}
                            key={wall.id}
                            state={state}
                            dispatch={dispatch}
                        />
                    ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div>
                    <Button
                        title="New loft"
                        icon={PlusIcon}
                        onClick={showModal(dispatch, {
                            type: 'add wall',
                            elementType: 'loft',
                        })}
                    />

                    {state.currentScenarioIsBaseline || (
                        <Button
                            title="Apply loft bulk measure"
                            icon={HammerIcon}
                            onClick={showModal(dispatch, {
                                type: 'select wall bulk measure',
                                elementType: 'loft',
                            })}
                            className={'ml-15'}
                        />
                    )}
                </div>
                <div>
                    <Button
                        title="New roof"
                        icon={PlusIcon}
                        onClick={showModal(dispatch, {
                            type: 'add wall',
                            elementType: 'roof',
                        })}
                    />

                    {state.currentScenarioIsBaseline || (
                        <Button
                            title="Apply roof bulk measure"
                            icon={HammerIcon}
                            onClick={showModal(dispatch, {
                                type: 'select wall bulk measure',
                                elementType: 'roof',
                            })}
                            className={'ml-15'}
                        />
                    )}
                </div>
            </div>
        </section>
    );
}

type SubProps = {
    state: State;
    dispatch: Dispatcher;
};

type PageProps = {
    state: State;
    dispatch: Dispatcher;
};

export function Fabric({ state, dispatch }: PageProps) {
    const locked = state.locked;

    useLayoutEffect(() => {
        const elem: HTMLElement | null = document.querySelector('.just-inserted');
        if (elem !== null) {
            elem.focus();
        }
    }, [state.justInserted]);

    return (
        <PageContext.Provider value={{ locked }}>
            <LockedWarning locked={locked} />
            <ThermalMassParameter state={state} dispatch={dispatch} />
            <Walls state={state} dispatch={dispatch} />
            <PartyWalls state={state} dispatch={dispatch} />
            <RoofsAndLofts state={state} dispatch={dispatch} />
            <Modals state={state} dispatch={dispatch} />
        </PageContext.Provider>
    );
}