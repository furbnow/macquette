import { useState } from 'react';

export default function useExternalState<T>(propVal: T): [T, T, (val: T) => void] {
    // External state might not be the best phrase to use for this concept.
    //
    // The idea is that we need a form of state-holding that can react to changes in our
    // data outside the React view.  If you just use useState() then when a new prop
    // comes into your function from the outside, it gets ignored.  And sometimes this
    // is right.  But in our case we have data that gets recalculated outside of the
    // Reacty portion of the code and we need the right updates to percolate into our
    // code.
    //
    // So we have three values: the prop value, the current value and the monitor value:
    //
    // * The prop value is what is passed to us.  This is only changed when we are
    //   passed a new value from whatever is telling React to render us.
    // * The current value is the updatable value.  If you have a text field, this is
    //   what we modify in onChange.
    // * The monitor value is the third value we use to see what kind of change is
    //   happening.  If it's the not same as the current value, we know that the user is
    //   editing our state and we should ignore any changes to the prop value.  But if
    //   it's the same as our current value and the prop value changes, we treat this
    //   as an update from on high.
    //
    // Happily this is all abstractable within this function and it doesn't have to leak
    // outside of it.

    const [currentVal, setCurrentVal] = useState(propVal);
    const [monitorVal, setMonitorVal] = useState(propVal);

    if (propVal === currentVal && propVal !== monitorVal) {
        setMonitorVal(propVal);
    } else if (propVal !== currentVal && currentVal === monitorVal) {
        setCurrentVal(propVal);
        setMonitorVal(propVal);
    }

    return [currentVal, monitorVal, setCurrentVal];
}
