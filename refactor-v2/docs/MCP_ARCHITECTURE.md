# CharacterMaker MCP - architecture and current implementation

Updated: 2026-08-08

## Purpose

CharacterMaker MCP is the bridge between MCP hosts such as ChatGPT/Codex and the same CharacterMaker data used by Web.

CharacterMaker is the canonical identity/context/reference source. It is **not required to be the image-generation provider**.

Current intended image flow:

```text
User: "сделай фото Лайвет"
        |
        v
ChatGPT / MCP host
        |
        v
prepare_image_generation("Лайвет")
        |
        +--> Persona normalized parameters
        +--> AI context
        +--> ranked face/body references
        +--> actual MCP image content
        +--> optional Outfit / Scene
        |
        v
host_action = native_image_generation
        |
        v
ChatGPT native image generator
```

A missing CharacterMaker `generate_image` provider tool is therefore not a valid reason for the host to stop when the host itself can generate images.

## Hosting and infrastructure

MCP is deployed inside the existing Supabase Free project as an Edge Function.

- project: `charmaker`;
- ref: `kszybiwhchwekpmramxn`;
- function: `charactermaker-mcp`;
- endpoint: `https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp`;
- current MCP server version: `0.2.0`;
- `verify_jwt=false` is intentional for the current public/no-account phase.

Physical images remain on InfinityFree `/media/...`. Supabase stores PostgreSQL data, metadata and relations. Supabase Storage, Cloudflare and R2 are not used.

## Unified Core

Web and MCP share:

- Persona/Outfit/Scene entities;
- normalized catalog IDs;
- schema versions;
- `ai_context`;
- asset relations/statuses;
- visual-reference ranking concepts;
- optimistic/versioned mutation semantics.

Core Web generation contract is now:

`generation-context-v2`

Source:

`src/core/context.service.ts`

MCP returns the same conceptual v2 package in snake_case and adds MCP-host-specific `host_action` instructions.

## Why MCP v0.2 was needed

Real ChatGPT conversations exposed four service-level failures:

1. a search could be performed but the host did not reliably continue to the full Persona card;
2. showing a saved photo required a manual `list_assets -> get_asset` chain and could result only in text/URL output;
3. large preset data was duplicated in both MCP text and structured output, unnecessarily increasing response size;
4. after `build_generation_context`, the host could incorrectly stop and claim CharacterMaker needed its own `generate_image` tool even though ChatGPT already had native image generation.

The v0.2 tools make the intended action explicit and reduce the number of dependent tool calls.

## Tool model

### `search_presets`

Discovery/listing tool.

Changes in v0.2:

- exact name/slug matches are ranked first;
- returns `exact_match` for one exact result;
- Persona/Outfit/Scene results include visual summary:
  - asset count;
  - canonical count;
  - approved count;
  - preview asset ID/role.

For explicit image-generation intent with a known exact Persona name, `prepare_image_generation` should normally be called directly.

### `get_preset`

Returns complete structured details:

- entity columns;
- normalized parameters with labels;
- AI context;
- optional asset metadata;
- visual package metadata;
- relational Background for Scene.

Identifier accepts UUID, slug or exact unique name.

Important response behavior:

- `include_assets=true` returns metadata only, not binary image content;
- full structured card stays in `structuredContent`;
- text output is a compact summary instead of duplicating the entire card.

This specifically reduces output size and makes `include_assets=true` more robust.

### `get_visual_package`

High-level tool for requests such as:

- `покажи фото Victoria June`;
- `получи фотографии Лайвет`;
- `открой референс Образа`.

It:

1. resolves UUID/slug/exact unique name;
2. loads linked assets;
3. ranks the best visual references;
4. returns selected assets and actual MCP image content in one call.

This replaces normal manual `list_assets -> get_asset` chains.

### `prepare_image_generation`

Primary high-level tool for explicit image creation requests.

Input:

- required Persona UUID/slug/exact name;
- optional Outfit UUID/slug/exact name;
- optional Scene UUID/slug/exact name;
- `include_images`;
- number of reference images.

Output contains:

- `generation-context-v2`;
- full normalized Persona/Outfit/Scene context;
- `generation_brief`;
- ranked visual package;
- primary face/body IDs;
- selected real MCP images;
- `ready_for_native_generation=true`;
- explicit `host_action`.

