import { Result } from '../helpers/result';
import type { ScenarioPageName, StandalonePageName } from './pages';
import { isScenarioPage, isStandalonePage } from './pages';

export const DEFAULT_ROUTE: StandaloneRoute = {
    type: 'standalone',
    page: 'address-search',
};

type StandaloneRoute = { type: 'standalone'; page: StandalonePageName };
type ScenarioRoute = {
    type: 'with scenario';
    page: ScenarioPageName;
    scenarioId: string;
};
type UnresolvedDefaultRoute = { type: 'default' };

export type UnresolvedRoute = StandaloneRoute | ScenarioRoute | UnresolvedDefaultRoute;
export type ResolvedRoute = StandaloneRoute | ScenarioRoute;

export type ParserState =
    | { type: 'initial' }
    | { type: 'empty initial segment' }
    | { type: 'first segment received'; firstSegment: string };

export function parseRoute(hashContents: string): Result<UnresolvedRoute, string> {
    if (hashContents === '') {
        return Result.ok({ type: 'default' });
    } else if (hashContents[0] !== '#') {
        return Result.err('invalid hash passed, needs leading #');
    }

    const segments = hashContents.slice(1).split('/');
    if (segments.length > 2) {
        return Result.err('too many path segments');
    }

    let state: ParserState = { type: 'initial' };

    for (const segment of segments) {
        switch (state.type) {
            case 'initial': {
                if (segment === '') {
                    state = { type: 'empty initial segment' };
                    continue;
                } else {
                    state = { type: 'first segment received', firstSegment: segment };
                }
                break;
            }

            case 'empty initial segment': {
                return Result.err(
                    'empty path segment must not be followed by another segment',
                );
            }

            case 'first segment received': {
                // Now we know that the first segment should be a scenarioId
                if (segment === '') {
                    return Result.err('second segment should not be empty');
                }

                // Page can be either standalone or scenario-based. If scenario based
                // we just junk the scenarioId when we return
                if (isStandalonePage(segment)) {
                    return Result.ok({ type: 'standalone', page: segment });
                } else if (isScenarioPage(segment)) {
                    return Result.ok({
                        type: 'with scenario',
                        page: segment,
                        scenarioId: state.firstSegment,
                    });
                } else {
                    return Result.err("couldn't resolve page name");
                }
            }
        }
    }

    if (state.type === 'empty initial segment') {
        return Result.ok({ type: 'default' });
    } else if (state.type === 'first segment received') {
        if (isStandalonePage(state.firstSegment)) {
            return Result.ok({ type: 'standalone', page: state.firstSegment });
        } else if (isScenarioPage(state.firstSegment)) {
            return Result.err(`route '${state.firstSegment}' requires a scenario name`);
        } else {
            return Result.err("couldn't resolve page name");
        }
    } else {
        return Result.err('generic failure');
    }
}

export function resolveRoute(route: UnresolvedRoute): ResolvedRoute {
    if (route.type === 'default') {
        return DEFAULT_ROUTE;
    } else {
        return route;
    }
}
