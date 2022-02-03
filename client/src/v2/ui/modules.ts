import { SandboxAction, sandboxModule, SandboxState } from './modules/sandbox';
import {
    SolarHotWaterAction,
    solarHotWaterModule,
    SolarHotWaterState,
} from './modules/solar-hot-water';

export const modules = {
    sandbox: sandboxModule,
    solarHotWater: solarHotWaterModule,
};

export type ModuleStates = {
    sandbox: SandboxState;
    solarHotWater: SolarHotWaterState;
};
export type ModuleAction = SandboxAction | SolarHotWaterAction;

export type ModuleName = keyof typeof modules;
