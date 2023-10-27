import assert from 'assert';
import fc from 'fast-check';
import { sum } from '../../src/helpers/array-reducers';

import {
  BarChart,
  energyCosts,
  EnergyCostsGraphInput,
  generateReportGraphs,
} from '../../src/reports/graphs';
import { arbFloat } from '../helpers/arbitraries';

function testArrayLengthsInvariant(chart: BarChart) {
  // When present, each of bins[].data, categoryLabels, and
  // categoryColours should have the length specified in numCategories

  const { numCategories } = chart;
  for (const bin of chart.bins) {
    expect(bin.data).toHaveLength(numCategories);
  }
  if (chart.categoryLabels !== undefined) {
    expect(chart.categoryLabels).toHaveLength(numCategories);
  }
  if (chart.categoryColours !== undefined) {
    expect(chart.categoryColours).toHaveLength(numCategories);
  }
}

function testColoursInvariant(chart: BarChart) {
  // colours should all match #xxxxxx regex
  for (const colour of chart.categoryColours ?? []) {
    expect(colour).toMatch(/^#[a-f0-9]{6}$/);
  }
}

function testEmptyCategoriesInvariant({ numCategories, bins }: BarChart) {
  // No category should have a value of 0 in all bins
  for (let categoryIdx = 0; categoryIdx < numCategories; categoryIdx++) {
    const valuesAcrossBins = bins.map((bin) => bin.data[categoryIdx]);
    expect(valuesAcrossBins.some((val) => val !== 0)).toBe(true);
  }
}

function testEmptyBinsInvariant({ bins }: BarChart) {
  // No bin should have a value of 0 in all categories
  for (const bin of bins) {
    expect(bin.data.some((val) => val !== 0)).toBe(true);
  }
}

function testBarChartInvariants(chart: BarChart) {
  testArrayLengthsInvariant(chart);
  testColoursInvariant(chart);
  testEmptyCategoriesInvariant(chart);
  testEmptyBinsInvariant(chart);
}

function getBarChart(key: string, projectData: unknown, scenarioIds: string[]): BarChart {
  const graph = generateReportGraphs(projectData, scenarioIds)[key];
  assert(graph !== undefined);
  assert(graph.type === 'bar');
  return graph;
}

describe('graph generation tests', () => {
  describe('invariant tests on empty projects', () => {
    // These are very basic, bare-minimum sanity checks. These invariants
    // should hold for all graphs generated. Feel free to write more
    // comprehensive tests...

    /* eslint-disable jest/expect-expect */
    test('heat balance', () => {
      const graph = getBarChart('heatBalance', { master: {} }, []);
      testBarChartInvariants(graph);
    });
    test('space heating demand', () => {
      const graph = getBarChart('spaceHeatingDemand', { master: {} }, []);
      testBarChartInvariants(graph);
    });
    test('peak heating load', () => {
      const graph = getBarChart('peakHeatingLoad', { master: {} }, []);
      testBarChartInvariants(graph);
    });
    test('fuel use', () => {
      const graph = getBarChart('fuelUse', { master: {} }, []);
      testBarChartInvariants(graph);
    });
    test('energy use intensity', () => {
      const graph = getBarChart('energyUseIntensity', { master: {} }, []);
      testBarChartInvariants(graph);
    });
    /* eslint-enable jest/expect-expect */
    // energy costs covered by test suite below
  });
  describe('energy costs', () => {
    const basicEnergyCostsChart = {
      type: 'bar' as const,
      stacked: true,
      units: '£ per year',
    };

    test('no scenarios', () => {
      const graph = energyCosts({
        modelModules: {
          fuels: { fuels: {} },
          currentEnergy: { fuels: {}, generation: null },
        },
        scenarios: [],
      });
      testBarChartInvariants(graph);
      expect(graph).toMatchObject({
        ...basicEnergyCostsChart,
        bins: [],
        categoryLabels: [],
      });
    });

    describe('bills data', () => {
      type BillsDataTestFixture = {
        fuels: Record<
          string,
          {
            unitPrice: number;
            standingCharge: number;
            annualUse: number;
          }
        >;
        generationSavings: number | null;
      };
      function makeEnergyCostsInputFromFixture(
        fixture: BillsDataTestFixture,
      ): EnergyCostsGraphInput {
        return {
          modelModules: {
            currentEnergy: {
              generation:
                fixture.generationSavings === null
                  ? null
                  : { annualCostSaved: fixture.generationSavings },
              fuels: fixture.fuels,
            },
            fuels: { fuels: fixture.fuels },
          },
          scenarios: [],
        };
      }
      test('fuel with only unit cost', () => {
        const fixture: BillsDataTestFixture = {
          fuels: {
            cake: {
              unitPrice: 2,
              annualUse: 3,
              standingCharge: 0,
            },
          },
          generationSavings: null,
        };
        const graph = energyCosts(makeEnergyCostsInputFromFixture(fixture));
        testBarChartInvariants(graph);
        expect(graph).toMatchObject({
          ...basicEnergyCostsChart,
          numCategories: 1,
          bins: [
            {
              label: 'Bills data',
              data: [
                (fixture.fuels['cake']!.annualUse * fixture.fuels['cake']!.unitPrice) /
                  100,
              ],
            },
          ],
          categoryLabels: ['cake use'],
        });
      });
      test('fuel with unit cost and standing charge', () => {
        const fixture: BillsDataTestFixture = {
          fuels: {
            coffee: {
              unitPrice: 2,
              standingCharge: 3,
              annualUse: 5,
            },
          },
          generationSavings: null,
        };
        const graph = energyCosts(makeEnergyCostsInputFromFixture(fixture));
        testBarChartInvariants(graph);
        expect(graph).toMatchObject({
          ...basicEnergyCostsChart,
          numCategories: 2,
          bins: [
            {
              label: 'Bills data',
              data: [
                fixture.fuels['coffee']!.standingCharge,
                (fixture.fuels['coffee']!.annualUse *
                  fixture.fuels['coffee']!.unitPrice) /
                  100,
              ],
            },
          ],
          categoryLabels: ['coffee standing charge', 'coffee use'],
        });
      });
      test('generation', () => {
        const fixture: BillsDataTestFixture = {
          fuels: {},
          generationSavings: 3,
        };
        const graph = energyCosts(makeEnergyCostsInputFromFixture(fixture));
        testBarChartInvariants(graph);
        expect(graph).toMatchObject({
          ...basicEnergyCostsChart,
          bins: [
            {
              label: 'Bills data',
              data: [3],
            },
          ],
          categoryLabels: ['Assumed saving from generation'],
        });
      });
      test('arbitrary', () => {
        const positiveFloat = arbFloat({
          min: Math.pow(2, -7),
          noNaN: true,
          noDefaultInfinity: true,
        });
        const arbFixture: fc.Arbitrary<BillsDataTestFixture> = fc.record({
          fuels: fc.dictionary(
            fc.oneof(fc.string(), fc.constant('Standard Tariff')),
            fc.record({
              unitPrice: positiveFloat,
              standingCharge: positiveFloat,
              annualUse: positiveFloat,
            }),
          ),
          totalCost: positiveFloat,
          generationSavings: fc.option(positiveFloat),
        });
        fc.assert(
          fc.property(arbFixture, (fixture) => {
            const graph = energyCosts(makeEnergyCostsInputFromFixture(fixture));

            // Invariant: sum of bin data should equal sum of fuel costs
            let expectedTotalCost = 0;
            for (const fuel of Object.values(fixture.fuels)) {
              expectedTotalCost += (fuel.unitPrice * fuel.annualUse) / 100;
              expectedTotalCost += fuel.standingCharge ?? 0;
            }
            expectedTotalCost += fixture.generationSavings ?? 0;
            const [firstBin] = graph.bins;
            const graphTotalCost = sum(firstBin?.data ?? []);
            expect(graphTotalCost).toBeApproximately(expectedTotalCost);
            testBarChartInvariants(graph);
          }),
        );
      });
    });
  });
});
