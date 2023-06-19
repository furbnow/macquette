/** Helper function to cast values to booleans

It should only be used to replicate behaviour of legacy code.

@warning JS has a strange understanding of what counts as truthy/falsy

This function is mostly to serve as a cognitive gate to the programmer to make
sure they realise what kind of weirdness they might invite in when writing
`if(isTruthy(someNullableString))`, for example.

MDN has an exhaustive list of truthy and falsy values at
https://developer.mozilla.org/en-US/docs/Glossary/Truthy.
*/
export function isTruthy(input: number | boolean | string | null | undefined): boolean {
    return Boolean(input);
}
