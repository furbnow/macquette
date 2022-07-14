import React, { useState } from 'react';

import { FloorInsulationMaterial } from '../../../../../data-schemas/libraries/floor-insulation';
import { partialBem } from '../../../../bem';
import { SelectFloorInsulationMaterial } from '../../../../input-components/libraries';

const materialSelectorBem = partialBem('floor-insulation-material-selector');

type Props = {
    value: FloorInsulationMaterial | null;
    onChange: (material: FloorInsulationMaterial | null) => void;
    selectButtonId?: string;
    optional?: true;
};

export function MaterialSelector(props: Props) {
    const [showSelector, setShowSelector] = useState(false);
    return (
        <div className={materialSelectorBem('root')}>
            {props.value !== null && (
                <div className={materialSelectorBem('material-view')}>
                    <div>{props.value.name}</div>
                    <div>{props.value.conductivity.toFixed(2)} W/m.K</div>
                </div>
            )}
            <div className={materialSelectorBem('buttons')}>
                {props.value === null && (
                    <button
                        className={
                            'btn' +
                            ' ' +
                            materialSelectorBem('button') +
                            ' ' +
                            (props.value === null && props.optional !== true
                                ? 'btn-primary'
                                : '')
                        }
                        id={props.selectButtonId}
                        onClick={() => setShowSelector(true)}
                    >
                        Select
                    </button>
                )}
                {props.value !== null && (
                    <button
                        className={'btn' + ' ' + materialSelectorBem('button')}
                        onClick={() => props.onChange(null)}
                    >
                        Clear
                    </button>
                )}
            </div>
            {showSelector && (
                <SelectFloorInsulationMaterial
                    onSelect={(material) => props.onChange(material)}
                    onClose={() => setShowSelector(false)}
                />
            )}
        </div>
    );
}
