import { prompt } from 'inquirer';

import { ApiCredentials, writeSessionIdForBaseUrl } from './lib/config';

type Params = ApiCredentials & {
    baseUrl: string;
};

async function getParams(): Promise<Params> {
    return await prompt<Params>([
        {
            type: 'input',
            name: 'baseUrl',
            message: 'Base URL',
            default: 'https://home.retrofitplanner.app',
        },
        {
            type: 'password',
            name: 'sessionId',
            message: 'Django sessionid cookie',
        },
        {
            type: 'password',
            name: 'csrfToken',
            message: 'Django CSRF token',
        },
    ]);
}

async function main() {
    const { baseUrl, sessionId, csrfToken } = await getParams();
    await writeSessionIdForBaseUrl(baseUrl, { csrfToken, sessionId });
    console.log('Success 👍');
}

main().catch(console.error);
