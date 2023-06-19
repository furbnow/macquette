import { cache } from '../../helpers/cache-decorators';
import { ModelError } from '../error';

/** Enum class for SAP window orientations with conversion to and from 0-based indexing */
export class Orientation {
    public static readonly names = [
        'North',
        'NE/NW',
        'East/West',
        'SE/SW',
        'South',
    ] as const;

    public static readonly all = Orientation.names.map((name) => new Orientation(name));

    constructor(public name: OrientationName) {}

    /** @deprecated Prefer optionalFromIndex0 */
    public static fromIndex0(index0: number): Orientation {
        const toReturn = Orientation.optionalFromIndex0(index0);
        if (toReturn === null) {
            throw new ModelError('Provided orientation index was out of bounds', {
                index0,
            });
        }
        return toReturn;
    }

    public static optionalFromIndex0(index0: number): Orientation | null {
        const name = Orientation.names[index0];
        if (name === undefined) {
            return null;
        } else {
            return new Orientation(name);
        }
    }

    @cache
    get index0(): number {
        return Orientation.names.indexOf(this.name);
    }
}

const arrayNames = [...Orientation.names];
export type OrientationName = typeof arrayNames extends Array<infer N> ? N : never;
