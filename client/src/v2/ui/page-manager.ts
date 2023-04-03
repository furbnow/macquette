import { featureFlags } from '../helpers/feature-flags';
import { isIndexable } from '../helpers/is-indexable';
import {
    applyDataMutator,
    externals,
    getAppContext,
    getCurrentRoute,
} from '../shims/typed-globals';
import { InstantiatedUiModule } from './module-management/instantiated-module';
import { UiModule } from './module-management/module-type';
import { addressSearchModule } from './modules/address-search';
import { currentEnergyModule } from './modules/current-energy';
import * as editorSidebar from './modules/editor-sidebar';
import { imageGalleryModule } from './modules/image-gallery';
import { sandboxModule } from './modules/sandbox';
import { solarHotWaterModule } from './modules/solar-hot-water';
import * as titleModule from './modules/title';
import type { ScenarioPageName, StandalonePageName } from './pages';
import { Route } from './routes';

export const standalonePages = {
    householdquestionnaire: { style: 'legacy' },
    commentary: { style: 'legacy' },
    currentenergy: { style: 'modern', module: currentEnergyModule },
    imagegallery: { style: 'modern', module: imageGalleryModule },
    compare: { style: 'legacy' },
    report: { style: 'legacy' },
    scopeofworks: { style: 'legacy' },
    export: { style: 'legacy' },
    librariesmanager: { style: 'legacy' },
    fuelsmanager: { style: 'legacy' },
    sandbox: { style: 'modern', module: sandboxModule },
    'address-search': { style: 'modern', module: addressSearchModule },
} satisfies Record<
    StandalonePageName,
    { style: 'legacy' } | { style: 'modern'; module: unknown }
>;

export const scenarioPages = {
    context: { style: 'legacy' },
    ventilation: { style: 'legacy' },
    elements: { style: 'legacy' },
    LAC: { style: 'legacy' },
    heating: { style: 'legacy' },
    fuel_requirements: { style: 'legacy' },
    generation: { style: 'legacy' },
    solarhotwater: { style: 'modern', module: solarHotWaterModule },
    worksheets: { style: 'legacy' },
} satisfies Record<
    ScenarioPageName,
    { style: 'legacy' } | { style: 'modern'; module: unknown }
>;

function pageDataForRoute(route: Route) {
    switch (route.type) {
        case 'standalone': {
            return standalonePages[route.page];
        }
        case 'with scenario': {
            return scenarioPages[route.page];
        }
    }
}

export class PageManager {
    private currentModule:
        | InstantiatedUiModule<unknown, unknown, unknown>
        | 'legacy'
        | null = null;
    private sidebarManager: SidebarManager;
    private titleManager: TitleManager;

    constructor(
        private legacySharedInit: () => void,
        private legacyModuleInit: () => Promise<void>,
        private legacyModuleInitPostUpdate: () => void,
        private legacyModuleUpdate: () => void,
        private legacyModuleUnload: () => void,
    ) {
        this.sidebarManager = new SidebarManager();
        this.titleManager = new TitleManager();
        this.handleNavigation().catch((err) => console.error(err));
        window.addEventListener('hashchange', () => {
            this.handleNavigation().catch((err) => console.error(err));
        });
    }

    externalDataUpdate() {
        if (this.currentModule === null) {
            return;
        }

        // Check if the scenario we're on still exists
        const route = getCurrentRoute();
        if (route.type === 'with scenario') {
            const { project } = externals();
            const { scenarioId } = route;

            if (isIndexable(project['data']) && !(scenarioId in project['data'])) {
                window.location.hash = '';
                return;
            }
        }

        this.sidebarManager.update();
        this.titleManager.update();

        if (this.currentModule === 'legacy') {
            this.legacyModuleUpdate();
        } else {
            this.currentModule.update(getAppContext());
        }
    }

    async handleNavigation() {
        const route = getCurrentRoute();

        // Unload existing module, if there is one
        if (this.currentModule !== null) {
            if (this.currentModule === 'legacy') {
                this.legacyModuleUnload();
            } else {
                this.currentModule.unmount();
            }
            this.currentModule = null;
        }

        // Set up globals as legacy expects
        if (!isIndexable(window)) {
            throw new Error('not running in browser');
        }
        const scenarioId = route.type === 'standalone' ? 'master' : route.scenarioId;
        window['scenario'] = scenarioId;
        window['page'] = route.page;
        const { project } = externals();
        if (isIndexable(project['data'])) {
            window['data'] = project['data'][scenarioId];
        } else {
            throw new Error('project.data not indexable');
        }

        // Load new module
        window.scrollTo({ top: 0 });
        const pageData = pageDataForRoute(route);
        if (pageData.style === 'legacy') {
            this.currentModule = 'legacy';
            await this.legacyModuleInit();
        } else {
            const element = document.querySelector('#editor__main-content');
            if (element === null) {
                throw new Error(
                    'main content area not available for view initialisation',
                );
            }
            /*
             * SAFETY: The type parameters of this.currentModule vary depending
             * on what is currently loaded. Due to the way that TypeScript
             * deals with subtyping of functions, this is impossible to express
             * in a general way (try it and see!). The cast is sound, because
             * none of the `any` type parameters are exposed in public methods.
             */
            this.currentModule = new InstantiatedUiModule(
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
                pageData.module as UiModule<any, any, any>,
                null,
                element,
                applyDataMutator,
            );
        }
        this.legacySharedInit();

        // Run updaters
        this.sidebarManager.update();
        this.titleManager.update();
        this.externalDataUpdate();

        // Run legacy post-update init
        if (this.currentModule === 'legacy') {
            this.legacyModuleInitPostUpdate();
        }
    }
}

class SidebarManager {
    private sidebarModule: InstantiatedUiModule<
        editorSidebar.State,
        editorSidebar.Action,
        editorSidebar.Effect
    > | null = null;

    constructor() {
        if (featureFlags.has('new-sidebar')) {
            const sidebarElement = document.querySelector('#editor__sidebar');
            if (sidebarElement === null) {
                throw new Error('sidebar area not available for view initialisation');
            }

            this.sidebarModule = new InstantiatedUiModule(
                editorSidebar.editorSidebarModule,
                null,
                sidebarElement,
                applyDataMutator,
            );
        }
    }

    update() {
        if (featureFlags.has('new-sidebar')) {
            this.sidebarModule?.update(getAppContext());
        }
    }
}

class TitleManager {
    private titleModule: InstantiatedUiModule<
        titleModule.State,
        titleModule.Action,
        never
    >;
    constructor() {
        const titleElement = document.querySelector('#title-component-container');
        if (titleElement === null) {
            throw new Error('title element not available');
        }
        this.titleModule = new InstantiatedUiModule(
            titleModule.titleModule,
            null,
            titleElement,
            applyDataMutator,
        );
    }

    update() {
        this.titleModule.update(getAppContext());
    }
}
