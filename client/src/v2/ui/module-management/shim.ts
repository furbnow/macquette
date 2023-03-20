import { Result } from '../../helpers/result';
import { applyDataMutator, getAppContext } from '../../shims/typed-globals';
import { InstantiatedUiModule } from './instantiated-module';
import type { UiModule } from './module-type';

/** Shim to be called from legacy code, for mounting a UI module on a legacy page */
export class MultipleModuleShim<State, Action, Effect> {
    private keyedInstances: Record<string, InstantiatedUiModule<State, Action, Effect>> =
        {};

    private getInstance(
        instanceKey: string,
    ): Result<InstantiatedUiModule<State, Action, Effect>, string> {
        const instance = this.keyedInstances[instanceKey];
        if (instance === undefined) {
            return Result.err(`module not found: ${instanceKey}`);
        }
        return Result.ok(instance);
    }

    constructor(private module_: UiModule<State, Action, Effect>) {}

    init(domElement: Element, instanceKey: string) {
        const instance = new InstantiatedUiModule(
            this.module_,
            instanceKey,
            domElement,
            applyDataMutator,
        );
        this.keyedInstances[instanceKey] = instance;
    }

    unmount(instanceKey: string) {
        const instance = this.getInstance(instanceKey).unwrap();
        instance.unmount();
        delete this.keyedInstances[instanceKey];
    }

    unmountAll() {
        for (const instanceKey of Object.keys(this.keyedInstances)) {
            this.unmount(instanceKey);
        }
    }

    update() {
        const context = getAppContext();
        for (const instance of Object.values(this.keyedInstances)) {
            instance.update(context);
        }
    }
}

/** Shim to be called from legacy code, for mounting a UI module on a legacy page */
export class SingleModuleShim<State, Action, Effect> {
    private instance: InstantiatedUiModule<State, Action, Effect> | null = null;
    constructor(private module_: UiModule<State, Action, Effect>) {}

    init(domElement: Element) {
        this.instance = new InstantiatedUiModule(
            this.module_,
            '',
            domElement,
            applyDataMutator,
        );
    }

    unmount() {
        if (this.instance === null) {
            console.warn('Tried to unmount an uninitialised instance');
            return;
        }
        this.instance.unmount();
        this.instance = null;
    }

    update() {
        if (this.instance === null) {
            console.warn('Tried to unmount an uninitialised instance');
            return;
        }
        this.instance.update(getAppContext());
    }
}
