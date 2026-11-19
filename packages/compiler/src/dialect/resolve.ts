/**
 * Dialect resolver (template-schema §4): rewrites a sanitized AST in place.
 *   :--name        → :is(<adapter selector list>)
 *   token(a-b)     → var(--rk-a-b)
 *   setting(id)    → var(--rk-s-id)          (range / color / font settings)
 *   asset(id)      → url("data:…")
 *   @setting …{}   → block kept or dropped for the given setting values
 * Every construct is validated even inside @setting blocks that end up dropped.
 */
import {
  type Adapter,
  CODES,
  type Diagnostic,
  diag,
  SELECT_VALUE,
  SETTING_ID,
  type Setting,
  type SettingValues,
  settingCssVar,
  tokenCssVar,
  tokenFromDialect,
} from '@reskin/schema';
import {
  type Atrule,
  type CssNode,
  type FunctionNode,
  List,
  type ListItem,
  type StyleSheet,
  type WalkContext,
  walk,
} from '../css/csstree.ts';
import { componentSelector, parseAdapter, simpleSelectorKey } from './adapter-selectors.ts';

export interface ResolveContext {
  file: string;
  adapter: Adapter;
  settings: readonly Setting[];
  /** Effective value for every setting (see `resolveSettingValues`). */
  values: Readonly<SettingValues>;
  /** Asset id → `data:` URI for every asset declared in the manifest. */
  assets: Readonly<Record<string, string>>;
}

export interface ResolveResult {
  diagnostics: Diagnostic[];
  rawSelectors: boolean;
  components: Set<string>;
  assets: Set<string>;
}

/** Elements every page has; selecting them doesn't make a template fragile. */
const UNIVERSAL_ELEMENTS = new Set(['html', 'body', '*']);
const DATA_URI =
  /^data:(?:font\/woff2|image\/(?:webp|png|avif|svg\+xml));base64,[A-Za-z0-9+/]+={0,2}$/;
const BOOLEAN_PRELUDE = new RegExp(`^(!?)(${SETTING_ID.source.slice(1, -1)})$`);
const SELECT_PRELUDE = new RegExp(
  `^(${SETTING_ID.source.slice(1, -1)})\\s*=\\s*(${SELECT_VALUE.source.slice(1, -1)})$`,
);

const isComponent = (n: CssNode): n is CssNode & { type: 'PseudoClassSelector'; name: string } =>
  n.type === 'PseudoClassSelector' && n.name.startsWith('--');

function singleIdent(fn: FunctionNode): string | null {
  const args = fn.children.toArray();
  return args.length === 1 && args[0]?.type === 'Identifier' ? args[0].name : null;
}

