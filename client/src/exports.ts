import { HTTPClient } from './api/http';
import { SaveManager } from './api/save-manager';
import { StaticFileResolver } from './api/static-file-resolver';
import { emulateJsonRoundTrip } from './helpers/emulate-json-round-trip';
import { datasets } from './model/datasets/legacy';
import { calcRun as calcRunAny } from './model/model';
import { generateReportGraphs, getHeatingLoad } from './reports/graphs';
import { MultipleModuleShim, SingleModuleShim } from './ui/module-management/shim';
import { commentaryModule } from './ui/modules/commentary';
import { fabricModule } from './ui/modules/fabric';
import { floorRowModule } from './ui/modules/floor-row';
import { PageManager } from './ui/page-manager';

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
        commentary: new SingleModuleShim(commentaryModule),
    },
    generateReportGraphs,
    getHeatingLoad,
    HTTPClient,
    StaticFileResolver,
    emulateJsonRoundTrip,
    PageManager,
    SaveManager,
};
