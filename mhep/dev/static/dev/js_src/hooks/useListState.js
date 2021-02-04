import { useState } from 'react';

export default function useListState(initial) {
    let [list, setState] = useState(initial);

    return [
        list,
        (item, present) => {
            if (present && !list.includes(item)) {
                setState([item, ...list]);
            } else if (!present && list.includes(item)) {
                setState(list.filter((entry) => entry !== item));
            }
        },
    ];
}
