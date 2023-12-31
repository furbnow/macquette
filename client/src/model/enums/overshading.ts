import { cache } from '../../helpers/cache-decorators';
import { ModelError } from '../error';

/** Enum class for SAP window overshading with conversion to and from 0-based indexing */
export class Overshading {
  public static readonly names = ['>80%', '60-80%', '20-60%', '<20%'] as const;

  public static readonly all = Overshading.names.map((name) => new Overshading(name));

  constructor(public name: OvershadingName) {}

  /** @deprecated Prefer optionalFromIndex0 */
  public static fromIndex0(index0: number) {
    const toReturn = Overshading.optionalFromIndex0(index0);
    if (toReturn === null) {
      throw new ModelError('Provided overshading index was out of bounds', {
        index0,
      });
    }
    return toReturn;
  }

  public static optionalFromIndex0(index0: number): Overshading | null {
    const name = Overshading.names[index0];
    if (name === undefined) {
      return null;
    } else {
      return new Overshading(name);
    }
  }

  @cache
  get index0(): number {
    return Overshading.names.indexOf(this.name);
  }

  @cache
  get display(): string {
    switch (this.name) {
      case '>80%':
        return 'Heavy: more than 80%';
      case '60-80%':
        return 'Significant: 60% - 80%';
      case '20-60%':
        return 'Modest: 20% - 60%';
      case '<20%':
        return 'None or very little: less than 20%';
    }
  }
}

const arrayNames = [...Overshading.names];
export type OvershadingName = typeof arrayNames extends Array<infer N> ? N : never;
