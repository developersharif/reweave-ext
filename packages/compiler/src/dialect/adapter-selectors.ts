/** Parses and checks adapter component selectors once per adapter object. */
import { type Adapter, CODES, type Diagnostic, diag } from '@reskin/schema';
import { type CssNode, clone, parse, type SelectorList, walk } from '../css/csstree.ts';

export interface ParsedComponent {
  id: string;
  selector: SelectorList;
  protected: boolean;
  /** Element names, ids and classes in the selector, used to spot raw selectors that target a protected component. */
  keys: ReadonlySet<string>;
}

export interface ParsedAdapter {
  components: ReadonlyMap<string, ParsedComponent>;
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
  const parsed = { components, diagnostics };
  cache.set(adapter, parsed);
  return parsed;
}

/** A fresh copy of a component's selector list, safe to splice into another AST. */
export const componentSelector = (c: ParsedComponent): SelectorList =>
  clone(c.selector) as SelectorList;
