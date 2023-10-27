import { Scenario } from '../../data-schemas/scenario';
import { Region } from '../enums/region';

export function extractRegionFromLegacy(scenario: Scenario) {
  const { region: code } = scenario ?? {};
  if (code === undefined) {
    return new Region('UK average');
  }
  return Region.fromIndex0(code);
}
