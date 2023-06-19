import { Library } from '../../src/data-schemas/libraries';

export type ItemOf<L extends Library> = L['data'][keyof L['data']];
export type LibraryItem = ItemOf<Library>;
export type LibraryWithOptionalId = Library & { id?: string };

export function assertNotNever<T>(val: T): T {
    return val;
}
