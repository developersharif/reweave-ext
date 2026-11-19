/**
 * Options page (T-3.4): per-site assignments, the template library (import a `.zip`,
 * uninstall), backup (export/import the library file) and the global pause. Every
 * change goes through the background, which validates it (extension-architecture §9).
 */
import { BRAND } from '@reskin/brand';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { toBase64Files, unzip, ZipError } from '../library/zip';
import {
  type AppState,
  type ErrorDiagnostic,
  exportLibrary,
  RequestError,
  type SiteView,
  type StateRequest,
  send,
} from '../shared/messages';
import { downloadText, libraryFilename } from './download';

type Notice = { kind: 'ok' | 'error'; text: string; diagnostics?: ErrorDiagnostic[] };

export function Library({ version }: { version: string }) {
  const [state, setState] = useState<AppState | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const run = useCallback(async (request: StateRequest, success?: (s: AppState) => string) => {
    try {
      const next = await send(request);
      setState(next);
      setNotice(success ? { kind: 'ok', text: success(next) } : null);
      return true;
    } catch (e) {
      setNotice(
        e instanceof RequestError
          ? { kind: 'error', text: e.message, diagnostics: e.diagnostics }
          : { kind: 'error', text: 'Something went wrong' },
      );
      return false;
    }
  }, []);

  useEffect(() => {
    void run({ type: 'getState' });
  }, [run]);

  /** Permission requests must start inside the click handler (user gesture). */
  const allow = async (site: SiteView) => {
    let granted = false;
    try {
      granted = await browser.permissions.request({ origins: site.origins });
    } catch {
      granted = false;
    }
    if (!granted) setNotice({ kind: 'error', text: `Access to ${site.name} was not granted.` });
    else await run({ type: 'setSiteEnabled', adapterId: site.adapterId, enabled: true });
  };

  return (
    <main className="library">
      <header>
        <h1>{BRAND.name}</h1>
        <span className="muted">Library · v{version}</span>
      </header>
      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}
      {!state ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <section aria-labelledby="general">
            <h2 id="general">General</h2>
            <label className="row">
              <input
                type="checkbox"
                checked={state.prefs.paused}
                onChange={(e) => void run({ type: 'setPaused', paused: e.currentTarget.checked })}
              />
              Pause all templates
            </label>
          </section>
          <Sites state={state} run={run} allow={allow} />
          <Templates state={state} run={run} setNotice={setNotice} />
          <Backup run={run} setNotice={setNotice} />
        </>
      )}
    </main>
  );
}

type Run = (request: StateRequest, success?: (s: AppState) => string) => Promise<boolean>;

