import Bottleneck from 'bottleneck';

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
    private limiter: Bottleneck;
    private errorFlag = false;

    constructor(
        private saveFunction: (data: object) => Promise<void>,
        private onChange: (status: 'unsaved' | 'saving' | 'failed' | 'saved') => void,
        private onError?: (error: unknown) => void,
    ) {
        this.limiter = new Bottleneck({
            maxConcurrent: 1,
            highWater: 1,
            strategy: Bottleneck.strategy.LEAK,
            minTime: 2000, // 2 second wait between saves
        });

        this.limiter.on('executing', () => {
            this.onChange('saving');
        });

        this.limiter.on('idle', () => {
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
    }

    save(data: unknown) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('data not an object');
        }

        this.onChange('unsaved');

        // We add every save event, as MDN says it's best practice to do this
        // rather than leave the handler in place and check whether it should
        // trigger the browser alert behaviour internally.  This is because the
        // browser will not put the page to "sleep" if this handler is
        // installed, with battery, CPU and memory implications.
        if (jsEnvironment() === 'browser') {
            addEventListener('beforeunload', beforeUnloadHandler);
        }

        this.limiter
            .schedule(async () => {
                try {
                    await this.saveFunction(data);
                    this.errorFlag = false;
                } catch (err) {
                    this.errorFlag = true;
                }
            })
            .catch((error) => {
                // This is expected if the bottleneck drops a task due to the
                // maximium queue length being reached
                if (error instanceof Bottleneck.BottleneckError) {
                    return;
                }

                if (this.onError !== undefined) {
                    this.onError(error);
                } else {
                    throw error;
                }
            });
    }
}
