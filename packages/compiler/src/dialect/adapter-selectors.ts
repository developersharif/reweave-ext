/** Parses and checks adapter component selectors once per adapter object. */
import { type Adapter, CODES, type Diagnostic, diag } from '@reskin/schema';
import { type CssNode, clone, generate, parse, type SelectorList, walk } from '../css/csstree.ts';

export interface ParsedComponent {
  id: string;
  selector: SelectorList;
  protected: boolean;
  /** Element names, ids and classes in the selector, used to spot raw selectors that target a protected component. */
  keys: ReadonlySet<string>;
}

export interface ParsedAdapter {
  components: ReadonlyMap<string, ParsedComponent>;
  /** The theme scope selector, re-serialized after parsing (absent if the adapter has no theme or it failed to parse). */
  themeScope?: string;
  diagnostics: Diagnostic[];
}

const cache = new WeakMap<Adapter, ParsedAdapter>();

export const simpleSelectorKey = (node: CssNode): string | null => {
  switch (node.type) {
    case 'TypeSelector':
      return node.name === '*' ? null : node.name.toLowerCase();
    case 'IdSelector':
      return `#${node.name}`;
    case 'ClassSelector':
      return `.${node.name}`;
    default:
      return null;
  }
};

export function parseAdapter(adapter: Adapter): ParsedAdapter {
  const hit = cache.get(adapter);
  if (hit) return hit;
  const components = new Map<string, ParsedComponent>();
  const diagnostics: Diagnostic[] = [];
  for (const [id, c] of Object.entries(adapter.components)) {
    const path = `components.${id}.selector`;
    let failed = false;
    const selector = parse(c.selector, {
      context: 'selectorList',
      onParseError: (e) => {
        failed = true;
        diagnostics.push(
          diag(CODES.CSS_PARSE_ERROR, 'error', `Adapter selector: ${e.message}`, { path }),
        );
      },
    }) as SelectorList;
    const keys = new Set<string>();
    walk(selector, (n) => {
      if (n.type === 'PseudoClassSelector' && n.name.startsWith('--')) {
        failed = true;
        diagnostics.push(
          diag(CODES.DIALECT_BAD_ARGUMENT, 'error', 'Adapter selectors cannot use :--components', {
            path,
          }),
        );
      }
      if (n.type === 'Raw') failed = true;
      const key = simpleSelectorKey(n);
      if (key) keys.add(key);
    });
    if (!failed) components.set(id, { id, selector, protected: c.protected === true, keys });
  }
  const parsed: ParsedAdapter = { components, diagnostics };
  if (adapter.theme) {
    const scope = parseScope(adapter.theme.scope, diagnostics);
    if (scope) parsed.themeScope = scope;
  }
  cache.set(adapter, parsed);
  return parsed;
}

/** Parses the theme scope as a plain selector list (no `:--components`, nothing unparsed). */
function parseScope(text: string, diagnostics: Diagnostic[]): string | null {
  const path = 'theme.scope';
  let failed = false;
  const fail = (message: string) => {
    if (!failed)
      diagnostics.push(diag(CODES.CSS_PARSE_ERROR, 'error', `Theme scope: ${message}`, { path }));
    failed = true;
  };
  let selector: CssNode;
  try {
    selector = parse(text, { context: 'selectorList', onParseError: (e) => fail(e.message) });
  } catch (e) {
    fail(e instanceof Error ? e.message : 'unparsable');
    return null;
  }
  walk(selector, (n) => {
    if (n.type === 'Raw' || (n.type === 'PseudoClassSelector' && n.name.startsWith('--'))) {
      if (!failed)
        diagnostics.push(
          diag(CODES.DIALECT_BAD_ARGUMENT, 'error', 'Theme scope must be a plain selector list', {
            path,
          }),
        );
      failed = true;
    }
  });
  return failed ? null : generate(selector);
}

/** A fresh copy of a component's selector list, safe to splice into another AST. */
export const componentSelector = (c: ParsedComponent): SelectorList =>
  clone(c.selector) as SelectorList;
