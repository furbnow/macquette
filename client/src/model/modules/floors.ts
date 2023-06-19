import { Scenario } from '../../data-schemas/scenario';
import { coalesceEmptyString } from '../../data-schemas/scenario/value-schemas';
import { sum } from '../../helpers/array-reducers';
import { cache } from '../../helpers/cache-decorators';
import { zip } from '../../helpers/zip';

export type FloorsInput = {
    floors: Array<FloorSpec>;
};

export function extractFloorsInputFromLegacy(scenario: Scenario): FloorsInput {
    const { floors } = scenario ?? {};
    return {
        floors:
            floors?.map(({ area, height, ...rest }) => ({
                area: coalesceEmptyString(area, 0),
                height: coalesceEmptyString(height, 0),
                ...rest,
            })) ?? [],
    };
}

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

    @cache
    get numberOfFloors(): number {
        return this.floors.length;
    }

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-assignment,
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
            if (legacyFloor.area === '') {
                legacyStrings = true;
            }
        }
        let out_TFA: string | number;
        if (legacyStrings) {
            out_TFA = this.totalFloorArea.toString(10);
        } else {
            out_TFA = this.totalFloorArea;
        }
        data.volume = this.totalVolume;
        data.TFA = out_TFA;
        data.num_of_floors = this.floors.length;
    }
    /* eslint-enable */
}
