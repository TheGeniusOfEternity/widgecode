import type { BlockRenderer } from './context.js';
import { BLOCK_LINE_HEIGHT } from '../geometry.js';
import { formatStatValue } from '../theme.js';
import {
  MultilineText,
  StatsRow,
  SvgText,
  asString,
  baseline,
  clamp,
  fitText,
  imageUrl,
  safeId,
  statsRowHeight,
  type StatItem,
} from '../svgPrimitives.js';
import { Avatar, BigStat, fitFontSize, wrapText } from './parts.js';

const avatarOf = (data: Record<string, unknown>, avatarDataUri?: string) =>
  avatarDataUri ?? imageUrl(data.avatarUrl);

// 1×1: avatar and followers.
const tiny: BlockRenderer = ({ block, data, labels, frame, tokens, avatarDataUri }) => {
  const avatar = Math.round(Math.min(44, frame.height * 0.42));
  return (
    <>
      <Avatar
        id={block.id}
        x={(frame.width - avatar) / 2}
        y={0}
        size={avatar}
        href={avatarOf(data, avatarDataUri)}
        tokens={tokens}
      />
      <BigStat
        x={frame.width / 2}
        top={avatar + 6}
        width={frame.width}
        value={data.followers}
        label={labels.followers}
        tokens={tokens}
        maxSize={22}
        labelSize={10}
        anchor="middle"
      />
    </>
  );
};

// 2×1: avatar, name, handle and a one-line summary.
const strip: BlockRenderer = ({
  block,
  data,
  labels,
  t,
  frame,
  tokens,
  username,
  avatarDataUri,
}) => {
  const avatar = Math.round(Math.min(56, frame.height));
  const x = avatar + 12;
  const width = frame.width - x;
  const summary = `${formatStatValue(data.publicRepositories)} ${labels.repositories.toLowerCase()} · ${formatStatValue(data.followers)} ${labels.followers.toLowerCase()}`;
  const columnHeight = (t.heading + t.meta * 2) * BLOCK_LINE_HEIGHT + 8;
  const top = (frame.height - columnHeight) / 2;
  return (
    <>
      <Avatar
        id={block.id}
        x={0}
        y={(frame.height - avatar) / 2}
        size={avatar}
        href={avatarOf(data, avatarDataUri)}
        tokens={tokens}
      />
      <SvgText
        x={x}
        y={baseline(top, t.heading)}
        value={fitText(asString(data.name, labels.githubProfile), width, t.heading, 800)}
        fill={tokens.ink}
        size={t.heading}
        weight={800}
      />
      <SvgText
        x={x}
        y={baseline(top + t.heading * BLOCK_LINE_HEIGHT + 2, t.meta)}
        value={fitText(`@${asString(data.username, username || 'username')}`, width, t.meta)}
        fill={tokens.ink}
        size={t.meta}
        opacity={0.6}
      />
      <SvgText
        x={x}
        y={baseline(top + (t.heading + t.meta) * BLOCK_LINE_HEIGHT + 8, t.meta)}
        value={fitText(summary, width, t.meta)}
        fill={tokens.ink}
        size={t.meta}
        weight={600}
        opacity={0.8}
      />
    </>
  );
};

const profileStats = (
  config: Record<string, unknown>,
  data: Record<string, unknown>,
  labels: { repositories: string; followers: string; following: string },
): StatItem[] =>
  [
    config.showRepositories !== false
      ? { label: labels.repositories, value: data.publicRepositories }
      : null,
    config.showFollowers !== false ? { label: labels.followers, value: data.followers } : null,
    config.showFollowing !== false ? { label: labels.following, value: data.following } : null,
  ].filter((item) => item !== null);

// 4×1: identity on the left, stats on the right.
const wide: BlockRenderer = ({
  block,
  config,
  data,
  labels,
  t,
  frame,
  tokens,
  username,
  avatarDataUri,
}) => {
  const avatar = Math.round(Math.min(64, frame.height));
  const x = avatar + 12;
  const identityWidth = frame.width * 0.38 - x;
  const stats = profileStats(config, data, labels);
  const statsX = frame.width * 0.4;
  const statsWidth = frame.width - statsX;
  const columnWidth = (statsWidth - t.columnGap * (stats.length - 1)) / Math.max(stats.length, 1);
  const identityTop = (frame.height - (t.heading + t.meta) * BLOCK_LINE_HEIGHT - 2) / 2;
  const statsTop = (frame.height - statsRowHeight(t)) / 2;
  return (
    <>
      <Avatar
        id={block.id}
        x={0}
        y={(frame.height - avatar) / 2}
        size={avatar}
        href={avatarOf(data, avatarDataUri)}
        tokens={tokens}
      />
      <SvgText
        x={x}
        y={baseline(identityTop, t.heading)}
        value={fitText(asString(data.name, labels.githubProfile), identityWidth, t.heading, 800)}
        fill={tokens.ink}
        size={t.heading}
        weight={800}
      />
      <SvgText
        x={x}
        y={baseline(identityTop + t.heading * BLOCK_LINE_HEIGHT + 2, t.meta)}
        value={fitText(
          `@${asString(data.username, username || 'username')}`,
          identityWidth,
          t.meta,
        )}
        fill={tokens.ink}
        size={t.meta}
        opacity={0.6}
      />
      {stats.map((item, index) => (
        <BigStat
          key={item.label}
          x={statsX + index * (columnWidth + t.columnGap)}
          top={statsTop}
          width={columnWidth}
          value={item.value}
          label={item.label}
          tokens={tokens}
          maxSize={t.statValue}
          labelSize={t.meta}
        />
      ))}
    </>
  );
};

