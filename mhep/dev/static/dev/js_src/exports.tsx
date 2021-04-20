import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { AppContext } from './context/AppContext';

import Assessment from './Assessment';

import blank from './lib/blank';
import { getScenarioList } from './lib/scenarios';
import { getScenarioMeasures } from './lib/measures';

import Commentary from './views/Commentary';
import CurrentEnergy from './views/CurrentEnergy';
import DwellingData from './views/DwellingData';
import PageHeader from './views/PageHeader';
import Report from './views/Report';
import ScopeOfWorks from './views/ScopeOfWorks';
import Sidebar from './views/Sidebar';
import SolarHotWater from './views/SolarHotWater';

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
        CurrentEnergy,
        DwellingData,
        PageHeader,
        Report,
        ScopeOfWorks,
        Sidebar,
        SolarHotWater,
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
    render: (view, props, root, update: () => void) =>
        render(
            <AppContext.Provider value={{ update, libraries: [] }}>
                {React.createElement(view, props)}
            </AppContext.Provider>,
            root || document.getElementById('content')
        ),
    unmount: (element) => unmountComponentAtNode(element),
};
