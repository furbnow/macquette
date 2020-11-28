import React from "react";
import { render } from "react-dom";

import Commentary from "./views/Commentary";
import PageHeader from "./views/PageHeader";

window.Macquette = {
    views: {
        Commentary,
        PageHeader,
    },
    components: {
    },
    render: (view, props, root) =>
        render(
            React.createElement(view, props),
            root || document.getElementById("content")
        ),
};
