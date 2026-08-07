# CharacterMaker V2 - persistence architecture

Supabase project: `charmaker`  
Project ref: `kszybiwhchwekpmramxn`  
Region: `eu-central-1`

## Product model

CharacterMaker V2 has three primary saved preset entities:

1. `characters` - UI: `Персона`.
2. `outfit_presets` - UI: `Образ`; one preset is the complete clothing set, not a single garment.
3. `scene_presets` - UI: `Сцена`; one preset combines background, action, camera, framing, lighting, style and other scene settings.

`backgrounds` is a reusable background library/building block used inside Scene presets. It is not a replacement for a saved Scene.

Each primary preset supports:

- create;
- load into the editor;
- update;
- archive/delete;
- attach multiple photos;
- mark primary photos by role;
- remove photos.

## Fixed infrastructure

- `main` remains the untouched legacy/reference source.
- V2 development lives in `refactor/domain-catalog-v2`.
- Supabase is used for PostgreSQL, public read API, RLS and the protected admin Edge Function.
- Supabase Storage is not used for CharacterMaker files.
- Cloudflare R2/S3 is not used.
- Video is not part of the product/database model.
- All photos/files are physically stored on InfinityFree under `/media/...`.
- PostgreSQL stores only file metadata and relations.

Example:

```text
InfinityFree:
/media/characters/{character_id}/portrait-....webp

Public URL:
https://charmaker.free.nf/media/characters/{character_id}/portrait-....webp

Supabase:
assets.object_path = /media/characters/...
assets.public_url  = https://charmaker.free.nf/media/...
character_assets   = character_id + asset_id + role
```

The same principle is used for outfits, scenes and generated images.

## Security and editing

Phase 1 has no end-user accounts and no CharacterMaker authentication.

Public browser roles:

- can SELECT active public data;
- cannot INSERT/UPDATE/DELETE tables;
- cannot execute mutation SECURITY DEFINER RPCs directly.

Preset mutations go through the Supabase Edge Function:

```text
admin-presets
```

The Edge Function performs custom validation of the single service editing key, then uses Supabase `service_role` internally to call the database RPC. The mutation RPCs themselves are executable by `service_role` only.

The raw editing key:

- is not committed to GitHub;
- is not embedded in the frontend bundle;
- is not stored in PostgreSQL;
- is kept by the browser only in `sessionStorage` for the current tab after validation.

Database mutation RPCs:

- `admin_upsert_preset`
- `admin_delete_preset`
- `admin_attach_asset`
- `admin_delete_asset`
- `admin_set_character_outfit`

Supabase Security Advisor is expected to remain clean because `anon` and `authenticated` cannot execute these RPCs.

## Catalog system

Core tables:

- `catalogs`
- `catalog_categories`
- `catalog_options`

Flexible preset values:

- `character_parameter_values`
- `outfit_preset_parameter_values`
- `background_parameter_values`
- `scene_preset_parameter_values`

Important physical measurements such as age, height, weight, bust, waist, hips and body-fat percentage remain normal columns on `characters`.

Every V2 preset also stores a lossless `metadata.editor_state` snapshot for exact editor restoration. Binary/Data URL image data is excluded from this snapshot. Normalized parameter rows remain available for filtering, validation and generation logic.

## Persona

Primary table: `characters`  
Parameters: `character_parameter_values`  
Photos: `character_assets`

Photo roles include:

- cover;
- portrait;
- face close-up;
- full front;
- full back;
- left/right profile;
- reference.

Files:

```text
/media/characters/{character_id}/...
```

## Outfit

Primary table: `outfit_presets`  
Parameters: `outfit_preset_parameter_values`  
Photos: `outfit_assets`

One Outfit preset contains the complete look:

- base layer;
- top;
- bottom;
- outerwear;
- footwear;
- color per layer;
- material per layer;
- accessories;
- custom description;
- optional suggested background.

Photo roles include cover, front, back, side, detail, texture, on-model and reference.

Files:

```text
/media/outfits/{outfit_preset_id}/...
```

A Persona can be linked to one or more Outfits through `character_outfits`; one may be marked as default.

## Scene

Primary table: `scene_presets`  
Parameters: `scene_preset_parameter_values`  
Photos: `scene_assets`

A Scene preset contains or references:

- background or custom background text;
- pose or motion;
- emotion;
- character orientation;
- shot type;
- vertical camera angle;
- horizontal camera position;
- aspect ratio;
- natural/studio lighting mode;
- time of day or studio setup;
- main/accent light colors;
- color temperature;
- image style;
- filter;
- reference behavior flags;
- optional reference photos.

Photo roles include cover, preview, reference, background reference and style reference.

Files:

```text
/media/scenes/{scene_preset_id}/...
```

A temporary browser Data URL used while editing a Scene is never persisted to Supabase. The real reference must be uploaded as a Scene asset on InfinityFree.

## Background library

Tables:

- `backgrounds`
- `background_parameter_values`
- `background_assets`

Backgrounds remain reusable building blocks. A saved Scene can choose one or use its own custom background text.

## Generations

Tables:

- `generations`
- `generation_sources`
- `generation_assets`

A generation can be linked to Persona, Outfit, Scene, background and reference assets.

Generated image files:

```text
/media/generations/{generation_id}/...
```

Only metadata and relations are stored in Supabase.

## InfinityFree media API

Frontend endpoint:

```text
api/media.php
```

Protected POST actions:

- `?action=upload`
- `?action=delete`

Current server-side restrictions:

- JPEG, PNG, WebP only;
- maximum 8 MB per image;
- server-generated file names;
- deletion restricted to `/media/...`.

Upload transaction:

```text
Browser
  -> InfinityFree physical file
  -> Supabase asset metadata
  -> preset/asset relation
```

If metadata/relation creation fails after the physical upload, the frontend attempts to remove the just-uploaded file as rollback.

Deletion transaction:

```text
InfinityFree physical file
  -> Supabase asset metadata/relation
```

## Deprecated Storage artifacts

Five empty Supabase Storage buckets were created during the discarded early design. They are private, contain no files and are unused by the application. The active connector does not expose bucket deletion, so they remain inert deprecated artifacts only.

## Current catalog data

Current control totals:

- 63 catalogs;
- 580 catalog options;
- 55 reusable background building blocks.

Legacy `main` remains the source for later controlled import of the old 14 Persona presets, 58 Outfit presets and 26 Scene/photoshoot presets. Their inconsistent legacy values must be normalized explicitly during import rather than silently guessed.

## Final corrective migrations

Relevant migrations after the initial schema/seeds:

- `harden_public_roles_read_only`
- `align_media_schema_with_infinityfree_images_only`
- `align_presets_with_product_model`
- `add_admin_preset_crud_rpc`
- `fix_infinityfree_asset_url_validation`
- `remove_admin_config_table`
- `restrict_admin_rpcs_to_service_role`
- `clean_preset_indexes`

Earlier migration names mentioning Supabase Storage describe superseded history, not the active media architecture.
