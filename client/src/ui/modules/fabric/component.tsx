import React, { useLayoutEffect, useState } from 'react';

import { sum } from '../../../helpers/array-reducers';
import type { PropsOf } from '../../../helpers/props-of';
import type { Shadow } from '../../../helpers/shadow-object-type';
import type { Icon } from '../../icons';
import { DeleteIcon, HammerIcon, PlusIcon, UndoIcon } from '../../icons';
import { CheckboxInput } from '../../input-components/checkbox';
import {
  CompleteWallLike,
  CompleteWallMeasure,
  SelectWallLike,
  SelectWallLikeMeasure,
} from '../../input-components/libraries';
import { NumberInput, NumberInputProps } from '../../input-components/number';
import type { RadioGroupProps } from '../../input-components/radio-group';
import { RadioGroup } from '../../input-components/radio-group';
import { TextInput, TextInputProps } from '../../input-components/text';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '../../output-components/modal';
import { NumberOutput } from '../../output-components/numeric';
import type { Action } from './reducer';
import type { State, WallLike } from './state';

type Dispatcher = (action: Action) => void;

type PageContextInterface = {
  locked: boolean;
};

export const PageContext = React.createContext<PageContextInterface>({
  locked: false,
});

function MyNumericInput(props: Omit<NumberInputProps, 'readOnly' | 'style'>) {
  const { locked } = React.useContext(PageContext);

  return (
    <NumberInput
      {...props}
      readOnly={locked}
      style={{ width: '50px', marginBottom: 0 }}
    />
  );
}

