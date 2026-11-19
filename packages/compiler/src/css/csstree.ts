/** Single import point for css-tree, via subpaths (smaller bundle). */
import generate from 'css-tree/generator';
import parse from 'css-tree/parser';
import { tokenize, tokenTypes } from 'css-tree/tokenizer';
import { clone, List as ListClass } from 'css-tree/utils';
import walk from 'css-tree/walker';

export type {
  Atrule,
  Block,
  CssLocation,
  CssNode,
  Declaration,
  FunctionNode,
  ListItem,
  PseudoClassSelector,
  Rule,
  Selector,
  SelectorList,
  StyleSheet,
  WalkContext,
} from 'css-tree';

export const List = ListClass;
export type List<T> = import('css-tree').List<T>;
export { clone, generate, parse, tokenize, tokenTypes, walk };
