import { UiModuleShim } from './module-management/shim';
import { currentEnergyModule } from './modules/current-energy';
import { floorRowModule } from './modules/floor-row';
import { imageGalleryModule } from './modules/image-gallery';
import { sandboxModule } from './modules/sandbox';
import { solarHotWaterModule } from './modules/solar-hot-water';

export const modules = {
    sandbox: new UiModuleShim(sandboxModule),
    solarHotWater: new UiModuleShim(solarHotWaterModule),
    floorRow: new UiModuleShim(floorRowModule),
    currentEnergy: new UiModuleShim(currentEnergyModule),
    imageGallery: new UiModuleShim(imageGalleryModule),
};
