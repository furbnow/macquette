/**
* Performs a sequence of cleaning operations which prepares a 'cell' of csv data for export.
* @summary https://tools.ietf.org/html/rfc4180
* @param {string} csvCell
* @return {string}
*/
export function cleanCSVcell(csvCell) {
    let csvCellCleaned = csvCell
                        .toString()
                        .replace(/\n/g, ``)
                        .replace(/"/g, `""`)
                        .trim();
    if (csvCellCleaned.includes(`,`)) {
        csvCellCleaned = `"${csvCellCleaned}"`;
    }
    return csvCellCleaned;
}


/**
* Converts an array of objects to CSV.
* @param {array} objArray - Array of objects where each object represents a row of csv data.
* @return {string}
*/
export default function convertObjectArrayToCSV(objArray) {
    let csv = '';
    for (let i = 0; i < objArray.length; i++) {
        let row = '';
        for (const col in objArray[i]) {
            if (row != '') {
                row += ',';
            }
            const csvCell = objArray[i][col]
            row += cleanCSVcell(csvCell);
        }
        csv += row + '\r\n';
    }
    return csv;
}
