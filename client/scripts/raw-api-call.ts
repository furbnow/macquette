import { Method } from 'axios';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { z } from 'zod';

import { HTTPClient } from '../src/v2/api/http';
import { readApiKeysForBaseUrl } from './lib/config';

type Params = {
    baseUrl: string;
    endpoint: string;
    method: Method;
    data?: string;
};

async function getParams(): Promise<Params> {
    const [baseUrl, endpoint, method, dataPath] = process.argv.slice(2);
    const firstParams: Omit<Params, 'data'> = z
        .object({
            baseUrl: z.string(),
            endpoint: z.string(),
            method: z.enum([
                'GET',
                'DELETE',
                'HEAD',
                'OPTIONS',
                'POST',
                'PUT',
                'PATCH',
                'PURGE',
                'LINK',
                'UNLINK',
            ]),
        })
        .parse({ baseUrl, endpoint, method: method?.toUpperCase() ?? 'GET' });
    if (dataPath !== undefined) {
        let data: string;
        if (dataPath === '-') {
            data = readFileSync(0, 'utf-8');
        } else {
            data = await readFile(dataPath, 'utf-8');
        }
        return { ...firstParams, data };
    } else {
        return firstParams;
    }
}

async function main() {
    const params = await getParams();
    const apiKeys = await readApiKeysForBaseUrl(params.baseUrl);
    const client = new HTTPClient({
        baseURL: params.baseUrl,
        ...apiKeys,
    });
    const response = await client.rawApiCall(params.method, params.endpoint, params.data);
    console.log(response);
}

main().catch(console.error);
