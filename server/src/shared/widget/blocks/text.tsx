import type { BlockRenderer } from './context.js';
import { TEXT_BLOCK_LINE_HEIGHT } from '../geometry.js';
import { MultilineText, asString } from '../svgPrimitives.js';
import { wrapText } from './parts.js';

// Text fills its box: the largest size (up to 40px) at which the wrapped text fits, centred
// vertically, in every allowed size.
export const renderText: BlockRenderer = ({ config, labels, frame, tokens }) => {
  const align = config.align === 'center' || config.align === 'right' ? config.align : 'left';
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const x = align === 'center' ? frame.width / 2 : align === 'right' ? frame.width : 0;
  const value = asString(config.text, labels.defaultText);
  const style = { weight: 800, letterSpacing: -0.05 };
  let size = 12;
  let lines = wrapText(value, frame.width, size, {
    ...style,
    maxLines: Math.max(Math.floor(frame.height / (size * TEXT_BLOCK_LINE_HEIGHT)), 1),
  });
  for (let candidate = Math.min(40, Math.floor(frame.height)); candidate > 12; candidate -= 1) {
    const wrapped = wrapText(value, frame.width, candidate, style);
    if (wrapped.length * candidate * TEXT_BLOCK_LINE_HEIGHT <= frame.height) {
      size = candidate;
      lines = wrapped;
      break;
    }
  }
  const top = Math.max((frame.height - lines.length * size * TEXT_BLOCK_LINE_HEIGHT) / 2, 0);
  return (
    <MultilineText
      x={x}
      top={top}
      lineHeight={TEXT_BLOCK_LINE_HEIGHT}
      lines={lines}
      fill={tokens.ink}
      size={size}
      weight={800}
      anchor={anchor}
      letterSpacing="-0.05em"
    />
  );
};
