import React, { useId } from 'react';

export type RadioGroupProps<T> = {
  options: {
    value: T;
    display: string;
  }[];
  value: T | null;
  onChange: (value: T) => void;
  radioClasses?: string[];
  labelClasses?: string[];
  disabled?: boolean;
};

export function RadioGroup<T extends string>({
  options,
  onChange,
  value,
  radioClasses = [],
  labelClasses = [],
  disabled = false,
}: RadioGroupProps<T>) {
  const groupId = useId();

  function castTargetValue(evt: React.ChangeEvent<HTMLInputElement>) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return evt.target.value as T;
  }

  return (
    <>
      {options.map(({ value: optionValue, display }, idx) => (
        <label
          key={idx}
          className={['radio', 'd-flex', ...labelClasses].join(' ')}
          htmlFor={`${groupId}-${idx}`}
        >
          <input
            type="radio"
            className={radioClasses.join(' ')}
            id={`${groupId}-${idx}`}
            value={optionValue}
            checked={optionValue === value}
            disabled={disabled}
            onChange={(evt) => {
              console.log(evt);
              onChange(castTargetValue(evt));
            }}
          />
          {display}
        </label>
      ))}
    </>
  );
}
