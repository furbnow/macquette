import { input, password } from '@inquirer/prompts';
import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';
import { mkdirSync } from 'fs';
import { open, opendir, stat } from 'fs/promises';
import { join, resolve } from 'path';

const MAX_CONCURRENT_REQUESTS = 4;

type Params = {
  baseUrl: string;
  cookies: {
    sessionid: string;
  };
  dataDirectory: string;
};

async function getParams(): Promise<Params> {
  return {
    baseUrl: await input({
      message: 'Base URL to query',
      default: 'https://home.retrofitplanner.app',
    }),
    dataDirectory: await input({
      message: 'Data directory',
      default: resolve(__dirname, '..', 'test', 'fixtures', 'private'),
    }),
    cookies: {
      sessionid: await password({
        message: 'Django sessionid cookie',
      }),
    },
  };
}

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

async function listExistingScrapedData({
  dataDirectory,
}: Params): Promise<AssessmentMetadata[]> {
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
}

function isSameSecond(a: Date, b: Date) {
  return a.getTime() % 1000 === b.getTime() % 1000;
}

async function main() {
  const params = await getParams();
  mkdirSync(params.dataDirectory, { recursive: true });
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
}

main().catch(console.error);
