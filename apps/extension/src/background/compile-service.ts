/**
 * Compiles a site's active template and writes `rk:compiled:<adapterId>`, the only
 * key the content script reads (D-021). Writes only when the output hash changes, so
 * open tabs don't re-apply identical CSS.
 */
import { compileTemplate } from '@reskin/compiler';
import { type Diagnostic, isValidSettingValue, type SettingValues } from '@reskin/schema';
import { getCompiled, getSettings, getSites, removeCompiled, setCompiled } from '../shared/storage';
import type { Registry } from './registry';

export type CompileOutcome =
  | { status: 'applied'; hash: string }
  | { status: 'cleared' }
  | { status: 'failed'; reason: string; diagnostics: Diagnostic[] };

/** User values that are still valid for the template's current settings (others are dropped). */
export function validUserSettings(
  reg: Registry,
  templateId: string,
  values: Readonly<Record<string, unknown>>,
): SettingValues {
  const settings = reg.templates.get(templateId)?.manifest.settings ?? [];
  const out: SettingValues = {};
  for (const s of settings) {
    const v = values[s.id];
    if (v !== undefined && isValidSettingValue(s, v)) out[s.id] = v as SettingValues[string];
  }
  return out;
}

export async function recompile(reg: Registry, adapterId: string): Promise<CompileOutcome> {
  const site = (await getSites())[adapterId];
  const adapter = reg.adapters.get(adapterId);
  if (!site?.enabled || !site.templateId || !adapter) {
    await removeCompiled(adapterId);
    return { status: 'cleared' };
  }
  const template = reg.templates.get(site.templateId);
  if (!template) {
    await removeCompiled(adapterId);
    return {
      status: 'failed',
      reason: `Template ${site.templateId} is not installed`,
      diagnostics: [],
    };
  }
  const settings = validUserSettings(reg, site.templateId, await getSettings(site.templateId));
  // A palette that was removed falls back to the template's own colours.
  const palette = site.paletteId ? reg.palettes.get(site.paletteId)?.tokens : undefined;
  const result = compileTemplate({
    manifest: template.manifest,
    sources: template.sources,
    assets: template.assets,
    adapter,
    variant: site.variantId,
    settings,
    ...(palette ? { palette } : {}),
  });
  if (!result.ok || !result.output) {
    await removeCompiled(adapterId);
    const first = result.diagnostics.find((d) => d.severity === 'error');
    return {
      status: 'failed',
      reason: first ? `${first.code}: ${first.message}` : 'Compile failed',
      diagnostics: result.diagnostics,
    };
  }
  if ((await getCompiled(adapterId))?.hash !== result.output.hash) {
    await setCompiled(adapterId, result.output);
  }
  return { status: 'applied', hash: result.output.hash };
}
