import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { HTTPClient } from '../src/v2/api/http';
import { getCsv, getJson } from './import-export-libraries/export';
import { withFilenames } from './import-export-libraries/filenames';
import { getParams } from './import-export-libraries/params';
import { sanitiseLibrary } from './import-export-libraries/sanitise';
import { splitElementsLibraries } from './import-export-libraries/split-elements-libraries';

async function main() {
    const params = await getParams();
    const client = new HTTPClient({
        sessionId: params.sessionId,
        baseURL: params.baseUrl,
    });
    const libraries = await client.listLibraries();
    const split = splitElementsLibraries(libraries);
    mkdirSync(params.dataDirectory, { recursive: true });
    for (const { library, filename } of withFilenames(split, params.outputFormat)) {
        writeFileSync(process.stdout.fd, `Processing ${filename}... `);
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
        writeFileSync(process.stdout.fd, 'done\n');
    }
}

main().catch(console.error);
