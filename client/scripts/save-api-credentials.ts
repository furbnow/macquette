import { input, password } from '@inquirer/prompts';

import { ApiCredentials, writeSessionIdForBaseUrl } from './lib/config';

type Params = ApiCredentials & {
  baseUrl: string;
};

async function getParams(): Promise<Params> {
  return {
    baseUrl: await input({
      message: 'Base URL',
      default: 'https://home.retrofitplanner.app',
    }),
    sessionId: await password({ message: 'Django sessionid cookie' }),
    csrfToken: await password({ message: 'Django CSRF token' }),
  };
}

async function main() {
  const { baseUrl, sessionId, csrfToken } = await getParams();
  await writeSessionIdForBaseUrl(baseUrl, { csrfToken, sessionId });
  console.log('Success 👍');
}

main().catch(console.error);
