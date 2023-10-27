import { readFile } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { z } from 'zod';

export function getConfigDir(): string {
  const xdgConfigHome = process.env['XDG_CONFIG_HOME'];
  let baseConfigDir: string;
  if (xdgConfigHome !== undefined) {
    baseConfigDir = xdgConfigHome;
  } else {
    const home = process.env['HOME'];
    if (home === undefined) {
      throw new Error('$HOME not defined, unable to resolve config dir');
    } else {
      baseConfigDir = join(home, '.config');
    }
  }
  return join(baseConfigDir, 'macquette');
}

const apiCredentialsSchema = z.object({
  sessionId: z.string(),
  csrfToken: z.string(),
});
export type ApiCredentials = z.infer<typeof apiCredentialsSchema>;

function apiCredentialsPath(baseUrl: string) {
  return join(getConfigDir(), 'api-credentials', encodeURIComponent(baseUrl));
}

export async function readApiKeysForBaseUrl(baseUrl: string): Promise<ApiCredentials> {
  const path = apiCredentialsPath(baseUrl);
  const json = await new Promise<string>((resolve, reject) => {
    // Use callback style because it provides a better type for the error
    readFile(path, 'utf-8', (error, data) => {
      if (error !== null) {
        if (error.code === 'ENOENT') {
          reject(
            new Error(
              `Path ${
                error.path ?? 'undefined'
              } does not exist. Have you run save-api-credentials.ts?`,
            ),
          );
        } else {
          reject(error);
        }
      } else {
        resolve(data);
      }
    });
  });
  const raw: unknown = JSON.parse(json);
  return apiCredentialsSchema.parse(raw);
}

export async function writeSessionIdForBaseUrl(
  baseUrl: string,
  credentials: ApiCredentials,
): Promise<void> {
  const path = apiCredentialsPath(baseUrl);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(credentials), 'utf-8');
}
