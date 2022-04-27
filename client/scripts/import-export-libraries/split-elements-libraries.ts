import { Library } from '../../src/v2/data-schemas/libraries';
import { discriminateTags } from '../../src/v2/data-schemas/libraries/elements';
import { LibraryWithSubtype } from './types';

export function splitElementsLibraries(libraries: Library[]): LibraryWithSubtype[] {
    return libraries.flatMap((library: Library): Library[] => {
        if (library.type === 'elements' || library.type === 'elements_measures') {
            const discriminators = [
                'Door',
                'Window',
                'Roof_light',
                'Wall',
                'Party_wall',
                'Floor',
                'Hatch',
                'Loft',
                'Roof',
            ];
            return discriminators.map((disc) => {
                const filteredData = Object.fromEntries(
                    Object.entries(library.data).filter(([, value]) =>
                        discriminateTags(value, disc),
                    ),
                );
                // SAFETY: the above filter does not change the type of the Record object
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                const outLib = {
                    ...library,
                    data: filteredData,
                } as Library;
                return { ...outLib, subtype: disc };
            });
        } else {
            return [library];
        }
    });
}
