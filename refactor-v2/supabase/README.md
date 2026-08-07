# CharacterMaker V2 - Supabase

Supabase project: `charmaker`

Project ref: `kszybiwhchwekpmramxn`

Region: `eu-central-1`

## Fixed architecture

- `main` remains the legacy CharacterMaker source and is not part of V2 deployment.
- V2 frontend reads public structured data through the Supabase publishable key.
- Supabase is used only for PostgreSQL data/API and RLS.
- All photos and other binary files are stored on the InfinityFree hosting used by CharacterMaker and are published through normal hosting paths/URLs.
- Supabase Storage is not part of the CharacterMaker media architecture.
- Cloudflare R2/S3 is not part of the CharacterMaker media architecture.
- Video is not part of the CharacterMaker product or database model.
- PostgreSQL stores file metadata and relations only: hosting path, public URL, MIME type, dimensions, size, role and ownership relation.
- Database passwords and service-role keys must never be committed to GitHub or exposed to the browser.
- Phase 1 has no CharacterMaker user accounts or authentication.
- Anonymous/authenticated browser roles have read-only access to public active data.
- Writes are blocked both by SQL privileges and RLS; trusted administration/backend tooling handles mutations.

## Main tables

### Catalog system

- `catalogs`
- `catalog_categories`
- `catalog_options`

Flexible entity values:

- `character_parameter_values`
- `wardrobe_parameter_values`
- `background_parameter_values`
- `scene_preset_parameter_values`

Core measurements such as age, height, weight, bust, waist, hips and body-fat percentage remain normal columns on `characters` rather than generic EAV values.

### Public libraries

- `characters`
- `wardrobe_items`
- `backgrounds`
- `scene_presets`
- `tags`

### Files and images

- `assets`
- `asset_variants`
- `character_assets`
- `wardrobe_assets`
- `background_assets`

`assets.storage_provider` is `infinityfree` for CharacterMaker-hosted files or `external` only for intentionally external references.

For InfinityFree assets, `object_path` stores the hosting-relative path and `public_url` stores the public URL when available.

Character image roles include portrait, face close-up, full front, full back, left/right profile, cover and references.

Wardrobe image roles include cover, front, back, side, detail, texture, on-model and references.

Background image roles include cover, preview, reference, plate, mask, depth and panorama.

### Relations

- `character_wardrobe_items`
- `character_tags`
- `wardrobe_tags`
- `background_tags`

### Image generations

- `generations`
- `generation_sources`
- `generation_assets`

A generation records provider, model, prompt, settings, request/response metadata and status. `generation_sources` links it to characters, wardrobe, backgrounds and reference assets. `generation_assets` links generated images, thumbnails, variations, previews and upscales.

Generated image files themselves are stored on InfinityFree, not in Supabase Storage.

## Applied database migrations

1. `create_charmaker_core_schema`
2. `configure_public_read_rls_and_storage`
3. `seed_character_catalogs`
4. `seed_wardrobe_catalogs`
5. `seed_scene_catalogs`
6. `add_asset_variants_scene_presets_and_character_wardrobe`
7. `add_foreign_key_indexes`
8. `harden_public_roles_read_only`
9. `align_media_schema_with_infinityfree_images_only`

Migration 9 supersedes the initial media-storage assumptions from migrations 1-2: the active model is InfinityFree-hosted files, no Supabase Storage usage and no video model.

## Current seeded catalogs

The database is the primary catalog source for V2. Current normalized V2 lists include character appearance/body/face/makeup, wardrobe layers/materials/colors/accessories, backgrounds, camera, poses/motions/emotions/orientations, lighting, filters and image styles.

The React application keeps the TypeScript catalogs as a temporary network fallback while migration to database-backed forms is completed.
