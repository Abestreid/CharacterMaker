# CharacterMaker MCP Edge Function

This directory contains the source for the deployed CharacterMaker remote MCP server.

## Deployment

Supabase project:

`charmaker` (`kszybiwhchwekpmramxn`)

Function:

`charactermaker-mcp`

MCP endpoint:

`https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp`

Health:

`https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp/health`

Current product mode is intentionally public and has no end-user accounts or roles, therefore `verify_jwt=false` is intentional. Do not switch this to an account/service-role architecture unless the product model changes.

## Infrastructure boundary

The MCP uses only the existing free CharacterMaker infrastructure:

- Supabase Free PostgreSQL/RPC/Edge Functions;
- InfinityFree `/media/...` for physical images;
- GitHub for source, documentation and CI.

Do not add Cloudflare, R2, Supabase Storage or a paid standalone backend.

## Data contract

The MCP operates on the same persisted CharacterMaker model as Web:

- Persona: `characters` + `character_parameter_values` + `character_assets`;
- Outfit: `outfit_presets` + `outfit_preset_parameter_values` + `outfit_assets`;
- Scene: `scene_presets` + `scene_preset_parameter_values` + `scene_assets`;
- reusable backgrounds: `backgrounds`;
- images: `assets` and relation tables;
- generation provenance: `generations`, `generation_sources`, `generation_assets`.

Current schema contracts:

- `character-state-v3`;
- `wardrobe-state-v2`;
- `scene-state-v3`;
- `generation-context-v1`.

## Tools

Read:

- `search_presets`;
- `get_preset`;
- `get_catalog`;
- `get_schema`;
- `build_generation_context`;
- `list_assets`;
- `get_asset`.

Write:

- `create_character`;
- `create_outfit`;
- `create_scene`;
- `patch_preset`;
- `import_asset_from_url`;
- `set_asset_reference_status`;
- `archive_preset`.

MCP does not expose hard delete.

## Required behavior

- Use stable catalog IDs for structured fields.
- If an option ID is uncertain, call `get_catalog` first.
- Unknown Persona facts must be omitted, not replaced by UI defaults or guesses.
- Use `patch_preset` for conversational partial changes so unrelated fields remain unchanged.
- Use `expected_version` when the current entity version is known.
- Permanent Persona identity must not absorb temporary Outfit or Scene attributes.
- Canonical/approved/reference-only images are explicit asset states and must not be inferred from every generation automatically.

## Image paths

MCP -> client:

`get_asset(include_image=true)` can return actual MCP image content.

Client -> CharacterMaker:

`import_asset_from_url` imports a publicly fetchable JPEG/PNG/WebP up to 8 MB to InfinityFree and then creates Supabase metadata/relation. The exact ability of a host such as ChatGPT to expose its newly generated image directly to an external MCP tool is host-dependent; CharacterMaker therefore explicitly supports URL import rather than assuming invisible binary handoff.

## Verification

Permanent remote smoke workflow:

`.github/workflows/mcp-smoke.yml`

The current deployed endpoint has passed:

- health;
- MCP initialize/initialized handshake;
- tools/list;
- real Persona search;
- live catalog read;
- actual image-content read.

A one-time write validation also passed:

- create Persona;
- read;
- partial patch with version increment;
- read and verify unrelated data preserved;
- archive;
- verify hidden from active library.

The temporary write fixture and all associated test audit/idempotency rows were removed after validation.

## Documentation rule

Every change in this function must also update, where applicable:

- `docs/MCP_ARCHITECTURE.md`;
- `docs/CHANGELOG.md`;
- `supabase/README.md`;
- database migration files under `supabase/migrations/`.

Project-wide mandatory documentation rules are in `docs/DEVELOPMENT_RULES.md`.
