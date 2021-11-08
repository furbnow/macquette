import React, { ReactElement, useState } from 'react';
import { Scenario } from '../types/Assessment';
import Graphics from '../components/Graphics';
import { HouseProps } from '../components/House';

function inScenario(page: string): boolean {
    switch (page) {
        case 'setup':
        case 'householdquestionnaire':
        case 'commentary':
        case 'report':
        case 'currentenergy':
        case 'imagegallery':
        case 'compare':
        case 'export':
        case 'librariesmanager':
        case 'fuelsmanager':
        case 'scopeofworks':
            return false;
        default:
            return true;
    }
}

export function houseData(scenario: Scenario): HouseProps {
    if (!scenario.fabric) {
        return {
            floor: 0,
            ventilation: 0,
            infiltration: 0,
            windows: 0,
            walls: 0,
            roof: 0,
            thermalbridge: 0,
        };
    }

    return {
        floor: scenario.fabric.total_floor_WK,
        ventilation: scenario.ventilation.average_ventilation_WK,
        infiltration: scenario.ventilation.average_infiltration_WK,
        windows: scenario.fabric.total_window_WK,
        walls: scenario.fabric.total_wall_WK,
        roof: scenario.fabric.total_roof_WK,
        thermalbridge: scenario.fabric.thermal_bridging_heat_loss,
    };
}

export function targetData(
    width: number,
    scenario: Scenario
): {
    width: number;
    space_heating_demand: number;
    primary_energy: number;
    co2: number;
    energyuse: number;
} {
    return {
        width: width,
        space_heating_demand: scenario.space_heating_demand_m2,
        primary_energy: scenario.primary_energy_use_m2,
        co2: scenario.kgco2perm2,
        energyuse: scenario.kwhdpp,
    };
}

function pageTitle(page: string): string {
    switch (page) {
        case 'setup':
            return 'Setup';
        case 'householdquestionnaire':
            return 'Household Questionnaire';
        case 'commentary':
            return 'Commentary';
        case 'report':
            return 'Generate Report';
        case 'currentenergy':
            return 'Current Energy Use';
        case 'imagegallery':
            return 'Image Gallery';
        case 'compare':
            return 'Compare Scenarios';
        case 'export':
            return 'Import/Export';
        case 'librariesmanager':
            return 'Libraries manager';
        case 'fuelsmanager':
            return 'Fuels manager';
        case 'scopeofworks':
            return 'Scope of Works';
        case 'dwellingdata':
            return 'Dwelling data';
        case 'ventilation':
            return 'Ventilation and infiltration';
        case 'LAC':
            return 'Lighting, appliances & cooking';
        case 'fuel_requirements':
            return 'Fuel requirements';
        case 'solarhotwater':
            return 'Solar hot water heating';
        case 'worksheets':
            return 'SAP worksheets';
        case 'elements':
            return 'Fabric elements';
        case 'heating':
            return 'Heating';
        case 'generation':
            return 'Generation';
        default:
            return page;
    }
}

interface PageHeaderProps {
    page: string;
    scenario: Scenario | null;
    scenarioId: string;
    totalLock: boolean;
    cost: number;
    width: number;
}

export default function PageHeader({
    page,
    scenario,
    scenarioId,
    totalLock,
    cost,
    width,
}: PageHeaderProps): ReactElement {
    const [showHouse, setShowHouse] = useState(true);

    const isBaseline = scenarioId === 'master' ? true : false;

    if (!inScenario(page)) {
        scenario = null;
        scenarioId = '';
    }

    return (
        <div>
            {totalLock && (
                <div className="locked-warning">
                    <h3>The assessment is locked!</h3>
                    <p>Your changes won&apos;t be saved.</p>
                    <p>
                        To unlock the assessment change the status from
                        &quot;Complete&quot; to &quot;In progress&quot;.
                    </p>
                </div>
            )}

            <div className="d-flex align-items-center justify-content-between pb-30">
                <div>
                    {scenario && (
                        <h4
                            className="mt-0 text-normal"
                            style={{ marginBottom: '3.5px' }}
                        >
                            {isBaseline ? (
                                scenario.scenario_name
                            ) : (
                                <>
                                    Scenario{' '}
                                    {parseInt(scenarioId.replaceAll(/scenario/g, ''), 10)}
                                    : {scenario.scenario_name}
                                </>
                            )}
                        </h4>
                    )}
                    <h2 className="ma-0">{pageTitle(page)}</h2>
                </div>

                {scenario && (
                    <button onClick={() => setShowHouse(!showHouse)} className="btn">
                        {showHouse ? 'Hide graphics' : 'Show graphics'}
                    </button>
                )}
            </div>

            {scenario && showHouse && (
                <Graphics
                    houseData={houseData(scenario)}
                    targetData={targetData(width, scenario)}
                    cost={cost}
                />
            )}
        </div>
    );
}
