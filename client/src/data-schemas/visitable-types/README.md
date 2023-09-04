# The Visitable Types Framework

(Yes it has a name)

So this is basically a flexible runtime typing framework for TypeScript, that
allows you to write types once and get a number of things for (almost) free,
including:

-   A Zod schema
-   A form input state type (including nullable fields, etc.)
-   A fast-check Arbitrary
-   Whatever other runtime or compile-time thing you want

## The problem this solves

With Zod, fast-check, etc., you have to write each type once per typing
framework. This means that you have to write `O(n*m)` types (where n is the number
of types, and m is the number of frameworks), and it also means you have to
keep them all in sync by hand across the frameworks, or write compile-time
assignability tests.

This allows you to write each type once, in this framework, and transform it
into an equivalent type in an arbitrary framework. (This makes the task of
writing types `O(n+m)` instead.)

## Usage

### Writing a visitable type

```ts
const myLovelyType = t.struct({
    foo: t.number(),
    bar: t.string(),
});
```

It works like Zod, or fast-check.

### Getting a Zod schema, form input state type, etc.

```ts
const schema = makeZodSchema(visitableType);
```

There are equivalent functions for Arbitraries and form state types.

### Writing a new transform

Due to some limitations of TypeScript, you will have to write a runtime
transform (a visitor) and a compile-time transform (a large type expression)
separately, and then cast them together at the end. Also, the runtime
transforms require lots of `any` types to make things work, so you should rely
on extensive testing.

See the "dummy visitor" in the tests for an example, or look at one of
the existing transforms in this directory.
