// @types/css-tree only declares the package root. We import subpaths to keep the
// service-worker bundle at ~23 KB gzip instead of ~56 KB (the root pulls in the lexer
// and its syntax data). See technical-research §9.
declare module 'css-tree/parser' {
  const parse: typeof import('css-tree').parse;
  export default parse;
}
declare module 'css-tree/walker' {
  const walk: typeof import('css-tree').walk;
  export default walk;
}
declare module 'css-tree/generator' {
  const generate: typeof import('css-tree').generate;
  export default generate;
}
declare module 'css-tree/tokenizer' {
  export const tokenize: typeof import('css-tree').tokenize;
  export const tokenTypes: typeof import('css-tree').tokenTypes;
}
declare module 'css-tree/utils' {
  export const List: typeof import('css-tree').List;
  export const clone: typeof import('css-tree').clone;
}
