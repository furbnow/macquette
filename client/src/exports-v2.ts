import { HTTPClient } from './v2/api/http';
import { SaveManager } from './v2/api/save-manager';
import { StaticFileResolver } from './v2/api/static-file-resolver';
import { emulateJsonRoundTrip } from './v2/helpers/emulate-json-round-trip';
import { datasets } from './v2/model/datasets/legacy';
import { calcRun as calcRunAny } from './v2/model/model';
import { generateReportGraphs, getHeatingLoad } from './v2/reports/graphs';
import { MultipleModuleShim, SingleModuleShim } from './v2/ui/module-management/shim';
import { fabricModule } from './v2/ui/modules/fabric';
import { floorRowModule } from './v2/ui/modules/floor-row';
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
    uiModuleShims: {
        floorRow: new MultipleModuleShim(floorRowModule),
        fabric: new SingleModuleShim(fabricModule),
    },
    generateReportGraphs,
    getHeatingLoad,
    HTTPClient,
    StaticFileResolver,
    emulateJsonRoundTrip,
    PageManager,
    SaveManager,
};
