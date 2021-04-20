import React from 'react';

import { Library } from '../types/Library';

interface AppContextInterface {
    update: () => void;
    libraries: Library[];
}

export const AppContext = React.createContext<AppContextInterface>({
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    update: () => {},
    libraries: [],
});
