import { UiModuleShim } from './module-management/shim';
import { addressSearchModule } from './modules/address-search';
import { currentEnergyModule } from './modules/current-energy';
import { editorSidebarModule } from './modules/editor-sidebar';
import { fabricModule } from './modules/fabric';
import { floorRowModule } from './modules/floor-row';
import { imageGalleryModule } from './modules/image-gallery';
import { sandboxModule } from './modules/sandbox';
import { solarHotWaterModule } from './modules/solar-hot-water';

export const modules = {
    sandbox: new UiModuleShim(sandboxModule),
    editorSidebar: new UiModuleShim(editorSidebarModule),
    solarHotWater: new UiModuleShim(solarHotWaterModule),
    floorRow: new UiModuleShim(floorRowModule),
    currentEnergy: new UiModuleShim(currentEnergyModule),
    imageGallery: new UiModuleShim(imageGalleryModule),
    fabric: new UiModuleShim(fabricModule),
    addressSearch: new UiModuleShim(addressSearchModule),
};

export type Module = typeof modules[keyof typeof modules];
