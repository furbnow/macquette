/**
* Downloads a CSV file
* @param {string} csv - a multiline string of csv data
* @param {string} filename
*/
export default function downloadCSV(csv, filename = "untitled.csv") {
    const downloadData = new Blob([csv], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(downloadData);
    downloadLink.setAttribute('download', filename);
    downloadLink.click();
}
