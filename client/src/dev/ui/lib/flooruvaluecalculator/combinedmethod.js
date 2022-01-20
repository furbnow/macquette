function sumArray(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

function calcRUpper(bridged, notbridged) {
    const R1 = sumArray(notbridged) + bridged.R_M1;
    const R2 = sumArray(notbridged) + bridged.R_M2;
    return (bridged.F1 / R1 + bridged.F2 / R2) ** -1;
}

function calcRLower(bridged, notbridged) {
    return sumArray(notbridged) + (bridged.F1 / bridged.R_M1 + bridged.F2 / bridged.R_M2) ** -1;
}

export default function calcCombined(layer_resistances) {
    const Rupper = calcRUpper(layer_resistances.bridged, layer_resistances.notbridged);
    const Rlower = calcRLower(layer_resistances.bridged, layer_resistances.notbridged);
    return 2 / (Rupper + Rlower);
}
