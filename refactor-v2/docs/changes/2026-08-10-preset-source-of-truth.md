# Preset source of truth and local draft isolation

Дата: 2026-08-10
Ветка: `refactor/domain-catalog-v2`

## Проблема

V2 одновременно сохранял полное состояние редактора в `metadata.editor_state`, нормализованные числовые поля/parameter rows в Supabase и локальный Zustand draft в браузере. При обновлении существующего пресета patch обновлял нормализованные поля, но не `metadata.editor_state`, поэтому metadata становилась устаревшей копией. Дополнительно localStorage сохранял изменяемый draft вместе с `activeCharacterId`, поэтому после reload несохраненные локальные значения могли визуально отображаться как загруженный сохраненный пресет.

## Правило source of truth

Для сохраненных пресетов единственный источник истины:

- нормализованные top-level поля соответствующей таблицы;
- нормализованные parameter value rows.

`metadata` используется только для служебных метаданных и provenance. Полный `editor_state` в metadata больше не хранится.

Для текущего несохраненного редактирования используется только локальный Zustand draft. Dirty draft не имеет права переживать reload с ID сохраненного пресета.

## Исправления

- `characterStateToPreset`, `wardrobeStateToOutfitPreset`, `sceneStateToPreset` больше не записывают полный `metadata.editor_state`;
- сохранены только служебные metadata (`editor_schema`, migration/import provenance, scene/layer metadata);
- editor store получил отдельные clean-load actions и dirty flags;
- обычное изменение формы помечает draft dirty;
- загрузка пресета из Supabase устанавливает state + preset ID атомарно и помечает состояние clean;
- persist schema обновлена до v3;
- миграция с v2 отвязывает старые локальные drafts от сохраненных preset IDs;
- dirty draft при последующей persistence сохраняется без active preset ID, поэтому не может быть ошибочно подписан именем сохраненного пресета после reload;
- устаревшие `metadata.editor_state`/`metadata.editorState` удалены из существующих записей `characters` в Supabase без удаления `import_origin` и другой metadata.

## Ксения

Канонический legacy source `main:src/constants/character/presets.ts` задает Ксению как:

- рост 168 см;
- вес 58 кг;
- грудь 92 см;
- талия 64 см;
- бедра 98 см.

Эти значения восстановлены в нормализованных полях текущей записи Ксении. Полного `metadata.editor_state` у записи больше нет.

## Инвариант

Сохраненная Персона никогда не должна иметь два независимых набора редактируемых параметров. UI, Core, генератор и MCP должны получать значения из одного нормализованного состояния Supabase; локальный draft существует только до явного сохранения/загрузки и не является частью сохраненного пресета.
