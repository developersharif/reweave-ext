/**
 * Single source of truth for user-facing brand strings (D-010).
 * Code identifiers, package names and CSS prefixes must NOT use these values.
 */
export const BRAND = {
  name: 'Reweave',
  shortName: 'Reweave',
  tagline: 'The web, rewoven.',
  description:
    'Community-made redesigns for YouTube and more — kept working when sites change. No tracking.',
  repoUrl: 'https://github.com/developersharif/reweave-ext',
  issuesUrl: 'https://github.com/developersharif/reweave-ext/issues',
} as const;

export type Brand = typeof BRAND;
