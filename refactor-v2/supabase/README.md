# CharacterMaker V2 - persistence architecture

Supabase project: `charmaker`  
Project ref: `kszybiwhchwekpmramxn`  
Region: `eu-central-1`

This document describes the actual current V2 persistence model. Historical experiments that are no longer used are explicitly marked as deprecated.

## Current product mode

CharacterMaker is currently a personal/shared public tool without end-user accounts, roles or private presets.

Primary saved entities:

1. `characters` - UI: `Персона`.
2. `outfit_presets` - UI: `Образ`; one preset is a complete outfit/look.
3. `scene_presets` - UI: `Сцена`; one preset combines background, action, camera, framing, lighting, style and reference behavior.
4. `generations` - generated image records and provenance.

All active presets are intentionally stored in one shared public library at this stage.

## Infrastructure

- V2 branch: `refactor/domain-catalog-v2`.
- Supabase PostgreSQL stores structured data, catalogs, metadata and relations.
- Supabase Edge Functions host the CharacterMaker remote MCP inside the same free project.
- Supabase Storage is not used.
- Cloudflare/R2 is not used.
- Images are physically stored on InfinityFree under `/media/...`.
- Video is not part of the current product model.
- GitHub Actions builds, tests and deploys DEV to `https://charmaker.free.nf/dev/`.

## Public persistence flow

The current product intentionally has no user/auth layer.

Browser reads use Supabase public tables protected by read RLS policies.

Preset writes use explicit public `SECURITY DEFINER` RPCs:

- `public_upsert_preset` - complete entity save used by the Web editor and MCP create tools;
- `public_patch_preset` - true partial update for MCP and future partial Web actions;
- `public_delete_preset` - archive/hard-delete primitive; MCP only exposes archive;
- `public_attach_asset`;
- `public_delete_asset`;
- `public_set_character_outfit`;
- `public_set_asset_reference_status`.

This is a deliberate temporary architecture for the personal/public phase. When user accounts are introduced later, ownership/private/public RLS must be designed as a separate migration instead of silently changing current behavior.

Security Advisor warnings about anonymous execution of public mutation `SECURITY DEFINER` functions are expected under this explicitly selected no-account model. They must not be "fixed" by introducing roles/authentication without a product decision.

The old `admin-presets` Edge Function is deprecated, returns 410 Gone and is not part of the active mutation flow. The old `admin_validate_token` database RPC has been removed.

## Shared Core contract

Web UI and MCP use the same persisted entities, stable catalog IDs, normalized parameter tables, schema versions, asset roles/statuses and mutation RPCs.

Web application facade:

`src/core/character-maker.service.ts`

Web/MCP context contract:

`src/core/context.service.ts`

Remote MCP source:

`supabase/functions/charactermaker-mcp/index.ts`

The Web UI must not create an independent persistence model from MCP.

## CharacterMaker MCP Edge Function

Function slug:

`charactermaker-mcp`

Remote endpoint:

`https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp`

Health endpoint:

`https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp/health`

Current auth mode:

`verify_jwt=false`

This is intentional for the current public/no-account product phase.

The MCP exposes read/write operations for:

- search and complete Persona/Outfit/Scene retrieval;
- catalogs and current schema;
- generation context assembly;
- create and partial patch;
- asset listing/read/image content;
- public-image URL import to InfinityFree;
- canonical/reference status;
- soft archive.

Full MCP documentation:

`docs/MCP_ARCHITECTURE.md`

External protocol verification:

`.github/workflows/mcp-smoke.yml`

The smoke workflow has successfully verified health, initialize/initialized handshake, tools/list, real database reads, catalog reads and actual image content from an external GitHub runner.

A separate one-time validation successfully verified create -> read -> partial patch -> read -> archive through the published MCP endpoint. The temporary fixture and its test audit/idempotency data were removed after the successful test.

## Catalog system

Core tables:

- `catalogs`;
- `catalog_categories`;
- `catalog_options`.

Normalized preset values:

- `character_parameter_values`;
- `outfit_preset_parameter_values`;
- `background_parameter_values`;
- `scene_preset_parameter_values`.

Current control totals after synchronization:

- 68 catalogs;
- 584 catalog options;
- 55 reusable backgrounds.

The local TypeScript option fallback also contains 584 option values. The DEV `Каталоги / Dev` page reads the complete catalog registry from Supabase and uses local TypeScript catalogs only as a network fallback.

Character catalogs added to the V3 editor contract include:

- `breast_size`;
- `skin_details`;
- `hair_details`;
- `makeup_details`;
- `permanent_features`.

## Persona

Primary table: `characters`  
Parameters: `character_parameter_values`  
Photos: `character_assets`

Important physical measurements remain normal columns:

- age;
- height;
- weight;
- bust;
- waist;
- hips;
- body-fat percentage.

Flexible appearance/body/detail values use normalized parameter rows.

Current state schema:

`character-state-v3`

Additional Core/MCP columns:

