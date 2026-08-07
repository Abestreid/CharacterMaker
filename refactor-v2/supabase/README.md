# CharacterMaker V2 - persistence architecture

Supabase project: `charmaker`

Project ref: `kszybiwhchwekpmramxn`

Region: `eu-central-1`

## Product model

CharacterMaker V2 has three primary saved preset entities:

1. `characters` - UI: `Персона`.
2. `outfit_presets` - UI: `Образ`; one row is a complete clothing set, not one garment.
3. `scene_presets` - UI: `Сцена`; one row combines background, action, camera, framing, lighting, style and related scene settings.

`backgrounds` is a reusable background library/building block used inside Scene presets. It is not a replacement for a saved Scene.

Each primary preset supports the same lifecycle:

- create;
- load into the editor;
- update;
- archive/delete;
- attach multiple photos;
- mark primary photos by role;
- remove photos.

## Fixed infrastructure

- `main` remains the untouched legacy/reference CharacterMaker source.
- V2 development lives in `refactor/domain-catalog-v2`.
- Supabase is the structured database/API only.
- Supabase Storage is not used for CharacterMaker files.
- Cloudflare R2/S3 is not used.
- Video is not part of the product/database model.
- All photos and files are physically stored on InfinityFree under `/media/...`.
- PostgreSQL stores file metadata and relations only.

Example:

```text
InfinityFree file:
/media/characters/{character_id}/portrait-....webp

Public URL:
https://charmaker.free.nf/media/characters/{character_id}/portrait-....webp

Supabase:
assets.object_path = /media/characters/...
assets.public_url  = https://charmaker.free.nf/media/...
character_assets   = character_id + asset_id + role
```

The same principle is used for `outfits`, `scenes` and generated images.

## Public access and editing

Phase 1 has no end-user accounts and no CharacterMaker authentication.

Public application roles have read-only access to active public data. Direct INSERT/UPDATE/DELETE permissions are revoked and RLS is enabled.

Mutations use protected SECURITY DEFINER RPC functions and a single service editing key. The raw editing key is never committed to GitHub and is never embedded into the frontend bundle. The browser keeps it only in `sessionStorage` for the current tab after successful validation.

Available mutation RPCs:

- `admin_validate_token`
- `admin_upsert_preset`
- `admin_delete_preset`
- `admin_attach_asset`
- `admin_delete_asset`
- `admin_set_character_outfit`

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

Every V2 preset also stores a lossless `metadata.editor_state` snapshot so the exact editor state can be restored on Load. Normalized parameter rows remain the source for filtering, validation and generation logic.

## Persona

Primary table:

- `characters`

Parameter table:

- `character_parameter_values`

Photos:

- `character_assets`

Supported photo roles include:

- cover;
- portrait;
- face close-up;
- full front;
- full back;
- left/right profile;
- reference.

Physical path convention:

```text
/media/characters/{character_id}/...
```

## Outfit

Primary table:

- `outfit_presets`

A preset represents the whole look/complete clothing set:

- base layer;
- top;
- bottom;
- outerwear;
- footwear;
- color for every layer;
- material for every layer;
- accessories;
- custom description;
- optional suggested background.

Parameter table:

- `outfit_preset_parameter_values`

Photos:

- `outfit_assets`

Photo roles include cover, front, back, side, detail, texture, on-model and reference.

Physical path convention:

```text
/media/outfits/{outfit_preset_id}/...
```

A Persona can be linked to one or more saved Outfits through `character_outfits` and one of them can be marked as default.

## Scene

Primary table:

- `scene_presets`

A saved Scene contains or references:

- background preset or custom background text;
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

Parameter table:

- `scene_preset_parameter_values`

Photos:

- `scene_assets`

Photo roles include cover, preview, reference, background reference and style reference.

Physical path convention:

```text
/media/scenes/{scene_preset_id}/...
```

## Background library

Tables:

- `backgrounds`
- `background_parameter_values`
- `background_assets`

Backgrounds remain reusable scene components. A Scene preset can use a background from the library or custom text.

## Generations

Tables:

- `generations`
- `generation_sources`
- `generation_assets`

A generation can be linked to:

- Persona preset;
- Outfit preset;
- Scene preset;
- background building block;
- reference asset.

Generated image files are written to:

```text
/media/generations/{generation_id}/...
```

Only their metadata and relations live in Supabase.

## InfinityFree media API

Frontend endpoint:

```text
api/media.php
```

It supports protected POST actions:

- `?action=upload`
- `?action=delete`

Upload restrictions currently enforced server-side:

- JPEG;
- PNG;
- WebP;
- maximum 8 MB per image;
- file paths are generated by the server;
- deletion is restricted to `/media/...` only.

Upload transaction:

```text
Browser
  -> InfinityFree /media file
  -> Supabase assets metadata
  -> owner relation
```

If the Supabase relation fails after file upload, the frontend attempts to delete the just-uploaded InfinityFree file as rollback.

Deletion transaction:

```text
InfinityFree physical file
  -> Supabase asset metadata/relation
```

## Legacy Supabase Storage artifacts

Five empty buckets were created during the discarded early storage design. They are private and unused. The active application has no Storage upload/read integration. The current connector does not expose the bucket deletion operation, so these empty buckets are treated as deprecated infrastructure artifacts rather than product storage.

## Current seeded data

The database currently contains the normalized V2 catalog system, including character/body/face/makeup settings, complete outfit layers/materials/colors/accessories, backgrounds, camera, poses/motions/emotions, lighting, filters and image styles.

Current control totals:

- 63 catalogs;
- 580 catalog options;
- 55 background building blocks.

Legacy `main` remains the source for later controlled import of the old 14 Persona presets, 58 Outfit presets and 26 Scene/photoshoot presets. Their inconsistent legacy values must be normalized explicitly during import rather than silently guessed.

## Relevant migrations

The active architecture includes the original schema/seed migrations plus these corrective/final migrations:

- `harden_public_roles_read_only`
- `align_media_schema_with_infinityfree_images_only`
- `align_presets_with_product_model`
- `add_admin_preset_crud_rpc`
- `fix_infinityfree_asset_url_validation`

Any earlier migration names referring to Supabase Storage describe superseded history, not the active media architecture.
