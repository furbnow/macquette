import { cache } from '../../helpers/cacheGetter';
import { sum } from '../../helpers/sum';
import { zip } from '../../helpers/zip';
import { LegacyScenario } from '../../legacy-state-validators/scenario';

type FloorsInput = {
    floors: Array<FloorSpec>;
};

export const extractFloorsInputFromLegacy = ({ floors }: LegacyScenario): FloorsInput => {
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
