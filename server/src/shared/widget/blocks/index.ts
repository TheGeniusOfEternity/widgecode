import type { BlockRenderer } from './context.js';
import { renderGithubCommits } from './githubCommits.js';
import { renderGithubLangs } from './githubLangs.js';
import { renderGithubPrs } from './githubPrs.js';
import { renderGithubStats } from './githubStats.js';
import { renderGithubStatus } from './githubStatus.js';
import { renderLeetcode } from './leetcode.js';
import { renderText } from './text.js';

export type { BlockRenderContext, BlockRenderer } from './context.js';

export const blockRenderers: Record<string, BlockRenderer> = {
  text: renderText,
  'github-stats': renderGithubStats,
  'github-langs': renderGithubLangs,
  'github-commits': renderGithubCommits,
  'github-prs': renderGithubPrs,
  'github-status': renderGithubStatus,
  'leetcode-stats': renderLeetcode,
};
