# Cloudflare Workers AI module - 2026-08-09

## Цель

Добавить в CharacterMaker V2 отдельный экспериментальный генерационный модуль для проверки Cloudflare Workers AI без изменения существующего CRUD Персоны, Образа, Сцены, Supabase schema, MCP и media storage.

## Что добавлено

- новый route `#/ai` и пункт `AI` в desktop/mobile навигации;
- новая mobile-first страница `src/pages/CloudflareAiPage.tsx`;
- изолированный клиент `src/features/cloudflare-ai/cloudflare-ai.client.ts`;
- PHP proxy `public/api/cloudflare-ai.php` для вызовов Cloudflare API с InfinityFree;
- фиксированный Account ID `b42a877844f90e5af0c85866814e1ab4`;
- фиксированная модель `@cf/black-forest-labs/flux-2-klein-4b`;
- проверка API Token через Cloudflare `/user/tokens/verify`;
- text-to-image генерация;
- до 4 reference images через `input_image_0` ... `input_image_3`;
- автоматическое клиентское уменьшение reference image до max side 511 px, поскольку FLUX.2 Klein требует входные изображения меньше 512x512;
- варианты 768x1024, 1024x1024, 1024x768;
- preview и скачивание результата прямо в браузере.

## Безопасность токена

Cloudflare API Token намеренно НЕ добавлен:

- в Git repository;
- в Vite env;
- в Supabase;
- в localStorage;
- в Zustand persistence;
- в исходный HTML/JS bundle.

Пользователь вставляет токен в password input. Токен существует только в React state текущей вкладки и передается same-origin PHP proxy через `X-Cloudflare-Token` только во время вызова. PHP endpoint не сохраняет токен.

Это временный безопасный режим для тестирования с мобильного устройства при отсутствии доступного механизма записи нового GitHub/hosting secret через текущие подключенные инструменты.

## Изоляция от существующего приложения

Модуль не меняет:

- `CharacterState`, `WardrobeState`, `SceneState`;
- editor store;
- активные preset IDs;
- Supabase tables/RPC/migrations;
- `characterMakerService` CRUD;
- существующий `media.php`;
- MCP endpoint и MCP tools.

Генерация выполняется только после явного нажатия пользователем кнопки на странице `#/ai`.

## Server flow

`CloudflareAiPage -> ./api/cloudflare-ai.php -> api.cloudflare.com -> Workers AI`

PHP endpoint поддерживает:

- `POST ?action=verify`;
- `POST ?action=generate`.

Для generation endpoint валидируются prompt, размеры, количество файлов, MIME, размер и dimensions reference image. Допустимые MIME: JPEG, PNG, WebP.

## Следующий этап

После проверки качества и стабильности Workers AI этот isolated module можно связать с `generation-context-v2` и автоматически подставлять canonical/approved assets активной Персоны. Это должно делаться отдельным изменением после успешного теста API, чтобы не смешивать экспериментальный provider с текущим Core/MCP flow.
