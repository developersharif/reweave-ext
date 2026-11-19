/**
 * CSS allowlist v1 — template-schema.md §4.1, security-model.md §3.
 * Anything not listed is rejected (fail closed). All names are compared lowercased.
 */

export const ALLOWED_AT_RULES: ReadonlySet<string> = new Set([
  'media',
  'supports',
  'container',
  'layer',
  'keyframes',
  'font-face',
  'property',
  'scope',
  'setting', // dialect
]);

/** Removed with a warning instead of rejected. */
export const STRIPPED_AT_RULES: ReadonlySet<string> = new Set(['charset']);

/** Why the riskiest forbidden at-rules are forbidden (better messages). */
export const AT_RULE_REASONS: Readonly<Record<string, string>> = {
  import: '@import loads a remote stylesheet',
  namespace: '@namespace is not needed for HTML pages',
  document: 'URL scoping belongs in the manifest (targets/routes)',
  '-moz-document': 'URL scoping belongs in the manifest (targets/routes)',
};

export const FORBIDDEN_PROPERTIES: ReadonlySet<string> = new Set([
  'behavior',
  '-ms-behavior',
  '-moz-binding',
  '-webkit-user-modify',
  '-o-link',
  '-o-link-source',
]);

/** Functions allowed inside declaration values. Image/URL loaders are absent on purpose. */
export const VALUE_FUNCTIONS: ReadonlySet<string> = new Set([
  // dialect (resolved by the compiler)
  'token',
  'setting',
  'asset',
  // custom properties / environment
  'var',
  'env',
  // math
  'calc',
  'min',
  'max',
  'clamp',
  'round',
  'mod',
  'rem',
  'abs',
  'sign',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'hypot',
  'log',
  'exp',
  // color
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'color-mix',
  'light-dark',
  // gradients (the only allowed <image> functions)
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
  'repeating-conic-gradient',
  // transforms
  'matrix',
  'matrix3d',
  'translate',
  'translatex',
  'translatey',
  'translatez',
  'translate3d',
  'scale',
  'scalex',
  'scaley',
  'scalez',
  'scale3d',
  'rotate',
  'rotatex',
  'rotatey',
  'rotatez',
  'rotate3d',
  'skew',
  'skewx',
  'skewy',
  'perspective',
  // filters
  'blur',
  'brightness',
  'contrast',
  'drop-shadow',
  'grayscale',
  'hue-rotate',
  'invert',
  'opacity',
  'saturate',
  'sepia',
  // easing
  'cubic-bezier',
  'steps',
  'linear',
  // grid
  'repeat',
  'minmax',
  'fit-content',
  // shapes
  'inset',
  'circle',
  'ellipse',
  'polygon',
  'rect',
  'xywh',
  'path',
  // generated content
  'counter',
  'counters',
  'attr', // only inside `content`, see CONTENT_ONLY_FUNCTIONS
  // anchor positioning / scroll-driven animation
  'anchor',
  'anchor-size',
  'scroll',
  'view',
  // @font-face src hints
  'format',
  'tech',
]);

export const CONTENT_ONLY_FUNCTIONS: ReadonlySet<string> = new Set(['attr']);

/** `@font-face { src: … }` may contain only these. */
export const FONT_FACE_SRC_FUNCTIONS: ReadonlySet<string> = new Set(['asset', 'format', 'tech']);

/** Functions allowed in at-rule preludes (`@supports selector(…)`, `@container style(…)`, `:is()` in `@scope`). */
export const PRELUDE_FUNCTIONS: ReadonlySet<string> = new Set([
  'selector',
  'font-tech',
  'font-format',
  'style',
  'scroll-state',
  'calc',
  'min',
  'max',
  'clamp',
  'is',
  'where',
  'not',
  'has',
  'nth-child',
  'nth-last-child',
  'nth-of-type',
  'nth-last-of-type',
  'lang',
  'dir',
]);

/** Properties whose strings are shown to users → long strings go to human review (UI redress). */
export const TEXT_PROPERTIES: ReadonlySet<string> = new Set([
  'content',
  'quotes',
  'list-style-type',
  'list-style',
]);
export const MAX_TEXT_CHARS = 3;

/** `:has()` anchored on these with a descendant combinator is slow on large pages. */
export const BROAD_HAS_ANCHORS: ReadonlySet<string> = new Set(['*', 'html', 'body', ':root']);

export const LIMITS = {
  /** Per template, all style files together (template-schema §4.1). */
  totalBytes: 256 * 1024,
  totalSelectors: 5000,
  hasDepth: 4,
  /** z-index at or above this on a fixed element is flagged as a possible overlay. */
  overlayZIndex: 10_000,
} as const;

export const RESERVED_PREFIX = '--rk-';
