// Article update dates, read from the git history (used by the build and by the post-build checks).
import { execFileSync } from 'node:child_process';

// Commits before this date come from converting the printed issues and do not count as updates.
// Change it to the launch day if it moves.
export const LAUNCH_DATE = '2026-11-12';

const git = (...args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

let fullHistory: boolean | undefined;
const hasFullHistory = () => {
  // In a shallow clone every date would be the date of the last commit, so it is better to give none.
  try {
    fullHistory ??= git('rev-parse', '--is-shallow-repository') === 'false';
  } catch {
    fullHistory = false;
  }
  return fullHistory;
};

/** Day (YYYY-MM-DD) of the last commit after the launch that touched the file, or undefined. */
export function lastUpdated(file: string): string | undefined {
  if (!hasFullHistory()) return undefined;
  return git('log', '-1', '--format=%cs', `--since=${LAUNCH_DATE}T00:00:00Z`, '--', file) || undefined;
}
