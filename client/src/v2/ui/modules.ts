import { UiModuleShim } from './module-management/shim';
import { sandboxModule } from './modules/sandbox';
import { solarHotWaterModule } from './modules/solar-hot-water';

export const modules = {
    sandbox: new UiModuleShim(sandboxModule),
    solarHotWater: new UiModuleShim(solarHotWaterModule),
};
