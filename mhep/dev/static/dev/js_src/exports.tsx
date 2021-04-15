import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { UpdateFunction } from './context/UpdateFunction';

import Assessment from './Assessment';

import blank from './lib/blank';
import { getScenarioList } from './lib/scenarios';
import { getScenarioMeasures } from './lib/measures';

import Commentary from './views/Commentary';
import DwellingData from './views/DwellingData';
import PageHeader from './views/PageHeader';
import SolarHotWater from './views/SolarHotWater';
import CurrentEnergy from './views/CurrentEnergy';
import Report from './views/Report';
import ScopeOfWorks from './views/ScopeOfWorks';

import TargetBar from './components/TargetBar';
import Graphics from './components/Graphics';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Macquette: any;
    }
}

window.Macquette = {
    Assessment,
    views: {
        Commentary,
        DwellingData,
        PageHeader,
        SolarHotWater,
        CurrentEnergy,
        Report,
        ScopeOfWorks,
    },
    lib: {
        blank,
        getScenarioList,
        getScenarioMeasures,
    },
    components: {
        TargetBar,
        Graphics,
    },
    render: (view, props, root, updateFn: () => void) =>
        render(
            <UpdateFunction.Provider value={updateFn}>
                {React.createElement(view, props)}
            </UpdateFunction.Provider>,
            root || document.getElementById('content')
        ),
    unmount: (element) => unmountComponentAtNode(element),
};
