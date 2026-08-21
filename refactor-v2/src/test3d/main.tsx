import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Test3DAppV3 } from './Test3DAppV3';

const root = document.getElementById('body-test3d-root');

if (!root) {
  throw new Error('Missing #body-test3d-root');
}

createRoot(root).render(
  <StrictMode>
    <Test3DAppV3 />
  </StrictMode>,
);
