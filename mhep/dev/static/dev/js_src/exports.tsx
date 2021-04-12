import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { UpdateFunction } from './context/UpdateFunction';

import Assessment from './Assessment';

import Commentary from './views/Commentary';
import DwellingData from './views/DwellingData';
import PageHeader from './views/PageHeader';
import SolarHotWater from './views/SolarHotWater';
import CurrentEnergy from './views/CurrentEnergy';
import Report from './views/Report';

import TargetBar from './components/TargetBar';
import Graphics from './components/Graphics';

window.Macquette = {
    Assessment,
    views: {
        Commentary,
        DwellingData,
        PageHeader,
        SolarHotWater,
        CurrentEnergy,
        Report,
    },
    components: {
        TargetBar,
        Graphics,
    },
    render: (view, props, root, updateFn) =>
        render(
            <UpdateFunction.Provider value={updateFn}>
                {React.createElement(view, props)}
            </UpdateFunction.Provider>,
            root || document.getElementById('content')
        ),
    unmount: (element) => unmountComponentAtNode(element),
};
