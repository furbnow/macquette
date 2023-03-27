import { HTTPClient } from './v2/api/http';
import { SaveManager } from './v2/api/save-manager';
import { StaticFileResolver } from './v2/api/static-file-resolver';
import { emulateJsonRoundTrip } from './v2/helpers/emulate-json-round-trip';
import { datasets } from './v2/model/datasets/legacy';
import { calcRun as calcRunAny } from './v2/model/model';
import { generateReportGraphs, getHeatingLoad } from './v2/reports/graphs';
import { modules } from './v2/ui/modules';
import { PageManager } from './v2/ui/page-manager';

declare global {
    interface Window {
        Macquette?: Record<string, unknown>;
    }
}

const calcRun: unknown = calcRunAny;

window.Macquette = {
    datasets,
    calcRun,
    uiModules: modules,
    generateReportGraphs,
    getHeatingLoad,
    HTTPClient,
    StaticFileResolver,
    emulateJsonRoundTrip,
    PageManager,
    SaveManager,
};