function MyTextInput(props: Omit<TextInputProps, 'readOnly' | 'style'>) {
  const { locked } = React.useContext(PageContext);

  return <TextInput {...props} readOnly={locked} style={{ marginBottom: 0 }} />;
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
                    value={selected.includes(item.id)}
                    onChange={() => toggleSelected(item.id)}
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
                <td style={{ minWidth: '100px' }}>{item.inputs.location}</td>
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
        onSelect={(item: CompleteWallLike) => {
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
        onSelect={(item: CompleteWallLike) => {
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
        items={state.walls.filter((wall) => wall.element.type === modal.measure.type)}
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
        The thermal mass parameter (TMP) gives an indication of how quickly a structure
        will absorb and release heat. You can choose to ignore the k value of individual
        elements and use a global TMP value instead.
      </p>

      <p>
        In multi-layered constructions - e.g. timber frame with external masonry leaf -
        the construction of the inner leaf is the more important factor.
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
            display: 'timber or steel frame with lightweight infill (low TMP)',
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
        value={state.thermalMassParameter}
        onChange={(value) =>
          dispatch({
            type: 'fabric/set thermal mass parameter',
            value,
          })
        }
      />
    </section>
  );
}

type WallStatus = 'new measure' | 'previous measure' | 'none';

function wallStatus(wall: WallLike): WallStatus {
  if (wall.type === 'measure') {
    return 'new measure';
  } else if (wall.element.tag.includes('-M')) {
    return 'previous measure';
  } else {
    return 'none';
  }
}

type WallProps = SubProps & {
  wall: WallLike;
  secondDimension: 'width' | 'height';
};

function WallRow({ state, dispatch, wall, secondDimension }: WallProps) {
  const status = wallStatus(wall);
  const colourForStatus: Record<WallStatus, string> = {
    'new measure': '--pale-green',
    'previous measure': '--blue-400',
    none: '--grey-600',
  };

  const isDeleted =
    (wall.inputs.area.type === 'dimensions' &&
      wall.inputs.area.dimensions.length === 0 &&
      wall.inputs.area.dimensions.height === 0) ||
    (wall.inputs.area.type === 'specific' && wall.inputs.area.specific.area === 0);

  return (
    <div
      className="card"
      style={{
        borderLeft: `10px solid var(${colourForStatus[status]})`,
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-15">
        <div>
          <span>
            {isDeleted && <span className="label label-important mr-7">Deleted</span>}
            <b>{wall.element.name}</b>
          </span>
          <div className="d-flex">
            <span>{wall.element.tag}</span>
            <span className="ml-15">U value: {wall.element.uvalue} W/K·m²</span>
            <span className="ml-15">k value: {wall.element.kvalue} kJ/K·m²</span>
            {wall.type === 'measure' && (
              <span className="ml-15">
                Measure cost: £
                <NumberOutput value={wall.outputs.costTotal} dp={0} />
              </span>
            )}
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
              title={wall.type === 'measure' ? 'Replace measure' : 'Apply measure'}
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
          <MyTextInput
            id={`e${wall.id}-location`}
            value={wall.inputs.location}
            onChange={(location) =>
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
            value={wall.inputs.area.type}
            onChange={(value) => {
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
              <label className="d-i small-caps" htmlFor={`e${wall.id}-length`}>
                Length
              </label>{' '}
              <span className="text-units">m</span>
              <br />
              <MyNumericInput
                id={`e${wall.id}-length`}
                value={wall.inputs.area.dimensions.length}
                onChange={(length) =>
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
              <label className="d-i small-caps" htmlFor={`e${wall.id}-height`}>
                {secondDimension === 'height' ? 'Height' : 'Width'}
              </label>{' '}
              <span className="text-units">m</span>
              <br />
              <MyNumericInput
                id={`e${wall.id}-height`}
                value={wall.inputs.area.dimensions.height}
                onChange={(height) =>
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
              <label className="d-i small-caps" htmlFor={`e${wall.id}-area`}>
                Area
              </label>{' '}
              <span className="text-units">m²</span>
              <br />
              <MyNumericInput
                id={`e${wall.id}-area`}
                value={wall.inputs.area.specific.area}
                onChange={(area) =>
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
              <label className="d-i small-caps" htmlFor={`e${wall.id}-area`}>
                Area
              </label>
              <br />
              <NumberOutput
                value={wall.inputs.area[wall.inputs.area.type].area}
                unit="m²"
              />
            </div>
          )}

          <span style={{ fontSize: '1.5rem', margin: '0 0.2rem' }}>
            <br />-
          </span>
          <div>
            <span className="small-caps">Windows</span> <br />
            <NumberOutput value={wall.outputs.windowArea} unit="m²" />
          </div>

          <span style={{ fontSize: '1.5rem', margin: '0 0.2rem' }}>
            <br />=
          </span>

          <div>
            <span className="small-caps">Net area</span> <br />
            <NumberOutput value={wall.outputs.netArea} unit="m²" />
          </div>

          <div className="ml-30">
            <span className="small-caps">Heat loss</span> <br />
            <NumberOutput value={wall.outputs.heatLoss} unit="W/K" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Totals({ walls }: { walls: WallLike[] }) {
  if (walls.length === 0) {
    return null;
  }

  return (
    <table className="mb-15 table" style={{ width: 'auto' }}>
      <tbody>
        <tr>
          <th className="text-left">Total net area</th>
          <td>
            <NumberOutput
              value={sum(walls.map((wall) => wall.outputs.netArea ?? 0))}
              unit="m²"
            />
          </td>
        </tr>
        <tr>
          <th className="text-left">Total heat loss</th>
          <td>
            <NumberOutput
              value={sum(walls.map((wall) => wall.outputs.heatLoss ?? 0))}
              unit="W/K"
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Walls({ state, dispatch }: SubProps) {
  const walls = state.walls.filter((wall) => wall.element.type === 'external wall');
  return (
    <section className="line-top mb-45">
      <h3 className="mt-0 mb-15">Walls</h3>

      <div className="rounded-cards mb-15">
        {walls.map((wall) => (
          <WallRow
            wall={wall}
            key={wall.id}
            state={state}
            dispatch={dispatch}
            secondDimension={'height'}
          />
        ))}
      </div>

      <Totals walls={walls} />

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
          disabled={walls.length === 0}
        />
      )}
    </section>
  );
}

function PartyWalls({ state, dispatch }: SubProps) {
  const walls = state.walls.filter((wall) => wall.element.type === 'party wall');
  return (
    <section className="line-top mb-45">
      <h3 className="mt-0 mb-15">Party walls</h3>

      <div className="rounded-cards mb-15">
        {walls.map((wall) => (
          <WallRow
            wall={wall}
            key={wall.id}
            state={state}
            dispatch={dispatch}
            secondDimension={'height'}
          />
        ))}
      </div>

      <Totals walls={walls} />

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
          disabled={walls.length === 0}
        />
      )}
    </section>
  );
}

function RoofsAndLofts({ state, dispatch }: SubProps) {
  const walls = state.walls.filter(
    (wall) => wall.element.type === 'roof' || wall.element.type === 'loft',
  );
  return (
    <section className="line-top mb-45">
      <h3 className="mt-0 mb-15">Roofs and lofts</h3>
      <p className="mb-0">
        When inputting roofs and lofts, only add that area which forms part of the thermal
        envelope of the building:
      </p>
      <ul className="mb-15">
        <li>
          Don&apos;t add a roof where it sits above a loft which is insulated at ceiling
          level.
        </li>
        <li>
          Don&apos;t add a loft where it sits below a roof which is insulated at rafter
          level.
        </li>
        <li>
          If the thermal envelope changes in a scenario (e.g. loft insulation is added and
          so the roof is no longer part of the envelope), then set the area of the element
          that is no longer part of the thermal envelope to 0, and add a new element to
          represent the new envelope, and then apply a measure to it.
        </li>
      </ul>

      <div className="rounded-cards mb-15">
        {walls.map((wall) => (
          <WallRow
            wall={wall}
            key={wall.id}
            state={state}
            dispatch={dispatch}
            secondDimension={'width'}
          />
        ))}
      </div>

      <Totals walls={walls} />

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
              disabled={walls.length === 0}
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
              disabled={walls.length === 0}
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
      <ThermalMassParameter state={state} dispatch={dispatch} />
      <Walls state={state} dispatch={dispatch} />
      <PartyWalls state={state} dispatch={dispatch} />
      <RoofsAndLofts state={state} dispatch={dispatch} />
      <Modals state={state} dispatch={dispatch} />
    </PageContext.Provider>
  );
}
