import React, { useState } from 'react';
import Graphics from '../components/Graphics';

export default function PageHeader({
    title = '',
    totalLock,
    showGraphics,
    houseData,
    targetData,
    cost,
}) {
    const [showHouse, setShowHouse] = useState(true);

    return (
        <div>
            {totalLock ? (
                <div className="locked-warning">
                    <h3>The assessment is locked!</h3>
                    <p>Your changes won&apos;t be saved.</p>
                    <p>
                        To unlock the assessment change the status from
                        &quot;Complete&quot; to &quot;In progress&quot;.
                    </p>
                </div>
            ) : null}
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
