import { Scenario } from '../../data-schemas/scenario';
import { cache } from '../../helpers/cache-decorators';
import { ModelError } from '../error';

export type OccupancyInput = {
    customOccupancy: number | null;
};

export const extractOccupancyInputFromLegacy = ({
    use_custom_occupancy,
    custom_occupancy,
}: Scenario): OccupancyInput => {
    if (use_custom_occupancy === true) {
        if (custom_occupancy === undefined || custom_occupancy === '') {
            throw new ModelError(
                'Data specified use_custom_occupancy = true but provided custom_occupancy was invalid',
                { use_custom_occupancy, custom_occupancy },
            );
        }
        return {
            customOccupancy: custom_occupancy,
        };
    } else {
        return {
            customOccupancy: null,
        };
    }
};

type OccupancyDependencies = {
    floors: { totalFloorArea: number };
};

export class Occupancy {
    constructor(
        private input: OccupancyInput,
        private dependencies: OccupancyDependencies,
    ) {}

    @cache
    get occupancy(): number {
        if (this.input.customOccupancy === null) {
            const { totalFloorArea } = this.dependencies.floors;
            // SAP worksheet section 4
            if (totalFloorArea > 13.9) {
                return (
                    1 +
                    1.76 *
                        (1 - Math.exp(-0.000349 * Math.pow(totalFloorArea - 13.9, 2))) +
                    0.0013 * (totalFloorArea - 13.9)
                );
            } else {
                return 1;
            }
        } else {
            return this.input.customOccupancy;
        }
    }

    @cache
    get occupancySource(): 'custom' | 'estimate' {
        if (this.input.customOccupancy === null) {
            return 'estimate';
        } else {
            return 'custom';
        }
    }

    /* eslint-disable
       @typescript-eslint/no-explicit-any,
       @typescript-eslint/no-unsafe-argument,
       @typescript-eslint/no-unsafe-member-access,
       @typescript-eslint/consistent-type-assertions,
    */
    mutateLegacyData(data: any) {
        if (data.custom_occupancy === undefined) {
            data.custom_occupancy = 1;
        }
        if (data.use_custom_occupancy === undefined) {
            data.use_custom_occupancy = this.occupancySource === 'custom';
        }
        data.occupancy = this.occupancy;
    }
    /* eslint-enable */
}
