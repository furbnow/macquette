import { prompt } from 'inquirer';
import { resolve } from 'path';

type CommonParams = {
    baseUrl: string;
    dataDirectory: string;
};

export type ExportParams = CommonParams & {
    outputFormat: 'csv' | 'json';
};

export async function getExportParams(): Promise<ExportParams> {
    return await prompt<ExportParams>([
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
            type: 'list',
            name: 'outputFormat',
            choices: ['csv', 'json'],
            message: 'Output file format',
        },
    ]);
}

export type ImportParams = CommonParams & { dryRun: boolean };

export async function getImportParams(): Promise<ImportParams> {
    return await prompt<ImportParams>([
        {
            type: 'confirm',
            name: 'dryRun',
            message: 'Dry run?',
            default: true,
        },
        {
            type: 'input',
            name: 'baseUrl',
            message: 'Base URL to query',
            default: 'http://localhost:8000',
        },
        {
            type: 'input',
            name: 'dataDirectory',
            message: 'Data directory',
            default: resolve(process.env['HOME'] ?? '/tmp', 'macquette-libraries'),
        },
    ]);
}
