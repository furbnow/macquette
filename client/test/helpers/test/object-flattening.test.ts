import { flatten } from '../object-flattening';

describe('object flattening', () => {
  test('empty object', () => {
    expect(flatten({})).toEqual(new Map([]));
  });

  test('flat object', () => {
    expect(
      flatten({
        hello: null,
        world: 42,
      }),
    ).toEqual(
      new Map([
        ['hello', null],
        ['world', 42],
      ]),
    );
  });

  test('nested object', () => {
    expect(
      flatten({
        hello: null,
        world: {
          foo: 'bar',
          baz: undefined,
        },
      }),
    ).toEqual(
      new Map([
        ['hello', null],
        ['world.foo', 'bar'],
        ['world.baz', undefined],
      ]),
    );
  });

  test('object with nested array', () => {
    expect(
      flatten({
        hello: null,
        world: [{ foo: 'bar' }, { foo: 'baz' }],
      }),
    ).toEqual(
      new Map([
        ['hello', null],
        ['world.0.foo', 'bar'],
        ['world.1.foo', 'baz'],
      ]),
    );
  });
});
