# CharacterMaker V2 - Changelog

Журнал фиксирует изменения ветки `refactor/domain-catalog-v2`. Новые записи добавляются сверху внутри соответствующей даты.

## 2026-08-07

### Final audit and mandatory device verification

- финальная проверка данных подтвердила: 68 catalogs, 584 catalog options, 55 backgrounds, 3 исторические character records, из которых только `Лайвет` была active/public уже в исходном backup;
- текущие статусы всех трех существовавших до работ character records сверены с `backup_20260807_1548` и совпадают 1:1 - исправления не архивировали пользовательские данные;
- test fixtures после MCP/DB validation отсутствуют: 0 MCP test characters, 0 rollback-test outfits, 0 rollback-test scenes, 0 test/rollback idempotency keys;
- создание Образа отдельно проверено транзакционно в живой БД: entity + normalized parameters создаются корректно, затем ROLLBACK оставляет 0 test rows;
- создание Сцены отдельно проверено транзакционно: `scene-state-v3`, reference flags, normalized parameters и `background_slug -> backgrounds.id` UUID relation работают, затем ROLLBACK оставляет 0 test rows/keys;
- DEV device verification сделана обязательной частью успешного deployment: Desktop Chrome, iOS WebKit/iPhone 13 и Android Chrome/Pixel 5 больше не являются `continue-on-error` шагами;
- `deployment/dev=success` теперь выставляется только после build, tests, FTPS remote SHA check, HTTP smoke и всех трех device/browser verification;
- Supabase Security Advisor повторно проверен. Публичные mutation `SECURITY DEFINER` предупреждения оставлены сознательно как следствие явно выбранной общей public/no-account модели; `audit_log` и `mutation_requests` остаются закрытыми внутренними таблицами с RLS без публичных write policies.

### MCP deployment and end-to-end validation

- добавлен настоящий remote MCP server `supabase/functions/charactermaker-mcp/index.ts`;
- MCP развернут как бесплатная Supabase Edge Function `charactermaker-mcp` в существующем проекте `charmaker`;
- текущий endpoint: `https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp`;
- `verify_jwt=false` выбран намеренно, поскольку текущая продуктовая модель остается общей публичной библиотекой без аккаунтов/ролей;
- реализованы read tools: `search_presets`, `get_preset`, `get_catalog`, `get_schema`, `build_generation_context`, `list_assets`, `get_asset`;
- реализованы write tools: `create_character`, `create_outfit`, `create_scene`, `patch_preset`, `import_asset_from_url`, `set_asset_reference_status`, `archive_preset`;
- `get_asset` умеет возвращать реальное изображение через MCP image content;
- `import_asset_from_url` умеет перенести публично доступное JPEG/PNG/WebP изображение на InfinityFree и создать asset relation в Supabase;
- добавлен true partial RPC `public_patch_preset`, чтобы MCP мог менять один параметр без полной перезаписи сущности;
- `public_patch_preset` поддерживает optimistic version, idempotency, parameter upsert/delete и `mutation_source=mcp` для audit;
- удален последний устаревший DB RPC `admin_validate_token`; старый `admin-presets` Edge Function остается только 410 Gone compatibility artifact;
- создана подробная документация `docs/MCP_ARCHITECTURE.md`;
- PR #1 полностью актуализирован под фактическую архитектуру V2 и MCP.

### MCP protocol smoke validation

Добавлен постоянный внешний workflow `.github/workflows/mcp-smoke.yml`.

GitHub runner фактически подтвердил:

- health endpoint -> HTTP 200;
- MCP `initialize` -> успешно;
- полный initialize/initialized handshake с учетом `Mcp-Session-Id`;
- `tools/list` -> успешно;
- `search_presets` -> реальное чтение Персоны `Лайвет` из Supabase;
- `get_catalog(eye_color)` -> реальный каталог из Supabase;
- `get_asset(include_image=true)` -> реальное изображение возвращается как MCP image content;
- commit status `mcp/smoke` -> success.

Первый smoke-run обнаружил корректно работающий `health` и `initialize`, но `tools/list` получил HTTP 400 из-за неполного клиентского handshake. Workflow был исправлен: теперь сохраняет session id, отправляет `notifications/initialized`, после чего `tools/list` и tool calls проходят успешно.

### MCP write validation

Одноразовый внешний GitHub workflow проверил через опубликованный MCP endpoint полный цикл:

1. `create_character` создал временную публичную Персону;
2. `get_preset` подтвердил исходные поля и `eye_color=green`;
3. `patch_preset` изменил только `eye_color` на `blue` и `ai_context`, версия стала `2`;
4. повторный `get_preset` подтвердил, что `age=25` и `gender=female` сохранились без перезаписи;
5. `archive_preset` скрыл fixture из активной библиотеки;
6. commit status `mcp/write-test` -> success.

После успешной проверки временная Персона была полностью удалена из БД вместе с ее test audit/idempotency записями. Проверено `remaining_fixture=0`. Одноразовый workflow затем удален из Git, поэтому тестовые записи не будут создаваться на будущих push.

### Mobile/DEV verification

- deployment workflow расширен отдельными визуальными профилями Desktop Chrome, iOS WebKit (`iPhone 13`) и Android Chrome (`Pixel 5`);
- screenshots сохраняются как GitHub Actions artifact;
- web pipeline продолжает выполнять typecheck, Vitest, production build, FTPS deploy и remote commit SHA verification;
- динамический browser `theme-color` уже корректно реализован в ThemeProvider, поэтому лишняя повторная правка не вносилась.

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
- обычное Web-обновление сохраняет существующий `ai_context`, чтобы не уничтожать MCP-инструкции;
- создан `src/core/context.service.ts` с MCP-ready Entity Context и `generation-context-v1`;
- Context Builder отдает стабильные ID вместе с русскими label, AI context и asset metadata;
- удалена неподдерживаемая video-вкладка из Results;
- пользовательская терминология унифицирована как `Персона -> Образ -> Сцена -> Результаты`;
- основной README и Supabase README переписаны под фактическую архитектуру;
- старый `admin-presets` flow отмечен как deprecated и больше не описывается как активный.

### Database migrations

Применены в Supabase и сохранены в Git:

- `supabase/migrations/202608071600_core_mcp_readiness.sql` -> `core_mcp_readiness_20260807`;
- `supabase/migrations/202608071635_remove_deprecated_admin_token_rpc.sql` -> `remove_deprecated_admin_token_rpc_20260807`;
- `supabase/migrations/202608071650_add_public_patch_preset.sql` -> `add_public_patch_preset_20260807`.

### Backup before Core/MCP corrections

- создана backup-ветка `backup/dev-2026-08-07-pre-core-mcp-fixes`;
- создан snapshot Supabase `backup_20260807_1548`;
- проверено совпадение количества строк по всем 25 таблицам между `public` и backup schema;
- добавлены обязательные правила ведения документации и changelog;
- зафиксировано текущее ограничение проекта: Supabase Free + InfinityFree + GitHub, без Cloudflare/R2/Supabase Storage, без пользовательских ролей и аккаунтов на текущем этапе.
