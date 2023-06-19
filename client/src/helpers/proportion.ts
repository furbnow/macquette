import { Result } from './result';

export class Proportion {
    get asRatio() {
        return this._ratio;
    }
    get asPercent() {
        return 100 * this._ratio;
    }
    get complement() {
        return Proportion.fromRatio(1 - this._ratio).unwrap();
    }

    private constructor(private _ratio: number) {}

    static fromRatio(ratio: number): Result<Proportion, string> {
        if (ratio < 0 || ratio > 1) {
            return Result.err('Ratio must be between 0 and 1');
        }
        return Result.ok(new Proportion(ratio));
    }

    static fromPercent(percent: number): Result<Proportion, string> {
        if (percent < 0 || percent > 100) {
            return Result.err('Percent must be between 0 and 100');
        }
        return Result.ok(new Proportion(percent / 100));
    }

    static fromPercentClamped(percent: number): Proportion {
        return Proportion.fromPercent(Math.max(0, Math.min(100, percent))).unwrap();
    }

    toJSON(): unknown {
        return this._ratio;
    }
}
