import { cache } from '../../helpers/cache-decorators';
import { ModelError } from '../error';

export type MonthName = typeof Month.names extends Array<infer N> ? N : never;

/** Enum class for months with conversion to and from 0-based and 1-based indexing */
export class Month {
  public static readonly names = [
    ...([
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ] as const),
  ];

  public static readonly all = Month.names.map((name) => new Month(name));

  constructor(public name: MonthName) {}

  public static fromIndex0(index0: number): Month {
    const name = Month.names[index0];
    if (name === undefined) {
      throw new ModelError('Month index out of bounds', { index0 });
    }
    return new Month(name);
  }

  public static fromIndex1(index1: number): Month {
    const name = Month.names[index1 - 1];
    if (name === undefined) {
      throw new ModelError('Month index out of bounds', { index1 });
    }
    return new Month(name);
  }

  @cache
  get index0(): number {
    return Month.names.indexOf(this.name);
  }

  get index1(): number {
    return this.index0 + 1;
  }

  get days(): number {
    switch (this.name) {
      case 'September':
      case 'April':
      case 'June':
      case 'November':
        return 30;
      case 'February':
        return 28; // SAP ignores leap years
      default:
        return 31;
    }
  }

  get season(): 'summer' | 'winter' {
    return this.index0 >= JUNE.index0 && this.index0 <= SEPTEMBER.index0
      ? 'summer'
      : 'winter';
  }
}

const JUNE = new Month('June');
const SEPTEMBER = new Month('September');
