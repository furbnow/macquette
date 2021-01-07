import React from "react";
import { render, unmountComponentAtNode } from "react-dom";

import Assessment from "./Assessment";

import Commentary from "./views/Commentary";
import PageHeader from "./views/PageHeader";
import SolarHotWater from "./views/SolarHotWater";

import TargetBar from "./components/TargetBar";
import Graphics from "./components/Graphics";

window.Macquette = {
    Assessment,
    views: {
        Commentary,
        PageHeader,
        SolarHotWater,
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
    unmount: (element) => unmountComponentAtNode(element)
};