function NoticeBanner({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return (
    <div className={`banner ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <div className="notice-head">
        <span>{notice.text}</span>
        <button type="button" className="link" onClick={onClose}>
          Dismiss
        </button>
      </div>
      {notice.diagnostics && notice.diagnostics.length > 0 && (
        <ul className="diagnostics">
          {notice.diagnostics.map((d, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a static list, rebuilt per notice
            <li key={i}>
              <code>{d.code}</code> {[d.file, d.path].filter(Boolean).join(' ')} {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Sites({
  state,
  run,
  allow,
}: {
  state: AppState;
  run: Run;
  allow: (s: SiteView) => Promise<void>;
}) {
  return (
    <section aria-labelledby="sites">
      <h2 id="sites">Sites</h2>
      {state.sites.map((site) => (
        <SiteRow key={site.adapterId} site={site} state={state} run={run} allow={allow} />
      ))}
    </section>
  );
}

function SiteRow({
  site,
  state,
  run,
  allow,
}: {
  site: SiteView;
  state: AppState;
  run: Run;
  allow: (s: SiteView) => Promise<void>;
}) {
  const active = site.templates.find((t) => t.id === site.templateId);
  const id = (what: string) => `${site.adapterId}-${what}`;
  if (!site.granted) {
    return (
      <div className="card site" data-site={site.adapterId}>
        <h3>{site.name}</h3>
        <p className="muted">No access yet. Allow it to restyle {site.name}.</p>
        <button type="button" onClick={() => void allow(site)}>
          Allow access to {site.name}
        </button>
      </div>
    );
  }
  return (
    <div className="card site" data-site={site.adapterId}>
      <div className="card-head">
        <h3>{site.name}</h3>
        <label className="row">
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
          Use on {site.name}
        </label>
      </div>
      {site.problem && (
        <p className="banner error">This template couldn't be applied: {site.problem}</p>
      )}
      <Field id={id('template')} label="Template">
        <select
          id={id('template')}
          value={site.templateId ?? ''}
          disabled={!site.enabled}
          onChange={(e) =>
            void run({
              type: 'setTemplate',
              adapterId: site.adapterId,
              templateId: e.currentTarget.value || null,
            })
          }
        >
          <option value="">Original site</option>
          {site.templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      {active && active.variants.length > 0 && (
        <Field id={id('variant')} label="Variant">
          <select
            id={id('variant')}
            value={site.variantId ?? ''}
            disabled={!site.enabled}
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
        </Field>
      )}
      {active?.usesPalettes && (
        <Field id={id('palette')} label="Colours">
          <select
            id={id('palette')}
            value={site.paletteId ?? ''}
            disabled={!site.enabled}
            onChange={(e) =>
              void run({
                type: 'setPalette',
                adapterId: site.adapterId,
                paletteId: e.currentTarget.value || null,
              })
            }
          >
            <option value="">Default</option>
            {state.palettes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {active && active.settings.length > 0 && (
        <button
          type="button"
          className="link"
          onClick={() =>
            void run(
              { type: 'resetSettings', templateId: active.id },
              () => `${active.name} settings reset.`,
            )
          }
        >
          Reset {active.name} settings
        </button>
      )}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function Templates({
  state,
  run,
  setNotice,
}: {
  state: AppState;
  run: Run;
  setNotice: (n: Notice) => void;
}) {
  const siteNames = new Map(state.sites.map((s) => [s.adapterId, s.name]));
  const importZip = async (file: File) => {
    let files: Record<string, string>;
    try {
      files = toBase64Files(await unzip(new Uint8Array(await file.arrayBuffer())));
    } catch (e) {
      setNotice({
        kind: 'error',
        text: e instanceof ZipError ? e.message : 'Could not read the file',
      });
      return;
    }
    await run({ type: 'importTemplate', files }, (s) => {
      const added = s.library.find(
        (t) =>
          t.origin === 'imported' &&
          !state.library.some((o) => o.id === t.id && o.version === t.version),
      );
      return added ? `Installed ${added.name} ${added.version}.` : 'Template installed.';
    });
  };
  return (
    <section aria-labelledby="templates">
      <h2 id="templates">Templates</h2>
      <ul className="template-list">
        {state.library.map((t) => (
          <li key={t.id} className="card">
            <div className="card-head">
              <h3>
                {t.name} <span className="muted">v{t.version}</span>
              </h3>
              <span className={`tag ${t.origin}`}>
                {t.origin === 'bundled' ? 'Built in' : 'Imported'}
              </span>
            </div>
            <p className="muted">{t.summary}</p>
            <p className="muted small">
              by {t.authors.join(', ')} · for{' '}
              {t.adapters.map((a) => siteNames.get(a) ?? a).join(', ')}
            </p>
            {t.origin === 'imported' && (
              <button
                type="button"
                className="link danger"
                onClick={() =>
                  void run(
                    { type: 'uninstallTemplate', templateId: t.id },
                    () => `Uninstalled ${t.name}.`,
                  )
                }
              >
                Uninstall {t.name}
              </button>
            )}
          </li>
        ))}
      </ul>
      <FilePicker label="Import template (.zip)" accept=".zip,application/zip" onFile={importZip} />
      <p className="muted small">
        Templates are checked on this device before they are installed: no scripts, no network
        requests.
      </p>
    </section>
  );
}

function Backup({ run, setNotice }: { run: Run; setNotice: (n: Notice) => void }) {
  const [pending, setPending] = useState<{ name: string; library: unknown } | null>(null);
  const doExport = async () => {
    try {
      const library = await exportLibrary();
      downloadText(
        libraryFilename(BRAND.name, new Date()),
        `${JSON.stringify(library, null, 2)}\n`,
      );
    } catch {
      setNotice({ kind: 'error', text: 'Export failed' });
    }
  };
  const choose = async (file: File) => {
    try {
      setPending({ name: file.name, library: JSON.parse(await file.text()) });
    } catch {
      setNotice({ kind: 'error', text: `${file.name} is not a library file` });
    }
  };
  return (
    <section aria-labelledby="backup">
      <h2 id="backup">Backup</h2>
      <p className="muted small">
        The library file holds your sites, choices, settings and imported templates. It holds no
        browsing data.
      </p>
      <div className="row">
        <button type="button" onClick={() => void doExport()}>
          Export library
        </button>
        <FilePicker label="Import library" accept=".json,application/json" onFile={choose} />
      </div>
      {pending && (
        <div className="banner confirm" role="alert">
          <span>Replace your current library with {pending.name}?</span>
          <button
            type="button"
            onClick={() =>
              void run(
                { type: 'importLibrary', library: pending.library },
                () => 'Library imported.',
              ).then(() => setPending(null))
            }
          >
            Replace
          </button>
          <button type="button" className="link" onClick={() => setPending(null)}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

function FilePicker({
  label,
  accept,
  onFile,
}: {
  label: string;
  accept: string;
  onFile: (f: File) => Promise<void>;
}) {
  return (
    <label className="file-picker">
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          if (file)
            void onFile(file).finally(() => {
              input.value = '';
            });
        }}
      />
      <span>{label}</span>
    </label>
  );
}
