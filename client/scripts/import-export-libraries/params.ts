import { confirm, input, select } from '@inquirer/prompts';
import { resolve } from 'path';

type CommonParams = {
    baseUrl: string;
    dataDirectory: string;
};

export type ExportParams = CommonParams & {
    outputFormat: 'csv' | 'json';
};

export async function getExportParams(): Promise<ExportParams> {
    return {
        baseUrl: await input({
            message: 'Base URL to query',
            default: 'https://home.retrofitplanner.app',
        }),
        dataDirectory: await input({
            message: 'Data directory',
            default: resolve(process.env['HOME'] ?? '/tmp', 'macquette-libraries'),
        }),
        outputFormat: await select({
            choices: [
                { name: 'CSV', value: 'csv' as const },
                { name: 'JSON', value: 'json' as const },
            ],
            message: 'Output file format',
        }),
    };
}

export type ImportParams = CommonParams & { dryRun: boolean };

export async function getImportParams(): Promise<ImportParams> {
    return {
        dryRun: await confirm({
            message: 'Dry run?',
            default: true,
        }),
        baseUrl: await input({
            message: 'Base URL to query',
            default: 'http://localhost:8000',
        }),
        dataDirectory: await input({
            message: 'Data directory',
            default: resolve(process.env['HOME'] ?? '/tmp', 'macquette-libraries'),
        }),
    };
}
