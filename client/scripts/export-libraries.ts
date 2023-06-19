import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { HTTPClient } from '../src/api/http';
import { finalErrorHandler } from './import-export-libraries/error-handling';
import { writeCsv, writeJson } from './import-export-libraries/export';
import { generateManifest } from './import-export-libraries/manifest';
import { getExportParams } from './import-export-libraries/params';
import { sanitiseLibrary } from './import-export-libraries/sanitise';
import { splitElementsLibraries } from './import-export-libraries/split-elements-libraries';
import { readApiKeysForBaseUrl } from './lib/config';

async function main() {
    const params = await getExportParams();
    const { sessionId } = await readApiKeysForBaseUrl(params.baseUrl);
    const client = new HTTPClient({
        sessionId: sessionId,
        baseURL: params.baseUrl,
    });
    const libraries = await client.listLibraries();
    const sanitisedLibraries = libraries.map((library) => {
        console.log(`Sanitising library ${library.id} (${library.name})`);
        return sanitiseLibrary(library);
    });
    const splits = splitElementsLibraries(sanitisedLibraries);
    mkdirSync(params.dataDirectory, { recursive: true });

    const manifestFilename = 'manifest.json';
    const { manifest, files } = generateManifest(splits, params.outputFormat);
    writeFileSync(
        join(params.dataDirectory, manifestFilename),
        JSON.stringify(manifest),
        'utf-8',
    );
    console.log(`Wrote ${manifestFilename}`);

    for (const [filename, library] of Object.entries(files)) {
        const outpath = join(params.dataDirectory, filename);
        let fileData: string;
        switch (params.outputFormat) {
            case 'csv':
                fileData = writeCsv(library);
                break;
            case 'json':
                fileData = writeJson(library);
                break;
        }
        writeFileSync(outpath, fileData, 'utf-8');
        console.log(`Wrote ${filename}.`);
    }
}

main().catch(finalErrorHandler).catch(console.error);
