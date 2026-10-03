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
  expect(snapToAllowedSize('github-stats', 3, 2)).toEqual({ width: 2, height: 2 });
  expect(snapToAllowedSize('github-stats', 4, 3)).toEqual({ width: 4, height: 2 });
  expect(snapToAllowedSize('github-stats', 4, 4)).toEqual({ width: 4, height: 4 });
  expect(snapToAllowedSize('github-stats', 1, 1)).toEqual({ width: 1, height: 1 });
  expect(snapToAllowedSize('github-stats', 3, 1)).toEqual({ width: 2, height: 1 });
  // Text supports more sizes.
  expect(snapToAllowedSize('text', 3, 2)).toEqual({ width: 3, height: 2 });
});

it('prefers sizes that fit the space available from the block position', () => {
  // Dragging to 4 wide from column 2 only has room for 2 columns.
  expect(snapToAllowedSize('github-prs', 4, 2, { maxWidth: 2 })).toEqual({ width: 2, height: 2 });
  expect(snapToAllowedSize('github-prs', 2, 4, { maxHeight: 3 })).toEqual({ width: 2, height: 2 });
});

it('maps sizes to layout variants', async () => {
  const { blockVariant, defaultBlockSize } = await import('@shared/widget/blockSizes.js');
  expect(blockVariant(1, 1)).toBe('tiny');
  expect(blockVariant(2, 1)).toBe('strip');
  expect(blockVariant(3, 1)).toBe('strip');
  expect(blockVariant(4, 1)).toBe('wide');
  expect(blockVariant(2, 2)).toBe('card');
  expect(blockVariant(2, 4)).toBe('card');
  expect(blockVariant(4, 2)).toBe('large');
  expect(defaultBlockSize('text')).toEqual({ width: 2, height: 1 });
  expect(defaultBlockSize('github-stats')).toEqual({ width: 2, height: 2 });
});

it('falls back to smaller sizes when placing a new block', async () => {
  const { placementSizes } = await import('@shared/widget/blockSizes.js');
  expect(placementSizes('github-stats')).toEqual([
    { width: 2, height: 2 },
    { width: 4, height: 1 },
    { width: 2, height: 1 },
    { width: 1, height: 1 },
  ]);
});
