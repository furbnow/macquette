import React from 'react';

import { assertNever } from '../../helpers/assert-never';

export const noOutput: unique symbol = Symbol.for('no output');
export const loading: unique symbol = Symbol.for('loading');

export type NumericOutputProps = {
    value: number | typeof noOutput | typeof loading;
    unit?: string | JSX.Element;
};

export function NumericOutput(props: NumericOutputProps) {
    const { value, unit } = props;
    if (value === loading) {
        return <>[loading...]</>;
    }
    if (value === noOutput) {
        return <>[no output]</>;
    }
    let unitElement: JSX.Element | undefined;
    if (typeof unit === 'string') {
        unitElement = <>{unit}</>;
    } else {
        unitElement = unit;
    }
    if (typeof value === 'number') {
        let valString: string;
        if (Number.isInteger(value)) {
            valString = value.toString(10);
        } else {
            valString = value.toFixed(2);
        }
        if (unitElement === undefined) {
            return <>{valString}</>;
        } else {
            return (
                <>
                    {valString} {unitElement}
                </>
            );
        }
    }
    return assertNever(value);
}
