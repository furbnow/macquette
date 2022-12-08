import { cache } from '../../helpers/cache-decorators';
import { Result } from '../../helpers/result';
import { regionFromPostcode } from '../datasets/region-lookups';
import { ModelError } from '../error';

export type RegionName = typeof Region.names extends Array<infer N> ? N : never;

/** Enum class for SAP regions with conversion to and from 0-based indexing */
export class Region {
    public static readonly names = [
        ...([
            'UK average',
            'Thames',
            'South East England',
            'Southern England',
            'South West England',
            'Severn Wales / Severn England',
            'Midlands',
            'West Pennines Wales / West Pennines England',
            'North West England / South West Scotland',
            'Borders Scotland / Borders England',
            'North East England',
            'East Pennines',
            'East Anglia',
            'Wales',
            'West Scotland',
            'East Scotland',
            'North East Scotland',
            'Highland',
            'Western Isles',
            'Orkney',
            'Shetland',
            'Northern Ireland',
        ] as const),
    ];

    public static readonly all = Region.names.map((name) => new Region(name));

    constructor(public name: RegionName) {}

    public static fromIndex0(index0: number): Region {
        const name = Region.names[index0];
        if (name === undefined) {
            throw new ModelError('Provided region index was out of bounds', { index0 });
        } else {
            return new Region(name);
        }
    }

    @cache
    get index0(): number {
        return Region.names.indexOf(this.name);
    }

    public static fromPostcode(postcode: string): Result<Region, Error> {
        postcode = postcode.toUpperCase();
        for (const [pattern, region] of regionFromPostcode) {
            if (typeof pattern === 'string') {
                if (postcode.startsWith(pattern)) {
                    return Result.ok(Region.fromIndex0(region));
                }
            } else {
                if (pattern.exec(postcode) !== null) {
                    return Result.ok(Region.fromIndex0(region));
                }
            }
        }
        return Result.err(
            new Error('Failed to find postcode in SAP postcode to region table'),
        );
    }
}
