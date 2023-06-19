import assert from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

import { LibraryMetadata } from '../../src/data-schemas/api-metadata';
import { Library } from '../../src/data-schemas/libraries';
import {
    mapSplitLibrary,
    SplitLibrary,
    splitLibrarySchema,
} from './split-elements-libraries';

const metadataSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    type: z.string(),
});
export type Metadata = z.infer<typeof metadataSchema>;

const fileRefSchema = z.object({
    metadata: metadataSchema,
    dataFile: z.object({
        type: z.enum(['csv', 'json']),
        name: z.string(),
    }),
});
export type FileRef = z.infer<typeof fileRefSchema>;

export const manifestSchema = z.array(splitLibrarySchema(fileRefSchema));
export type Manifest = z.infer<typeof manifestSchema>;
export type RehydratedManifest = Array<
    SplitLibrary<{
        metadata: Metadata;
        dataFile: { content: string; type: 'csv' | 'json' };
    }>
>;

export function generateManifest<L extends Library & LibraryMetadata>(
    splitLibraries: SplitLibrary<L>[],
    outputType: 'csv' | 'json',
): { manifest: Manifest; files: Record<string, L> } {
    const files: Record<string, L> = {};
    const manifest: Manifest = mapSplitLibrary(
        splitLibraries,
        (lib, subtype): FileRef => {
            let filename: string;
            if (subtype === undefined) {
                filename = `${lib.id}.${lib.type}.${outputType}`;
            } else {
                filename = `${lib.id}.${lib.type}.${subtype}.${outputType}`;
            }
            const ref = {
                metadata: {
                    id: lib.id,
                    name: lib.name,
                    type: lib.type,
                },
                dataFile: {
                    type: outputType,
                    name: filename,
                },
            };
            assert(!(filename in files));
            files[filename] = lib;
            return ref;
        },
    );
    return { manifest, files };
}

export function rehydrateManifest(
    manifest: Manifest,
    dataDirectory: string,
): RehydratedManifest {
    return mapSplitLibrary(manifest, (ref) => {
        const dataString = readFileSync(join(dataDirectory, ref.dataFile.name), 'utf-8');
        return {
            metadata: ref.metadata,
            dataFile: { content: dataString, type: ref.dataFile.type },
        };
    });
}
