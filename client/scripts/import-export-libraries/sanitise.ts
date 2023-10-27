import assert from 'assert';
import { cloneDeep, mapValues } from 'lodash';
import { safeIsArray } from '../../src/helpers/safe-is-array';

import { Library } from '../../src/data-schemas/libraries';
import type { ItemOf, LibraryItem } from './types';

function sanitiseItem<Item extends LibraryItem>(item: Item, name: string): Item {
  const out = cloneDeep(item);
  if ('description' in out && typeof out.description === 'string') {
    out.description = out.description.replace(/"+$/, '').trim();
    if (out.description === 'undefined') {
      out.description = '';
    }
  }
  if ('name' in out && out.name !== undefined) {
    out.name = out.name.replace(/"+$/, '').trim();
  }
  if ('source' in out && out.source !== undefined) {
    if (out.source === 'undefined' || out.source === '--') {
      out.source = '';
    }
  }
  if (out.tag === undefined) {
    out.tag = name;
  }
  if ('tags' in out) {
    assert(safeIsArray(out.tags));
    const newTags = out.tags.flatMap((t) => (typeof t !== 'string' ? [] : [t]));
    newTags.forEach((tag) => assert(tag.indexOf(',') === -1));
    out.tags = newTags;
  }
  assert(out.tag === name);
  return out;
}

export function sanitiseLibrary<L extends Library>(library: L): L {
  const newData = mapValues<L['data'], ItemOf<L>>(library.data, sanitiseItem);
  const outLibrary = {
    ...library,
    data: newData,
  };
  return outLibrary;
}
