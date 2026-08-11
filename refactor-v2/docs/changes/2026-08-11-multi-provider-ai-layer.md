# 2026-08-11 - Multi-provider AI generation layer

## Задача

Убрать жесткую связку `режим генерации -> Cloudflare token -> Cloudflare model` и сохранить единый BodyDNA normalizer при подключении нескольких image providers.

Целевая схема:

```text
CharacterState
  -> BodyDNA normalizer
  -> logical generation mode
  -> selected model config
  -> model/provider prompt adapter
  -> provider transport
  -> credential pool
  -> image result
```

## Что добавлено

### Provider registry

`src/features/ai-generation/ai-registry.ts`

Поддерживаются providers:

- Cloudflare Workers AI;
- AI Horde;
- Pollinations AI.

Registry связывает каждую доступную модель с:

- provider;
- API model id;
- UI label;
- prompt adapter;
- максимальным количеством references;
- guidance.

Исходные режимы `Быстро`, `Качество`, `Экспериментальный` сохранены как логические presets. Их назначение на конкретные model configs теперь меняется через `#/admin`.

### Prompt adapter routing

BodyDNA normalizer не изменен.

`buildCharacterPhotoPromptForAdapter()` выбирает prompt adapter по model config. Существующие FLUX.2 Klein и FLUX.2 Dev adapters сохранены. Для AI Horde и Pollinations добавлены provider-specific instructions поверх нормализованного Klein BodyDNA prompt.

### Unified client

`src/features/ai-generation/ai-image.client.ts`

Клиент:

- получает model key;
- определяет provider/model/adapter через registry;
- получает активные credentials соответствующей группы;
- последовательно пробует credentials в порядке настройки;
- возвращает единый base64 image result независимо от provider;
- для AI Horde поддерживает asynchronous job polling.

### Unified PHP proxy

`public/api/ai-image.php`

Один same-origin endpoint обслуживает:

- Cloudflare Workers AI;
- Pollinations AI;
- AI Horde.

Cloudflare credential представляет пару `Account ID + API Token`. Проверка выполняется против account-scoped Workers AI Models API, поэтому active token с неправильным Account ID больше не считается рабочим connection.

Cloudflare ошибки нормализуются, включая daily quota exhaustion (`3036`). Credential pool позволяет перейти к следующей настроенной паре.

Pollinations использует `gen.pollinations.ai`, Bearer API key, account balance verification и OpenAI-compatible image generation endpoint.

AI Horde использует `find_user`, asynchronous image generation и status polling.

### Admin

Добавлен route:

```text
#/admin
```

На странице можно:

- создавать несколько credentials по provider groups;
- для Cloudflare указывать отдельные Account ID + Token pairs;
- включать/выключать credentials;
- проверять каждый credential;
- включать/выключать модели;
- переопределять API model id;
- назначать конкретную модель режимам `Быстро`, `Качество`, `Экспериментальный`.

Старый `#/ai` перенаправляется на `#/admin`, чтобы не оставлять второй Cloudflare-only source of truth.

### Persona canonical photo wizard

`Персона -> Фото` переведен на общий provider layer.

Пользователь выбирает:

1. логический режим;
2. при необходимости конкретную модель.

Конкретная модель автоматически определяет provider и prompt adapter. API keys больше не вводятся внутри мастера фото.

## Secrets

Реальные ключи из локального `apis.txt` намеренно не добавлены в Git, Supabase или frontend defaults.

DEV `/admin` сохраняет настройки в `localStorage` конкретного браузера. Это позволяет настроить предоставленные ключи группами без публикации secrets в репозитории.

Это DEV-механизм. Перед публичным production с серверными общими credentials нужен защищенный admin/auth + server-side secrets storage, чтобы посетители сайта не могли использовать общие API credentials.

## Не менялось

- BodyDNA formulas и semantic normalization;
- Supabase schema;
- preset data;
- media storage architecture;
- MCP contracts;
- canonical asset save flow.
