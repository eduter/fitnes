import { expect, it } from 'vitest';
import { EditHistory, floodFill, replaceRegion } from './model.ts';

it('flood fills only the connected region and keeps the input immutable', () => {
    const pixels = Uint8Array.from([1, 2, 1, 1, 2, 1]);
    expect(Array.from(floodFill(pixels, 3, 0, 0, 7))).toEqual([7, 2, 1, 7, 2, 1]);
    expect(Array.from(pixels)).toEqual([1, 2, 1, 1, 2, 1]);
});

it('replaces only matching pixels inside an inclusive rectangle', () => {
    const pixels = Uint8Array.from([1, 1, 1, 1, 1, 2]);
    expect(Array.from(replaceRegion(pixels, 3, { left: 1, top: 0, width: 2, height: 2 }, 1, 8))).toEqual([
        1, 8, 8, 1, 8, 2,
    ]);
});

it('undoes a whole operation, supports redo and drops the redo branch after a new edit', () => {
    const history = new EditHistory(Uint8Array.from([1, 2]));
    history.commit(Uint8Array.from([3, 3]), 'Fill');
    expect(Array.from(history.undo())).toEqual([1, 2]);
    expect(Array.from(history.redo())).toEqual([3, 3]);
    history.undo();
    history.commit(Uint8Array.from([4, 2]), 'Replace');
    expect(history.canRedo).toBe(false);
    expect(Array.from(history.undo())).toEqual([1, 2]);
});
