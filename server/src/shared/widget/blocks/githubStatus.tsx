import type { BlockRenderer } from './context.js';
import { BLOCK_LINE_HEIGHT, estimateTextWidth } from '../geometry.js';
import { MultilineText, SvgText, TitleRow, asString, baseline, linesOf } from '../svgPrimitives.js';
import { wrapText } from './parts.js';

// 1×1: the emoji, with a dot when busy.
const tiny: BlockRenderer = ({ data, labels, frame, tokens }) => {
  const emoji = asString(data.emoji);
  const message = asString(data.message);
  if (!emoji) {
    const lines = wrapText(message || labels.noStatus, frame.width, 12, {
      weight: 700,
      maxLines: 4,
    });
    return (
      <MultilineText
        x={frame.width / 2}
        top={(frame.height - lines.length * 12 * BLOCK_LINE_HEIGHT) / 2}
        lineHeight={BLOCK_LINE_HEIGHT}
        lines={lines}
        fill={tokens.ink}
        size={12}
        weight={700}
        anchor="middle"
        opacity={message ? 1 : 0.6}
      />
    );
  }
  const size = Math.round(Math.min(frame.width, frame.height) * 0.5);
  return (
    <>
      <SvgText
        x={frame.width / 2}
        y={baseline((frame.height - size * BLOCK_LINE_HEIGHT) / 2, size)}
        value={emoji}
        fill={tokens.ink}
        size={size}
        anchor="middle"
      />
      {data.busy === true && <circle cx={frame.width - 5} cy={5} r={5} fill={tokens.accent} />}
    </>
  );
};

// 2×1 and 4×1: emoji on the left, message (2 lines / 1 line) and busy flag on the right.
const strips: BlockRenderer = ({ data, labels, t, frame, tokens, variant }) => {
  const emoji = asString(data.emoji);
  const message = asString(data.message) || labels.noStatus;
  const emojiSize = Math.round(Math.min(frame.height * 0.5, variant === 'wide' ? 40 : 34));
  const x = emoji ? emojiSize * 1.35 : 0;
  const width = frame.width - x;
  const lines = wrapText(message, width, t.heading, {
    weight: 700,
    maxLines: variant === 'wide' ? 1 : 2,
  });
  const busy = data.busy === true;
  const textHeight =
    lines.length * t.heading * BLOCK_LINE_HEIGHT + (busy ? t.meta * BLOCK_LINE_HEIGHT + 6 : 0);
  const top = (frame.height - textHeight) / 2;
  return (
    <>
      {emoji && (
        <SvgText
          x={0}
          y={baseline((frame.height - emojiSize * BLOCK_LINE_HEIGHT) / 2, emojiSize)}
          value={emoji}
          fill={tokens.ink}
          size={emojiSize}
        />
      )}
      <MultilineText
        x={x}
        top={top}
        lineHeight={BLOCK_LINE_HEIGHT}
        lines={lines}
        fill={tokens.ink}
        size={t.heading}
        weight={700}
        opacity={asString(data.message) ? 1 : 0.6}
      />
      {busy && (
        <SvgText
          x={x}
          y={baseline(top + lines.length * t.heading * BLOCK_LINE_HEIGHT + 6, t.meta)}
          value={labels.busy}
          fill={tokens.accent}
          size={t.meta}
          weight={700}
        />
      )}
    </>
  );
};

const card: BlockRenderer = ({ data, labels, t, frame, tokens, username }) => {
  const emoji = asString(data.emoji);
  const message = asString(data.message);
  const top = t.heading * BLOCK_LINE_HEIGHT + t.sectionGap;
  const messageTop = emoji ? top + t.text * BLOCK_LINE_HEIGHT + t.headingGap : top;
  const messageLines = message
    ? linesOf(message, Math.floor(frame.width / (t.heading * 0.55)), 3)
    : [];
  const chipTop = messageTop + messageLines.length * t.heading * BLOCK_LINE_HEIGHT + t.headingGap;
  const chipHeight = t.meta * BLOCK_LINE_HEIGHT + 8;
  return (
    <>
      <TitleRow
        title={labels.status}
        meta={`@${asString(data.username, username || 'username')}`}
        frame={frame}
        tokens={tokens}
      />
      {!emoji && !message ? (
        <SvgText
          x={0}
          y={baseline(top, t.meta)}
          value={labels.noStatus}
          fill={tokens.ink}
          size={t.meta}
          opacity={0.6}
        />
      ) : (
        <>
          {emoji && (
            <SvgText
              x={0}
              y={baseline(top, t.text)}
              value={emoji}
              fill={tokens.ink}
              size={t.text}
            />
          )}
          <MultilineText
            x={0}
            top={messageTop}
            lineHeight={BLOCK_LINE_HEIGHT}
            lines={messageLines}
            fill={tokens.ink}
            size={t.heading}
            weight={700}
          />
          {data.busy === true && (
            <g>
              <rect
                y={chipTop}
                width={estimateTextWidth(labels.busy, t.meta, { weight: 700 }) + 20}
                height={chipHeight}
                rx={chipHeight / 2}
                fill={tokens.accent}
                fillOpacity={0.14}
              />
              <SvgText
                x={10}
                y={baseline(chipTop + 4, t.meta)}
                value={labels.busy}
                fill={tokens.accent}
                size={t.meta}
                weight={700}
              />
            </g>
          )}
        </>
      )}
    </>
  );
};

export const renderGithubStatus: BlockRenderer = (context) => {
  if (context.variant === 'tiny') return tiny(context);
  if (context.variant === 'strip' || context.variant === 'wide') return strips(context);
  return card(context);
};
