# CharacterMaker V2 - Supabase

Supabase project: `charmaker`

Project ref: `kszybiwhchwekpmramxn`

Region: `eu-central-1`

## Principles

- `main` remains the legacy CharacterMaker source and is not part of V2 deployment.
- V2 frontend reads public data through the Supabase publishable key.
- Database passwords and service-role keys must never be committed to GitHub or exposed to the browser.
- Phase 1 has no CharacterMaker user accounts or authentication.
- Anonymous/authenticated browser roles have read-only access to public active data.
- Writes are intentionally blocked by RLS and are performed only through trusted administration/backend tooling.
- Binary media is stored in object storage; PostgreSQL stores metadata and relationships.
- The `assets.storage_provider` field supports `supabase`, `r2`, and `external` so media storage can migrate later without redesigning the domain model.

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

Core measurements such as age, height, weight, bust, waist, hips, and body-fat percentage remain normal columns on `characters` rather than generic EAV values.

### Public libraries

- `characters`
- `wardrobe_items`
- `backgrounds`
- `scene_presets`
- `tags`

### Media

- `assets`
- `asset_variants`
- `character_assets`
- `wardrobe_assets`
- `background_assets`

Character asset roles include portrait, face close-up, full front, full back, left/right profile, cover and references.

Wardrobe asset roles include cover, front, back, side, detail, texture, on-model and references.

Background asset roles include cover, preview, reference, plate, mask, depth and panorama.

### Relations

- `character_wardrobe_items`
- `character_tags`
- `wardrobe_tags`
- `background_tags`

### Generations

- `generations`
- `generation_sources`
- `generation_assets`

A generation records provider, model, prompt, settings, request/response metadata and status. `generation_sources` links it to characters, wardrobe, backgrounds and reference assets. `generation_assets` links generated images/videos, variations, previews and upscales.

## Storage buckets

Public read-only catalog/media buckets:

- `catalog-characters`
- `catalog-wardrobe`
- `catalog-backgrounds`
- `generated-images`
- `generated-videos`

There are no anonymous insert/update/delete policies in phase 1.

## Applied database migrations

1. `create_charmaker_core_schema`
2. `configure_public_read_rls_and_storage`
3. `seed_character_catalogs`
4. `seed_wardrobe_catalogs`
5. `seed_scene_catalogs`
6. `add_asset_variants_scene_presets_and_character_wardrobe`
7. `add_foreign_key_indexes`

## Current seeded catalogs

The database is the primary catalog source for V2. Current normalized V2 lists include character appearance/body/face/makeup, wardrobe layers/materials/colors/accessories, backgrounds, camera, poses/motions/emotions/orientations, lighting, filters and image styles.

The React application keeps the TypeScript catalogs as a temporary network fallback while migration to database-backed forms is completed.
