import { datasets } from './model/datasets';
import { calcRun } from './model/openBEM';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Macquette: any;
    }
}

window.Macquette = {
    datasets,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    calcRun,
};
