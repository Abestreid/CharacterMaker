# Backup перед переработкой Preset Workspace UI

Дата: 2026-08-07

Перед изменением layout и UX управления пресетами создана отдельная backup-ветка:

`backup/pre-ui-preset-manager-20260807`

Источник backup:

`refactor/domain-catalog-v2`

Backup создан до изменения:

- `src/components/presets/PresetManager.tsx`;
- `src/components/presets/PresetPanels.tsx`;
- `src/app/AppShell.tsx`;
- `src/theme/theme-toggle.tsx`.

Изменение не затрагивает Supabase schema, данные БД, MCP или media storage, поэтому отдельный snapshot БД для этого UI-only refactor не создавался.

Восстановление кода при необходимости выполняется из backup-ветки Git без влияния на данные Supabase/InfinityFree.
