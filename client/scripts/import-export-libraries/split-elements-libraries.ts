import assert from 'assert';
import { pickBy } from 'lodash';
import { z } from 'zod';

import { Library } from '../../src/v2/data-schemas/libraries';
import { discriminateTags } from '../../src/v2/data-schemas/libraries/elements';
import { assertNotNever, LibraryWithOptionalId } from './types';

export function splitLibrarySchema<T>(librarySchema: z.ZodSchema<T>) {
    return z.discriminatedUnion('fileType', [
        z.object({
            fileType: z.literal('single file'),
            library: librarySchema,
        }),
        z.object({
            fileType: z.literal('multiple files'),
            library: z.array(
                z.object({
                    partialLibrary: librarySchema,
                    subtype: z.string(),
                }),
            ),
        }),
    ]);
}
export type SplitLibrary<L> =
    | { fileType: 'single file'; library: L }
    | {
          fileType: 'multiple files';
          library: { partialLibrary: L; subtype: string }[];
      };

(function typeTest() {
    // This is a type-level check that our hand-written type for SplitLibrary
    // matches up up with the schema, because z.infer can't work with generic
    // functions. See https://github.com/microsoft/TypeScript/issues/40542
    const dummySplitLibrarySchema = splitLibrarySchema(z.literal('dummy value' as const));
    type Inferred = z.infer<typeof dummySplitLibrarySchema>;
    type Calculated = SplitLibrary<'dummy value'>;
    type TypesAreEqual = Inferred extends Calculated
        ? Calculated extends Inferred
            ? unknown
            : never
        : never;
    assertNotNever<TypesAreEqual>(true);
})();

export function mapSplitLibrary<InL, OutL>(
    input: SplitLibrary<InL>[],
    fn: (l: InL, subtype?: string) => OutL,
): SplitLibrary<OutL>[] {
    return input.map((split) => {
        switch (split.fileType) {
            case 'single file': {
                return {
                    ...split,
                    library: fn(split.library),
                };
            }
            case 'multiple files': {
                return {
                    ...split,
                    library: split.library.map((subItem) => ({
                        ...subItem,
                        partialLibrary: fn(subItem.partialLibrary, subItem.subtype),
                    })),
                };
            }
        }
    });
}

export function splitElementsLibraries<L extends Library>(
    libraries: L[],
): SplitLibrary<L>[] {
    return libraries.map(<InnerL extends L>(library: InnerL): SplitLibrary<InnerL> => {
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
            const splitLibrary = discriminators.map((disc) => {
                const filteredData = pickBy(library.data, discriminateTags(disc));
                const outLib = {
                    ...library,
                    data: filteredData,
                };
                return { partialLibrary: outLib, subtype: disc };
            });
            return {
                fileType: 'multiple files',
                library: splitLibrary,
            };
        } else {
            return {
                fileType: 'single file',
                library,
            };
        }
    });
}

export function merge(
    splits: SplitLibrary<LibraryWithOptionalId>[],
): LibraryWithOptionalId[] {
    return splits.map(<L extends LibraryWithOptionalId>(split: SplitLibrary<L>): L => {
        switch (split.fileType) {
            case 'single file':
                return split.library;
            case 'multiple files': {
                type Data = L['data'];
                const firstPartial = split.library[0]?.partialLibrary;
                assert(firstPartial !== undefined);
                const newData: Data = split.library
                    .map(({ partialLibrary }): L => partialLibrary)
                    .reduce((combinedData: Data, partialLibrary: L): Data => {
                        assert(partialLibrary.id === firstPartial.id);
                        assert(partialLibrary.name === firstPartial.name);
                        return {
                            ...combinedData,
                            ...partialLibrary.data,
                        };
                    }, {});
                return {
                    ...firstPartial,
                    data: newData,
                };
            }
        }
    });
}
