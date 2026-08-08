# 2026-08-08 - MCP visual and native-generation workflow correction

## Scope

This package changes CharacterMaker service/Core/MCP behavior only.

It does **not** modify Persona/Outfit/Scene user data, measurements, catalog option values or existing asset reference statuses. Data enrichment is a separate task.

## Problems reproduced from real ChatGPT conversations

1. Persona search could occur without a reliable continuation to the full preset card.
2. A saved photo could be found as asset metadata/URL but not appear visibly in the chat until a second manual `get_asset` call.
3. `get_preset(include_assets=true)` duplicated large data in MCP text and `structuredContent`, increasing response size without value.
4. After `build_generation_context`, the host could stop with the incorrect conclusion that CharacterMaker needed its own `generate_image` MCP tool even when ChatGPT already had native image generation.
5. MCP had no single high-level operation that returned Persona parameters, canonical references and actual image bytes together.

## MCP v0.2.0

Server version changed from `0.1.0` to `0.2.0`.

### New `get_visual_package`

For requests to show/get saved CharacterMaker photos.

- accepts UUID, slug or exact unique name;
- ranks assets by reference status, primary flag and semantic role;
- returns primary face/body references where applicable;
- inlines selected image bytes as MCP image content;
- avoids the normal `list_assets -> get_asset` multi-call chain.

### New `prepare_image_generation`

Primary tool for explicit image-generation requests.

- accepts Persona UUID/slug/exact name;
- accepts optional Outfit and Scene identifiers;
- builds `generation-context-v2`;
- returns generation brief and structured parameters;
- selects recommended identity/body/outfit/scene references;
- can inline the actual reference images;
- returns `host_action.type = native_image_generation` and `should_continue=true`.

Host rule: when the user asked for an image and the host has native image generation, the host should continue immediately after this tool result. Absence of a CharacterMaker `generate_image` provider tool is not a reason to stop.

### Improved `search_presets`

- exact name and slug matching ranked first;
- returns `exact_match` for one exact result;
- search results include asset/canonical/approved counts and preview asset metadata;
- explicit generation requests with a known exact Persona should usually call `prepare_image_generation` directly.

### Improved `get_preset`

- identifier supports UUID, slug or exact unique name;
- `include_assets=true` returns asset metadata and visual package, never binary image bytes;
- transient `metadata.editor_state` is removed from MCP entity output because normalized rows are canonical for restoration;
- full card remains in `structuredContent`;
- text output is a compact summary rather than a duplicate of the full card.

### Improved visual ranking

Reference status priority:

`canonical > approved > reference_only > normal > rejected(excluded)`.

Additional ranking:

- `is_primary`;
- semantic role;
- relation sort order.

Persona role ranking recognizes face, portrait, full-body, body-reference, profiles and other identity references.

Warnings are returned rather than invented data when a canonical/approved/face/body reference is missing.

### Multimodal failure isolation

- one image remains limited to 8 MB;
- combined inline high-level workflow payload is limited to 12 MB;
- an individual failed image fetch is written to `inline_image_errors`;
- the remaining structured Persona context and successfully fetched images are still returned.

## Unified Web Core

`src/core/context.service.ts` moved from `generation-context-v1` to `generation-context-v2`.

Core now exposes the same concepts:

- `VisualPackage`;
- reference quality;
- primary face/body assets;
- ranked recommended assets;
- recommended asset IDs.

MCP adds only protocol/host-specific output such as `host_action` and inline MCP image content.

## Automated acceptance coverage

`.github/workflows/mcp-smoke.yml` now reproduces the previously problematic read/image flows:

1. health reports v0.2.0;
2. MCP handshake;
3. tools include `get_visual_package` and `prepare_image_generation`;
4. exact-name `Victoria June` search returns visual summary;
5. `get_preset("Victoria June", include_assets=true)` returns normalized parameters and assets;
6. `get_visual_package("Victoria June")` returns actual image content;
7. `prepare_image_generation("Victoria June")` returns `generation-context-v2`, native-generation host action and real reference image content;
8. `prepare_image_generation("Лайвет")` works using her current saved visual reference quality without changing her data;
9. catalog reads remain functional.

Permanent smoke is read-only and does not create or modify user presets.
