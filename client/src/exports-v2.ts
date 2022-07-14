import { HTTPClient } from './v2/api/http';
import { StaticFileResolver } from './v2/api/static-file-resolver';
import { emulateJsonRoundTrip } from './v2/helpers/emulate-json-round-trip';
import { datasets } from './v2/model/datasets/legacy';
import { calcRun as calcRunAny } from './v2/model/model';
import { generateReportGraphs, getHeatingLoad } from './v2/reports/graphs';
import { selectWall } from './v2/ui/input-components/libraries';
import { modules } from './v2/ui/modules';

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
    selectWall,
    emulateJsonRoundTrip,
};
