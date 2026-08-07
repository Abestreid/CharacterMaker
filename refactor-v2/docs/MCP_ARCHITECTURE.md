# CharacterMaker MCP - architecture and current implementation

Updated: 2026-08-07

## Purpose

CharacterMaker MCP is a bidirectional bridge between MCP clients such as ChatGPT/Codex and the same CharacterMaker data used by the Web UI.

The MCP is not a second CharacterMaker implementation. It uses the same persisted entities, stable catalog IDs, normalized parameter tables, AI context fields and asset relations.

Primary workflow:

```text
MCP client
   |
   v
CharacterMaker MCP
   |
   +--> Persona
   +--> Outfit
   +--> Scene
   +--> Catalogs
   +--> Assets
   +--> Generation Context
   |
   v
Supabase PostgreSQL
   |
   +--> image metadata/relations
             |
             v
       InfinityFree /media
```

## Hosting and cost model

MCP is deployed inside the existing Supabase Free project as an Edge Function.

No additional hosting provider is used.

Not used:

- Cloudflare Workers;
- Cloudflare R2;
- Supabase Storage;
- paid standalone backend.

Supabase project:

`charmaker`

Project ref:

`kszybiwhchwekpmramxn`

Edge Function:

`charactermaker-mcp`

Remote MCP endpoint:

`https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp`

Health endpoint:

`https://kszybiwhchwekpmramxn.supabase.co/functions/v1/charactermaker-mcp/health`

Current deployed function version at initial deployment: `1`.

## Authentication mode

Current CharacterMaker phase has no end-user accounts, roles or private presets.

Therefore the MCP function is intentionally deployed with:

`verify_jwt = false`

This matches the current public shared-library model. Authentication/ownership must not be added silently while CharacterMaker remains a personal public tool.

When real multi-user accounts are introduced later, MCP auth and database ownership/RLS must be designed together as a separate architecture change.

## Protocol implementation

Runtime:

- Supabase Edge Functions / Deno;
- `@modelcontextprotocol/server` 2.x;
- Zod 4;
- `@supabase/supabase-js`.

The server uses the current stateless MCP handler and keeps legacy stateless compatibility enabled for older MCP clients.

Source in Git:

`supabase/functions/charactermaker-mcp/index.ts`

## Current MCP tools

### Read tools

`search_presets`

Searches active public:

- Persona;
- Outfit;
- Scene;
- reusable Background.

`get_preset`

Returns a complete saved entity bundle:

- entity columns;
- schema/version;
- `ai_context`;
- normalized parameter values;
- catalog labels for parameter IDs;
- linked images;
- relational Background for Scene.

`get_catalog`

Returns one current database catalog, categories and active option values. MCP should call this before writing an option when the stable `option_id` is uncertain.

`get_schema`

Returns current persistence/MCP contract and schema versions.

`build_generation_context`

Builds a provider-independent bundle from:

- required Persona;
- optional Outfit;
- optional Scene;
- AI contexts;
- canonical images;
- approved/reference-only images.

It does not call an image-generation provider.

`list_assets`

Returns linked asset metadata, role, primary flag and reference status.

`get_asset`

Returns asset metadata and can return the actual image as MCP image content.

### Write tools

`create_character`

Creates a public Persona. Unknown facts must be omitted rather than replaced with guessed UI defaults.

`create_outfit`

Creates one complete public Outfit/Образ.

`create_scene`

Creates a public Scene and resolves `background_slug` to the relational `backgrounds.id`.

`patch_preset`

Performs a true partial update. Omitted fields stay unchanged.

Supports:

- top-level field patches;
- parameter-level upsert;
- parameter-level delete;
- `expected_version` optimistic concurrency;
- idempotency;
- MCP mutation audit source.

`import_asset_from_url`

Imports a publicly fetchable JPEG/PNG/WebP into InfinityFree and attaches it to a saved entity.

Current DEV media target:

`https://charmaker.free.nf/dev/api/media.php?action=upload`

The physical file is stored under the normal root `/media/...` structure.

`set_asset_reference_status`

Sets:

- `normal`;
- `approved`;
- `canonical`;
- `reference_only`;
- `rejected`.

`archive_preset`

Soft-deletes an entity from the active public library. MCP does not expose hard delete.

## Partial updates

Database RPC:

`public_patch_preset`

This is separate from the full Web editor save RPC because MCP conversations frequently change one fact only.

Example conceptual operation:

```text
"У Блонди теперь зеленые глаза"
```

MCP patch:

```json
{
  "kind": "character",
  "id": "...",
  "expected_version": 4,
  "parameters": [
    {
      "catalog_id": "eye_color",
      "option_id": "green",
      "position": 0
    }
  ]
}
```

All other Persona fields remain unchanged.

The RPC was transactionally tested against a real existing Persona and rolled back after the test, confirming both the update behavior and rollback integrity.

## AI context

Primary presets contain `ai_context` JSONB.

Expected semantic fields include:

- `summary`;
- `canonicalDescription`;
- `identityInstructions`;
- `mustPreserve[]`;
- `mayVary[]`;
- `avoid[]`;
- `generationNotes[]`;
- `schemaVersion`.

The normal Web editor preserves existing `ai_context` when it updates visual fields, so Web and MCP do not erase each other's data.

## Images and canonical references

Physical image storage stays on InfinityFree.

Supabase stores:

- asset metadata;
- entity relation;
- role;
- primary flag;
- `reference_status`.

A typical Persona can therefore have:

```text
portrait          primary + canonical
face_closeup      canonical
full_front        approved
reference         reference_only
```

MCP `get_asset` can return the image itself to a compatible client.

MCP `import_asset_from_url` handles the reverse direction when the client can provide a publicly fetchable image URL.

The exact ability of a particular MCP host to pass its own newly generated image directly into an external MCP tool depends on that host. CharacterMaker does not assume that capability; URL import and MCP image output are explicit supported paths.

## Database safety for the current public phase

Public writes are intentional at this stage.

The system still protects data consistency with:

- normalized catalog IDs;
- schema versions;
- optimistic entity `version`;
- `expected_version` conflict detection;
- idempotency keys;
- audit log;
- soft archive instead of MCP hard delete.

Security Advisor warnings about public executable `SECURITY DEFINER` mutation RPCs are expected under this explicitly chosen public/no-account mode and must not be "fixed" by introducing accounts or service-role-only writes without a new product decision.

## Automated verification

GitHub workflow:

`.github/workflows/mcp-smoke.yml`

It performs remote checks from an external GitHub runner:

1. health endpoint;
2. MCP `initialize`;
3. initialized notification;
4. `tools/list`;
5. real Persona search against Supabase;
6. current catalog read;
7. actual image-content read when the smoke reference asset is available.

The workflow publishes commit status:

`mcp/smoke`

This verification is separate from frontend `deployment/dev` status.

## Documentation rule

Every MCP tool/schema/protocol/deployment change must update:

- this document;
- `docs/CHANGELOG.md`;
- affected database migration documentation;
- source in `supabase/functions/charactermaker-mcp/`.