// 4×2: big avatar, name, handle, bio and stats along the bottom.
const large: BlockRenderer = ({
  block,
  config,
  data,
  labels,
  t,
  frame,
  tokens,
  username,
  avatarDataUri,
}) => {
  const avatar = Math.round(Math.min(88, frame.height * 0.45));
  const x = avatar + 16;
  const width = frame.width - x;
  const name = asString(data.name, labels.githubProfile);
  const nameSize = fitFontSize(name, width, { max: 26, min: t.heading });
  const bio = asString(data.bio);
  const bioSize = 13;
  const bioLines = bio ? wrapText(bio, width, bioSize, { maxLines: 2 }) : [];
  const stats = profileStats(config, data, labels);
  return (
    <>
      <Avatar
        id={block.id}
        x={0}
        y={0}
        size={avatar}
        href={avatarOf(data, avatarDataUri)}
        tokens={tokens}
      />
      <SvgText
        x={x}
        y={baseline(0, nameSize)}
        value={fitText(name, width, nameSize, 800)}
        fill={tokens.ink}
        size={nameSize}
        weight={800}
        letterSpacing="-0.03em"
      />
      <SvgText
        x={x}
        y={baseline(nameSize * BLOCK_LINE_HEIGHT + 2, t.meta)}
        value={fitText(`@${asString(data.username, username || 'username')}`, width, t.meta)}
        fill={tokens.ink}
        size={t.meta}
        opacity={0.6}
      />
      <MultilineText
        x={x}
        top={(nameSize + t.meta) * BLOCK_LINE_HEIGHT + 10}
        lineHeight={1.35}
        lines={bioLines}
        fill={tokens.ink}
        size={bioSize}
        opacity={0.8}
      />
      {stats.length > 0 && (
        <StatsRow
          top={frame.height - statsRowHeight(t)}
          items={stats}
          frame={frame}
          tokens={tokens}
        />
      )}
    </>
  );
};

const card: BlockRenderer = ({
  block,
  config,
  data,
  labels,
  t,
  frame,
  tokens,
  username,
  avatarDataUri,
}) => {
  const avatarHref = avatarDataUri ?? imageUrl(data.avatarUrl);
  const avatarId = `avatar-${safeId(block.id)}`;
  const tightGap = clamp(frame.width / 100, 2, 3);
  const textColumnHeight = t.heading * BLOCK_LINE_HEIGHT + tightGap + t.meta * BLOCK_LINE_HEIGHT;
  const headingHeight = Math.max(t.avatar, textColumnHeight);
  const avatarY = (headingHeight - t.avatar) / 2;
  const textTop = (headingHeight - textColumnHeight) / 2;
  const textX = t.avatar + t.headingGap;
  const textWidth = frame.width - textX;
  const stats = [
    config.showRepositories !== false
      ? { label: labels.repositories, value: data.publicRepositories }
      : null,
    config.showFollowers !== false ? { label: labels.followers, value: data.followers } : null,
    config.showFollowing !== false ? { label: labels.following, value: data.following } : null,
  ].filter((item): item is StatItem => item !== null);
  return (
    <>
      <rect
        y={avatarY}
        width={t.avatar}
        height={t.avatar}
        rx={14}
        fill={tokens.accent}
        fillOpacity={0.22}
      />
      {avatarHref && (
        <>
          <clipPath id={avatarId}>
            <rect y={avatarY} width={t.avatar} height={t.avatar} rx={14} />
          </clipPath>
          <image
            href={avatarHref}
            y={avatarY}
            width={t.avatar}
            height={t.avatar}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${avatarId})`}
          />
        </>
      )}
      <SvgText
        x={textX}
        y={baseline(textTop, t.heading)}
        value={fitText(asString(data.name, labels.githubProfile), textWidth, t.heading, 800)}
        fill={tokens.ink}
        size={t.heading}
        weight={800}
      />
      <SvgText
        x={textX}
        y={baseline(textTop + t.heading * BLOCK_LINE_HEIGHT + tightGap, t.meta)}
        value={fitText(`@${asString(data.username, username || 'username')}`, textWidth, t.meta)}
        fill={tokens.ink}
        size={t.meta}
        opacity={0.6}
      />
      {stats.length > 0 && (
        <StatsRow top={headingHeight + t.sectionGap} items={stats} frame={frame} tokens={tokens} />
      )}
    </>
  );
};

export const renderGithubStats: BlockRenderer = (context) => {
  if (context.variant === 'tiny') return tiny(context);
  if (context.variant === 'strip') return strip(context);
  if (context.variant === 'wide') return wide(context);
  if (context.variant === 'large') return large(context);
  return card(context);
};
