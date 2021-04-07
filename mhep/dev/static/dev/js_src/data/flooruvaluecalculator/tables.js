// Tables C1 - C5: https://gitlab.com/carboncoop/macquette/uploads/be22b5aa2b7106d41439b3dece5ffba6/FLOOR_U-VALUE_TABLES.pdf

export const C1 = {
    description: 'U-values for solid ground floors',
    matrix: [
        [0.13, 0.11, 0.1, 0.09, 0.08],
        [0.22, 0.18, 0.16, 0.14, 0.13],
        [0.3, 0.24, 0.21, 0.18, 0.17],
        [0.37, 0.29, 0.25, 0.22, 0.19],
        [0.44, 0.34, 0.28, 0.24, 0.22],
        [0.49, 0.38, 0.31, 0.27, 0.23],
        [0.55, 0.41, 0.34, 0.29, 0.25],
        [0.6, 0.44, 0.36, 0.3, 0.26],
        [0.65, 0.47, 0.38, 0.32, 0.27],
        [0.7, 0.5, 0.4, 0.33, 0.28],
        [0.74, 0.52, 0.41, 0.34, 0.28],
        [0.78, 0.55, 0.43, 0.35, 0.29],
        [0.82, 0.57, 0.44, 0.35, 0.3],
        [0.86, 0.59, 0.45, 0.36, 0.3],
        [0.89, 0.61, 0.46, 0.37, 0.31],
        [0.93, 0.62, 0.47, 0.37, 0.32],
        [0.96, 0.64, 0.47, 0.38, 0.32],
        [0.99, 0.65, 0.48, 0.39, 0.32],
        [1.02, 0.66, 0.49, 0.39, 0.33],
        [1.05, 0.68, 0.5, 0.4, 0.33],
    ],
    //X: Thermal resistance of all-over insulation
    X: [0, 0.5, 1, 1.5, 2],
    //Y: perimeter/area
    Y: [
        0.05,
        0.1,
        0.15,
        0.2,
        0.25,
        0.3,
        0.35,
        0.4,
        0.45,
        0.5,
        0.55,
        0.6,
        0.65,
        0.7,
        0.75,
        0.8,
        0.85,
        0.9,
        0.95,
        1,
    ],
};

export const C2 = {
    description: 'Edge insulation factor for horizontal edge insulation',
    matrix: [
        [0.13, 0.18, 0.21, 0.22],
        [0.2, 0.27, 0.32, 0.34],
        [0.23, 0.33, 0.39, 0.42],
    ],
    //X: thermal resistance of insulation
    X: [0.5, 1, 1.5, 2],
    //Y: insulation width
    Y: [0.5, 1, 1.5],
};

export const C3 = {
    description: 'Edge insulation factor for vertical edge insulation',
    matrix: [
        [0.13, 0.18, 0.21, 0.22],
        [0.2, 0.27, 0.32, 0.34],
        [0.23, 0.33, 0.39, 0.42],
        [0.26, 0.37, 0.43, 0.48],
    ],
    //X: thermal resistance of insulation
    X: [0.5, 1, 1.5, 2],
    //Y: insulation depth - referred again as 'width' in Appendix C
    Y: [0.25, 0.5, 0.75, 1],
};

export const C4 = {
    description: 'U-values of uninsulated suspended floors',
    matrix: [
        [0.15, 0.15],
        [0.25, 0.26],
        [0.33, 0.35],
        [0.4, 0.42],
        [0.46, 0.48],
        [0.51, 0.53],
        [0.55, 0.58],
        [0.59, 0.62],
        [0.63, 0.66],
        [0.66, 0.7],
        [0.69, 0.73],
        [0.72, 0.76],
        [0.75, 0.79],
        [0.77, 0.81],
        [0.8, 0.84],
        [0.82, 0.86],
        [0.84, 0.88],
        [0.86, 0.9],
        [0.88, 0.92],
        [0.89, 0.93],
    ],
    //X: Height of floor deck above ground level and ventilation opening area per unit perimeter of underfloor space
    X: [0.0015, 0.003],
    //Y: perimeter/area
    Y: [
        0.05,
        0.1,
        0.15,
        0.2,
        0.25,
        0.3,
        0.35,
        0.4,
        0.45,
        0.5,
        0.55,
        0.6,
        0.65,
        0.7,
        0.75,
        0.8,
        0.85,
        0.9,
        0.95,
        1,
    ],
};

export const C5 = {
    description: 'U-values of uninsulated basement floors',
    matrix: [
        [0.2, 0.19, 0.18, 0.17, 0.16],
        [0.34, 0.31, 0.29, 0.27, 0.26],
        [0.44, 0.41, 0.38, 0.35, 0.33],
        [0.53, 0.48, 0.44, 0.41, 0.38],
        [0.61, 0.55, 0.5, 0.46, 0.43],
        [0.68, 0.61, 0.55, 0.5, 0.46],
        [0.74, 0.65, 0.59, 0.53, 0.49],
        [0.79, 0.7, 0.62, 0.56, 0.51],
        [0.84, 0.73, 0.65, 0.58, 0.53],
        [0.89, 0.77, 0.68, 0.6, 0.54],
    ],
    //X: Basement depth
    X: [0.5, 1, 1.5, 2, 2.5],
    //Y: perimeter/area
    Y: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
};
