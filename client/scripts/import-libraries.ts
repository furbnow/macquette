import chalk from 'chalk';
import { readFileSync } from 'fs';
import { prompt } from 'inquirer';
import { join } from 'path';

import { HTTPClient } from '../src/v2/api/http';
import { librarySchema } from '../src/v2/data-schemas/libraries';
import { finalErrorHandler } from './import-export-libraries/error-handling';
import { readCsv, readJson } from './import-export-libraries/export';
import {
    Manifest,
    manifestSchema,
    RehydratedManifest,
    rehydrateManifest,
} from './import-export-libraries/manifest';
import { getImportParams } from './import-export-libraries/params';
import {
    mapSplitLibrary,
    merge,
} from './import-export-libraries/split-elements-libraries';
import { LibraryWithOptionalId } from './import-export-libraries/types';
import { readApiKeysForBaseUrl } from './lib/config';

function readManifest(dataDirectory: string): Manifest {
    const json = readFileSync(join(dataDirectory, 'manifest.json'), 'utf-8');
    const raw: unknown = JSON.parse(json);
    return manifestSchema.parse(raw);
}

function parse(manifest: RehydratedManifest): LibraryWithOptionalId[] {
    const splitParsed = mapSplitLibrary(manifest, (libraryData) => {
        let data: Record<string, unknown>;
        const { type, content } = libraryData.dataFile;
        switch (type) {
            case 'json': {
                data = readJson(content);
                break;
            }
            case 'csv': {
                data = readCsv(content);
                break;
            }
        }
        const library = {
            ...libraryData.metadata,
            data,
        };
        return {
            ...librarySchema.parse(library),
            ...(libraryData.metadata.id === undefined
                ? {}
                : { id: libraryData.metadata.id }),
        };
    });
    return merge(splitParsed);
}

type ConfirmResult =
    | { type: 'skip' }
    | { type: 'update'; id: string }
    | { type: 'create' };
async function confirmProceed(
    client: Pick<HTTPClient, 'listLibraries'>,
    params: { dryRun: boolean },
) {
    const allLibraries = await client.listLibraries();
    return async (library: LibraryWithOptionalId): Promise<ConfirmResult> => {
        if (library.id !== undefined) {
            const existingLibrary = allLibraries.find(
                (existingLibrary) => existingLibrary.id === library.id,
            );
            if (existingLibrary === undefined) {
                console.error(
                    chalk.red('[ERROR]') +
                        ' ' +
                        'Library to upload specified an ID, but there was no library with that ID server-side',
                );
                return { type: 'skip' };
            } else {
                console.log(
                    chalk.yellow('[WARN]') +
                        ' ' +
                        `You are about to replace the server-side library with ID ${existingLibrary.id}`,
                );
                console.log(
                    'Name: (old) ' +
                        chalk.red(existingLibrary.name) +
                        ' (new) ' +
                        chalk.green(library.name),
                );
                console.log(
                    'Number of items: (old) ' +
                        chalk.red(Object.keys(existingLibrary.data).length) +
                        ' (new) ' +
                        chalk.green(Object.keys(library.data).length),
                );
            }
        } else {
            console.log('You are about to upload a ' + chalk.green('new') + ' library.');
            console.log('Name: ' + chalk.green(library.name));
            console.log(
                'Number of items: ' + chalk.green(Object.keys(library.data).length),
            );
        }
        if (params.dryRun) {
            console.log('(No action - dry run)');
            return { type: 'skip' };
        } else {
            const { confirm } = await prompt<{ confirm: boolean }>([
                { type: 'confirm', name: 'confirm', default: false, message: 'Proceed?' },
            ]);
            if (!confirm) {
                return { type: 'skip' };
            } else if (library.id === undefined) {
                return { type: 'create' };
            } else {
                return { type: 'update', id: library.id };
            }
        }
    };
}

async function main() {
    const params = await getImportParams();
    const { sessionId, csrfToken } = await readApiKeysForBaseUrl(params.baseUrl);
    const manifest = readManifest(params.dataDirectory);
    const rehydratedManifest = rehydrateManifest(manifest, params.dataDirectory);
    const parsed = parse(rehydratedManifest);
    const client = new HTTPClient({
        sessionId,
        csrfToken,
        baseURL: params.baseUrl,
    });
    const confirm = await confirmProceed(client, params);
    for (const library of parsed) {
        const confirmed = await confirm(library);
        if (confirmed.type === 'skip') {
            continue;
        } else if (confirmed.type === 'update') {
            await client.updateLibrary(confirmed.id, library);
        } else if (confirmed.type === 'create') {
            await client.createLibrary(library);
        }
    }
}

main().catch(finalErrorHandler).catch(console.error);
