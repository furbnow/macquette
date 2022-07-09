import { HTTPClient } from './v2/api/http';
import { StaticFileResolver } from './v2/api/static-file-resolver';
import { emulateJsonRoundTrip } from './v2/helpers/emulate-json-round-trip';
import { datasets } from './v2/model/datasets/legacy';
import { calcRun } from './v2/model/model';
import { generateReportGraphs, getHeatingLoad } from './v2/reports/graphs';
import { selectWall } from './v2/ui/input-components/libraries';
import { modules } from './v2/ui/modules';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Macquette: any;
    }
}

window.Macquette = {
    datasets,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    calcRun,
    uiModules: modules,
    generateReportGraphs,
    getHeatingLoad,
    HTTPClient,
    StaticFileResolver,
    selectWall,
    emulateJsonRoundTrip,
};
