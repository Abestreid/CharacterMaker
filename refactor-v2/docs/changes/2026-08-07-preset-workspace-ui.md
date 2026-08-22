# CharacterMaker V2 - компактный UX пресетов и живой preview

Дата: 2026-08-07
Ветка: `refactor/domain-catalog-v2`

## Причина изменения

После загрузки пресета встроенный `PresetManager` раскрывался прямо внутри основного editor flow. Блок с CRUD-действиями и фотографиями увеличивал страницу на сотни пикселей, сдвигал секции Персоны/Образа/Сцены вниз и создавал сильный layout shift. На desktop 1920 px пользователь терял основной редактор из первого viewport.

Дополнительно правый Preview не отражал загруженный character preset: продолжал показывать `Новая персона` и placeholder, хотя активный preset и его изображения уже существовали в Supabase/InfinityFree.

## Что изменено

### 1. Preset toolbar

`PresetManager` больше не раскрывает большой CRUD-блок внутри страницы.

В основном editor flow остается компактная строка фиксированной геометрии:

- название активного пресета;
- статус `Загружен`;
- выбор пресета;
- управление пресетом;
- контекстное сохранение.

Загрузка пресета больше не изменяет высоту основной страницы.

### 2. Выбор пресета

Выбор перенесен в отдельный responsive overlay:

- desktop - центрированный dialog;
- mobile - нижний full-height sheet;
- поиск по имени/описанию;
- один клик по пресету сразу загружает его в editor state;
- активный preset визуально отмечается;
- создание нового preset доступно из picker.

Отдельная кнопка `Загрузить` после выбора больше не требуется.

### 3. Управление пресетом

CRUD и media tools сохранены полностью, но вынесены из editor flow в отдельный manager overlay.

Сохранены:

- создание нового пресета;
- обновление выбранного пресета;
- сохранение текущего состояния как нового;
- удаление/архивация пресета;
- ручное обновление библиотеки;
- загрузка фото JPEG/PNG/WebP;
- все роли фотографий Персоны, Образа и Сцены;
- флаг `Основное`;
- все AI reference statuses: `normal`, `approved`, `canonical`, `reference_only`, `rejected`;
- изменение AI reference status уже загруженного asset;
- удаление asset из InfinityFree и Supabase relations.

Ни одно поле domain editor и ни один существующий preset/media инструмент не удалены.

### 4. Active entity binding

`PresetManager` теперь получает фактический `activeId` из Zustand store.

Это устраняет рассинхронизацию между:

- выбранным в UI пресетом;
- загруженным editor state;
- `activeCharacterId` / `activeOutfitId` / `activeSceneId`.

При создании/обновлении текущий preset становится активным. При архивировании активной сущности соответствующий active ID очищается.

### 5. Character Preview

`AppShell` теперь использует `activeCharacterId` как источник identity выбранной Персоны.

Preview загружает:

- имя активной Персоны из Supabase;
- связанные character assets;
- primary asset, а при его отсутствии - `cover`, `portrait`, `face_closeup` или первый доступный asset;
- количество доступных фотографий.

Desktop preview и mobile compact preview показывают реальную фотографию и имя загруженной Персоны. Placeholder используется только если изображение отсутствует или не загрузилось.

После изменения фотографий или данных preset manager отправляет локальное событие `charactermaker:library-changed`, и preview обновляется без перезагрузки страницы.

### 6. Desktop workspace

Desktop shell приведен к рабочей сетке для широкого экрана:

- sidebar: 240 px;
- общий workspace: до 1680 px;
- preview column: 340 px;
- оставшаяся ширина используется editor area;
- preview остается sticky.

Это особенно исправляет использование пространства на 1920 px.

### 7. Theme control

Трехсегментный текстовый ThemeToggle в узком sidebar заменен на стабильную компактную строку `Тема` + три icon buttons:

- Light;
- Dark;
- System.

Функциональность темы сохранена полностью, переполнение sidebar устранено.

### 8. Проверка сохранения существующих пресетов

Во время обязательной CI-проверки обнаружено рассогласование между существующим контрактом `WEB_PARTIAL_UPDATE_RULES.md`, регрессионными тестами и фактическим Core: тесты ожидали `buildStatePatch`, а текущий Core его не предоставлял.

Исправлена фактическая реализация без изменения модели данных:

- восстановлен `public_patch_preset` client в `preset.repository.ts`;
- существующий пресет перед сохранением перечитывается из нормализованного Supabase state;
- Web отправляет только реально измененные top-level поля и normalized parameters;
- неизмененные UI fallback/default значения не превращаются в сохраненные факты;
- удаленные normalized значения передаются как delete patch;
- переход Персоны female -> male удаляет несовместимые female-only параметры;
- изменение background Сцены синхронно обновляет `background_slug` и normalized `background`;
- сохраняется optimistic version check и существующий `ai_context`.

Финальная отдельная проверка подтвердила:

- TypeScript typecheck - успешно;
- Vitest - 3 test files, 60/60 tests успешно;
- production Vite build - успешно.

Временный диагностический workflow после проверки удален, временные diagnostic issues закрыты.

## Что не менялось

- Supabase schema;
- normalized domain contracts;
- MCP;
- InfinityFree media API;
- каталоги и их значения;
- поля Персоны;
- поля Образа;
- поля Сцены;
- deployment architecture.

Изменение является frontend/UX refactor и восстановлением уже документированного Web partial-update контракта без миграций БД.
