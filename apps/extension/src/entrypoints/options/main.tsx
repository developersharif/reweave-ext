import { BRAND } from '@reskin/brand';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Library } from '../../options/Library';
import '../../ui/tokens.css';
import './style.css';

document.title = `${BRAND.name} library`;
const root = document.getElementById('root');
if (!root) throw new Error('Options root element missing');
createRoot(root).render(
  <StrictMode>
    <Library version={browser.runtime.getManifest().version} />
  </StrictMode>,
);
