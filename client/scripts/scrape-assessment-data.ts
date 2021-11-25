import { prompt } from 'inquirer';
import axios, { AxiosInstance } from 'axios';
import { opendir, stat, open } from 'fs/promises';
import { join } from 'path';
import Bottleneck from 'bottleneck';

const MAX_CONCURRENT_REQUESTS = 4;

type Params = {
    baseUrl: string;
    cookies: {
        sessionid: string;
    };
    dataDirectory: string;
};

const getParams = async (): Promise<Params> => {
    type PromptResult = {
        baseUrl: string;
        sessionid: string;
        dataDirectory: string;
    };
    const { baseUrl, sessionid, dataDirectory } = await prompt<PromptResult>([
        {
            type: 'input',
            name: 'baseUrl',
            message: 'Base URL to query',
            default: 'https://home.retrofitplanner.app',
        },
        {
            type: 'input',
            name: 'dataDirectory',
            message: 'Data directory',
            default: './test/model/fixtures/private',
        },
        {
            type: 'input',
            name: 'sessionid',
            message: 'Django sessionid cookie',
        },
    ]);
    return {
        baseUrl,
        cookies: {
            sessionid,
        },
        dataDirectory,
    };
};

type AssessmentMetadata = {
    id: string;
    updatedAt: Date;
};

class AssessmentClient {
    private bottleneck: Bottleneck;
    private axios: AxiosInstance;

    constructor(params: Params) {
        this.axios = axios.create({
            baseURL: params.baseUrl,
            headers: {
                cookie: `sessionid=${params.cookies.sessionid}`,
            },
        });
        this.bottleneck = new Bottleneck({
            maxConcurrent: MAX_CONCURRENT_REQUESTS,
        });
    }

    private async get(endpoint: string): Promise<unknown> {
        const response = await this.bottleneck.schedule(() => this.axios.get(endpoint));
        const data: unknown = response.data;
        return data;
    }

    async listMetadata(): Promise<AssessmentMetadata[]> {
        type DataFormat = { id: string; updated_at: string }[];
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const data = (await this.get(`/v2/api/assessments/`)) as DataFormat;
        return data.map(({ id, updated_at }) => {
            return {
                id,
                updatedAt: new Date(updated_at),
            };
        });
    }

    async getAssessment(id: string): Promise<unknown> {
        return this.get(`/v2/api/assessments/${id}/`);
    }
}

const listExistingScrapedData = async ({
    dataDirectory,
}: Params): Promise<AssessmentMetadata[]> => {
    const dir = await opendir(dataDirectory);
    const out = [];
    const jsonSuffix = /\.json$/;
    for await (const dentry of dir) {
        if (!dentry.isFile() || !jsonSuffix.test(dentry.name)) {
            continue;
        }
        const { name } = dentry;
        const id = name.replace(jsonSuffix, '');
        const { mtime } = await stat(join(dataDirectory, name));
        out.push({
            id,
            updatedAt: mtime,
        });
    }
    return out;
};

const isSameSecond = (a: Date, b: Date) => {
    return a.getTime() % 1000 === b.getTime() % 1000;
};

const main = async () => {
    const params = await getParams();
    const client = new AssessmentClient(params);
    const metadata = await client.listMetadata();
    console.log(`${metadata.length} items serverside`);
    const existing = await listExistingScrapedData(params);
    console.log(`${existing.length} items locally`);
    const toFetch = metadata.filter((metadataItem) => {
        for (const existingItem of existing) {
            if (
                existingItem.id === metadataItem.id &&
                isSameSecond(existingItem.updatedAt, metadataItem.updatedAt)
            ) {
                // Items are the same, so we don't care to fetch again
                return false;
            }
        }
        // Did not match anything, so fetch
        return true;
    });

    console.log(`${toFetch.length} new or updated items to fetch and save`);

    await Promise.all(
        toFetch.map(async ({ id, updatedAt }): Promise<void> => {
            const data = await client.getAssessment(id);
            const filePath = join(params.dataDirectory, `${id}.json`);
            const handle = await open(filePath, 'w');
            await handle.write(JSON.stringify(data, null, 4));
            await handle.utimes(updatedAt, updatedAt);
            await handle.close();
            process.stdout.write('.');
        }),
    );
    console.log(' done 😻');
};

main().catch(console.error);
