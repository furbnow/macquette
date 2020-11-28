import React, { useState } from "react";
import Graphics from "../components/Graphics";

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
                <Graphics houseData={houseState} targetData={targetState} cost={cost} />
            ) : null}
        </div>
    );
}
