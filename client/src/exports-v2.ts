import { datasets } from './v2/model/datasets';
import { calcRun } from './v2/model/model';
import { mount } from './v2/ui/module-management';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Macquette: any;
    }
}

const uiModules = { mount };

window.Macquette = {
    datasets,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    calcRun,
    uiModules,
};
