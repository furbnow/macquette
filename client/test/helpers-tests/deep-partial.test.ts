import { DeepPartial, DeepWith } from '../../src/helpers/safe-merge';

describe('DeepPartial and DeepWith', () => {
  // Type-level tests
  /* eslint-disable jest/expect-expect, @typescript-eslint/no-unused-vars */
  test('ES6 classes are treated like a primitive by DeepPartial', () => {
    class SomeClass {
      stringProp = '';
    }
    type SomeStruct = {
      foo: string;
      bar: SomeClass;
    };
    type DeepPartialStruct = DeepPartial<SomeStruct>;
    type StringPropToTest = Exclude<DeepPartialStruct['bar'], undefined>['stringProp'];
    type Test = StringPropToTest extends string ? 'passed' : 'failed';
    const test: Test = 'passed';
  });

  it('ES6 classes are treated like a primitive by DeepWith', () => {
    class SomeClass {
      stringProp = '';
    }
    type SomeStruct = {
      foo: string;
      bar: SomeClass;
      baz: {
        quux: number;
      };
    };
    type StructDeepWithNull = DeepWith<null, SomeStruct>;
    type StringPropToTest = Exclude<
      Exclude<StructDeepWithNull, null>['bar'],
      null
    >['stringProp'];
    type Test = StringPropToTest extends string ? 'passed' : 'failed';
    const test: Test = 'passed';
  });
  /* eslint-enable */
});
