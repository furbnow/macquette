import assert from 'assert';
import { cloneDeep, mapValues } from 'lodash';

import { Library } from '../../src/v2/data-schemas/libraries';
import { Shadow } from '../../src/v2/helpers/shadow-object-type';
import type { ItemOf, LibraryItem } from './types';

type SanitisedItem<Item> = Item extends { tags?: (string | null)[] | undefined }
    ? Item & { tags?: string[] }
    : Item;

function sanitiseItem<Item extends LibraryItem>(
    item: Item,
    name: string,
): SanitisedItem<Item> {
    const out = cloneDeep(item);
    if ('description' in out) {
        out.description = out.description.replace(/"+$/, '').trim();
        if (out.description === 'undefined') {
            out.description = '';
        }
    }
    if (out.tag === undefined) {
        out.tag = name;
    }
    if ('tags' in out) {
        assert(out.tags !== undefined);
        const newTags = out.tags.flatMap((t) => (t === null ? [] : [t]));
        newTags.forEach((tag) => assert(tag.indexOf(',') === -1));
        out.tags = newTags;
    }
    assert(out.tag === name);
    // SAFETY: types checked by assertions in this function
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return out as SanitisedItem<Item>;
}

export type SanitisedLibrary<L extends Library> = Shadow<
    L,
    {
        data: Record<string, SanitisedItem<ItemOf<L>>>;
    }
>;
export function sanitiseLibrary<L extends Library>(library: L): SanitisedLibrary<L> {
    const newData = mapValues<L['data'], SanitisedItem<ItemOf<L>>>(
        library.data,
        sanitiseItem,
    );
    const outLibrary = {
        ...library,
        data: newData,
    };
    return outLibrary;
}
