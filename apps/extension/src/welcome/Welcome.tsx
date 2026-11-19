/**
 * Welcome page (T-3.6), opened on first install: choose sites → allow access →
 * pick one of the bundled templates → "Try it" opens the site restyled. Three clicks
 * plus the browser's permission prompt (user-flows §1).
 */
import { BRAND } from '@reskin/brand';
import { BUNDLED_PREVIEWS } from '@reskin/templates/previews';
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  type AppState,
  RequestError,
  type SiteView,
  type StateRequest,
  send,
  type TemplateSummary,
} from '../shared/messages';
import { siteById } from '../shared/sites';

export function Welcome() {
  const [state, setState] = useState<AppState | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (request: StateRequest) => {
    try {
      const next = await send(request);
      setState(next);
      setError(null);
      return next;
    } catch (e) {
      setError(e instanceof RequestError ? e.message : 'Something went wrong');
      return null;
    }
  }, []);

  useEffect(() => {
    void run({ type: 'getState' }).then((s) => {
      if (s) setPicked(new Set(s.sites.map((site) => site.adapterId))); // all supported sites, preselected
    });
  }, [run]);

  /** Permission requests must start inside the click handler (user gesture). */
  const allow = async () => {
    if (!state) return;
    const sites = state.sites.filter((s) => picked.has(s.adapterId));
    let granted = false;
    try {
      granted = await browser.permissions.request({ origins: sites.flatMap((s) => s.origins) });
    } catch {
      granted = false;
    }
    if (!granted) {
      setError('Access was not granted. You can allow it any time from the toolbar button.');
      return;
    }
    for (const site of sites)
      await run({ type: 'setSiteEnabled', adapterId: site.adapterId, enabled: true });
  };

  const tryIt = async (site: SiteView, template: TemplateSummary) => {
    if (!site.enabled)
      await run({ type: 'setSiteEnabled', adapterId: site.adapterId, enabled: true });
    const next = await run({
      type: 'setTemplate',
      adapterId: site.adapterId,
      templateId: template.id,
    });
    const url = siteById(site.adapterId)?.homeUrl;
    if (next && url) await browser.tabs.create({ url });
  };

  const granted = state?.sites.filter((s) => s.granted) ?? [];
  const waiting = state?.sites.filter((s) => !s.granted) ?? [];
  return (
    <main className="welcome">
      <header>
        <h1>Welcome to {BRAND.name}</h1>
        <p className="lead">
          Restyle the sites you use with community templates. Templates are plain styles, checked on
          this device: no scripts, no tracking, and nothing you browse leaves your browser.
        </p>
      </header>
      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}
      {state && (
        <>
          <section aria-labelledby="step-sites" className="step">
            <h2 id="step-sites">
              <span className="num">1</span> Choose your sites
            </h2>
            {waiting.length > 0 && (
              <>
                <ul className="site-picks">
                  {waiting.map((s) => (
                    <li key={s.adapterId}>
                      <label>
                        <input
                          type="checkbox"
                          checked={picked.has(s.adapterId)}
                          onChange={(e) => {
                            const next = new Set(picked);
                            if (e.currentTarget.checked) next.add(s.adapterId);
                            else next.delete(s.adapterId);
                            setPicked(next);
                          }}
                        />
                        {s.name}
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="muted small">
                  Your browser will ask to let {BRAND.name} change how these sites look. It only
                  ever touches the sites you allow.
                </p>
                <button
                  type="button"
                  className="primary"
                  disabled={!waiting.some((s) => picked.has(s.adapterId))}
                  onClick={() => void allow()}
                >
                  Allow access
                </button>
              </>
            )}
            {granted.length > 0 && (
              <p className="banner ok">{granted.map((s) => s.name).join(', ')}: access allowed.</p>
            )}
          </section>

          {granted.map((site) => (
            <section
              key={site.adapterId}
              aria-labelledby={`step-templates-${site.adapterId}`}
              className="step"
            >
              <h2 id={`step-templates-${site.adapterId}`}>
                <span className="num">2</span> Pick a template for {site.name}
              </h2>
              <ul className="cards">
                {site.templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    active={site.enabled && site.templateId === t.id}
                    onTry={() => void tryIt(site, t)}
                  />
                ))}
              </ul>
            </section>
          ))}

          <footer className="muted small">
            Change templates, colours and settings any time from the toolbar button, or in the{' '}
            <a href={browser.runtime.getURL('/options.html')}>library</a>.
          </footer>
        </>
      )}
    </main>
  );
}

function TemplateCard({
  template,
  active,
  onTry,
}: {
  template: TemplateSummary;
  active: boolean;
  onTry: () => void;
}) {
  const previews = BUNDLED_PREVIEWS[template.id];
  return (
    <li className="card">
      {previews && <img className="cover" src={previews.cover} alt="" width={1280} height={800} />}
      <div className="card-body">
        <h3>
          {template.name} {active && <span className="tag">In use</span>}
        </h3>
        <p className="muted">{template.summary}</p>
        {previews && (
          <details>
            <summary>Before and after</summary>
            <div className="compare">
              <figure>
                <img
                  src={previews.before}
                  alt={`${template.name}: before`}
                  width={1280}
                  height={800}
                />
                <figcaption>Before</figcaption>
              </figure>
              <figure>
                <img
                  src={previews.after}
                  alt={`${template.name}: after`}
                  width={1280}
                  height={800}
                />
                <figcaption>After</figcaption>
              </figure>
            </div>
          </details>
        )}
        <button
          type="button"
          className="primary"
          aria-label={`Try it: ${template.name}`}
          onClick={onTry}
        >
          Try it
        </button>
      </div>
    </li>
  );
}
