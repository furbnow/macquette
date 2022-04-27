import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { HTTPClient } from '../src/v2/api/http';
import { getCsv, getJson } from './import-export-libraries/export';
import { withFilenames } from './import-export-libraries/filenames';
import { getManifest } from './import-export-libraries/manifest';
import { getParams } from './import-export-libraries/params';
import { sanitiseLibrary } from './import-export-libraries/sanitise';
import {
    flatten,
    splitElementsLibraries,
} from './import-export-libraries/split-elements-libraries';

async function main() {
    const params = await getParams();
    const client = new HTTPClient({
        sessionId: params.sessionId,
        baseURL: params.baseUrl,
    });
    const libraries = await client.listLibraries();
    const splits = splitElementsLibraries(libraries);
    const splitsWithFilenames = withFilenames(splits, params.outputFormat);
    mkdirSync(params.dataDirectory, { recursive: true });

    const manifestFilename = 'manifest.json';
    log(`Processing ${manifestFilename}... `, { newLine: false });
    const manifest = getManifest(splitsWithFilenames);
    writeFileSync(
        join(params.dataDirectory, manifestFilename),
        JSON.stringify(manifest),
        'utf-8',
    );
    log('done');

    for (const { library, filename } of flatten(splitsWithFilenames)) {
        log(`Processing ${filename}... `, { newLine: false });
        const sanitisedLibrary = sanitiseLibrary(library);
        const outpath = join(params.dataDirectory, filename);
        let fileData: string;
        switch (params.outputFormat) {
            case 'csv':
                fileData = getCsv(sanitisedLibrary);
                break;
            case 'json':
                fileData = getJson(sanitisedLibrary);
                break;
        }
        writeFileSync(outpath, fileData, 'utf-8');
        log('done');
    }
}

function log(message: string, options?: { newLine: boolean }) {
    const newLine = options?.newLine ?? true;
    if (newLine) {
        writeFileSync(process.stdout.fd, message + '\n');
    } else {
        writeFileSync(process.stdout.fd, message);
    }
}

main().catch(console.error);
