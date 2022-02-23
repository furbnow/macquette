import { cache } from '../../helpers/cache-decorators';
import { ModelError } from '../error';

export type OrientationName = typeof Orientation.names extends Array<infer N> ? N : never;

/** Enum class for SAP window orientations with conversion to and from 0-based indexing */
export class Orientation {
    public static readonly names = [
        ...(['North', 'NE/NW', 'East/West', 'SE/SW', 'South'] as const),
    ];

    public static readonly all = Orientation.names.map((name) => new Orientation(name));

    constructor(public name: OrientationName) {}

    public static fromIndex0(index0: number) {
        const name = Orientation.names[index0];
        if (name === undefined) {
            throw new ModelError('Provided orientation index was out of bounds', {
                index0,
            });
        } else {
            return new Orientation(name);
        }
    }

    @cache
    get index0(): number {
        return Orientation.names.indexOf(this.name);
    }
}
