export type Shadow<Base extends object, Overlay extends object> = Overlay &
    Omit<Base, keyof Overlay>;
