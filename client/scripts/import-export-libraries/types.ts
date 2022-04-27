import { Library } from '../../src/v2/data-schemas/libraries';

export type LibraryItem = ItemOf<Library>;
export type ItemOf<L extends Library> = L['data'][keyof L['data']];
export type LibraryWithSubtype = Library & { subtype?: string };
