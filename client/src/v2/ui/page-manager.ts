import { isEqual } from 'lodash';

import { featureFlags } from '../helpers/feature-flags';
import { isIndexable } from '../helpers/is-indexable';
import { externals } from '../shims/typed-globals';
import { modules } from './modules';
import type { Module } from './modules';
import type { StandalonePageName, ScenarioPageName } from './pages';
import { resolveRoute, parseRoute, DEFAULT_ROUTE } from './routes';
import type { ResolvedRoute } from './routes';

type PageData = { style: 'legacy' } | { style: 'modern'; module: Module };

export const standalonePages: Record<StandalonePageName, PageData> = {
    householdquestionnaire: { style: 'legacy' },
    commentary: { style: 'legacy' },
    currentenergy: { style: 'modern', module: modules.currentEnergy },
    imagegallery: { style: 'modern', module: modules.imageGallery },
    compare: { style: 'legacy' },
    report: { style: 'legacy' },
    scopeofworks: { style: 'legacy' },
    export: { style: 'legacy' },
    librariesmanager: { style: 'legacy' },
    fuelsmanager: { style: 'legacy' },
    sandbox: { style: 'modern', module: modules.sandbox },
};

export const scenarioPages: Record<ScenarioPageName, PageData> = {
    context: { style: 'legacy' },
    ventilation: { style: 'legacy' },
    elements: { style: 'legacy' },
    LAC: { style: 'legacy' },
    heating: { style: 'legacy' },
    fuel_requirements: { style: 'legacy' },
    generation: { style: 'legacy' },
    solarhotwater: { style: 'modern', module: modules.solarHotWater },
    worksheets: { style: 'legacy' },
};

function pageDataForRoute(route: ResolvedRoute): PageData {
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
    private currentRoute: ResolvedRoute | null = null;

    constructor(
        private legacySharedInit: () => void,
        private legacyModuleInit: () => Promise<void>,
        private legacyModuleInitPostUpdate: () => void,
        private legacyModuleUpdate: () => void,
        private legacyModuleUnload: () => void,
    ) {
        PageManager.initEnvirons();

        const currentPage = parseRoute(window.location.hash);
        if (currentPage.isOk()) {
            this.takeRoute(resolveRoute(currentPage.unwrap())).catch((err) =>
                console.error(err),
            );
        } else {
            alert('Could not navigate to page, going to default page');
            this.takeRoute(resolveRoute(DEFAULT_ROUTE)).catch((err) =>
                console.error(err),
            );
        }

        window.addEventListener('hashchange', () => {
            const currentPage = parseRoute(window.location.hash);
            if (currentPage.isOk()) {
                this.takeRoute(resolveRoute(currentPage.unwrap())).catch((err) => {
                    alert('Could not navigate to page');
                    console.error(err);
                });
            } else {
                alert('Could not navigate to page');
            }
        });
    }

    private unload() {
        if (this.currentRoute === null) {
            return;
        }

        const pageData = pageDataForRoute(this.currentRoute);
        if (pageData.style === 'legacy') {
            this.legacyModuleUnload();
        } else {
            pageData.module.unmountAll();
        }

        this.currentRoute = null;
    }

    private async init(route: ResolvedRoute) {
        this.updateEnvirons(route);
        window.scrollTo({ top: 0 });

        const pageData = pageDataForRoute(route);
        if (pageData.style === 'legacy') {
            await this.legacyModuleInit();
        } else {
            const element = document.querySelector('#editor__main-content');
            if (element === null) {
                throw new Error(
                    'main content area not available for view initialisation',
                );
            }
            pageData.module.init(element, '');
        }

        this.legacySharedInit();
        this.currentRoute = route;
    }

    async externalDataUpdate() {
        if (this.currentRoute === null) {
            return;
        }

        // Check if the scenario we're on still exists
        if (this.currentRoute.type === 'with scenario') {
            const { project } = externals();
            const { scenarioId } = this.currentRoute;

            if (isIndexable(project['data']) && !(scenarioId in project['data'])) {
                return await this.takeRoute(resolveRoute(DEFAULT_ROUTE));
            }
        }

        this.updateEnvirons(this.currentRoute);

        const pageData = pageDataForRoute(this.currentRoute);
        if (pageData.style === 'legacy') {
            this.legacyModuleUpdate();
        } else {
            pageData.module.update(this.currentRoute);
        }
    }

    async takeRoute(newRoute: ResolvedRoute) {
        if (isEqual(this.currentRoute, newRoute)) {
            return;
        }

        this.unload();

        // We are using this global to share state between here and the UiModuleShim.
        // The exercise of removing this global state this is left to future readers.
        if (!isIndexable(window)) {
            throw new Error('not running in browser');
        }
        const scenarioId =
            newRoute.type === 'standalone' ? 'master' : newRoute.scenarioId;
        window['scenario'] = scenarioId;
        window['page'] = newRoute.page;

        const { project } = externals();
        if (isIndexable(project['data'])) {
            window['data'] = project['data'][scenarioId];
        } else {
            throw new Error('project.data not indexable');
        }

        await this.init(newRoute);
        await this.externalDataUpdate();

        const pageData = pageDataForRoute(newRoute);
        if (pageData.style === 'legacy') {
            this.legacyModuleInitPostUpdate();
        }
    }

    private static initEnvirons() {
        if (featureFlags.has('new-sidebar')) {
            const sidebarElement = document.querySelector('#editor__sidebar');
            if (sidebarElement === null) {
                throw new Error('sidebar area not available for view initialisation');
            }

            modules.editorSidebar.init(sidebarElement, '');
        }
    }

    private updateEnvirons(route: ResolvedRoute) {
        if (featureFlags.has('new-sidebar')) {
            modules.editorSidebar.update(route);
        }
    }
}
