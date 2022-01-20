import convertObjectArrayToCSV, {
    cleanCSVcell,
} from '../../../../src/dev/ui/lib/convertObjectArrayToCSV';

describe('cleanCSVcell', () => {
    test('string with leading/trailing spaces', () => {
        const input =
            '   A string stored in the Assessment data can contain leading/trailing spaces. ';
        const output =
            'A string stored in the Assessment data can contain leading/trailing spaces.';
        const csvCellCleaned = cleanCSVcell(input);
        expect(csvCellCleaned).toBe(output);
    });
    test('string with new line', () => {
        const input = 'It can also contain \nnewlines.';
        const output = 'It can also contain newlines.';
        const csvCellCleaned = cleanCSVcell(input);
        expect(csvCellCleaned).toBe(output);
    });
    test('string with a comma', () => {
        const input = 'It can also contain commas, like this one.';
        const output = '"It can also contain commas, like this one."';
        const csvCellCleaned = cleanCSVcell(input);
        expect(csvCellCleaned).toBe(output);
    });
    test('string with text wrapped in quotes', () => {
        const input = 'It can also "contain text" wrapped in quotes.';
        const output = 'It can also ""contain text"" wrapped in quotes.';
        const csvCellCleaned = cleanCSVcell(input);
        expect(csvCellCleaned).toBe(output);
    });
    test('all these cases together', () => {
        const input = '   All \nthese scenarios, can "occur" at the same time!   ';
        const output = '"All these scenarios, can ""occur"" at the same time!"';
        const csvCellCleaned = cleanCSVcell(input);
        expect(csvCellCleaned).toBe(output);
    });
});

test('convertObjectArrayToCSV', () => {
    const input = [
        {
            name: 'name',
            age: 'age',
            location: 'location',
        },
        {
            name: 'jane',
            age: '12',
            location: 'marseille',
        },
        {
            name: 'bob "the fixer" geldof',
            age: 55,
            location: '   london, england',
        },
        {
            name: 'Bobby ;\nDROP TABLE users;',
            age: '100',
            location: 'the \nworld wide web',
        },
    ];
    const output = `name,age,location\r
jane,12,marseille\r
bob ""the fixer"" geldof,55,"london, england"\r
Bobby ;DROP TABLE users;,100,the world wide web\r
`;
    const csv = convertObjectArrayToCSV(input);
    expect(csv).toBe(output);
});
