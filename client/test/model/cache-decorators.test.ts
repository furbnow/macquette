import fc from 'fast-check';

import { cache, cacheMonth } from '../../src/helpers/cache-decorators';
import { Month } from '../../src/model/enums/month';

describe('@cache* decorators', () => {
  describe('@cache', () => {
    it('does not invoke the inner method on cache hit', () => {
      let getterCalls = 0;
      class Foo {
        @cache
        get foo() {
          getterCalls += 1;
          if (getterCalls > 1) {
            throw new Error('called more than once!');
          } else {
            return 'some value';
          }
        }
      }
      const foo = new Foo();
      foo.foo;
      foo.foo;
      expect(getterCalls).toBe(1);
    });

    it('does not persist the cache between instances', () => {
      class Foo {
        constructor(private toReturn: unknown) {}
        @cache
        get foo() {
          return this.toReturn;
        }
      }
      const foo1 = new Foo(1);
      const foo2 = new Foo('hello');
      foo1.foo;
      expect(foo2.foo).toBe('hello');
    });
  });

  describe('@cacheMonth', () => {
    const arbMonth = fc.constantFrom(...Month.all);
    it('passes the month to the inner method', () => {
      class Foo {
        @cacheMonth
        foo(month: Month) {
          return month.index0;
        }
      }
      fc.assert(
        fc.property(arbMonth, (month) => {
          const foo = new Foo();
          expect(foo.foo(month)).toBe(month.index0);
        }),
      );
    });

    it('does not invoke the inner method on cache hit and returns the correct value', () => {
      class Foo {
        public methodInvocations = 0;
        @cacheMonth
        foo(month: Month) {
          this.methodInvocations += 1;
          return month.index0;
        }
      }
      fc.assert(
        fc.property(arbMonth, (month) => {
          const foo = new Foo();
          expect(foo.foo(month)).toBe(month.index0);
          expect(foo.foo(month)).toBe(month.index0);
          expect(foo.methodInvocations).toBe(1);
        }),
      );
    });

    it('does not persist the cache between instances', () => {
      class Foo {
        constructor(private offset: number) {}
        @cacheMonth
        foo(month: Month) {
          return month.index0 + this.offset;
        }
      }
      fc.assert(
        fc.property(arbMonth, (month) => {
          const foo1 = new Foo(1);
          const foo2 = new Foo(2);
          foo1.foo(month);
          expect(foo2.foo(month)).toBe(month.index0 + 2);
        }),
      );
    });
  });
});
