// For some reason ESLint can't resolve this import
// eslint-disable-next-line import/no-unresolved
import { stringify as csvStringify } from 'csv-stringify/sync';
import { omit } from 'lodash';

import { Library } from '../../src/v2/data-schemas/libraries';
import { SanitisedLibrary } from './sanitise';
import { ItemOf, LibraryItem } from './types';

type CsvRow = Omit<LibraryItem, 'tags'> & {
    tags?: string | null;
};

function prepareForCsv<L extends Library>(
    library: SanitisedLibrary<L>,
): {
    columnNames: string[];
    csvData: CsvRow[];
} {
    const collectedItemFields: Set<string> = new Set();
    const csvData: CsvRow[] = [];
    const libraryData: Record<string, ItemOf<L>> = library.data;
    for (const item of Object.values(libraryData)) {
        for (const key of Object.keys(item)) {
            collectedItemFields.add(key);
        }
        let tagsMixin: { tags?: string };
        if ('tags' in item && item.tags !== undefined) {
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

export function getCsv(library: SanitisedLibrary<Library>) {
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

export function getJson(library: SanitisedLibrary<Library>) {
    return JSON.stringify(library);
}
