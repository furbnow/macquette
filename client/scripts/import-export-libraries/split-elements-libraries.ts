import { Library } from '../../src/v2/data-schemas/libraries';
import { discriminateTags } from '../../src/v2/data-schemas/libraries/elements';

export type SplitDiscriminated<L> =
    | {
          type: 'unitary';
          item: L;
      }
    | {
          type: 'split';
          subtypedItems: {
              subtype: string;
              item: L;
          }[];
      };

export function splitElementsLibraries(
    libraries: Library[],
): SplitDiscriminated<Library>[] {
    return libraries.map(<L extends Library>(library: L): SplitDiscriminated<L> => {
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
            const subtypedItems = discriminators.map((disc) => {
                const filteredData = Object.fromEntries(
                    Object.entries(library.data).filter(([, value]) =>
                        discriminateTags(value, disc),
                    ),
                );
                const outLib = {
                    ...library,
                    data: filteredData,
                };
                return { item: outLib, subtype: disc };
            });
            return { type: 'split', subtypedItems };
        } else {
            return { type: 'unitary', item: library };
        }
    });
}

export function flatten<T>(stuff: SplitDiscriminated<T>[]): T[] {
    return stuff.flatMap((split): T[] => {
        switch (split.type) {
            case 'unitary':
                return [split.item];
            case 'split':
                return split.subtypedItems.map((subtypedItem) => subtypedItem.item);
        }
    });
}
