// Which sizes (in grid cells) each block type supports. A block only offers sizes it has a
// design for; the editor snaps corner-resizing to these and the server rejects anything else.
import { MAX_BLOCK_HEIGHT, MAX_BLOCK_WIDTH } from './geometry.js';

export type BlockSize = { width: number; height: number };

const size = (width: number, height: number): BlockSize => ({ width, height });

// The 2-column grid's sizes, doubled: what every block could do before size variants.
const LEGACY_SIZES = [size(2, 2), size(2, 4), size(4, 2), size(4, 4)];

export const BLOCK_SIZES: Record<string, BlockSize[]> = {
  text: LEGACY_SIZES,
  'github-stats': LEGACY_SIZES,
  'github-langs': LEGACY_SIZES,
  'github-commits': LEGACY_SIZES,
  'github-prs': LEGACY_SIZES,
  'github-status': LEGACY_SIZES,
  'leetcode-stats': LEGACY_SIZES,
};

export const DEFAULT_BLOCK_SIZE: BlockSize = size(2, 2);

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
