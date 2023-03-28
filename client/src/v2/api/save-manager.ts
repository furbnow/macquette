import type { AsyncWorker, QueueObject } from 'async';
import { queue } from 'async';
import { jsEnvironment } from '../helpers/js-environment';

function beforeUnloadHandler(event: BeforeUnloadEvent) {
    // Modern browsers use this call as a signal to display the pre-navigation
    // prompt.
    event.preventDefault();

    // This prompt (and return value) is provided for legacy browsers, since
    // modern browsers will not display the text you give them.
    return (event.returnValue =
        'A save is still in progress - are you sure you want to exit?');
}

/**
 * A container for logic that avoids data races when saving project data.
 *
 * This should only be instantiated once as it will also set up a browser prompt
 * for when the user tries to leave (if there is unsaved data).
 */
export class SaveManager {
    private queue: QueueObject<unknown>;
    private errorFlag = false;

    constructor(
        private saveFunction: (data: unknown) => Promise<void>,
        private onChange: (status: 'unsaved' | 'saving' | 'failed' | 'saved') => void,
        onError: (error: unknown) => void,
    ) {
        const worker: AsyncWorker<unknown, unknown> = (task, cb) => {
            this.onChange('saving');
            this.saveFunction(task)
                .then(() => {
                    this.errorFlag = false;
                    cb();
                })
                .catch((err) => {
                    cb(err);
                });
        };

        this.queue = queue(worker, 1);

        this.queue.drain(() => {
            if (this.errorFlag) {
                this.onChange('failed');
                return;
            } else {
                this.onChange('saved');
                if (jsEnvironment() === 'browser') {
                    removeEventListener('beforeunload', beforeUnloadHandler);
                }
            }
        });

        this.queue.error((error) => {
            this.errorFlag = true;
            onError(error);
        });
    }

    async save(data: unknown) {
        this.onChange('unsaved');

        // We add every save event, as MDN says it's best practice to do this
        // rather than leave the handler in place and check whether it should
        // trigger the browser alert behaviour internally.  This is because the
        // browser will not put the page to "sleep" if this handler is
        // installed, with battery, CPU and memory implications.
        if (jsEnvironment() === 'browser') {
            addEventListener('beforeunload', beforeUnloadHandler);
        }

        await this.queue.push(data);
    }
}
