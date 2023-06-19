// For some reason ESLint can't resolve these imports
// eslint-disable-next-line import/no-unresolved
import { parse as csvParse } from 'csv-parse/sync';
// eslint-disable-next-line import/no-unresolved
import { stringify as csvStringify } from 'csv-stringify/sync';
import { omit } from 'lodash';
import { z } from 'zod';
import { safeIsArray } from '../../src/helpers/safe-is-array';

import { Library } from '../../src/data-schemas/libraries';
import { ItemOf, LibraryItem } from './types';

type CsvRow = Omit<LibraryItem, 'tags'> & {
    tags?: string | null;
};

function prepareForCsv<L extends Library>(
    library: L,
): {
    columnNames: string[];
    csvData: CsvRow[];
} {
    const collectedItemFields: Set<string> = new Set();
    const csvData: CsvRow[] = [];
    const libraryItems: ItemOf<L>[] = Object.values(
        // SAFETY: TS struggles to translate between a union of Records and a
        // Record of unions, so we have to cast here

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        library.data as Record<string, ItemOf<L>>,
    );
    for (const item of libraryItems) {
        for (const key of Object.keys(item)) {
            collectedItemFields.add(key);
        }
        let tagsMixin: { tags?: string };
        if ('tags' in item && safeIsArray(item.tags)) {
            tagsMixin = {
                tags: item.tags.join(','),
            };
        } else {
            tagsMixin = {};
        }
        csvData.push({
            ...omit(item, 'tags'),
            ...tagsMixin,
        });
    }

    const columnNames: string[] = [];
    // Columns which we want to put first
    for (const col of ['tag', 'name', 'tags']) {
        if (collectedItemFields.delete(col)) {
            columnNames.push(col);
        }
    }
    // The rest
    for (const col of collectedItemFields) {
        columnNames.push(col);
    }

    return { columnNames, csvData };
}

export function writeCsv(library: Library): string {
    const { columnNames, csvData } = prepareForCsv(library);
    const csvString = csvStringify(csvData, {
        columns: columnNames,
        header: true,
        cast: {
            boolean: (bool) => (bool ? 'true' : 'false'),
        },
    });
    return csvString;
}

export function readCsv(csv: string): Record<string, unknown> {
    const raw: unknown = csvParse(csv, { columns: true });
    const partialSchema = z.array(
        z
            .object({
                tag: z.string(),
                tags: z.string().optional(),
            })
            .passthrough(),
    );
    const partiallyValidated = partialSchema.parse(raw);
    const records = partiallyValidated.map((record) => {
        if (record.tags !== undefined) {
            return {
                ...record,
                tags: [record.tags],
            };
        } else {
            return record;
        }
    });
    const entries = records.map((record): [string, unknown] => [record.tag, record]);
    return Object.fromEntries<unknown>(entries);
}

export function writeJson(library: Library) {
    return JSON.stringify(library);
}

export function readJson(json: string): Record<string, unknown> {
    const raw: unknown = JSON.parse(json);
    const dataSchema = z.object({
        data: z.record(z.unknown()),
    });
    return dataSchema.parse(raw).data;
}
