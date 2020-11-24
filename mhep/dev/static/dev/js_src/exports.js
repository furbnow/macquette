import React from "react";
import { render } from "react-dom";

import Commentary from "./views/Commentary";
import House from "./components/House";

window.Macquette = {
    views: {
        Commentary,
    },
    components: {
        House,
    },
    render: (view, props, root) =>
        render(
            React.createElement(view, props),
            root || document.getElementById("content")
        ),
};
