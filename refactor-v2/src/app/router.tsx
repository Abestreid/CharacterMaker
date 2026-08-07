import { Navigate, createHashRouter } from 'react-router';
import { AppShell } from './AppShell';
import { CharacterPresetPanel, OutfitPresetPanel, ScenePresetPanel } from '../components/presets/PresetPanels';
import { CatalogsPage } from '../pages/CatalogsPage';
import { CharacterPage } from '../pages/CharacterPage';
import { ResultsPage } from '../pages/ResultsPage';
import { ScenePage } from '../pages/ScenePage';
import { WardrobePage } from '../pages/WardrobePage';

export const router = createHashRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, element: <Navigate replace to="/character" /> },
      { path: 'character', element: <><CharacterPresetPanel /><CharacterPage /></> },
      { path: 'wardrobe', element: <><OutfitPresetPanel /><WardrobePage /></> },
      { path: 'scene', element: <><ScenePresetPanel /><ScenePage /></> },
      { path: 'results', Component: ResultsPage },
      { path: 'catalogs', Component: CatalogsPage },
      { path: '*', element: <Navigate replace to="/character" /> },
    ],
  },
]);
