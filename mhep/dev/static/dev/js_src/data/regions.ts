export const regions = [
    { value: 0, display: 'UK average' },
    { value: 1, display: 'Thames' },
    { value: 2, display: 'South East England' },
    { value: 3, display: 'Southern England' },
    { value: 4, display: 'South West England' },
    { value: 5, display: 'Severn Wales / Severn England' },
    { value: 6, display: 'Midlands' },
    { value: 7, display: 'West Pennines Wales / West Pennines England' },
    { value: 8, display: 'North West England / South West Scotland' },
    { value: 9, display: 'Borders Scotland / Borders England' },
    { value: 10, display: 'North East England' },
    { value: 11, display: 'East Pennines' },
    { value: 12, display: 'East Anglia' },
    { value: 13, display: 'Wales' },
    { value: 14, display: 'West Scotland' },
    { value: 15, display: 'East Scotland' },
    { value: 16, display: 'North East Scotland' },
    { value: 17, display: 'Highland' },
    { value: 18, display: 'Western Isles' },
    { value: 19, display: 'Orkney' },
    { value: 20, display: 'Shetland' },
    { value: 21, display: 'Northern Ireland' },
];

export function getRegionFromPostcode(postcode: string): number | null {
    for (const [pattern, region] of region_from_postcode) {
        if (typeof pattern === 'string') {
            if (postcode.startsWith(pattern)) {
                return region;
            }
        } else {
            if (pattern.exec(postcode)) {
                return region;
            }
        }
    }
    return null;
}

/*
 * Mapping of first part of postcode to UK region.
 * This list is matched against the postcode in source order.
 * So more specific rules should come before more general rules.
 * i.e. a postcode 'SK4' should come before 'SK', or the 'SK' rule will take
 * precedence.
 * Taken from SAP2012 table U4 p.177.
 */
export const region_from_postcode: Array<[string | RegExp, number]> = [
    ['AB', 16],
    ['AL', 1],
    ['BA', 5],
    ['BB', 7],
    [/^BD2[34]/, 10],
    ['BD', 11],
    ['BH', 3],
    ['BL', 7],
    ['BN', 2],
    ['BR', 2],
    ['BS', 5],
    ['BT', 21],
    ['B', 6],
    ['CA', 8],
    ['CB', 12],
    ['CF', 5],
    [/^CH[5-8]/, 7],
    ['CH', 7],
    [/^CM2[1-3]/, 1],
    ['CM', 12],
    ['CO', 12],
    ['CR', 1],
    ['CT', 2],
    ['CV', 6],
    ['CW', 7],
    ['DA', 2],
    ['DD', 15],
    ['DE', 6],
    ['DG', 8],
    [/^DH[45]/, 9],
    ['DH', 10],
    ['DL', 10],
    ['DN', 11],
    ['DT', 3],
    ['DY', 6],
    ['E', 1],
    ['EC', 1],
    [/^EH4[3-6]/, 9],
    ['EH', 15],
    ['EN9', 12],
    ['EN', 1],
    ['EX', 4],
    ['FK', 14],
    ['FY', 7],
    ['GL', 5],
    [/^GU1[12]/, 3],
    ['GU14', 3],
    [/^GU2[89]/, 2],
    [/^GU3[0-5]/, 3],
    ['GU46', 3],
    [/^GU5[12]/, 3],
    ['GU', 1],
    ['G', 14],
    ['HA', 1],
    ['HD', 11],
    ['HG', 10],
    ['HP', 1],
    ['HR', 6],
    ['HS', 18],
    ['HU', 11],
    ['HX', 11],
    ['IG', 12],
    ['IP', 12],
    [/^IV3[0-2]/, 16],
    ['IV36', 16],
    ['IV', 17],
    ['KA', 14],
    ['KT', 1],
    [/^KW1[5-7]/, 19],
    ['KW', 17],
    ['KY', 15],
    [/^LA[7-9]/, 8],
    [/^LA1[0-9]/, 8],
    [/^LA2[0-3]/, 8],
    ['LA', 7],
    ['LD', 13],
    ['LE', 6],
    [/^LL2[3-7]/, 13],
    [/^LL[3-6][0-9]/, 13],
    [/^LL7[0-8]/, 13],
    ['LL', 7],
    ['LN', 11],
    ['LS24', 10],
    ['LS', 11],
    ['LU', 1],
    ['L', 7],
    ['ME', 2],
    ['MK', 1],
    ['ML', 14],
    ['M', 7],
    ['NE', 9],
    ['NG', 11],
    ['NN', 6],
    ['NP8', 13],
    ['NP', 5],
    ['NR', 12],
    ['NW', 1],
    ['N', 1],
    ['OL', 7],
    ['OX', 1],
    ['PA', 14],
    ['PE9', 11],
    [/^PE1[0-2]/, 11],
    [/^PE2[0-5]/, 11],
    ['PE', 12],
    ['PH19', 17],
    [/^PH2[0-5]/, 17],
    ['PH26', 16],
    ['PH30-44', 17],
    ['PH49', 14],
    ['PH50', 14],
    ['PH', 15],
    ['PL', 4],
    [/^PO1[89]/, 2],
    [/^PO2[0-2]/, 2],
    ['PO', 3],
    ['PR', 7],
    [/RG2[1-9]/, 3],
    ['RG', 1],
    [/^RH1[0-9]/, 2],
    ['RH20', 2],
    ['RH', 1],
    ['RM', 12],
    ['S18', 6],
    ['S32-33', 6],
    ['S40-45', 6],
    [/^SA1[4-9]/, 13],
    ['SA20', 13],
    [/^SA3[1-9]/, 13],
    [/^SA4[0-8]/, 13],
    [/^SA6[1-9]/, 13],
    [/^SA7[0-3]/, 13],
    ['SA', 5],
    ['SE', 1],
    ['SG', 1],
    ['SK13', 6],
    ['SK17', 6],
    [/^SK2[23]/, 6],
    ['SK', 7],
    ['SL', 1],
    ['SM', 1],
    ['SN7', 1],
    ['SN', 5],
    ['SO', 3],
    [/^SP[6-9]/, 3],
    [/^SP1[01]/, 3],
    ['SP', 5],
    [/^SR[78]/, 10],
    ['SR', 9],
    ['SS', 12],
    ['ST', 6],
    ['SW', 1],
    ['SY14', 7],
    [/^SY1[5-9]/, 13],
    [/^SY2[0-5]/, 13],
    ['SY', 6],
    ['S', 11],
    ['TA', 5],
    ['TD', 9],
    ['TF', 6],
    ['TN', 2],
    ['TQ', 4],
    ['TR', 4],
    ['TS', 10],
    ['TW', 1],
    ['UB', 1],
    ['WA', 7],
    ['WC', 1],
    ['WD', 1],
    ['WF', 11],
    ['WN', 7],
    ['WR', 6],
    ['WS', 6],
    ['WV', 6],
    ['W', 1],
    [/^YO1[56]/, 11],
    ['YO25', 11],
    ['YO', 10],
    ['ZE', 20],
];
