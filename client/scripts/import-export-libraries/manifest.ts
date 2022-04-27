import assert from 'assert';
import { pick } from 'lodash';
import { z } from 'zod';

import { LibraryWithFilename } from './filenames';
import { SplitDiscriminated } from './split-elements-libraries';

const manifestItemCommon = {
    id: z.string(),
    name: z.string(),
    type: z.string(),
};
const manifestItemSchema = z.union([
    z
        .object({
            filename: z.string(),
        })
        .extend(manifestItemCommon),
    z
        .object({
            filenames: z.array(
                z.object({
                    filename: z.string(),
                    subtype: z.string(),
                }),
            ),
        })
        .extend(manifestItemCommon),
]);
const manifestSchema = z.array(manifestItemSchema);

type Manifest = z.infer<typeof manifestSchema>;

export function getManifest(
    splitLibraries: SplitDiscriminated<LibraryWithFilename>[],
): Manifest {
    return splitLibraries.map((split) => {
        switch (split.type) {
            case 'unitary': {
                return {
                    ...pick(split.item.library, ['id', 'name', 'type']),
                    filename: split.item.filename,
                };
            }
            case 'split': {
                const firstLibrary = split.subtypedItems[0]?.item.library;
                assert(firstLibrary !== undefined);
                return {
                    ...pick(firstLibrary, ['id', 'name', 'type']),
                    filenames: split.subtypedItems.map(({ item, subtype }) => ({
                        filename: item.filename,
                        subtype,
                    })),
                };
            }
        }
    });
}
