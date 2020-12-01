import React, { useState } from 'react';
import Graphics from '../components/Graphics';

export default function PageHeader({ title = '', showGraphics, houseData, targetData, cost }) {
    const [showHouse, setShowHouse] = useState(true);

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between pb-30">
                <h2 className="ma-0">{title}</h2>
                {showGraphics ? (
                    <button onClick={() => setShowHouse(!showHouse)} className="btn">
                        {showHouse ? 'Hide graphics' : 'Show graphics'}
                    </button>
                ) : null}
            </div>
            {showGraphics && showHouse ? (
                <Graphics houseData={houseData} targetData={targetData} cost={cost} />
            ) : null}
        </div>
    );
}
