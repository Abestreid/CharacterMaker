import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Test3DAppV3 } from './Test3DAppV3';
import './test3d-v3.css';

const TEST3D_VERSION = '3.1.0';
const BUILD_SHA = (import.meta.env.VITE_BUILD_SHA || 'local').slice(0, 8);

const root = document.getElementById('body-test3d-root');

if (!root) {
  throw new Error('Missing #body-test3d-root');
}

createRoot(root).render(
  <StrictMode>
    <div className="lab3d-release-strip" role="status" aria-label="Версия опубликованного теста">
      <strong>TEST3D v{TEST3D_VERSION}</strong>
      <span>build {BUILD_SHA}</span>
      <span>OxiHuman + CharacterMaker shapes</span>
    </div>
    <Test3DAppV3 />
  </StrictMode>,
);
