# CharacterMaker V2 - Changelog

Журнал фиксирует изменения ветки `refactor/domain-catalog-v2`. Новые записи добавляются сверху внутри соответствующей даты.

## 2026-08-07

### Core/MCP consistency corrections

- фактическая Supabase БД и TypeScript domain приведены к одному набору character-параметров;
- добавлен `breast_size` в локальный character catalog;
- `CharacterState` переведен на `character-state-v3` и дополнен `breastSizeId`, `skinDetails`, `hair.details`, `makeup.details`, `permanentFeatures`;
- редактор Персоны показывает и сохраняет новые поля;
- локальные option-каталоги теперь имеют контрольный итог 584 значения, совпадающий с Supabase;
- сохранение Персоны, Образа и Сцены дополнено `schema_version`, `version`, `ai_context`, idempotency и optimistic concurrency;
- добавлены таблицы `mutation_requests` и `audit_log`;
- добавлен asset `reference_status`: `normal`, `approved`, `canonical`, `reference_only`, `rejected`;
- добавлен RPC `public_set_asset_reference_status`;
- Scene теперь передает `background_slug`, а RPC разрешает его в настоящий `backgrounds.id`;
- reference flags Scene вынесены в нормальные колонки `reference_use_clothing` и `reference_use_expression`;
- создан `preset-state.repository.ts`, который восстанавливает editor state из основных колонок и нормализованных `*_parameter_values`, поэтому `metadata.editor_state` больше не обязателен для загрузки;
- добавлены `activeCharacterId`, `activeOutfitId`, `activeSceneId` в editor store;
- временный Scene Data URL исключен из Zustand localStorage;
- InfinityFree media API теперь валидирует и возвращает width/height;
- создан единый application facade `src/core/character-maker.service.ts`;
- Preset UI переведен с прямых infrastructure imports на общий Core;
- Catalogs UI переведен на Core и сохраняет Supabase как основной источник;
- обычное Web-обновление сохраняет существующий `ai_context`, чтобы не уничтожать будущие MCP-инструкции;
- создан `src/core/context.service.ts` с MCP-ready Entity Context и `generation-context-v1`;
- Context Builder отдает стабильные ID вместе с русскими label, AI context и asset metadata;
- удалена неподдерживаемая video-вкладка из Results;
- пользовательская терминология унифицирована как `Персона -> Образ -> Сцена -> Результаты`;
- основной README и Supabase README переписаны под фактическую архитектуру;
- старый `admin-presets` flow отмечен как deprecated и больше не описывается как активный;
- подтверждено, что динамический browser `theme-color` уже корректно реализован в ThemeProvider, поэтому лишняя правка не вносилась.

### Validation / deployment

- после основного Core/database пакета GitHub Actions успешно прошел TypeScript typecheck, Vitest, production build, FTPS deployment и remote commit verification;
- DEV продолжает автоматически проверяться desktop/iPhone screenshot steps в deployment workflow;
- последующие небольшие Core/docs изменения также проходят через тот же обязательный pipeline.

### Database migration

Применена и сохранена в Git migration:

`supabase/migrations/202608071600_core_mcp_readiness.sql`

Supabase migration name:

`core_mcp_readiness_20260807`

### Backup before Core/MCP corrections

- создана backup-ветка `backup/dev-2026-08-07-pre-core-mcp-fixes`;
- создан snapshot Supabase `backup_20260807_1548`;
- проверено совпадение количества строк по всем 25 таблицам между `public` и backup schema;
- добавлены обязательные правила ведения документации и changelog;
- зафиксировано текущее ограничение проекта: Supabase Free + InfinityFree + GitHub, без Cloudflare/R2/Supabase Storage, без пользовательских ролей и аккаунтов на текущем этапе.
