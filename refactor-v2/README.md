# CharacterMaker Refactor V2

CharacterMaker V2 - mobile-first редактор и единое ядро для сохранения и повторного использования Персон, Образов, Сцен, референсных изображений и результатов генераций.

Текущая V2-разработка ведется в ветке:

`refactor/domain-catalog-v2`

Legacy-код в `main` используется только как источник для контролируемой миграции старых данных и не является архитектурой V2.

## Продуктовая модель

Основные сущности:

```text
Персона -> Образ -> Сцена -> Результаты
```

- `Персона` - постоянная идентичность и внешность;
- `Образ` - полный комплект одежды, обуви и аксессуаров;
- `Сцена` - действие, эмоция, камера, фон, свет, стиль и reference behavior;
- `Результаты` - изображения генераций с provenance на использованные сущности и референсы.

На текущем этапе CharacterMaker является личным инструментом без аккаунтов и пользовательских ролей. Все активные пресеты находятся в общей публичной библиотеке Supabase.

## Бесплатная инфраструктура

Текущая архитектура намеренно использует только уже выбранные бесплатные компоненты:

- GitHub - код, история, документация, Actions;
- Supabase Free - PostgreSQL, public REST/RPC и будущая MCP Edge Function;
- InfinityFree - Web DEV и физическое хранение изображений `/media/...`.

Не используются:

- Cloudflare;
- R2/S3;
- Supabase Storage;
- платный отдельный backend;
- видео.

## Frontend stack

- React 19 + TypeScript;
- Vite 8;
- React Router;
- Zustand для editor state;
- TanStack Query для server state;
- Tailwind CSS 4;
- локальная shadcn-style design system поверх Base UI;
- Lucide React;
- Sonner;
- Embla + Yet Another React Lightbox;
- react-easy-crop;
- dnd-kit;
- TanStack Virtual;
- React Hook Form + Zod;
- Vitest.

## Единое ядро

Web и будущий MCP не должны иметь отдельные бизнес-модели.

Основной прикладной facade:

`src/core/character-maker.service.ts`

MCP-ready context builder:

`src/core/context.service.ts`

Web UI вызывает Core, Core работает с Supabase/InfinityFree. Будущий MCP должен вызывать те же domain types, mappers, loaders и context builder.

```text
React Web ---------+
                   |
                   v
          CharacterMaker Core
                   ^
                   |
Future MCP --------+
                   |
          Supabase + InfinityFree
```

## Domain contract

Основные editor states:

- `CharacterState` - `character-state-v3`;
- `WardrobeState` - `wardrobe-state-v2`;
- `SceneState` - `scene-state-v3`.

Правила:

1. State хранит стабильные английские ID.
2. Русские отображаемые названия хранятся в catalog `label`.
3. Все option-каталоги синхронизированы с актуальной Supabase БД.
4. Текущий контрольный итог - 68 catalogs и 584 catalog options.
5. Web не должен дублировать catalogs внутри JSX.
6. Preset loading восстанавливает state из нормализованных DB rows, а не требует `metadata.editor_state`.
7. `metadata.editor_state` остается snapshot/cache для совместимости.

## Персона V3

Кроме базовых характеристик текущий контракт поддерживает:

- размер груди;
- дополнительное описание кожи;
- дополнительное описание волос;
- дополнительное описание макияжа;
- постоянные особенности;
- отдельные татуировки.

Все эти поля сохраняются в нормализованных parameter rows и доступны будущему MCP.

## Образы

Один сохраненный `outfit_presets` - это полный Образ:

- нижний слой;
- верх;
- низ;
- верхняя одежда;
- обувь;
- цвет и материал каждого слоя;
- аксессуары;
- дополнительное описание.

## Сцены и фоны

UI продолжает использовать стабильный background slug из каталога.

При сохранении RPC разрешает slug в настоящий `backgrounds.id`, поэтому `scene_presets.background_id` остается нормальной UUID relation и больше не существует двух независимых моделей фона.

## Изображения

Файлы физически хранятся на InfinityFree:

```text
/media/characters/{id}/...
/media/outfits/{id}/...
/media/scenes/{id}/...
/media/generations/{id}/...
```

Supabase хранит `assets` и relation tables.

Asset status для AI/reference workflow:

- `normal`;
- `approved`;
- `canonical`;
- `reference_only`;
- `rejected`.

`api/media.php` проверяет MIME, лимит 8 MB и реальные размеры изображения и возвращает width/height вместе с file metadata.

Временный Scene Data URL не записывается в localStorage.

## AI context и MCP readiness

Primary presets имеют `ai_context` JSONB. Он предназначен для:

- canonical description;
- identity instructions;
- must-preserve rules;
- may-vary rules;
- avoid rules;
- generation notes.

Обычное Web-редактирование сохраняет существующий `ai_context`, чтобы будущие MCP-инструкции не терялись.

`context.service.ts` уже умеет собрать:

```text
GenerationContext
├── Persona structured data + labels + aiContext + assets
├── Outfit structured data + labels + aiContext + assets
├── Scene structured data + labels + aiContext + assets
├── canonicalAssets
└── referenceAssets
```

Текущая версия контракта:

`generation-context-v1`

## Versioning, retry и audit

Основные пресеты имеют `version`.

Update может передать `expected_version`, чтобы не затереть изменения, сделанные другим интерфейсом после загрузки.

`public_upsert_preset` поддерживает `idempotency_key` для безопасных повторных запросов.

Изменения записываются в `audit_log`.

## Mobile-first UX

Поддерживаются:

- iOS safe-area;
- Android safe-area/viewport;
- `100dvh`;
- мобильная нижняя навигация;
- touch targets;
- 16 px form controls на маленьких экранах для предотвращения iOS auto-zoom;
- light/dark/system;
- динамический browser `theme-color`;
- reduced motion;
- desktop sidebar/sticky preview;
- mobile Drawer и desktop Dialog для больших каталогов.

DEV CI дополнительно снимает desktop и iPhone screenshot после deployment.

## Design system

```text
components/ui        -> primitives
components/media     -> media primitives
components/presets   -> saved entity UI
pages                -> route composition
core                 -> shared application/context layer
infrastructure       -> Supabase/InfinityFree adapters
```

Новая функциональность не должна обходить Core без технической причины.

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

Push в `refactor/domain-catalog-v2` запускает GitHub Actions:

1. install;
2. TypeScript typecheck;
3. Vitest;
4. production build;
5. FTPS deploy в `/htdocs/dev`;
6. проверка remote `build-info.json` на точное совпадение commit SHA;
7. HTTP smoke check;
8. desktop и iPhone visual screenshots.

DEV URL:

`https://charmaker.free.nf/dev/`

## Документация и изменения

Обязательные правила:

`docs/DEVELOPMENT_RULES.md`

Журнал:

`docs/CHANGELOG.md`

Supabase architecture:

`supabase/README.md`

Backup перед Core/MCP corrections:

`docs/backups/2026-08-07-pre-core-mcp-fixes.md`
