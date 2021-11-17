import * as z from 'zod';
import { cache } from '../../helpers/cacheGetter';
import { sum } from '../../helpers/sum';
import { zip } from '../../helpers/zip';

type FloorsInput = {
    floors: Array<FloorSpec>;
};

const legacyInputSchema = z.object({
    floors: z
        .array(
            z.object({
                area: z.union([z.number(), z.literal('').transform(() => 0)]),
                height: z.union([z.number(), z.literal('').transform(() => 0)]),
                name: z.string(),
            }),
        )
        .optional(),
});
export const extractFloorsInputFromLegacy = (
    data: Record<string, unknown>,
): FloorsInput => {
    const { floors } = legacyInputSchema.parse(data);
    return { floors: floors ?? [] };
};

type FloorSpec = { area: number; height: number; name: string };

export class Floor {
    constructor(public spec: FloorSpec) {}

    get volume(): number {
        return this.spec.area * this.spec.height;
    }
}

export class Floors {
    private floors: Array<Floor>;

    constructor(readonly input: FloorsInput) {
        this.floors = input.floors.map((floorSpec) => new Floor(floorSpec));
    }

    @cache
    get totalFloorArea(): number {
        return sum(this.floors.map((f) => f.spec.area));
    }

    @cache
    get totalVolume(): number {
        return sum(this.floors.map((f) => f.volume));
    }

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
    mutateLegacyData(data: any) {
        if (data.floors === undefined) {
            data.floors = [];
        }
        let legacyStrings = false;
        for (const [newStyleFloor, legacyFloor] of zip(
            this.floors,
            data.floors as any[],
        )) {
            legacyFloor.volume = newStyleFloor.volume;
            if (legacyFloor.height === '') {
                legacyStrings = true;
            }
        }
        data.volume = this.totalVolume;
        data.TFA = legacyStrings && this.totalFloorArea === 0 ? '0' : this.totalFloorArea;
        data.num_of_floors = this.floors.length;
    }
    /* eslint-enable */
}
