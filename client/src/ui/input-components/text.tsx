import React from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';
import { useStateTracker } from './use-state-tracker';

type BasicTextInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export type TextInputProps = Shadow<PropsOf<'input'>, BasicTextInputProps>;

export function TextInput({ value, onChange, ...passthroughProps }: TextInputProps) {
  const [innerState, setInnerState] = useStateTracker<string>(value);

  return (
    <input
      type="text"
      value={innerState}
      onChange={(evt) => setInnerState(evt.target.value)}
      onBlur={() => {
        if (innerState !== value) {
          onChange(innerState);
        }
      }}
      {...passthroughProps}
    />
  );
}
