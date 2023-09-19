/*
 * Vincenty Inverse Solution of Geodesics on the Ellipsoid
 * (c) Chris Veness 2005-2012, MIT Licence
 * from www.movable-type.co.uk/scripts/latlong-vincenty.html
 *
 * Distances & bearings between points calculated on an ellipsoidal earth model usin
 * ‘direct and inverse solutions of geodesics on the ellipsoid’ devised by Thaddeus
 * Vincenty.
 *
 * From: T Vincenty, "Direct and Inverse Solutions of Geodesics on the Ellipsoid
 * with application of nested equations", Survey Review, vol XXIII no 176, 1975.
 * www.ngs.noaa.gov/PUBS_LIB/inverse.pdf.
 */

function toRadians(val: number): number {
    return (val * Math.PI) / 180;
}

export function distance(from: [number, number], to: [number, number]): number {
    const phi1 = toRadians(from[0]);
    const lambda1 = toRadians(from[1]);
    const phi2 = toRadians(to[0]);
    const lambda2 = toRadians(to[1]);

    const wgs84 = {
        a: 6378137,
        b: 6356752.314245,
        f: 1 / 298.257223563,
    };
    const { a, b, f } = wgs84;

    // L = difference in longitude, U = reduced latitude, defined by tan U = (1-f)·tanφ.
    const L = lambda2 - lambda1;
    const tanU1 = (1 - f) * Math.tan(phi1),
        cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1),
        sinU1 = tanU1 * cosU1;
    const tanU2 = (1 - f) * Math.tan(phi2),
        cosU2 = 1 / Math.sqrt(1 + tanU2 * tanU2),
        sinU2 = tanU2 * cosU2;

    const antipodal = Math.abs(L) > Math.PI / 2 || Math.abs(phi2 - phi1) > Math.PI / 2;

    let lambda = L,
        sinLambda = null,
        cosLambda = null; // λ = difference in longitude on an auxiliary sphere
    let sigma = antipodal ? Math.PI : 0,
        sinSigma = 0,
        cosSigma = antipodal ? -1 : 1,
        sinSqσ = null; // σ = angular distance P₁ P₂ on the sphere
    let cos2AlphaMid = 1; // σₘ = angular distance on the sphere from the equator to the midpoint of the line
    let cosSqAlpha = 1; // α = azimuth of the geodesic at the equator

    let lambdaPrime = null,
        iterations = 0;
    do {
        sinLambda = Math.sin(lambda);
        cosLambda = Math.cos(lambda);
        sinSqσ =
            (cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2;
        if (Math.abs(sinSqσ) < 1e-24) break; // co-incident/antipodal points (σ < ≈0.006mm)
        sinSigma = Math.sqrt(sinSqσ);
        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
        sigma = Math.atan2(sinSigma, cosSigma);
        const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
        cosSqAlpha = 1 - sinAlpha * sinAlpha;
        cos2AlphaMid = cosSqAlpha !== 0 ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0; // on equatorial line cos²α = 0 (§6)
        const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        lambdaPrime = lambda;
        lambda =
            L +
            (1 - C) *
                f *
                sinAlpha *
                (sigma +
                    C *
                        sinSigma *
                        (cos2AlphaMid +
                            C * cosSigma * (-1 + 2 * cos2AlphaMid * cos2AlphaMid)));
        const iterationCheck = antipodal ? Math.abs(lambda) - Math.PI : Math.abs(lambda);
        if (iterationCheck > Math.PI) {
            throw new EvalError('λ > π');
        }
    } while (Math.abs(lambda - lambdaPrime) > 1e-12 && ++iterations < 1000); // TV: 'iterate until negligible change in λ' (≈0.006mm)

    if (iterations >= 1000) throw new EvalError('Vincenty formula failed to converge');

    const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
    const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    const deltaSigma =
        B *
        sinSigma *
        (cos2AlphaMid +
            (B / 4) *
                (cosSigma * (-1 + 2 * cos2AlphaMid * cos2AlphaMid) -
                    (B / 6) *
                        cos2AlphaMid *
                        (-3 + 4 * sinSigma * sinSigma) *
                        (-3 + 4 * cos2AlphaMid * cos2AlphaMid)));

    return b * A * (sigma - deltaSigma);
}
