/**
 * CSS sanitizer: parse authoring-dialect CSS and walk it against the v1 allowlist.
 * Runs in CI, on the server and again in the extension before compile (security-model §3).
 *
 * Safety properties this relies on:
 * - Output is always *regenerated* from the AST, never copied from source text, so the
 *   browser only ever sees what this walk has approved.
 * - Backslash escapes outside strings are rejected (css-tree keeps `@\69mport` and
 *   `b\61ckground` undecoded, so they would otherwise slip past name checks).
 * - Any parse error fails the file: css-tree's error recovery yields `Raw` nodes that
 *   this walk can't see into.
 */
import { CODES, type Diagnostic, diag, hasErrors } from '@reskin/schema';
import {
  type CssNode,
  type Declaration,
  generate,
  type List,
  type ListItem,
  parse,
  type Rule,
  type StyleSheet,
  tokenize,
  tokenTypes,
  type WalkContext,
  walk,
} from '../css/csstree.ts';
import {
  ALLOWED_AT_RULES,
  AT_RULE_REASONS,
  BROAD_HAS_ANCHORS,
  CONTENT_ONLY_FUNCTIONS,
  FONT_FACE_SRC_FUNCTIONS,
  FORBIDDEN_PROPERTIES,
  LIMITS,
  MAX_TEXT_CHARS,
  PRELUDE_FUNCTIONS,
  RESERVED_PREFIX,
  STRIPPED_AT_RULES,
  TEXT_PROPERTIES,
  VALUE_FUNCTIONS,
} from './allowlist.ts';

export interface SanitizeResult {
  ok: boolean;
  ast: StyleSheet;
  diagnostics: Diagnostic[];
  stats: { bytes: number; selectors: number };
}

interface Pos {
  line: number;
  column: number;
}

export function utf8Length(s: string): number {
  let n = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    n += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return n;
}

function lineMap(source: string): (offset: number) => Pos {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - (starts[lo] ?? 0) + 1 };
  };
}

const at = (node: CssNode): Pos | undefined =>
  node.loc ? { line: node.loc.start.line, column: node.loc.start.column } : undefined;

const DOTTED_TOKEN = /\btoken\(\s*([a-z]+)\.([a-z0-9-]+)\s*\)/gi;

