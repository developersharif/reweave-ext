/** @reskin/compiler — sanitize and compile templates. Pure: no DOM, no chrome.*, no Node APIs. */
export const PACKAGE_NAME = '@reskin/compiler';

export {
  type CompiledGroup,
  type CompiledTemplate,
  type CompileInput,
  type CompileResult,
  compileTemplate,
  ENGINE_VERSION,
  hashString,
  isSafeMediaQuery,
} from './compile.ts';
export { type ParsedAdapter, parseAdapter } from './dialect/adapter-selectors.ts';
export { type ResolveContext, type ResolveResult, resolveDialect } from './dialect/resolve.ts';
export { LIMITS } from './sanitize/allowlist.ts';
export { type SanitizeResult, sanitizeCss } from './sanitize/sanitize.ts';
export {
  clampRange,
  resolveSettingValues,
  resolveTokens,
  rootDeclarations,
  type TokenMap,
} from './values.ts';
