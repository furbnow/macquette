import React from 'react';

import { PropsOf } from '../../helpers/props-of';
import { Shadow } from '../../helpers/shadow-object-type';

type BasicSelectProps<T> = {
  options: {
    value: T;
    display: string;
    disabled?: boolean;
  }[];
  value: T | null;
  onChange: (value: T) => void;
};

export type SelectProps<T> = Shadow<PropsOf<'select'>, BasicSelectProps<T>>;

const UNSELECTED_VALUE = '__unselected__';

export function Select<T extends string>({
  options,
  onChange,
  value,
  ...passthrough
}: SelectProps<T>) {
  function castTargetValue(evt: React.ChangeEvent<HTMLSelectElement>) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return evt.target.value as T;
  }
  let unselected;
  if (value === null) {
    unselected = (
      <option key={null} value={UNSELECTED_VALUE} disabled>
        Select...
      </option>
    );
  } else {
    unselected = <></>;
  }
  return (
    <select
      onChange={(evt) => onChange(castTargetValue(evt))}
      value={value ?? UNSELECTED_VALUE}
      {...passthrough}
    >
      {unselected}
      {options.map(({ value, display, disabled = false }) => (
        <option key={value} value={value} disabled={disabled}>
          {display}
        </option>
      ))}
    </select>
  );
}
