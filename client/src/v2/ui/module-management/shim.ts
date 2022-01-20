/* eslint-disable
    @typescript-eslint/consistent-type-assertions,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unsafe-member-access,
*/
export const externals = () => ({
    data: (window as any).data as unknown,
    update: (window as any).update as () => void,
});
