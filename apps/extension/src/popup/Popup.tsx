import { BRAND } from '@reskin/brand';
import type { Request, SettingValue } from '@reskin/schema';
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { type AppState, RequestError, type SiteView, send } from '../shared/messages';
import { SettingControl } from './SettingControl';
import { popupView } from './view';

interface Props {
  /** The active tab's URL, when the browser reveals it (see view.ts). */
  tabUrl: string | undefined;
  version: string;
}

export function Popup({ tabUrl, version }: Props) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (request: Request) => {
    try {
      setState(await send(request));
      setError(null);
    } catch (e) {
      setError(e instanceof RequestError ? e.message : 'Something went wrong');
    }
  }, []);

  useEffect(() => {
    void run({ type: 'getState' });
  }, [run]);

  /** Permission requests must start inside the click handler (user gesture). */
  const enable = async (site: SiteView) => {
    try {
      const granted = await browser.permissions.request({ origins: site.origins });
      if (!granted) {
        setError(`Access to ${site.name} was not granted.`);
        return;
      }
    } catch {
      setError('The browser refused the permission request.');
      return;
    }
    await run({ type: 'setSiteEnabled', adapterId: site.adapterId, enabled: true });
  };

  if (!state) {
    return (
      <main className="popup">
        <Header version={version} />
        {error ? <p className="banner error">{error}</p> : <p className="muted">Loading…</p>}
      </main>
    );
  }

  const view = popupView(state, tabUrl);
  return (
    <main className="popup">
      <Header version={version} />
      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}
      {view.kind === 'site' && (
        <SitePanel
          site={view.site}
          host={view.host}
          sensitive={view.sensitive}
          run={run}
          enable={enable}
        />
      )}
      {view.kind === 'enable' && (
        <section aria-labelledby="enable-heading">
          <h2 id="enable-heading">Enable a site</h2>
          <p className="muted">
            {BRAND.name} only works on sites you turn on. Or open a supported site and click the
            toolbar icon there.
          </p>
          <ul className="site-list">
            {view.sites.map((s) => (
              <li key={s.adapterId}>
                <span>{s.name}</span>
                <button type="button" onClick={() => void enable(s)}>
                  Enable
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {view.kind === 'unsupported' && (
        <section>
          <h2>Not supported here</h2>
          <p className="muted">
            {BRAND.name} works on {view.sites.map((s) => s.name).join(', ')}. Other sites aren't
            supported yet.
          </p>
        </section>
      )}
      <footer>
        <label>
          <input
            type="checkbox"
            checked={state.prefs.paused}
            onChange={(e) => void run({ type: 'setPaused', paused: e.currentTarget.checked })}
          />
          Pause everywhere
        </label>
      </footer>
    </main>
  );
}

function Header({ version }: { version: string }) {
  return (
    <header>
      <h1>{BRAND.name}</h1>
      <span className="version">v{version}</span>
    </header>
  );
}

interface SitePanelProps {
  site: SiteView;
  host: string;
  sensitive: boolean;
  run: (request: Request) => Promise<void>;
  enable: (site: SiteView) => Promise<void>;
}

function SitePanel({ site, host, sensitive, run, enable }: SitePanelProps) {
  const active = site.templates.find((t) => t.id === site.templateId);
  const setSetting = (id: string, value: SettingValue) => {
    if (active) void run({ type: 'setSettings', templateId: active.id, values: { [id]: value } });
  };

  if (!site.granted) {
    return (
      <section>
        <h2>{host}</h2>
        <p className="muted">{site.name} is supported. Turn it on to choose a template.</p>
        <button type="button" onClick={() => void enable(site)}>
          Enable on {host}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="site-heading">
      <div className="site-head">
        <h2 id="site-heading">{host}</h2>
        <label className="switch">
          <input
            type="checkbox"
            checked={site.enabled}
            onChange={(e) =>
              void run({
                type: 'setSiteEnabled',
                adapterId: site.adapterId,
                enabled: e.currentTarget.checked,
              })
            }
          />
          Use on this site
        </label>
      </div>
      {sensitive && <p className="banner">Templates are paused on this page.</p>}
      {site.problem && (
        <p className="banner error">This template couldn't be applied: {site.problem}</p>
      )}
      {site.enabled && (
        <>
          {active && (
            <div className="template">
              <p className="template-name">
                {active.name} <span className="version">v{active.version}</span>
              </p>
              <p className="muted">{active.summary}</p>
              {active.variants.length > 0 && (
                <div className="setting">
                  <label htmlFor="variant">Variant</label>
                  <select
                    id="variant"
                    value={site.variantId ?? ''}
                    onChange={(e) =>
                      void run({
                        type: 'setTemplate',
                        adapterId: site.adapterId,
                        templateId: active.id,
                        ...(e.currentTarget.value ? { variantId: e.currentTarget.value } : {}),
                      })
                    }
                  >
                    <option value="">Default</option>
                    {active.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {active.settings.map((s) => (
                <SettingControl
                  key={s.id}
                  setting={s}
                  value={site.settings[s.id]}
                  onChange={(v) => setSetting(s.id, v)}
                />
              ))}
              {active.settings.length > 0 && (
                <button
                  type="button"
                  className="link"
                  onClick={() => void run({ type: 'resetSettings', templateId: active.id })}
                >
                  Reset settings
                </button>
              )}
            </div>
          )}
          <fieldset className="templates">
            <legend>Template</legend>
            <label>
              <input
                type="radio"
                name="template"
                checked={site.templateId === null}
                onChange={() =>
                  void run({ type: 'setTemplate', adapterId: site.adapterId, templateId: null })
                }
              />
              Original site
            </label>
            {site.templates.map((t) => (
              <label key={t.id}>
                <input
                  type="radio"
                  name="template"
                  checked={site.templateId === t.id}
                  onChange={() =>
                    void run({ type: 'setTemplate', adapterId: site.adapterId, templateId: t.id })
                  }
                />
                {t.name}
              </label>
            ))}
          </fieldset>
        </>
      )}
    </section>
  );
}
