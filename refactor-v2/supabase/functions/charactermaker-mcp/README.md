# CharacterMaker MCP Edge Function

This directory contains the source for the deployed CharacterMaker remote MCP server.

Current server version: `0.2.0`.

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
- `generation-context-v2`.

The Web Core and MCP now use the same visual-reference ranking concepts: canonical/approved status, primary flag, role priority, primary face/body references and recommended generation assets.

## Primary MCP workflows

### User asks for parameters/details

Use:

`get_preset`

It accepts UUID, stable slug or an exact unique preset name.

`include_assets=true` returns asset metadata only. It intentionally does not inline image bytes. Large preset output is no longer duplicated in both text and structured output: the text part is a compact summary while full normalized data stays in `structuredContent`.

### User asks to show/get saved photos

Use:

`get_visual_package`

Example conceptual request:

`Покажи фотографию Victoria June`

The tool:

1. resolves Persona/Outfit/Scene by UUID, slug or exact unique name;
2. ranks linked images;
3. prefers `canonical`, then `approved`, then fallback references;
4. respects asset role and `is_primary`;
5. returns selected image bytes directly as MCP image content when `include_images=true`.

This is preferred over a manual `list_assets -> get_asset` chain for normal photo requests.

### User asks to create/generate an image

Use:

`prepare_image_generation`

This is the primary high-level tool for requests such as:

- `сделай фото Лайвет`;
- `создай изображение Victoria June`;
- `generate this Persona in the selected Outfit and Scene`.

The tool:

1. resolves Persona by UUID, slug or exact unique name;
2. optionally resolves Outfit and Scene the same way;
3. builds `generation-context-v2`;
4. selects primary face/body and other useful references;
5. returns actual reference images as MCP image content when requested;
6. returns an explicit `host_action.type = native_image_generation` instruction.

**Critical host rule:** CharacterMaker is the source of canonical identity, structured parameters and reference images. It is not the image-generation provider. If the MCP host such as ChatGPT has native image generation and the user asked to generate an image, the host must continue immediately with its native generator after `prepare_image_generation` returns. The host must not stop with a message such as "CharMaker has no generate_image tool".

A separate MCP `generate_image` provider tool is intentionally not required for this workflow.

### Conversational partial update

Use:

`patch_preset`

Only supplied fields/parameters change. Unknown/omitted fields remain untouched.

## Tools

### Read/workflow tools

- `search_presets` - ranked discovery with exact-match and visual-reference summary;
- `get_preset` - complete normalized card and optional asset metadata;
- `get_visual_package` - automatically select and inline the best saved images;
- `prepare_image_generation` - complete CharacterMaker-to-native-generator handoff;
- `get_catalog`;
- `get_schema`;
- `build_generation_context` - provider-independent v2 context by UUID;
- `list_assets` - raw metadata plus ranked visual package;
- `get_asset` - one explicit asset, optionally including image bytes.

### Write tools

- `create_character`;
- `create_outfit`;
- `create_scene`;
- `patch_preset`;
- `import_asset_from_url`;
- `set_asset_reference_status`;
- `archive_preset`.

MCP does not expose hard delete.

## Search behavior

`search_presets` now ranks matches in this order:

1. exact name;
2. exact slug;
3. name prefix;
4. slug prefix;
5. name contains;
6. slug contains;
7. description contains.

For Persona/Outfit/Scene results it also returns:

- asset count;
- canonical asset count;
- approved asset count;
- preview asset id/role;
- `exact_match` when there is exactly one exact result.

For a known exact Persona name and an explicit image-generation request, the host should usually skip the search chain and call `prepare_image_generation` directly.

## Visual-reference ranking

Reference-status priority:

1. `canonical`;
2. `approved`;
3. `reference_only`;
4. `normal`;
5. `rejected` is excluded.

`is_primary=true` increases priority.

Character role priority strongly prefers identity-relevant roles such as:

- `face_closeup`;
- `portrait`;
- `full_front` / `full_body_front`;
- `body_reference`;
- profiles and other references.

The visual package exposes:

- `primary_face_asset`;
- `primary_body_asset`;
- `recommended_assets`;
- `recommended_asset_ids`;
- quality level and warnings.

If no dedicated body reference exists, structured Persona measurements/parameters remain part of generation context and the tool explicitly reports that limitation rather than inventing a body image.

## Required behavior

- Use stable catalog IDs for structured fields.
- If an option ID is uncertain, call `get_catalog` first.
- Unknown Persona facts must be omitted, not replaced by UI defaults or guesses.
- Use `patch_preset` for conversational partial changes so unrelated fields remain unchanged.
- Use `expected_version` when the current entity version is known.
- Permanent Persona identity must not absorb temporary Outfit or Scene attributes.
- Canonical/approved/reference-only images are explicit asset states and must not be inferred from every generation automatically.
- Do not claim Persona parameters were loaded unless `get_preset`, `build_generation_context` or `prepare_image_generation` actually returned them.
- Do not claim an image was shown merely because its URL/metadata was returned. For visible image content use `get_visual_package(include_images=true)` or `get_asset(include_image=true)`.
- For explicit image-generation intent, do not stop after context preparation when the host has a native image generator.

## Image paths

MCP -> client:

- `get_asset(include_image=true)` returns one explicit MCP image;
- `get_visual_package(include_images=true)` returns selected best references;
- `prepare_image_generation(include_images=true)` returns generation context plus selected reference images.

Inline safety limits:

- maximum individual CharacterMaker image: 8 MB;
- maximum combined inline image payload per multimodal workflow call: 12 MB;
- failed individual reference fetches are reported in `inline_image_errors` without discarding the remaining structured context.

Client -> CharacterMaker:

`import_asset_from_url` imports a publicly fetchable JPEG/PNG/WebP up to 8 MB to InfinityFree and then creates Supabase metadata/relation. The exact ability of a host to expose a newly generated image URL/binary to an external MCP tool remains host-dependent.

## Verification

Permanent remote smoke workflow:

`.github/workflows/mcp-smoke.yml`

MCP v0.2 acceptance coverage includes:

- health and version;
- MCP initialize/initialized handshake;
- tools list including `get_visual_package` and `prepare_image_generation`;
- exact-name `Victoria June` search with visual summary;
- `get_preset(include_assets=true)` with full normalized parameters + assets;
- direct canonical image content through `get_visual_package`;
- `prepare_image_generation` returning `generation-context-v2`, `host_action=native_image_generation` and real image content;
- fallback preparation for `Лайвет` even when her current saved visual quality is lower;
- live catalog read.

Write-path validation remains separate because permanent smoke must not create user data.

## Documentation rule

Every change in this function must also update, where applicable:

- `docs/MCP_ARCHITECTURE.md`;
- `docs/CHANGELOG.md`;
- `supabase/README.md`;
- database migration files under `supabase/migrations/` when the database contract changes.

Project-wide mandatory documentation rules are in `docs/DEVELOPMENT_RULES.md`.
