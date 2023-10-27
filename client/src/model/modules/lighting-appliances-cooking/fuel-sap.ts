import { TypeOf, t } from '../../../data-schemas/visitable-types';
import { ModelError } from '../../error';

export const fuelInput = t.struct({
  name: t.string(),
  fraction: t.number({ min: 0, max: 1 }),
});
export type FuelInput = TypeOf<typeof fuelInput>;

export class Fuel {
  constructor(
    private input: FuelInput,
    dependencies: { fuels: { names: string[] } },
  ) {
    if (!dependencies.fuels.names.includes(input.name)) {
      throw new ModelError('LAC fuel name must be a valid fuel');
    }
    if (input.fraction < 0 || input.fraction > 1) {
      throw new ModelError('LAC fuel fraction must be between 0 and 1');
    }
  }

  get name(): string {
    return this.input.name;
  }

  get fraction(): number {
    return this.input.fraction;
  }
}
