import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from './app/providers';
import { router } from './app/router';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Не найден корневой элемент приложения');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
