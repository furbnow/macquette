import React from "react";
import { render } from "react-dom";

import Commentary from "./views/Commentary";
import PageHeader from "./views/PageHeader";

import TargetBar from "./components/TargetBar";
import Graphics from "./components/Graphics";

window.Macquette = {
    views: {
        Commentary,
        PageHeader,
    },
    components: {
        TargetBar,
        Graphics,
    },
    render: (view, props, root) =>
        render(
            React.createElement(view, props),
            root || document.getElementById("content")
        ),
};
