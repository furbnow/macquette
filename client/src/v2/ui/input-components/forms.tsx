import React, { CSSProperties, ReactNode, useId, useState } from 'react';

import { partialBem } from '../bem';
import { InfoIcon } from '../icons';
import { CheckboxInput } from './checkbox';
import { Select } from './select';

type OptionalSectionProps = {
    open: boolean;
    onChange: (open: boolean) => void;
    checkboxText: string;
    children: ReactNode;
};
export function OptionalSection({
    open,
    onChange,
    checkboxText,
    children,
}: OptionalSectionProps) {
    const id = useId();
    return (
        <>
            <label htmlFor={id}>{checkboxText}</label>
            <span>
                <CheckboxInput id={id} checked={open} onChange={onChange} />
            </span>
            {open ? children : null}
        </>
    );
}

type ChoiceSectionProps<T> = {
    value: T;
    onChange: (value: T) => void;
    choices: Array<{ value: T; display: string; child: ReactNode }>;
    selectText: string;
};
export function ChoiceSection<T extends string>(props: ChoiceSectionProps<T>) {
    const id = useId();
    const choice = props.choices.find(({ value }) => value === props.value);
    if (choice === undefined) {
        console.error('value was not in choices');
    }
    return (
        <>
            <label htmlFor={id}>{props.selectText}</label>
            <Select
                options={props.choices}
                selected={props.value}
                callback={props.onChange}
            />
            {choice?.child}
        </>
    );
}

type InfoTooltip = {
    children: ReactNode;
};
export function InfoTooltip({ children }: InfoTooltip) {
    const buttonStyle: CSSProperties = {
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        paddingBottom: '5px',
    };
    const containerStyle: CSSProperties = {
        position: 'relative',
        display: 'inline-block',
    };
    const [hidden, setHidden] = useState(true);
    const textStyle: CSSProperties = {
        visibility: hidden ? 'hidden' : 'visible',
        width: '240px',
        marginLeft: '-120px',
        top: '100%',
        left: '50%',
        backgroundColor: 'black',
        color: 'white',
        textAlign: 'center',
        padding: '7px',
        borderRadius: '4px',
        position: 'absolute',
        zIndex: '100',
        fontWeight: 'normal',
    };
    return (
        <div style={containerStyle}>
            <button
                style={buttonStyle}
                onFocus={() => setHidden(false)}
                onBlur={() => setHidden(true)}
            >
                <InfoIcon />
            </button>
            <span style={textStyle}>{children}</span>
        </div>
    );
}

type LabelWithInfoProps = {
    htmlFor: string;
    children: ReactNode;
    infoText: ReactNode;
};
export function LabelWithInfo(props: LabelWithInfoProps) {
    return (
        <div>
            <label style={{ display: 'inline-block' }} htmlFor={props.htmlFor}>
                {props.children}
            </label>
            <InfoTooltip>{props.infoText}</InfoTooltip>
        </div>
    );
}

type FormGridProps = {
    children: ReactNode;
};
export function FormGrid(props: FormGridProps) {
    const bem = partialBem('form-grid');
    return <div className={bem('root')}>{props.children}</div>;
}
