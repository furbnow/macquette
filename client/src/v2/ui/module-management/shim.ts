import { LibraryMetadata } from '../../data-schemas/api-metadata';
import { Library } from '../../data-schemas/libraries';

/* eslint-disable
    @typescript-eslint/consistent-type-assertions,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unsafe-member-access,
*/
export const externals = () => ({
    project: (window as any).p as unknown,
    scenarioId: (window as any).scenario as unknown,
    update: (window as any).update as () => void,
    libraries: (window as any).libraries as (Library & LibraryMetadata)[],
});
