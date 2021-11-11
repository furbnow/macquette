const axios = require('axios');
const querystring = require('querystring');

const processEnvConfig = () => {
    const { BASE_URL: baseUrl, USERNAME: username, PASSWORD: password } = process.env
    if (baseUrl === undefined || username === undefined || password === undefined) {
        throw new Error('Must provide params')
    }

    return { baseUrl, username, password }
}

const config = processEnvConfig()

function getCookieValue(headers, name) {
    // Find the matching set-cookie header
    const header = headers['set-cookie'].find((str) => str.startsWith(`${name}=`));
    if (header === undefined) {
        throw new Error(`No cookie named '${name}' set`);
    }

    // It's in the format <name>=<value>; ...; this gets us <value>:
    return header.split(';')[0].split('=')[1];
}

describe('the web service', () => {
    let fetcher = '';
    let csrfToken = '';
    let sessionId = '';

    beforeAll(async () => {
        let rootResponse = await axios.get(config.baseUrl);

        // Save the CSRF token for later requests
        csrfToken = getCookieValue(rootResponse.headers, 'csrftoken');

        // 200 is enough for us here
        expect(rootResponse.status).toEqual(200);

        let loginResponse = await axios.post(
            `${config.baseUrl}login/`,
            querystring.stringify({
                csrfmiddlewaretoken: csrfToken,
                username: config.username,
                password: config.password,
            }),
            {
                headers: {
                    Cookie: `csrftoken=${csrfToken}`,
                    referer: config.baseUrl,
                },
                // We need to get the sessionid cookie
                maxRedirects: 0,
                validateStatus: (status) => status === 302,
            }
        );

        // Password form control should not exist at this point.
        expect(loginResponse.data).not.toMatch(/id_password/);

        sessionId = getCookieValue(loginResponse.headers, 'sessionid');

        // Configure an axios instance to make the rest of the tests more readable
        fetcher = axios.create({
            baseURL: config.baseUrl,
            headers: {
                cookie: `csrftoken=${csrfToken}; sessionid=${sessionId}`,
                referer: config.baseUrl,
            },
        });
    });

    test("the site root doesn't error out", async () => {
        const response = await fetcher.get('/');
        expect(response.status).toEqual(200);
    });

    test('create and view an assessment', async () => {
        const createResponse = await fetcher.post(
            '/v2/api/assessments/',
            querystring.stringify({
                csrfmiddlewaretoken: csrfToken,
                name: 'Test assessment',
                description: 'Description of fnord',
            })
        );
        expect(createResponse.status).toEqual(201);
        expect(createResponse.data.id).not.toEqual(undefined);

        const htmlResponse = await fetcher.get(
            `/v2/assessments/${createResponse.data.id}`
        );
        expect(htmlResponse.status).toEqual(200);
    });
});
