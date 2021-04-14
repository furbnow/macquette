import { Scenario } from '../types/Assessment';

export function deleteFloor(scenario: Scenario, idx: number): void {
    scenario.floors.splice(idx, 1);
}

export function addFloor(scenario: Scenario): void {
    let name = '';
    const n_floors = scenario.floors.length;
    if (n_floors == 0) {
        name = 'Ground Floor';
    } else if (n_floors == 1) {
        name = '1st Floor';
    } else if (n_floors == 2) {
        name = '2nd Floor';
    } else if (n_floors == 3) {
        name = '3rd Floor';
    } else if (n_floors > 3) {
        name = n_floors + 'th Floor';
    }
    scenario.floors.push({ name, area: 0, height: 0, volume: 0 });
}
