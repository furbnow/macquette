/** Unions all elements of a tuple type */
export type TupleUnion<T extends readonly unknown[]> = T extends readonly [
  infer First,
  ...infer Rest,
]
  ? First | TupleUnion<Rest>
  : never;
