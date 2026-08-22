# CharacterMaker V2 - Changelog

Журнал фиксирует изменения ветки `refactor/domain-catalog-v2`. Новые записи добавляются сверху внутри соответствующей даты.

## 2026-08-10

### Cloudflare FLUX.2 model presets for Persona canonical photos

- в `Персона -> Фото` добавлены три режима Workers AI: `Быстро` (`flux-2-klein-4b`), `Качество` (`flux-2-klein-9b`) и `Экспериментальное` (`flux-2-dev`);
- режим `Качество` / Klein 9B установлен по умолчанию для пяти канонических кадров;
- `generateCloudflareImage()` теперь получает явный model ID, а PHP proxy принимает его только из whitelist трех разрешенных моделей;
- Klein 4B и Klein 9B используют общий строгий BodyDNA adapter, для FLUX.2 Dev добавлен отдельный более естественный prompt adapter с акцентом на stable identity, realistic anatomy и exact silhouette preservation;
- для всех трех режимов сохранены BodyDNA ratios, absolute anchors, calibration clothing и semantic reference roles;
- произвольный кириллический free-text временно исключается из prompt, пока нет отдельного надежного слоя английской нормализации, поэтому модельный prompt остается English-only;
- диагностический `#/ai` синхронизирован с обязательным `model` contract и использует default Klein 9B;
- regression tests расширены проверками model routing и English-only prompt behavior;
- Supabase schema, данные пресетов, media storage и MCP contracts не изменялись;
- подробности: `docs/changes/2026-08-10-cloudflare-flux-model-presets.md`.

## 2026-08-09

### Persona canonical photo wizard integrated into Persona editor

- перед изменениями создана резервная ветка `backup/dev-2026-08-09-pre-persona-photo-generator`;
- в экран `Персона` добавлена отдельная вкладка `Фото`, свободная страница `#/ai` сохранена как диагностическая песочница;
- добавлен последовательный мастер 5 канонических кадров: `face_closeup -> portrait -> full_front -> full_back -> profile_left`;
- каждый следующий шаг разблокируется только после сохранения предыдущих кадров, поэтому ранее подтвержденные каноны становятся визуальными референсами следующих генераций;
- prompt builder передает только релевантный срез `CharacterState`: лицо получает identity/face/skin/hair/makeup/permanent features, торс дополнительно верхнюю часть тела, полный рост - полную антропометрию и параметры формы тела;
- для телесных кадров используется временный бежевый спортивный комплект: непрозрачный облегающий короткий топ + короткие облегающие спортивные шорты, без логотипов и аксессуаров; он не меняет сохраненный Образ;
- для профилей младше 18 лет автоматически используется закрытый calibration outfit: бежевая спортивная футболка и шорты до колена;
- до 4 Cloudflare references выбираются по semantic role и качеству `canonical > approved > reference_only > normal`, rejected исключаются;
- результат сохраняется через существующий Core: физический файл -> InfinityFree, asset metadata/relation -> Supabase, `reference_status=canonical`;
- при замене слота новый файл сначала полностью сохраняется, только потом удаляются старые assets той же роли;
- Cloudflare token может переиспользоваться между `AI` и `Персона -> Фото` только в памяти текущего SPA-сеанса и по-прежнему не попадает в GitHub, Supabase, Zustand persistence или localStorage;
- Supabase migration не понадобилась: текущая схема `character_assets` уже поддерживает все необходимые роли и canonical reference status;
- добавлены регрессионные тесты границ prompt context, чтобы face/torso/full-body не начали получать лишние параметры в будущих изменениях;
- подробности: `docs/changes/2026-08-09-persona-canonical-photo-wizard.md`.

### Isolated Cloudflare Workers AI image-generation module

- добавлен отдельный route `#/ai` и пункт `AI` в desktop/mobile навигации без изменения существующего CRUD Персоны, Образа и Сцены;
- добавлена mobile-first страница `CloudflareAiPage` для проверки токена и генерации непосредственно с телефона;
- добавлен изолированный client adapter `src/features/cloudflare-ai/cloudflare-ai.client.ts`;
- добавлен same-origin PHP proxy `public/api/cloudflare-ai.php`;
- используется Cloudflare Account ID `b42a877844f90e5af0c85866814e1ab4` и модель `@cf/black-forest-labs/flux-2-klein-4b`;
- поддержана проверка токена через `/user/tokens/verify`, text-to-image и до 4 `input_image_0..3` references;
- reference images автоматически уменьшаются в браузере до max side 511 px перед отправкой;
- результат отображается в UI и доступен для скачивания;
- Cloudflare API Token намеренно не сохраняется в Git, Supabase, localStorage или публичном bundle: пользователь вводит его в текущей вкладке, после чего он передается PHP proxy только на время запроса;
- Supabase schema, migrations, Core preset CRUD, editor store, media.php и MCP в этом изменении не менялись;
- обновлены правила разработки: Cloudflare Workers AI разрешен только как внешний генерационный backend, но не как storage или источник данных пресетов;
- подробности: `docs/changes/2026-08-09-cloudflare-workers-ai-module.md`.

## 2026-08-08

### MCP v0.2.0 visual and native-generation workflow