export function sanitizeCss(source: string, file: string): SanitizeResult {
  const out: Diagnostic[] = [];
  const err = (code: Diagnostic['code'], message: string, pos?: Pos) =>
    out.push(diag(code, 'error', message, { file, ...pos }));
  const warn = (code: Diagnostic['code'], message: string, pos?: Pos) =>
    out.push(diag(code, 'warning', message, { file, ...pos }));
  const review = (code: Diagnostic['code'], message: string, pos?: Pos) =>
    out.push(diag(code, 'review', message, { file, ...pos }));

  const bytes = utf8Length(source);
  const stats = { bytes, selectors: 0 };
  if (bytes > LIMITS.totalBytes) {
    err(CODES.CSS_SIZE_LIMIT, `File is ${bytes} bytes; the limit is ${LIMITS.totalBytes}`);
    return { ok: false, ast: parse('') as StyleSheet, diagnostics: out, stats };
  }

  const pos = lineMap(source);

  // 1. Token pass: escapes and malformed tokens.
  let slash = source.indexOf('\\'); // next backslash at or after the current token (-1 = none left)
  tokenize(source, (type, start, end) => {
    if (type === tokenTypes.BadString || type === tokenTypes.BadUrl) {
      err(CODES.CSS_PARSE_ERROR, 'Unterminated string or url()', pos(start));
      return;
    }
    if (slash === -1 || slash >= end) return;
    if (slash < start) slash = source.indexOf('\\', start);
    if (slash === -1 || slash >= end) return;
    if (type === tokenTypes.String || type === tokenTypes.Comment) return;
    err(
      CODES.CSS_ESCAPE_FORBIDDEN,
      `Backslash escapes are only allowed inside strings: "${source.slice(start, end)}"`,
      pos(start),
    );
  });

  for (const m of source.matchAll(DOTTED_TOKEN)) {
    err(
      CODES.DIALECT_BAD_ARGUMENT,
      `Write token(${m[1]}-${m[2]}), not token(${m[1]}.${m[2]}): dots aren't valid inside CSS functions`,
      pos(m.index),
    );
  }

  // 2. Parse.
  let parseErrors = 0;
  const ast = parse(source, {
    positions: true,
    filename: file,
    parseAtrulePrelude: false,
    parseCustomProperty: true,
    onParseError: (e) => {
      parseErrors++;
      err(CODES.CSS_PARSE_ERROR, `${e.message} (nested CSS rules are not supported in v1)`, {
        line: e.line,
        column: e.column,
      });
    },
  }) as StyleSheet;

  // 3. Allowlist walk.
  const mayHaveHas = /:has\(/i.test(source); // skip the selector-tree checks for most files
  const preludes = new WeakSet<CssNode>();
  let fontFaceDepth = 0;
  let keyframesDepth = 0;

  const checkPrelude = (atName: string, text: string, p: Pos | undefined) => {
    tokenize(text, (type, start, end) => {
      const t = text.slice(start, end);
      if (type === tokenTypes.Url || type === tokenTypes.BadUrl) {
        err(CODES.CSS_URL_FORBIDDEN, `url() is not allowed in @${atName}`, p);
      } else if (type === tokenTypes.Function) {
        const fn = t.slice(0, -1).toLowerCase();
        if (fn === 'url') err(CODES.CSS_URL_FORBIDDEN, `url() is not allowed in @${atName}`, p);
        else if (!PRELUDE_FUNCTIONS.has(fn))
          err(CODES.CSS_FUNCTION_FORBIDDEN, `${fn}() is not allowed in @${atName}`, p);
      } else if (
        type === tokenTypes.AtKeyword ||
        type === tokenTypes.LeftCurlyBracket ||
        type === tokenTypes.RightCurlyBracket ||
        type === tokenTypes.Semicolon
      ) {
        err(CODES.CSS_AT_RULE_PRELUDE_FORBIDDEN, `Unexpected "${t}" in @${atName}`, p);
      } else if (type === tokenTypes.Ident && t.toLowerCase().startsWith(RESERVED_PREFIX)) {
        err(CODES.CSS_RESERVED_NAME, `${RESERVED_PREFIX}* names are reserved for the engine`, p);
      }
    });
    if (atName === 'scope' && text.includes(':--')) {
      err(
        CODES.DIALECT_BAD_ARGUMENT,
        'Components (:--name) are not supported in @scope preludes in v1',
        p,
      );
    }
  };

  const checkRule = (rule: Rule) => {
    if (keyframesDepth > 0 || rule.prelude.type !== 'SelectorList') return;
    stats.selectors += rule.prelude.children.size;
    if (mayHaveHas) {
      for (const selector of rule.prelude.children) {
        const depth = hasDepth(selector);
        if (depth > LIMITS.hasDepth)
          err(
            CODES.CSS_HAS_TOO_DEEP,
            `:has() is nested ${depth} levels; the limit is ${LIMITS.hasDepth}`,
            at(selector),
          );
        if (isBroadHas(selector))
          warn(
            CODES.CSS_BROAD_HAS,
            ':has() with a descendant combinator on *, html, body or :root is slow on large pages',
            at(selector),
          );
      }
    }
    checkOverlay(rule, review);
  };

  const checkDeclaration = (decl: Declaration) => {
    const prop = decl.property.toLowerCase();
    if (prop.startsWith(RESERVED_PREFIX))
      err(
        CODES.CSS_RESERVED_NAME,
        `${RESERVED_PREFIX}* custom properties are reserved for the engine`,
        at(decl),
      );
    if (FORBIDDEN_PROPERTIES.has(prop))
      err(CODES.CSS_PROPERTY_FORBIDDEN, `"${prop}" is not allowed`, at(decl));
    if (fontFaceDepth > 0 && prop === 'src' && decl.value.type === 'Value') {
      const ok = decl.value.children
        .toArray()
        .every(
          (n) =>
            (n.type === 'Function' && FONT_FACE_SRC_FUNCTIONS.has(n.name.toLowerCase())) ||
            (n.type === 'Operator' && n.value === ','),
        );
      if (!ok)
        err(
          CODES.CSS_FONT_FACE_SRC,
          '@font-face src may only use asset(<id>) with optional format()/tech()',
          at(decl),
        );
    }
    if (TEXT_PROPERTIES.has(prop) && decl.value.type === 'Value') {
      walk(decl.value, (n) => {
        if (n.type === 'String' && [...n.value].length > MAX_TEXT_CHARS) {
          review(
            CODES.CSS_TEXT_CONTENT,
            `Text "${n.value.slice(0, 60)}" in ${prop} is shown on the page; strings over ${MAX_TEXT_CHARS} characters need human review`,
            at(n),
          );
        }
      });
    }
  };

  walk(ast, {
    enter(this: WalkContext, node: CssNode, item: ListItem<CssNode>, list: List<CssNode>) {
      switch (node.type) {
        case 'Atrule': {
          const name = node.name.toLowerCase();
          if (STRIPPED_AT_RULES.has(name)) {
            warn(CODES.CSS_CHARSET_IGNORED, `@${name} is ignored`, at(node));
            list?.remove(item);
            return this.skip;
          }
          if (!ALLOWED_AT_RULES.has(name)) {
            err(
              CODES.CSS_AT_RULE_FORBIDDEN,
              AT_RULE_REASONS[name] ?? `@${name} is not allowed`,
              at(node),
            );
            return this.skip;
          }
          if (node.prelude) {
            preludes.add(node.prelude);
            if (node.prelude.type === 'Raw') checkPrelude(name, node.prelude.value, at(node));
          }
          if (name === 'font-face') fontFaceDepth++;
          if (name === 'keyframes') keyframesDepth++;
          return;
        }
        case 'Rule':
          checkRule(node);
          return;
        case 'Declaration':
          checkDeclaration(node);
          return;
        case 'Url':
          err(
            CODES.CSS_URL_FORBIDDEN,
            'url() is not allowed; reference bundled files with asset(<id>)',
            at(node),
          );
          return;
        case 'Function': {
          const fn = node.name.toLowerCase();
          if (!VALUE_FUNCTIONS.has(fn))
            err(CODES.CSS_FUNCTION_FORBIDDEN, `${fn}() is not allowed`, at(node));
          else if (
            CONTENT_ONLY_FUNCTIONS.has(fn) &&
            this.declaration?.property.toLowerCase() !== 'content'
          )
            err(CODES.CSS_FUNCTION_FORBIDDEN, `${fn}() is only allowed in content`, at(node));
          return;
        }
        case 'Identifier':
          if (node.name.toLowerCase().startsWith(RESERVED_PREFIX))
            err(
              CODES.CSS_RESERVED_NAME,
              `${RESERVED_PREFIX}* names are reserved; use token() or setting()`,
              at(node),
            );
          return;
        case 'Raw':
          if (!preludes.has(node) && parseErrors === 0)
            err(CODES.CSS_PARSE_ERROR, 'Could not parse this part of the stylesheet', at(node));
          return;
        default:
          return;
      }
    },
    leave(node: CssNode) {
      if (node.type !== 'Atrule') return;
      const name = node.name.toLowerCase();
      if (name === 'font-face') fontFaceDepth--;
      if (name === 'keyframes') keyframesDepth--;
    },
  });

  if (stats.selectors > LIMITS.totalSelectors)
    err(
      CODES.CSS_TOO_MANY_SELECTORS,
      `${stats.selectors} selectors; the limit is ${LIMITS.totalSelectors}`,
    );

  return { ok: !hasErrors(out), ast, diagnostics: out, stats };
}

// --- selector helpers ----------------------------------------------------------

function childrenOf(node: CssNode): CssNode[] {
  const c = (node as { children?: unknown }).children;
  return c && typeof c === 'object' && 'toArray' in c ? (c as List<CssNode>).toArray() : [];
}

export function hasDepth(node: CssNode): number {
  const inner = Math.max(0, ...childrenOf(node).map(hasDepth));
  return node.type === 'PseudoClassSelector' && node.name.toLowerCase() === 'has'
    ? inner + 1
    : inner;
}

function containsDescendantCombinator(node: CssNode): boolean {
  if (node.type === 'Combinator' && node.name === ' ') return true;
  return childrenOf(node).some(containsDescendantCombinator);
}

/** A compound is "narrow" if it has a class, id, attribute, component or specific element name. */
function isBroadHas(selector: CssNode): boolean {
  const compounds: CssNode[][] = [[]];
  for (const n of childrenOf(selector)) {
    if (n.type === 'Combinator') compounds.push([]);
    else compounds[compounds.length - 1]?.push(n);
  }
  return compounds.some((compound) => {
    const narrow = compound.some(
      (n) =>
        n.type === 'ClassSelector' ||
        n.type === 'IdSelector' ||
        n.type === 'AttributeSelector' ||
        (n.type === 'TypeSelector' && !BROAD_HAS_ANCHORS.has(n.name.toLowerCase())) ||
        (n.type === 'PseudoClassSelector' && n.name.startsWith('--')),
    );
    return (
      !narrow &&
      compound.some(
        (n) =>
          n.type === 'PseudoClassSelector' &&
          n.name.toLowerCase() === 'has' &&
          containsDescendantCombinator(n),
      )
    );
  });
}

const OVERLAY_PROPERTIES = new Set(['position', 'pointer-events', 'z-index']);

function checkOverlay(
  rule: Rule,
  review: (code: Diagnostic['code'], message: string, pos?: Pos) => void,
) {
  const values = new Map<string, string>();
  for (const n of rule.block.children) {
    if (n.type !== 'Declaration') continue;
    const prop = n.property.toLowerCase();
    if (OVERLAY_PROPERTIES.has(prop)) values.set(prop, generate(n.value).toLowerCase().trim());
  }
  if (!values.has('position')) return;
  const position = values.get('position');
  const positioned = position === 'fixed' || position === 'absolute';
  const clickThrough = values.get('pointer-events') === 'none' && positioned;
  const zIndex = Number(values.get('z-index'));
  const topmost = position === 'fixed' && Number.isFinite(zIndex) && zIndex >= LIMITS.overlayZIndex;
  if (clickThrough || topmost) {
    review(
      CODES.CSS_OVERLAY,
      clickThrough
        ? 'Positioned element with pointer-events: none can disguise what a click does (decoy overlay)'
        : `Fixed element with z-index ≥ ${LIMITS.overlayZIndex} can cover the page`,
      at(rule),
    );
  }
}
