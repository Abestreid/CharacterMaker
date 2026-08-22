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
- Supabase Free - PostgreSQL, public REST/RPC и remote MCP Edge Function;
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

Web и MCP не должны иметь отдельные несовместимые бизнес-модели.

Основной прикладной facade Web:

`src/core/character-maker.service.ts`

Общий MCP-ready context builder:

`src/core/context.service.ts`

Web и MCP работают с теми же Supabase entities, catalog IDs, normalized parameter tables, schema/version fields, AI context и asset relations.

```text
React Web ---------+
                   |
                   v
          CharacterMaker Core/Data
                   ^
                   |
Remote MCP --------+
                   |
          Supabase + InfinityFree
```

Remote MCP source:

`supabase/functions/charactermaker-mcp/index.ts`

Remote MCP endpoint:

`https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp`

Подробности:

`docs/MCP_ARCHITECTURE.md`

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

Все эти поля сохраняются в нормализованных parameter rows и доступны MCP.

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

Создание Образа и normalized parameter rows проверено транзакционно на живой БД с полным rollback после теста.

## Сцены и фоны

UI и MCP используют стабильный background slug из каталога.

При сохранении/patch RPC разрешает slug в настоящий `backgrounds.id`, поэтому `scene_presets.background_id` остается нормальной UUID relation и больше не существует двух независимых моделей фона.

Создание Сцены, reference flags и UUID background relation проверены транзакционно на живой БД с rollback и нулевыми остаточными test rows.

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

MCP `get_asset` фактически проверен внешним GitHub runner и возвращает реальное изображение как MCP image content.

## AI context и Generation Context

Primary presets имеют `ai_context` JSONB. Он предназначен для:

- canonical description;
- identity instructions;
- must-preserve rules;
- may-vary rules;
- avoid rules;
- generation notes.

Обычное Web-редактирование сохраняет существующий `ai_context`, чтобы MCP-инструкции не терялись.

`context.service.ts` и MCP собирают общий `generation-context-v2`:

```text
GenerationContext v2
├── Persona structured data + labels + aiContext + assets
├── Outfit structured data + labels + aiContext + assets
├── Scene structured data + labels + aiContext + assets
├── VisualPackage
│   ├── primary face/body references
│   └── ranked recommended assets
├── canonicalAssets
└── referenceAssets
```

Для интерактивного ChatGPT workflow MCP v0.2 добавляет high-level tools:

- `get_visual_package` - получить лучшие сохраненные фото и actual MCP image content;
- `prepare_image_generation` - собрать Persona/optional Outfit/Scene + `generation-context-v2` + reference images + `host_action=native_image_generation`.

CharacterMaker остается источником canonical identity/context/references. Если пользователь просит создать изображение и MCP host имеет собственный native image generator, host должен продолжить генерацию после `prepare_image_generation`, а не требовать отдельный provider-specific `generate_image` tool внутри CharacterMaker.

Текущая версия контракта:

`generation-context-v2`

## Full save, partial patch, retry и audit

`public_upsert_preset` используется для полного save/create.

`public_patch_preset` выполняет настоящий частичный update и не перезаписывает неуказанные поля/parameters.

Основные пресеты имеют `version`.

Update может передать `expected_version`, чтобы не затереть изменения, сделанные другим интерфейсом после загрузки.

Mutation RPC поддерживают idempotency, а изменения записываются в `audit_log`.

Partial patch проверен как транзакционно в PostgreSQL, так и end-to-end через опубликованный MCP endpoint.

## MCP tools

Read:

- `search_presets`;
- `get_preset`;
- `get_catalog`;
- `get_schema`;
- `build_generation_context`;
- `list_assets`;
- `get_asset`.

Write:

- `create_character`;
- `create_outfit`;
- `create_scene`;
- `patch_preset`;
- `import_asset_from_url`;
- `set_asset_reference_status`;
- `archive_preset`.

MCP не предоставляет hard delete.

## MCP verification

Постоянный workflow:

`.github/workflows/mcp-smoke.yml`

Он реально проверяет с внешнего GitHub runner:

- health;
- MCP initialize/initialized handshake;
- tools/list;
- чтение существующей Персоны;
- чтение database catalog;
- возврат реального изображения.

Commit status:

`mcp/smoke`

Отдельный одноразовый write-validation успешно проверил create -> read -> partial patch -> read -> archive. После проверки fixture и test audit/idempotency данные были полностью удалены.

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

DEV CI отдельно снимает:

- Desktop Chrome;
- iOS WebKit / iPhone 13;
- Android Chrome / Pixel 5.

## Design system

```text
components/ui        -> primitives
components/media     -> media primitives
components/presets   -> saved entity UI
pages                -> route composition
core                 -> shared application/context layer
infrastructure       -> Supabase/InfinityFree adapters
supabase/functions   -> remote MCP adapter
```

Новая функциональность не должна обходить общую domain/persistence модель без технической причины.

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

Push в `refactor/domain-catalog-v2` по V2-файлам запускает GitHub Actions:

1. install;
2. TypeScript typecheck;
3. Vitest;
4. production build;
5. FTPS deploy в `/htdocs/dev`;
6. проверка remote `build-info.json` на точное совпадение commit SHA;
7. HTTP smoke check;
8. Desktop Chrome, iOS WebKit и Android Chrome visual screenshots.

DEV URL:

`https://charmaker.free.nf/dev/`

## Backup

Перед Core/MCP correction package создано:

- Git backup branch `backup/dev-2026-08-07-pre-core-mcp-fixes`;
- Supabase snapshot schema `backup_20260807_1548`.

Все 25 public table row counts были проверены 1:1 с backup.

## Документация и изменения

Обязательные правила:

`docs/DEVELOPMENT_RULES.md`

Журнал:

`docs/CHANGELOG.md`

MCP:

`docs/MCP_ARCHITECTURE.md`

Supabase architecture:

`supabase/README.md`

Backup:

`docs/backups/2026-08-07-pre-core-mcp-fixes.md`
