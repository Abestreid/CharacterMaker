# Backup before Core/MCP corrections - 2026-08-07

Backup created before the CharacterMaker V2 consistency and MCP-readiness corrections.

## Git DEV snapshot

Source branch:

`refactor/domain-catalog-v2`

Backup branch:

`backup/dev-2026-08-07-pre-core-mcp-fixes`

The backup branch was created before any correction commits from this work package.

## Supabase snapshot

Project: `charmaker`

Project ref: `kszybiwhchwekpmramxn`

Backup schema:

`backup_20260807_1548`

Snapshot contains:

- copies of all 25 tables from `public` with their current data;
- `_function_definitions` with definitions of functions from `public`;
- `_policies` with RLS policy metadata;
- `_table_counts` with row counts at backup time;
- `_backup_manifest` with snapshot metadata.

Verification performed immediately after creation. Source and backup row counts matched for all 25 tables.

Control values at backup time:

- `catalogs`: 68;
- `catalog_options`: 584;
- `backgrounds`: 55;
- `characters`: 3;
- `character_parameter_values`: 90;
- `assets`: 1;
- `character_assets`: 1;
- `outfit_presets`: 0;
- `scene_presets`: 0;
- `generations`: 0.

## Restore note

This is an in-project database snapshot for rollback/reference, not an external disaster-recovery backup. Do not delete the schema until the correction package has been validated on DEV.
