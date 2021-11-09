import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { AppContext } from './ui/context/AppContext';

import Assessment from './ui/Assessment';

import blank from './ui/lib/blank';
import { getScenarioList } from './ui/lib/scenarios';
import { getScenarioMeasures } from './ui/lib/measures';

import Commentary from './ui/views/Commentary';
import CurrentEnergy from './ui/views/CurrentEnergy';
import DwellingData from './ui/views/DwellingData';
import Generation from './ui/views/Generation';
import PageHeader from './ui/views/PageHeader';
import Report from './ui/views/Report';
import ScopeOfWorks from './ui/views/ScopeOfWorks';
import Setup from './ui/views/Setup';
import Sidebar from './ui/views/Sidebar';
import SolarHotWater from './ui/views/SolarHotWater';
import ImageGallery from './ui/views/ImageGallery';

import TargetBar from './ui/components/TargetBar';
import Graphics from './ui/components/Graphics';

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
        Generation,
        PageHeader,
        Report,
        ScopeOfWorks,
        Setup,
        Sidebar,
        SolarHotWater,
        ImageGallery,
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
    render: (
        view: any,
        props: any,
        root: HTMLElement,
        update: () => void,
        libraries: [] = []
    ) =>
        render(
            <AppContext.Provider value={{ update, libraries }}>
                {React.createElement(view, props)}
            </AppContext.Provider>,
            root || document.getElementById('content')
        ),
    unmount: (element: HTMLElement) => unmountComponentAtNode(element),
};
