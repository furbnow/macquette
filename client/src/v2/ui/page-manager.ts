import { isEqual } from 'lodash';

import { isIndexable } from '../helpers/is-indexable';
import { externals } from '../shims/typed-globals';
import { resolveRoute, parseRoute } from './routes';
import type { ResolvedRoute } from './routes';

export class PageManager {
    private currentRoute: ResolvedRoute | null = null;

    constructor(
        private legacySharedInit: () => void,
        private legacyModuleInit: () => Promise<void>,
        private legacyModuleInitPostUpdate: () => void,
        private legacyModuleUpdate: () => void,
        private legacyModuleUnload: () => void,
    ) {
        const currentPage = parseRoute(window.location.hash);
        if (currentPage.isOk()) {
            this.takeRoute(resolveRoute(currentPage.unwrap())).catch((err) =>
                console.error(err),
            );
        } else {
            throw new Error(currentPage.unwrapErr());
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

        this.legacyModuleUnload();

        this.currentRoute = null;
    }

    private async init(route: ResolvedRoute) {
        await this.legacyModuleInit();
        this.legacySharedInit();
        this.currentRoute = route;
    }

    externalDataUpdate() {
        if (this.currentRoute === null) {
            return;
        }

        this.legacyModuleUpdate();
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
        this.externalDataUpdate();
        this.legacyModuleInitPostUpdate();
    }
}
