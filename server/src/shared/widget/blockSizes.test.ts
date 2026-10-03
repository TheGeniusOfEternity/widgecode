import {
  DEFAULT_BLOCK_SIZE,
  isAllowedBlockSize,
  snapToAllowedSize,
} from '@shared/widget/blockSizes.js';

it('allows only the sizes a block declares', () => {
  expect(DEFAULT_BLOCK_SIZE).toEqual({ width: 2, height: 2 });
  expect(isAllowedBlockSize('github-stats', 2, 2)).toBe(true);
  expect(isAllowedBlockSize('github-stats', 3, 3)).toBe(false);
  // Unknown types fall back to the legacy set.
  expect(isAllowedBlockSize('future-block', 4, 2)).toBe(true);
});

it('snaps a dragged size to the nearest allowed one', () => {
  expect(snapToAllowedSize('text', 3, 2)).toEqual({ width: 2, height: 2 });
  expect(snapToAllowedSize('text', 4, 3)).toEqual({ width: 4, height: 2 });
  expect(snapToAllowedSize('text', 4, 4)).toEqual({ width: 4, height: 4 });
  expect(snapToAllowedSize('text', 1, 1)).toEqual({ width: 2, height: 2 });
});

it('prefers sizes that fit the space available from the block position', () => {
  // Dragging to 4 wide from column 2 only has room for 2 columns.
  expect(snapToAllowedSize('text', 4, 2, { maxWidth: 2 })).toEqual({ width: 2, height: 2 });
  expect(snapToAllowedSize('text', 2, 4, { maxHeight: 3 })).toEqual({ width: 2, height: 2 });
});