- CharacterMaker MCP обновлен с `0.1.0` до `0.2.0` и развернут как Edge Function version 2 на прежнем endpoint;
- добавлен `get_visual_package`: UUID/slug/exact name -> ranking сохраненных assets -> actual MCP image content в одном вызове;
- добавлен `prepare_image_generation`: Persona + optional Outfit/Scene -> `generation-context-v2` + primary face/body + recommended references + actual image content + `host_action=native_image_generation`;
- зафиксировано обязательное поведение MCP host: если пользователь просит создать изображение и host имеет native image generator, после `prepare_image_generation` он должен продолжить генерацию, а не останавливаться из-за отсутствия provider-specific `generate_image` внутри CharacterMaker;
- `search_presets` теперь ранжирует exact name/slug первым и возвращает `exact_match`, asset/canonical/approved counts и preview asset;
- `get_preset` принимает UUID/slug/exact unique name, стабильно возвращает `include_assets=true`, не тащит binary images и не дублирует полную карточку в text + structured output;
- `metadata.editor_state` исключен из MCP card output: source of truth для MCP - normal columns + normalized parameter rows;
- добавлен ranking visual references: canonical > approved > reference_only > normal, rejected исключается, учитываются `is_primary`, semantic role и sort order;
- multimodal workflow изолирует ошибки отдельных картинок и ограничивает combined inline payload 12 MB;
- общий Web Core синхронизирован на `generation-context-v2`, добавлены `VisualPackage`, primary face/body и recommended asset IDs;
- добавлены Core regression tests для canonical/primary/role ranking, rejected exclusion и missing body warning;
- постоянный MCP smoke теперь воспроизводит реальные проблемные сценарии: exact `Victoria June`, `get_preset(include_assets=true)`, canonical photo через `get_visual_package`, полный `prepare_image_generation`, а также Лайвет;
- расширенный remote MCP smoke завершился успешно;
- данные Персон/Образов/Сцен, измерения, catalog values и reference statuses в этом пакете не изменялись;
- подробности: `docs/changes/2026-08-08-mcp-visual-generation-workflow.md` и `docs/MCP_ARCHITECTURE.md`.

## 2026-08-07

### Original CharacterMaker character presets imported into Supabase

- исходный массив `PRESETS` взят из `main:src/constants/character/presets.ts`, blob `5a716f8aa8e0b0bdfb0f7464063fd466a06561ef`;
- в Supabase через штатный `public_upsert_preset('character', payload)` импортированы 13 отсутствовавших оригинальных Персон;
- существующая актуализированная Лайвет `laivet` намеренно не перезаписывалась старым legacy-профилем;
- после импорта публичная библиотека содержит ровно 14 active/public Персон - полный оригинальный набор имен;
- все новые записи приведены к `character-state-v3`, имеют `metadata.editor_state` и нормализованные `character_parameter_values`;
- `breastSizeId` оставлен `null`, поскольку такого параметра не было в оригинальном проекте;
- скрытые женские поля старых мужских профилей не перенесены в активный V2 state;
- опечатка Наны `Крылая` нормализована в `winged`, возраст Эльфийского Рейнджера `125` сохранен как в оригинале;
- legacy `clothingPreset` сохранен в import metadata, но отдельные Образы на этом шаге не создавались;
- подробная запись: `docs/changes/2026-08-07-import-original-character-presets.md`.

### Preset workspace UI, live preview and DEV stabilization

- перед UI-refactor создана backup-ветка `backup/pre-ui-preset-manager-20260807`;
- большой inline `PresetManager` заменен компактным toolbar, поэтому загрузка пресета больше не создает layout shift и не выталкивает редактор вниз;
- выбор пресета перенесен в responsive picker: desktop dialog + mobile bottom sheet, добавлены поиск и загрузка одним нажатием;
- полный CRUD и media tools сохранены: создание, обновление, сохранение как новый, архивирование, refresh, JPEG/PNG/WebP upload, все asset roles, `is_primary`, все `reference_status`, обновление статуса и удаление asset;
- Preset UI синхронизирован с `activeCharacterId`, `activeOutfitId`, `activeSceneId`;
- desktop и mobile preview теперь показывают имя и реальный primary/cover/portrait asset активной Персоны с InfinityFree;
- desktop workspace оптимизирован под широкие экраны: sidebar 240 px, workspace до 1680 px, sticky preview 340 px;
- ThemeToggle в sidebar сделан компактным без переполнения;
- восстановлен документированный Web partial-update contract: существующие Персона/Образ/Сцена обновляются через `public_patch_preset`, а не полным overwrite;
- `buildStatePatch` снова формирует только реальные top-level и normalized parameter changes, включая delete patch для удаленных параметров;
- регрессионная проверка прошла: TypeScript typecheck успешно, Vitest 60/60 tests успешно, production Vite build успешно;
- диагностикой DEV подтверждено: build, FTPS deploy и remote SHA verification проходили, ложный failure создавал нестабильный HTTP smoke InfinityFree;
- HTTP smoke усилен browser-like User-Agent и повторными попытками после FTP deploy;
- итоговый `deployment/dev` снова проходит полный обязательный pipeline, включая HTTP smoke и visual verification Desktop Chrome, iOS WebKit/iPhone 13 и Android Chrome/Pixel 5;
- подробная запись: `docs/changes/2026-08-07-preset-workspace-ui.md`;
- backup note: `docs/backups/2026-08-07-pre-preset-workspace-ui.md`.

### Removal of discarded Supabase Storage artifacts

- подтверждено `storage.objects = 0` перед удалением;
- все оставшиеся пустые legacy Supabase Storage buckets удалены;
- применена и сохранена в Git migration `202608071720_remove_unused_storage_buckets.sql`;
- текущая media architecture окончательно остается InfinityFree `/media/...` + Supabase `assets` metadata/relations, без Supabase Storage.

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

Добавлен постоянный внешний GitHub workflow `.github/workflows/mcp-smoke.yml`.

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
- проверено совпадение количества строк по всем 25 таблицам между `public` и backup schema`;
- добавлены обязательные правила ведения документации и changelog;
- зафиксировано текущее ограничение проекта: Supabase Free + InfinityFree + GitHub, без Cloudflare/R2/Supabase Storage, без пользовательских ролей и аккаунтов на текущем этапе.
