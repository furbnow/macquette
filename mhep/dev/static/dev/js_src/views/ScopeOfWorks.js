import React from 'react'
import convertObjectArrayToCSV from '../lib/convertObjectArrayToCSV'
import downloadCSV from '../lib/downloadCSV'
import { getMeasures, formatMeasures } from '../lib/measures'

function exportCSV(assessment) {
    const measures = getMeasures(assessment)
    const formatted = formatMeasures(measures)
    const csv = convertObjectArrayToCSV(formatted)
    downloadCSV(csv, 'measures.csv')
}

function ScopeOfWorks({ assessment }) {
    return (
        <section>
            <b>Export Appendix A (Scenario Measures Complete Tables) to CSV format</b>
            <br /><br />
            <button
                className="btn"
                onClick={() => { exportCSV(assessment) }}
            >Export CSV
            </button>
        </section >
    )
}

export default ScopeOfWorks
