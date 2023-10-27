import fc from 'fast-check';
import { Month } from '../../src/model/enums/month';

export function arbMonthly<T>(inner: fc.Arbitrary<T>): fc.Arbitrary<(m: Month) => T> {
  return (
    fc
      .array(inner, { minLength: Month.all.length, maxLength: Month.all.length })
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      .map((values) => monthly(values as MonthlyTuple<T>))
  );
}

type MonthlyTuple<T> = [T, T, T, T, T, T, T, T, T, T, T, T];

export function monthly<T>(values: MonthlyTuple<T>): (m: Month) => T {
  function monthlyInner(m: Month) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return values[m.index0]!;
  }
  Object.defineProperty(monthlyInner, fc.toStringMethod, {
    value: () => `monthly([${values.map((value) => fc.stringify(value)).join(', ')}])`,
  });
  return monthlyInner;
}
