# Cloudflare FLUX.2 model presets - 2026-08-10

## Цель

Добавить в `Персона -> Фото` три явных режима генерации Cloudflare Workers AI без разрыва существующего канонического workflow и BodyDNA-нормализации.

## Модели

Введены три preset ID:

- `fast` -> `@cf/black-forest-labs/flux-2-klein-4b`;
- `quality` -> `@cf/black-forest-labs/flux-2-klein-9b`;
- `experimental` -> `@cf/black-forest-labs/flux-2-dev`.

Режим по умолчанию - `quality`.

## UI

В `PersonaPhotoGenerator` добавлен переключатель модели:

- `Быстро` - черновые пробы;
- `Качество` - основной режим для пяти канонических кадров;
- `Экспериментальное` - ручное сравнение FLUX.2 Dev.

Выбор хранится локально в состоянии мастера и не изменяет Персону, Образ, Сцену или Supabase schema.

При смене модели несохраненный результат очищается, чтобы пользователь не мог случайно принять изображение, сгенерированное предыдущим preset.

## API client

`generateCloudflareImage()` теперь требует `model` и передает его в same-origin PHP proxy через multipart `FormData`.

Остальные параметры сохранены:

- prompt;
- width / height;
- guidance;
- optional seed;
- до 4 reference images.

## PHP proxy

`public/api/cloudflare-ai.php` больше не строит Workers AI URL из одного hardcoded model ID.

Proxy:

1. принимает `model`;
2. валидирует его по закрытому whitelist;
3. разрешает только три утвержденных FLUX.2 model ID;
4. формирует endpoint из выбранной модели;
5. возвращает фактически использованный model ID в response.

Default proxy model также переведен на Klein 9B.

## Prompt adapters

Архитектура теперь имеет явный model router:

```text
CharacterState
    ↓
BodyNormalizer
    ↓
BodyDNA
    ↓
PersonaPhotoModelPreset
    ├─ fast         -> Klein 4B -> Klein adapter
    ├─ quality      -> Klein 9B -> Klein adapter
    └─ experimental -> FLUX.2 Dev -> Dev adapter
```

### Klein 4B / Klein 9B

Обе модели используют существующий `buildFlux2KleinPersonaPhotoPrompt()`.

Сохраняются:

- английский prompt;
- визуальная геометрия тела;
- BodyDNA ratios;
- absolute measurement anchors;
- body composition;
- face / hair / makeup;
- reference roles;
- calibration clothing;
- camera / studio instructions.

### FLUX.2 Dev

Добавлен отдельный `buildFlux2DevPersonaPhotoPrompt()`.

Он использует те же canonical данные и BodyDNA, но формулирует их более естественно и менее таблично. Основные приоритеты:

- stable identity;
- realistic anatomy;
- exact silhouette preservation;
- сохранение waist-to-height, bust-to-waist, hips-to-waist и других ключевых ratios;
- явные роли reference images;
- calibration clothing visibility;
- запрет усреднять сохраненную геометрию к generic body.

## English-only prompt layer

Catalog IDs продолжают преобразовываться в английские prompt tokens.

Для произвольных пользовательских полей текущая реализация не выполняет автоматический перевод. Если free-text содержит кириллицу, Dev adapter временно исключает такой fragment из prompt вместо передачи русского текста модели. Это сохраняет English-only слой до появления отдельной надежной нормализации/перевода.

## Совместимость диагностического AI route

Отдельный `#/ai` остается диагностическим генератором. После добавления обязательного `model` в client contract он явно передает default model `@cf/black-forest-labs/flux-2-klein-9b`, чтобы не ломать typecheck и существующий sandbox flow.

## Тесты

`persona-photo-generator.prompt.test.ts` обновлен под обязательный `modelPreset` и дополнен проверками FLUX.2 Dev:

- Klein 4B/9B продолжают использовать прежний строгий adapter;
- experimental действительно переключается на Dev adapter;
- Dev получает BodyDNA и canonical anchors;
- Dev получает жесткие instructions по identity/reference roles;
- Dev не использует Klein-specific numeric block wording;
- кириллический free-text не попадает в English-only Dev prompt.

## База данных и media

Изменение не требует migration и не меняет:

- Supabase schema;
- character/outfit/scene data;
- canonical asset roles;
- InfinityFree media storage;
- MCP contracts.