- `schema_version`;
- `version` for optimistic concurrency;
- `ai_context` JSONB for canonical AI description/instructions.

## Outfit

Primary table: `outfit_presets`  
Parameters: `outfit_preset_parameter_values`  
Photos: `outfit_assets`

One Outfit contains the complete look:

- base layer;
- top;
- bottom;
- outerwear;
- footwear;
- color/material per layer;
- accessories;
- custom description.

Current state schema:

`wardrobe-state-v2`

Additional Core/MCP columns:

- `schema_version`;
- `version`;
- `ai_context`.

Transactional persistence validation on 2026-08-07 confirmed creation plus normalized parameter rows; the test transaction was rolled back and left zero test rows.

## Scene

Primary table: `scene_presets`  
Parameters: `scene_preset_parameter_values`  
Photos: `scene_assets`

Current state schema:

`scene-state-v3`

A Scene stores:

- pose or motion;
- emotion;
- orientation;
- shot type;
- vertical/horizontal camera angle;
- aspect ratio;
- reusable background or custom background text;
- natural/studio light settings;
- colors and temperature;
- image style;
- filter;
- reference behavior.

`scene_presets.background_id` is the real UUID relation to `backgrounds`. The editor and MCP use the stable background slug/catalog ID. `public_upsert_preset` and `public_patch_preset` resolve `background_slug` to the corresponding `backgrounds.id`.

Reference behavior is stored in normal columns:

- `reference_use_clothing`;
- `reference_use_expression`.

Temporary browser Data URLs are not persisted to Supabase and are excluded from Zustand local persistence.

Transactional persistence validation on 2026-08-07 confirmed Scene creation, normalized parameter rows, `scene-state-v3`, reference flags and a real UUID relation resolving back to `professional_white_cyclorama`; rollback left zero test rows/keys.

## Assets and InfinityFree

Universal metadata table:

`assets`

Physical locations:

```text
/media/characters/{character_id}/...
/media/outfits/{outfit_preset_id}/...
/media/scenes/{scene_preset_id}/...
/media/generations/{generation_id}/...
```

`api/media.php` accepts JPEG, PNG and WebP up to 8 MB, creates server-side filenames, validates image dimensions and returns:

- public URL;
- object path;
- MIME type;
- size;
- width;
- height.

Supabase stores only metadata and entity relations.

Assets have `reference_status`:

- `normal`;
- `approved`;
- `canonical`;
- `rejected`;
- `reference_only`.

MCP `get_asset` has been externally validated to return an actual image as MCP image content.

## Preset loading

`metadata.editor_state` remains a convenient snapshot/cache but is no longer required to restore a preset.

Current Web loading reconstructs editor state from:

1. primary entity columns;
2. normalized `*_parameter_values` rows;
3. relational background data where needed;
4. normal Scene reference flags.

MCP independently reads the same normalized database state and resolves catalog labels from the same live catalog tables.

## Full save vs partial patch

`public_upsert_preset` is intended for a complete editor save/create.

`public_patch_preset` changes only fields and parameter rows supplied in the patch. This is required for conversational operations such as changing only `eye_color` without resending every Persona characteristic.

Partial patch supports:

- optional top-level fields;
- normalized parameter upsert;
- normalized parameter delete;
- `expected_version` conflict detection;
- idempotency key;
- audit `mutation_source`.

A real transactional database test changed an existing Persona eye color and version and then rolled back successfully, confirming no residual test data.

## Versioning, idempotency and audit

Primary presets contain integer `version` fields.

Updates may send `expected_version`. If the stored version changed since it was loaded, the RPC raises a version conflict instead of silently overwriting a newer update.

Processed retry keys are recorded in `mutation_requests`.

`audit_log` records mutation source/action/entity for Web/MCP debugging.

## Generations

Tables:

- `generations`;
- `generation_sources`;
- `generation_assets`.

The existing schema supports provenance links from a generation to:

- Persona;
- Outfit;
- Scene;
- Background;
- reference assets.

The V2 Results UI currently represents images only. Generation-provider integration is a later layer and must consume the shared generation-context contract rather than legacy Gemini-specific state.

## Backups

Before the 2026-08-07 Core/MCP consistency corrections:

- Git backup branch: `backup/dev-2026-08-07-pre-core-mcp-fixes`;
- Supabase snapshot schema: `backup_20260807_1548`.

See `docs/backups/2026-08-07-pre-core-mcp-fixes.md`.

## Migrations in Git

All schema changes must have a corresponding SQL file under `supabase/migrations/`.

Current correction migrations:

- `202608071600_core_mcp_readiness.sql`;
- `202608071635_remove_deprecated_admin_token_rpc.sql`;
- `202608071650_add_public_patch_preset.sql`.

## Deprecated artifacts

The following are historical and not active architecture:

- old `admin-presets` editing-key flow;
- old `admin_validate_token` RPC;
- empty Supabase Storage buckets from the discarded storage design;
- Cloudflare R2/S3 proposal;
- video-related schema/UI assumptions.

They must not be treated as current implementation requirements.
