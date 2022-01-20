import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { AppContext } from './dev/ui/context/AppContext';

import Assessment from './dev/ui/Assessment';

import blank from './dev/ui/lib/blank';
import { getScenarioList } from './dev/ui/lib/scenarios';
import { getScenarioMeasures } from './dev/ui/lib/measures';

import Commentary from './dev/ui/views/Commentary';
import CurrentEnergy from './dev/ui/views/CurrentEnergy';
import DwellingData from './dev/ui/views/DwellingData';
import FloorUValueCalculator from './dev/ui/views/FloorUValueCalculator/FloorUValueCalculator';
import Generation from './dev/ui/views/Generation';
import ImageGallery from './dev/ui/views/ImageGallery';
import PageHeader from './dev/ui/views/PageHeader';
import Report from './dev/ui/views/Report';
import ScopeOfWorks from './dev/ui/views/ScopeOfWorks';
import Setup from './dev/ui/views/Setup';
import Sidebar from './dev/ui/views/Sidebar';
import SolarHotWater from './dev/ui/views/SolarHotWater';
import Ventilation from './dev/ui/views/Ventilation';

import TargetBar from './dev/ui/components/TargetBar';
import Graphics from './dev/ui/components/Graphics';

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
        Ventilation,
        FloorUValueCalculator,
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
        libraries: [] = [],
    ) =>
        render(
            <AppContext.Provider value={{ update, libraries }}>
                {React.createElement(view, props)}
            </AppContext.Provider>,
            root || document.getElementById('content'),
        ),
    unmount: (element: HTMLElement) => unmountComponentAtNode(element),
};
