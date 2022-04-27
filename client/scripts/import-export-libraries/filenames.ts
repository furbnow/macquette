import { Params } from './params';
import { LibraryWithSubtype } from './types';

export function withFilenames(
    libraries: LibraryWithSubtype[],
    outputFormat: Params['outputFormat'],
): { filename: string; library: LibraryWithSubtype }[] {
    const allFilenames = new Set<string>();
    const withFilenames = libraries.map((library) => {
        const extension = outputFormat;
        let filename;
        if ('subtype' in library) {
            filename = `${library.id}.${library.type}.${library.subtype}.${extension}`;
        } else {
            filename = `${library.id}.${library.type}.${extension}`;
        }
        if (allFilenames.has(filename)) {
            throw new Error(`Duplicate filename! ${filename}`);
        } else {
            allFilenames.add(filename);
        }
        return {
            library,
            filename,
        };
    });
    return withFilenames;
}
