import { SandboxAction, sandboxModule, SandboxState } from './modules/sandbox';

export const modules = {
    sandbox: sandboxModule,
};

export type ModuleStates = {
    sandbox: SandboxState;
};
export type ModuleAction = SandboxAction;

export type ModuleName = keyof typeof modules;
