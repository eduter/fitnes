import { masterPalette } from './palette.ts';
import { assessPicture } from './pictureCheck.ts';
import type { RgbImage } from './png.ts';
import { SearchLimit } from './searchLimit.ts';

/** A definite violation or a diagnostic from an unsuccessful layer search. */
interface CheckProblem {
    readonly code: string;
    readonly message: string;
}

/** Only pass is evidence of compliance; inconclusive must also block a UI change. */
interface CheckReport {
    readonly status: 'pass' | 'fail' | 'inconclusive';
    readonly width: number;
    readonly height: number;
    readonly problems: readonly CheckProblem[];
}

/** Check native, unquantized screenshot pixels with unlimited distinct tile patterns. */
function checkPicture(image: RgbImage): CheckReport {
    const { width, height, data } = image;
    if (width !== 256 || !Number.isSafeInteger(height) || height < 1) {
        return {
            status: 'fail',
            width,
            height,
            problems: [
                {
                    code: 'picture-size',
                    message: `Expected 256 logical pixels wide and a positive integer height; got ${width}×${height}`,
                },
            ],
        };
    }
    if (data.length !== width * height * 3) {
        return {
            status: 'fail',
            width,
            height,
            problems: [{ code: 'image-data', message: `Expected ${width * height * 3} RGB bytes; got ${data.length}` }],
        };
    }

    let problems: CheckProblem[];
    try {
        problems = assessPicture(image, masterPalette());
    } catch (error) {
        if (!(error instanceof SearchLimit)) {
            throw error;
        }
        return { status: 'inconclusive', width, height, problems: [{ code: 'search-limit', message: error.message }] };
    }
    const definite = problems.some((problem) => problem.code === 'off-palette' || problem.code === 'color-limit');
    const status = problems.length === 0 ? 'pass' : definite ? 'fail' : 'inconclusive';
    return {
        status,
        width,
        height,
        problems:
            status === 'inconclusive'
                ? problems.map((problem) => ({
                      ...problem,
                      message: `No compliant decomposition found. Candidate: ${problem.message}`,
                  }))
                : problems,
    };
}

export type { CheckProblem, CheckReport };
export { checkPicture };
