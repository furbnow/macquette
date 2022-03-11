import { datasets } from './v2/model/datasets/legacy';
import { calcRun } from './v2/model/model';
import { mount } from './v2/ui/module-management';
import { generateReportGraphs } from './v2/reports/graphs';

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
    generateReportGraphs,
};
