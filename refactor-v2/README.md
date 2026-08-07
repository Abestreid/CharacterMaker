# CharacterMaker Refactor V2

Mobile-first React-приложение и типизированный domain-слой CharacterMaker.

## Frontend stack

- React 19 + TypeScript;
- Vite 8;
- React Router;
- Zustand для локального editor state;
- TanStack Query для server state / Supabase / API;
- Tailwind CSS 4;
- shadcn-style локальная design system поверх Base UI;
- Lucide React как основной icon pack;
- Sonner для toast-уведомлений;
- Embla + Yet Another React Lightbox для галерей;
- react-easy-crop для crop/zoom/rotate;
- dnd-kit для будущей сортировки ассетов;
- TanStack Virtual для больших каталогов;
- React Hook Form + Zod для форм и валидации;
- Vitest для тестов.

## Design system

UI больше не должен содержать копии одних и тех же кнопок, полей и списков на разных страницах.

Структура:

```text
components/ui        -> primitives: Button, SearchInput, Toggle, CatalogField...
components/media     -> PhotoGallery, ImageCropper и media primitives
components/<domain>  -> Character / Wardrobe / Scene product components
pages                -> композиция секций и маршрутов
```

Изменение базового компонента автоматически применяется во всех местах, где он используется.

### Темы

Поддерживаются три режима:

- light;
- dark;
- system.

Цвета задаются через semantic design tokens (`background`, `surface`, `foreground`, `border`, `primary`, `danger` и т.д.), а не через локальные случайные значения на каждой странице.

## Responsive UX

Основной принцип - mobile first.

- мобильная нижняя навигация;
- safe-area для iOS/Android;
- `100dvh`;
- touch targets 44-56 px;
- компактный preview персоны на телефоне;
- sticky preview на desktop;
- большие каталоги на mobile открываются как swipeable Bottom Drawer;
- те же каталоги на desktop открываются как Dialog;
- поиск и категории встроены в единый `CatalogField`;
- интерфейс учитывает виртуальную клавиатуру мобильного устройства.

Основная пользовательская навигация:

```text
Персона -> Гардероб -> Сцена -> Результаты
```

`Каталоги / Dev` оставлены отдельным техническим экраном.

## Реализовано

- полноценный Vite frontend;
- адаптивный App Shell;
- редактор персоны;
- редактор пяти слоев одежды;
- редактор сцены;
- стабильные domain catalog id;
- локальное сохранение редактора через Zustand persist;
- светлая / темная / системная тема;
- единый UI component layer;
- Base UI Dialog / Drawer для каталогов;
- поисковые каталоги;
- экран результатов;
- photo gallery / touch carousel / fullscreen lightbox;
- image cropper с zoom и rotate;
- query provider для серверных данных;
- централизованные design tokens;
- accessibility focus states и reduced-motion support.

## Domain-правила

1. Состояние хранит стабильные английские `id`.
2. Русский пользовательский текст хранится в `label`.
3. UI получает значения из domain-каталогов.
4. Компонент не должен дублировать каталог внутри JSX.
5. Большой список использует общий Catalog Picker.
6. Визуальные ассеты позднее связываются с catalog/domain id.
7. Новая функциональность не должна возвращать монолитный `components/ui.tsx` - он остается compatibility barrel.

## Запуск

```bash
npm install
npm run dev
```

Проверка:

```bash
npm run check
npm run build
```

## DEV deploy

Ветка `refactor/domain-catalog-v2` автоматически проходит typecheck, тесты, production build и FTPS deploy в DEV через GitHub Actions.
