import React from 'react';
import ReactDOM from 'react-dom/client';
import { BodyMorphTest } from './BodyMorphTest';
import './body-test.css';

const root = document.getElementById('body-test-root');

if (!root) {
  throw new Error('Не найден корневой элемент 2D Body Lab');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BodyMorphTest />
  </React.StrictMode>,
);