`host_action` tells a compatible host that if the user requested an image, it should immediately invoke its own native image generator with the returned data and image references.

### `build_generation_context`

Remains available for provider-neutral integrations by UUID.

v0.2 output now includes:

- ranked visual package;
- primary face/body reference IDs;
- recommended assets;
- generation brief;
- native-host continuation instruction.

For interactive ChatGPT image generation, `prepare_image_generation` is preferable because it can inline actual reference image bytes in the same tool result.

### Existing read/write tools

Still available:

- `get_catalog`;
- `get_schema`;
- `list_assets`;
- `get_asset`;
- `create_character`;
- `create_outfit`;
- `create_scene`;
- `patch_preset`;
- `import_asset_from_url`;
- `set_asset_reference_status`;
- `archive_preset`.

Hard delete remains intentionally absent from MCP.

## Visual-reference ranking

Asset quality priority:

1. `canonical`;
2. `approved`;
3. `reference_only`;
4. `normal`;
5. `rejected` is excluded.

Additional ranking signals:

- `is_primary`;
- semantic asset role;
- relation sort order.

Persona role priority recognizes identity references such as:

- `face_closeup`;
- `portrait`;
- `headshot`;
- `full_front`;
- `full_body_front`;
- `body_reference`;
- profiles;
- hair/reference roles.

Returned visual package includes:

- `reference_quality`;
- `primary_face_asset`;
- `primary_body_asset`;
- `recommended_assets`;
- `recommended_asset_ids`;
- warnings when canonical/approved/face/body references are missing.

This is a ranking policy only. It does not modify asset statuses or Persona data.

## Multimodal output safety

Actual MCP images are used by:

- `get_asset(include_image=true)`;
- `get_visual_package(include_images=true)`;
- `prepare_image_generation(include_images=true)`.

Limits:

- one source image <= 8 MB;
- combined inline images per high-level call <= 12 MB;
- individual image-fetch failures are captured in `inline_image_errors`;
- the structured Persona context remains available even if one image fails to fetch.

## Host behavior contract

For explicit requests such as:

`@CharMaker сделай фото Лайвет`

correct behavior is:

```text
prepare_image_generation
-> receive Persona parameters + visual references
-> invoke host native image generation
-> return generated image
```

Incorrect behavior:

```text
build_generation_context
-> "у CharMaker нет generate_image, поэтому я не могу продолжить"
```

For explicit photo-display requests such as:

`покажи фото Victoria June`

correct behavior is:

```text
get_visual_package(include_images=true)
-> display actual MCP image content
```

Do not claim the image was shown when only metadata/URL was returned.

Do not claim full Persona parameters were loaded if only a search result or a single asset was retrieved.

## Persistence and mutation safety

No mutation semantics were changed by the v0.2 visual package.

Current mutation rules remain:

- public shared library, no accounts/roles;
- stable catalog IDs;
- partial `patch_preset`;
- `expected_version` conflict detection;
- idempotency;
- audit log;
- soft archive;
- unknown Persona facts omitted rather than guessed/defaulted.

## Automated verification

Permanent workflow:

`.github/workflows/mcp-smoke.yml`

v0.2 smoke explicitly validates the previously problematic scenarios:

1. health reports server `0.2.0`;
2. MCP handshake;
3. tools include `get_visual_package` and `prepare_image_generation`;
4. exact `Victoria June` search returns visual summary;
5. `get_preset("Victoria June", include_assets=true)` returns normalized card + assets without error;
6. `get_visual_package` returns an actual canonical image;
7. `prepare_image_generation("Victoria June")` returns v2 context, actual image content and `native_image_generation` host action;
8. `prepare_image_generation("Лайвет")` also works with her current fallback-quality reference;
9. catalog read remains functional.

Permanent smoke is read-only and does not create test user data.

## Scope of the 2026-08-08 correction

This correction changes **service/Core/MCP behavior only**.

It does not alter Persona/Outfit/Scene user data, measurements, catalog values or canonical asset statuses. Data cleanup/enrichment is a separate task.

## Documentation rule

Every MCP/Core contract change must update:

- this document;
- `supabase/functions/charactermaker-mcp/README.md`;
- `docs/CHANGELOG.md`;
- affected tests/workflows;
- DB migrations only when the database schema/contract itself changes.
