import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Test3DApp } from './Test3DApp';

const root = document.getElementById('body-test3d-root');

if (!root) {
  throw new Error('Missing #body-test3d-root');
}

createRoot(root).render(
  <StrictMode>
    <Test3DApp />
  </StrictMode>,
);
