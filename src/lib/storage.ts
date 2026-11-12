// Keys and events for what the site keeps in the reader's browser (localStorage).
// The inline theme script in src/layouts/Base.astro cannot import modules and repeats THEME_KEY.

export const THEME_KEY = 'maismat:theme';
export type Theme = 'light' | 'dark';

const CHALLENGE_PREFIX = 'maismat:challenge:';
/** Value stored for a solved challenge. */
export const SOLVED = 'solved';
export const challengeKey = (id: string) => CHALLENGE_PREFIX + id;
/** The challenge id of a storage key, or null if the key is not a challenge's. */
export const challengeIdFromKey = (key: string) =>
  key.startsWith(CHALLENGE_PREFIX) ? key.slice(CHALLENGE_PREFIX.length) : null;

/** Fired on document when challenges are marked as solved by importing progress. */
export const PROGRESS_EVENT = 'maismat:progress';

export function isSolved(id: string): boolean {
  try {
    return localStorage.getItem(challengeKey(id)) === SOLVED;
  } catch {
    return false;
  }
}

/** @returns false if the browser does not let the site store anything */
export function markSolved(id: string): boolean {
  try {
    localStorage.setItem(challengeKey(id), SOLVED);
    return true;
  } catch {
    return false;
  }
}
