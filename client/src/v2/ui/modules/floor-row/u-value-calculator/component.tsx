import objectInspect from 'object-inspect';
import React from 'react';

import {
    FloorType,
    FloorUValueError,
    FloorUValueWarning,
    PerFloorTypeSpec,
} from '../../../../data-schemas/scenario/fabric/floor-u-value';
import { Result } from '../../../../helpers/result';
import { WithWarnings } from '../../../../helpers/with-warnings';
import { partialBem } from '../../../bem';
import { errorDisplay } from './errors';
import * as exposedFloor from './floor-types/exposed';
import * as heatedBasementFloor from './floor-types/heated-basement';
import * as solidFloor from './floor-types/solid';
import * as suspendedFloor from './floor-types/suspended';
import { Action, reducer } from './state/reducer';
import { warningDisplay } from './warnings';

type ControlledComponentProps<S> = {
    value: S;
    onChange: (newValue: S) => void;
};

type FUVCProps = ControlledComponentProps<PerFloorTypeSpec> & {
    elementId: string;
    modelUValueOutput: WithWarnings<Result<number, FloorUValueError>, FloorUValueWarning>;
    selectedFloorType: Exclude<FloorType, 'custom'>;
};

const fuvcBem = partialBem('floor-u-value-calculator');

export function FUVC({
    value,
    onChange,
    modelUValueOutput,
    selectedFloorType,
}: FUVCProps) {
    function dispatch(action: Action) {
        onChange(reducer({ ...value, selectedFloorType }, action));
    }
    const calculatedUValue = modelUValueOutput;
    const uValueWarnings = Array.from(calculatedUValue.inner()[1])
        .map((warning) =>
            warningDisplay(warning)
                .mapErr(() => objectInspect(warning))
                .coalesce(),
        )
        .map((element, idx) => (
            <div key={idx} className="alert alert-warning">
                {element}
            </div>
        ));
    const uValueError = calculatedUValue
        .inner()[0]
        .mapOk(() => null)
        .mapErr((err) =>
            errorDisplay(err)
                .mapErr(() => objectInspect(err))
                .coalesce(),
        )
        .mapErr((err) => <div className="alert alert-error">{err}</div>)
        .coalesce();
    return (
        <div className={fuvcBem('root')}>
            <div className={fuvcBem('grid')}>
                {selectedFloorType === 'solid' && (
                    <solidFloor.Component state={value.solid} dispatch={dispatch} />
                )}

                {selectedFloorType === 'suspended' && (
                    <suspendedFloor.Component
                        state={value.suspended}
                        dispatch={dispatch}
                    />
                )}

                {selectedFloorType === 'heated basement' && (
                    <heatedBasementFloor.Component
                        state={value['heated basement']}
                        dispatch={dispatch}
                    />
                )}

                {selectedFloorType === 'exposed' && (
                    <exposedFloor.Component state={value.exposed} dispatch={dispatch} />
                )}
            </div>

            {uValueWarnings.length !== 0 && (
                <div className={fuvcBem('warning-display')}>{uValueWarnings}</div>
            )}
            {uValueError !== null && (
                <div className={fuvcBem('error-display')}>
                    {uValueWarnings}
                    {uValueError}
                </div>
            )}
        </div>
    );
}
