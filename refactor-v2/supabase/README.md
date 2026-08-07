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
- Supabase Storage is not used.
- Cloudflare/R2 is not used.
- Images are physically stored on InfinityFree under `/media/...`.
- Video is not part of the current product model.
- GitHub Actions builds, tests and deploys DEV to `https://charmaker.free.nf/dev/`.

## Public persistence flow

The current product intentionally has no user/auth layer.

Browser reads use Supabase public tables protected by read RLS policies.

Preset writes use explicit public `SECURITY DEFINER` RPCs:

- `public_upsert_preset`
- `public_delete_preset`
- `public_attach_asset`
- `public_delete_asset`
- `public_set_character_outfit`
- `public_set_asset_reference_status`

This is a deliberate temporary architecture for the personal/public phase. When user accounts are introduced later, ownership/private/public RLS must be designed as a separate migration instead of silently changing current behavior.

The old `admin-presets` Edge Function is deprecated and is not part of the active mutation flow. Old documentation describing an admin editing key must not be used as current architecture.

## Shared Core contract

Web UI and the future MCP must use the same CharacterMaker application/domain layer.

Current shared application facade:

`src/core/character-maker.service.ts`

It is responsible for the same operations that future MCP tools will call:

- list/load/save Persona;
- list/load/save Outfit;
- list/load/save Scene;
- catalogs;
- preset assets;
- media upload/delete;
- reference status.

The Web UI must not create an independent business model for MCP.

## Catalog system

Core tables:

- `catalogs`
- `catalog_categories`
- `catalog_options`

Normalized preset values:

- `character_parameter_values`
- `outfit_preset_parameter_values`
- `background_parameter_values`
- `scene_preset_parameter_values`

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

`scene_presets.background_id` is the real UUID relation to `backgrounds`. The editor continues to use the stable background slug/catalog id. `public_upsert_preset` resolves `background_slug` to the corresponding `backgrounds.id`, so the editor and relational model no longer represent two unrelated background systems.

Reference behavior is stored in normal columns:

- `reference_use_clothing`;
- `reference_use_expression`.

Temporary browser Data URLs are not persisted to Supabase and are excluded from Zustand local persistence.

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

This is the basis for distinguishing ordinary generations/references from identity-defining canonical images in MCP/AI workflows.

## Preset loading

`metadata.editor_state` remains a convenient snapshot/cache but is no longer the source required to restore a preset.

Current loading reconstructs editor state from:

1. primary entity columns;
2. normalized `*_parameter_values` rows;
3. relational background data where needed;
4. normal Scene reference flags.

This allows Web and future MCP clients to use the same database state even when an old preset does not contain a compatible editor snapshot.

## Versioning and mutation safety

Primary presets contain integer `version` fields.

Updates may send `expected_version`. If the stored version changed since it was loaded, the RPC raises a version conflict instead of silently overwriting a newer update.

`public_upsert_preset` also supports `idempotency_key`. Processed keys are recorded in `mutation_requests` so retrying the same create/save request can return the original result.

`audit_log` records mutation actions and entity IDs for debugging and future MCP traceability.

## Generations

Tables:

- `generations`
- `generation_sources`
- `generation_assets`

The existing schema already supports provenance links from a generation to:

- Persona;
- Outfit;
- Scene;
- Background;
- reference assets.

The V2 Results UI currently represents images only. Generation-provider integration is a later layer and must use the shared Core context rather than legacy Gemini-specific state.

## Backups

Before the 2026-08-07 Core/MCP consistency corrections:

- Git backup branch: `backup/dev-2026-08-07-pre-core-mcp-fixes`;
- Supabase snapshot schema: `backup_20260807_1548`.

See `docs/backups/2026-08-07-pre-core-mcp-fixes.md`.

## Migrations in Git

All new schema changes must have a corresponding SQL file under:

`supabase/migrations/`

The Core/MCP readiness migration is recorded as:

`supabase/migrations/202608071600_core_mcp_readiness.sql`

## Deprecated artifacts

The following are historical and not active architecture:

- old `admin-presets` editing-key flow;
- empty Supabase Storage buckets from the discarded storage design;
- Cloudflare R2/S3 proposal;
- video-related schema/UI assumptions.

They must not be treated as current implementation requirements.
