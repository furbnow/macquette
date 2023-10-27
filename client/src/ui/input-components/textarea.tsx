import React from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';
import { useStateTracker } from './use-state-tracker';

type BasicTextareaProps = {
  value: string;
  onChange: (value: string) => void;
};

export type TextareaProps = Shadow<PropsOf<'textarea'>, BasicTextareaProps>;

export function Textarea({ value, onChange, ...passthroughProps }: TextareaProps) {
  const [innerState, setInnerState] = useStateTracker(value);

  return (
    <textarea
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
