import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Test3DAppV2 } from './Test3DAppV2';

const root = document.getElementById('body-test3d-root');

if (!root) {
  throw new Error('Missing #body-test3d-root');
}

createRoot(root).render(
  <StrictMode>
    <Test3DAppV2 />
  </StrictMode>,
);
