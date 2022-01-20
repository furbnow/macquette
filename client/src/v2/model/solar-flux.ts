import {
    solarFluxK,
    latitudeRadians,
    meanGlobalSolarIrradianceHorizontal,
    solarDeclinationRadians,
} from './datasets-shims';
import { Month } from './enums/month';
import { Orientation } from './enums/orientation';
import { Region } from './enums/region';

/// Calculate the solar flux on an inclined surface of unit area, according to
/// SAP Appendix U section U3.2
export const calculateSolarFlux = (
    region: Region,
    orientation: Orientation,
    tiltDegrees: number,
    month: Month,
): number => {
    const radians = (tiltDegrees / 360.0) * 2.0 * Math.PI;
    const sinp = Math.sin(radians / 2.0); // sinp = sin(p/2)
    const sin2p = sinp * sinp;
    const sin3p = sinp * sinp * sinp;
    const A =
        solarFluxK(1, orientation) * sin3p +
        solarFluxK(2, orientation) * sin2p +
        solarFluxK(3, orientation) * sinp;
    const B =
        solarFluxK(4, orientation) * sin3p +
        solarFluxK(5, orientation) * sin2p +
        solarFluxK(6, orientation) * sinp;
    const C =
        solarFluxK(7, orientation) * sin3p +
        solarFluxK(8, orientation) * sin2p +
        solarFluxK(9, orientation) * sinp +
        1;
    const latitude = latitudeRadians(region);
    const solarDeclination = solarDeclinationRadians(month);
    const cos1 = Math.cos(latitude - solarDeclination);
    const cos2 = cos1 * cos1; // cos-squared
    const R_h_inc = A * cos2 + B * cos1 + C;
    const irradiance = meanGlobalSolarIrradianceHorizontal(region, month);
    return irradiance * R_h_inc;
};
