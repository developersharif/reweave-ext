import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from '../../popup/Popup';
import './style.css';

/**
 * The tab this popup describes: the active tab, or `?tab=<id>` when the popup page is
 * opened in a tab of its own (e2e tests). The URL is only revealed for sites we hold a
 * host permission for.
 */
async function targetTabUrl(): Promise<string | undefined> {
  const id = Number(new URLSearchParams(location.search).get('tab'));
  if (Number.isInteger(id) && id > 0) return (await browser.tabs.get(id)).url;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.url;
}

const root = document.getElementById('root');
if (!root) throw new Error('Popup root element missing');

void targetTabUrl()
  .catch(() => undefined)
  .then((tabUrl) => {
    createRoot(root).render(
      <StrictMode>
        <Popup tabUrl={tabUrl} version={browser.runtime.getManifest().version} />
      </StrictMode>,
    );
  });
