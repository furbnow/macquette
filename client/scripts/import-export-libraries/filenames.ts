import { Library } from '../../src/v2/data-schemas/libraries';
import { Params } from './params';
import { SplitDiscriminated } from './split-elements-libraries';

export type LibraryWithFilename = { filename: string; library: Library };

export function withFilenames(
    splitLibraries: SplitDiscriminated<Library>[],
    outputFormat: Params['outputFormat'],
): SplitDiscriminated<LibraryWithFilename>[] {
    const extension = outputFormat;
    const allFilenames = new Set<string>();
    function registerFilename(filename: string) {
        if (allFilenames.has(filename)) {
            throw new Error(`Duplicate filename! ${filename}`);
        } else {
            allFilenames.add(filename);
        }
    }
    const withFilenames = splitLibraries.map((split) => {
        switch (split.type) {
            case 'unitary': {
                const filename = `${split.item.id}.${split.item.type}.${extension}`;
                registerFilename(filename);
                return {
                    ...split,
                    item: {
                        library: split.item,
                        filename,
                    },
                };
            }
            case 'split': {
                return {
                    ...split,
                    subtypedItems: split.subtypedItems.map(({ subtype, item }) => {
                        const filename = `${item.id}.${item.type}.${subtype}.${extension}`;
                        registerFilename(filename);
                        return {
                            subtype,
                            item: {
                                library: item,
                                filename,
                            },
                        };
                    }),
                };
            }
        }
    });
    return withFilenames;
}
