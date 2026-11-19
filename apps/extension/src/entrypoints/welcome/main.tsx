import { BRAND } from '@reskin/brand';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../ui/tokens.css';
import { Welcome } from '../../welcome/Welcome';
import './style.css';

document.title = `Welcome to ${BRAND.name}`;
const root = document.getElementById('root');
if (!root) throw new Error('Welcome root element missing');
createRoot(root).render(
  <StrictMode>
    <Welcome />
  </StrictMode>,
);
