# CharacterMaker V2 - Changelog

Журнал фиксирует изменения ветки `refactor/domain-catalog-v2`. Новые записи добавляются сверху внутри соответствующей даты.

## 2026-08-07

### Backup before Core/MCP corrections

- создана backup-ветка `backup/dev-2026-08-07-pre-core-mcp-fixes`;
- создан snapshot Supabase `backup_20260807_1548`;
- проверено совпадение количества строк по всем 25 таблицам между `public` и backup schema;
- добавлены обязательные правила ведения документации и changelog;
- зафиксировано текущее ограничение проекта: Supabase Free + InfinityFree + GitHub, без Cloudflare/R2/Supabase Storage, без пользовательских ролей и аккаунтов на текущем этапе.

### Planned correction package

В этом пакете исправлений должны быть приведены к единому состоянию:

- domain model и фактические Supabase catalogs;
- сохранение/загрузка Персоны, Образа и Сцены;
- background model;
- reference images и local persistence;
- единый application/Core service layer для Web и будущего MCP;
- терминология UI;
- текущая документация Supabase;
- Results без video;
- mobile/iOS/Android детали темы и viewport;
- MCP-ready contracts без внедрения платной инфраструктуры.
