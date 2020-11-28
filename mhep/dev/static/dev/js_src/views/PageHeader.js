import React, { useState } from "react";
import House from "../components/House";
import TargetBars from "../components/TargetBars";

const fmtPrice = (price) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(price);

export default function PageHeader({ house, targets, costIn, callback }) {
    const [title, setTitle] = useState("");
    const [showHouse, setShowHouse] = useState(true);
    const [houseState, setHouseState] = useState(house);
    const [targetState, setTargetState] = useState(targets);
    const [cost, setCost] = useState(costIn);

    callback({ setTitle, setShowHouse, setHouseState, setTargetState, setCost });

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between pb-30">
                <h2 className="ma-0">{title}</h2>
                <button onClick={() => setShowHouse(!showHouse)} className="btn">
                    {showHouse ? "Hide graphics" : "Show graphics"}
                </button>
            </div>
            {showHouse ? (
                <div className="d-flex align-items-center justify-content-between pb-30">
                    <div className="mr-30">
                        <House {...houseState} />
                        {cost ? <div>Measures cost: {fmtPrice(cost)}</div> : null}
                    </div>

                    <div id="targetbars" style={{ width: "45%", flexShrink: 0 }}>
                        <TargetBars {...targetState} />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
