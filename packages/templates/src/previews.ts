/**
 * Preview images of the bundled templates, for extension pages (welcome, library).
 * Vite emits them as files of the extension package; they are never exposed to
 * websites (no `web_accessible_resources`, security-model T8). Kept out of
 * `index.ts` so the background bundle doesn't carry them.
 */
import calmAfter from '../calm-youtube/previews/after.jpg?url';
import calmBefore from '../calm-youtube/previews/before.jpg?url';
import calmCover from '../calm-youtube/previews/cover.jpg?url';
import compactAfter from '../compact-youtube/previews/after.jpg?url';
import compactBefore from '../compact-youtube/previews/before.jpg?url';
import compactCover from '../compact-youtube/previews/cover.jpg?url';
import focusAfter from '../focus-youtube/previews/after.jpg?url';
import focusBefore from '../focus-youtube/previews/before.jpg?url';
import focusCover from '../focus-youtube/previews/cover.jpg?url';

export interface TemplatePreviews {
  cover: string;
  before: string;
  after: string;
}

export const BUNDLED_PREVIEWS: Readonly<Record<string, TemplatePreviews>> = {
  'reskin/focus-youtube': { cover: focusCover, before: focusBefore, after: focusAfter },
  'reskin/compact-youtube': { cover: compactCover, before: compactBefore, after: compactAfter },
  'reskin/calm-youtube': { cover: calmCover, before: calmBefore, after: calmAfter },
};