export function resolveDialect(ast: StyleSheet, ctx: ResolveContext): ResolveResult {
  const out: Diagnostic[] = [];
  const pos = (n: CssNode) =>
    n.loc
      ? { file: ctx.file, line: n.loc.start.line, column: n.loc.start.column }
      : { file: ctx.file };
  const err = (code: Diagnostic['code'], message: string, n: CssNode) =>
    out.push(diag(code, 'error', message, pos(n)));

  const { components } = parseAdapter(ctx.adapter);
  const protectedKeys = new Map<string, string>();
  for (const c of components.values()) {
    if (c.protected) for (const k of c.keys) protectedKeys.set(k, c.id);
  }
  const settingById = new Map(ctx.settings.map((s) => [s.id, s]));
  const result: ResolveResult = {
    diagnostics: out,
    rawSelectors: false,
    components: new Set(),
    assets: new Set(),
  };
  const settingBlocks: {
    item: ListItem<CssNode>;
    list: List<CssNode>;
    node: Atrule;
    active: boolean;
  }[] = [];
  let keyframes = 0;

  // Hand-rolled recursion: this runs once per selector, and walk() setup costs add up on big files.
  const checkSelector = (n: CssNode): void => {
    if (isComponent(n)) return;
    const raw =
      n.type === 'ClassSelector' ||
      n.type === 'IdSelector' ||
      n.type === 'AttributeSelector' ||
      (n.type === 'TypeSelector' && !UNIVERSAL_ELEMENTS.has(n.name.toLowerCase()));
    if (raw) {
      result.rawSelectors = true;
      const key = simpleSelectorKey(n);
      const owner = key ? protectedKeys.get(key) : undefined;
      if (owner)
        err(
          CODES.PROTECTED_COMPONENT_STYLED,
          `This selector targets protected component "${owner}"`,
          n,
        );
    }
    const children = (n as { children?: List<CssNode> | null }).children;
    if (children && typeof children === 'object' && Symbol.iterator in children)
      for (const c of children) checkSelector(c);
  };

  const settingPrelude = (node: Atrule): boolean | null => {
    const text = node.prelude?.type === 'Raw' ? node.prelude.value.trim() : '';
    if (!node.block) {
      err(CODES.DIALECT_SETTING_PRELUDE, '@setting needs a { … } block', node);
      return null;
    }
    const bool = BOOLEAN_PRELUDE.exec(text);
    const select = bool ? null : SELECT_PRELUDE.exec(text);
    const id = bool?.[2] ?? select?.[1];
    if (!id) {
      err(
        CODES.DIALECT_SETTING_PRELUDE,
        `Expected "@setting id", "@setting !id" or "@setting id = value", got "@setting ${text}"`,
        node,
      );
      return null;
    }
    const s = settingById.get(id);
    if (!s) {
      err(CODES.DIALECT_UNKNOWN_SETTING, `Unknown setting "${id}"`, node);
      return null;
    }
    if (bool) {
      if (s.type !== 'boolean') {
        err(
          CODES.DIALECT_SETTING_TYPE,
          `"@setting ${id}" needs a boolean setting; for select settings write "@setting ${id} = <value>"`,
          node,
        );
        return null;
      }
      return (ctx.values[id] === true) !== (bool[1] === '!');
    }
    const value = select?.[2] ?? '';
    if (s.type !== 'select') {
      err(CODES.DIALECT_SETTING_TYPE, `"@setting ${id} = …" needs a select setting`, node);
      return null;
    }
    if (!s.options.some((o) => o.value === value)) {
      err(CODES.DIALECT_SETTING_PRELUDE, `"${value}" is not an option of "${id}"`, node);
      return null;
    }
    return ctx.values[id] === value;
  };

  const resolveFunction = (fn: FunctionNode, item: ListItem<CssNode>, list: List<CssNode>) => {
    const name = fn.name.toLowerCase();
    if (name !== 'token' && name !== 'setting' && name !== 'asset') return;
    const arg = singleIdent(fn);
    if (arg === null) {
      err(
        CODES.DIALECT_BAD_ARGUMENT,
        `${name}() takes exactly one name, e.g. ${name}(${name === 'token' ? 'color-bg' : 'myId'})`,
        fn,
      );
      return;
    }
    if (name === 'token') {
      const token = tokenFromDialect(arg);
      if (!token)
        return err(CODES.DIALECT_UNKNOWN_TOKEN, `Unknown token "${arg}" (standard/v1)`, fn);
      fn.name = 'var';
      fn.children = new List<CssNode>().appendData({
        type: 'Identifier',
        name: tokenCssVar(token),
      });
      return;
    }
    if (name === 'setting') {
      const s = settingById.get(arg);
      if (!s) return err(CODES.DIALECT_UNKNOWN_SETTING, `Unknown setting "${arg}"`, fn);
      if (s.type !== 'range' && s.type !== 'color' && s.type !== 'font')
        return err(
          CODES.DIALECT_SETTING_TYPE,
          `setting(${arg}) needs a range, color or font setting; use @setting blocks for ${s.type}`,
          fn,
        );
      fn.name = 'var';
      fn.children = new List<CssNode>().appendData({
        type: 'Identifier',
        name: settingCssVar(arg),
      });
      return;
    }
    if (!Object.hasOwn(ctx.assets, arg))
      return err(CODES.DIALECT_UNKNOWN_ASSET, `Unknown asset "${arg}"`, fn);
    const uri = ctx.assets[arg] ?? '';
    if (!DATA_URI.test(uri))
      return err(
        CODES.ASSET_DATA_INVALID,
        `Asset "${arg}" is not a base64 woff2/webp/png/avif/svg data URI`,
        fn,
      );
    result.assets.add(arg);
    list.replace(item, list.createItem({ type: 'Url', value: uri }));
  };

  walk(ast, {
    enter(this: WalkContext, node: CssNode, item: ListItem<CssNode>, list: List<CssNode>) {
      if (node.type === 'Atrule' && node.name.toLowerCase() === 'keyframes') keyframes++;
      if (node.type === 'Rule' && keyframes === 0 && node.prelude.type === 'SelectorList') {
        for (const selector of node.prelude.children) checkSelector(selector);
      }
      if (isComponent(node)) {
        const id = node.name.slice(2);
        const c = components.get(id);
        if (!c)
          return err(
            CODES.DIALECT_UNKNOWN_COMPONENT,
            `Adapter "${ctx.adapter.id}" has no component "${id}"`,
            node,
          );
        if (c.protected)
          return err(
            CODES.PROTECTED_COMPONENT_STYLED,
            `"${id}" is protected (consent/security UI) and cannot be styled`,
            node,
          );
        result.components.add(id);
        node.name = 'is';
        node.children = new List<CssNode>().appendData(componentSelector(c));
        return this.skip;
      }
      if (node.type === 'Function') resolveFunction(node, item, list);
    },
    leave(node: CssNode, item: ListItem<CssNode>, list: List<CssNode>) {
      if (node.type !== 'Atrule') return;
      const name = node.name.toLowerCase();
      if (name === 'keyframes') keyframes--;
      if (name !== 'setting') return;
      const active = settingPrelude(node);
      if (active !== null && list) settingBlocks.push({ item, list, node, active });
    },
  });

  // Post-order (inner blocks first), so splicing an outer block carries already-resolved children.
  for (const { item, list, node, active } of settingBlocks) {
    if (active && node.block) list.replace(item, node.block.children);
    else list.remove(item);
  }
  return result;
}
