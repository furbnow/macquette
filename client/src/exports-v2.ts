import { HTTPClient } from './v2/api/http';
import { StaticFileResolver } from './v2/api/static-file-resolver';
import { datasets } from './v2/model/datasets/legacy';
import { calcRun } from './v2/model/model';
import { generateReportGraphs, getHeatingLoad } from './v2/reports/graphs';
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
    generateReportGraphs,
    getHeatingLoad,
    HTTPClient,
    StaticFileResolver,
};
