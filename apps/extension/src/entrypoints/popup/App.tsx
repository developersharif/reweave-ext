import { BRAND } from '@reskin/brand';

export function App() {
  const version = browser.runtime.getManifest().version;
  return (
    <main className="popup">
      <header>
        <h1>{BRAND.name}</h1>
        <span className="version">v{version}</span>
      </header>
      <p className="tagline">{BRAND.tagline}</p>
      <p className="muted">Supported sites will appear here (M2).</p>
    </main>
  );
}
