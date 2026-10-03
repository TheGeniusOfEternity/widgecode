// Which sizes (in grid cells) each block type supports. A block only offers sizes it has a
// design for; the editor snaps corner-resizing to these and the server rejects anything else.
import { MAX_BLOCK_HEIGHT, MAX_BLOCK_WIDTH } from './geometry.js';

export type BlockSize = { width: number; height: number };

const size = (width: number, height: number): BlockSize => ({ width, height });

// The 2-column grid's sizes, doubled. Every block keeps them so migrated widgets stay valid; they
// render with the "card" / "large" variants.
const LEGACY_SIZES = [size(2, 2), size(2, 4), size(4, 2), size(4, 4)];
// Compact sizes with dedicated layouts: tile, strip and wide strip.
const COMPACT_SIZES = [size(1, 1), size(2, 1), size(4, 1)];

export const BLOCK_SIZES: Record<string, BlockSize[]> = {
  text: [...COMPACT_SIZES, size(3, 1), size(3, 2), size(4, 3), ...LEGACY_SIZES],
  'github-stats': [...COMPACT_SIZES, ...LEGACY_SIZES],
  'github-langs': [...COMPACT_SIZES, ...LEGACY_SIZES],
  'github-commits': [...COMPACT_SIZES, ...LEGACY_SIZES],
  'github-prs': [...COMPACT_SIZES, ...LEGACY_SIZES],
  'github-status': [...COMPACT_SIZES, ...LEGACY_SIZES],
  'leetcode-stats': [...COMPACT_SIZES, ...LEGACY_SIZES],
};

export const DEFAULT_BLOCK_SIZE: BlockSize = size(2, 2);

const DEFAULT_SIZES: Record<string, BlockSize> = { text: size(2, 1) };

export const defaultBlockSize = (type: string) => DEFAULT_SIZES[type] ?? DEFAULT_BLOCK_SIZE;

/**
 * Sizes to try when placing a new block: the default first, then the other allowed sizes no
 * larger than it, biggest first (so a nearly full widget still takes a compact block).
 */
export const placementSizes = (type: string): BlockSize[] => {
  const preferred = defaultBlockSize(type);
  const area = (item: BlockSize) => item.width * item.height;
  const smaller = allowedBlockSizes(type)
    .filter(
      (item) =>
        area(item) <= area(preferred) &&
        !(item.width === preferred.width && item.height === preferred.height),
    )
    .sort((left, right) => area(right) - area(left) || right.width - left.width);
  return [preferred, ...smaller];
};

/**
 * Layout family for a block size: `tiny` 1×1 tile, `strip` 2–3×1, `wide` 4×1, `card` 2–3 columns
 * × 2+ rows (the classic block look), `large` 4 columns × 2+ rows. A block without a dedicated
 * `large` layout renders its `card` layout there.
 */
export type BlockVariant = 'tiny' | 'strip' | 'wide' | 'card' | 'large';

export const blockVariant = (width: number, height: number): BlockVariant => {
  if (width === 1) return 'tiny';
  if (height === 1) return width >= 4 ? 'wide' : 'strip';
  return width >= 4 ? 'large' : 'card';
};

export const allowedBlockSizes = (type: string) => BLOCK_SIZES[type] ?? LEGACY_SIZES;

export const isAllowedBlockSize = (type: string, width: number, height: number) =>
  allowedBlockSizes(type).some((item) => item.width === width && item.height === height);

/**
 * The allowed size closest to what the user dragged to (in cells), preferring sizes that fit the
 * space available from the block's position. Ties go to the smaller block.
 */
export const snapToAllowedSize = (
  type: string,
  width: number,
  height: number,
  { maxWidth = MAX_BLOCK_WIDTH, maxHeight = MAX_BLOCK_HEIGHT } = {},
): BlockSize => {
  const candidates = allowedBlockSizes(type);
  const fitting = candidates.filter((item) => item.width <= maxWidth && item.height <= maxHeight);
  const pool = fitting.length ? fitting : candidates;
  return pool.reduce((best, item) => {
    const distance = Math.abs(item.width - width) + Math.abs(item.height - height);
    const bestDistance = Math.abs(best.width - width) + Math.abs(best.height - height);
    if (distance !== bestDistance) return distance < bestDistance ? item : best;
    return item.width * item.height < best.width * best.height ? item : best;
  });
};
