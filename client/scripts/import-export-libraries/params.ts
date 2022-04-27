import { prompt } from 'inquirer';
import { resolve } from 'path';

export type Params = {
    baseUrl: string;
    sessionId: string;
    dataDirectory: string;
    outputFormat: 'csv' | 'json';
};

export const getParams = async (): Promise<Params> => {
    const { baseUrl, sessionId, dataDirectory, outputFormat } = await prompt<Params>([
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
            default: resolve(process.env['HOME'] ?? '/tmp', 'macquette-libraries'),
        },
        {
            type: 'password',
            name: 'sessionId',
            message: 'Django sessionid cookie',
        },
        {
            type: 'list',
            name: 'outputFormat',
            choices: ['csv', 'json'],
            message: 'Output file format',
        },
    ]);
    return {
        baseUrl,
        sessionId,
        dataDirectory,
        outputFormat,
    };
};
