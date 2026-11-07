import { expect, it } from 'vitest';
import { copyRegion, EditHistory, floodFill, paintLine, pasteRegion, replaceRegion } from './model.ts';

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

it('draws exact pixels along a continuous pencil stroke and undoes the stroke as one action', () => {
    const original = new Uint8Array(25);
    let stroke = paintLine(original, 5, 0, 0, 4, 0, 32);
    stroke = paintLine(stroke, 5, 4, 0, 4, 4, 32);
    expect(Array.from(stroke).filter((code) => code === 32)).toHaveLength(9);
    expect(original.every((code) => code === 0)).toBe(true);
    const history = new EditHistory(original);
    history.commit(stroke, 'Pencil stroke');
    expect(history.undo()).toEqual(original);
    expect(history.canUndo).toBe(false);
});

it('copies a rectangle as an independent snapshot and pastes exact repeating pixels', () => {
    const original = Uint8Array.from([1, 2, 9, 9, 3, 4, 9, 9]);
    const patch = copyRegion(original, 4, { left: 0, top: 0, width: 2, height: 2 });
    expect(Array.from(patch.pixels)).toEqual([1, 2, 3, 4]);
    const result = pasteRegion(original, 4, patch, 2, 0);
    expect(Array.from(result)).toEqual([1, 2, 1, 2, 3, 4, 3, 4]);
    expect(Array.from(original)).toEqual([1, 2, 9, 9, 3, 4, 9, 9]);
    original[0] = 8;
    expect(patch.pixels[0]).toBe(1);
});

it('clips a paste at image edges without wrapping rows and undoes placement in one step', () => {
    const original = new Uint8Array(6);
    const patch = { width: 2, height: 2, pixels: Uint8Array.from([1, 2, 3, 4]) };
    const pasted = pasteRegion(original, 3, patch, 2, 1);
    expect(Array.from(pasted)).toEqual([0, 0, 0, 0, 0, 1]);
    const history = new EditHistory(original);
    history.commit(pasted, 'Paste selection');
    expect(history.undo()).toEqual(original);
    expect(history.canUndo).toBe(false);
    expect(history.redo()).toEqual(pasted);
});
