import React from 'react'

function RadioField({ id, options, value, setValue }) {
    return (
        <div>
            {options.map((opt, i) => (
                <div key={i}>
                    <label className='radio d-flex mb-7' htmlFor={`field_${id}_option_${i}`}>
                        <input className='mr-7 big-checkbox'
                            type="radio"
                            id={`field_${id}_option_${i}`}
                            name="options"
                            value={opt.value}
                            checked={opt.value == value}
                            onChange={(evt) => setValue(evt.target.value)}
                        />
                        {opt.display}
                    </label>
                </div>
            ))}
        </div>
    )
}

export default RadioField
