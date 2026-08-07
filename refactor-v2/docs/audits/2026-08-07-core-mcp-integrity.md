# CharacterMaker V2 - Core/MCP integrity audit

Date: 2026-08-07

## Scope

Final database/data integrity audit after the Core/MCP correction package.

## Control totals

Validated against live Supabase:

- active catalogs: 68;
- active catalog options: 584;
- active reusable backgrounds: 55.

The SQL audit is assertion-based and raises an exception on any mismatch.

## Catalog integrity

Validated:

- every active catalog option belongs to an existing active catalog;
- the complete `background` catalog option set matches active `backgrounds.slug` values in both directions;
- there are no missing reusable Background rows for active background options;
- there are no extra active reusable Background rows without a matching active background option.

## Normalized preset integrity

Validated that every non-null `option_id` currently stored in:

- `character_parameter_values`;
- `outfit_preset_parameter_values`;
- `scene_preset_parameter_values`

has a matching active `(catalog_id, option_id)` in `catalog_options`.

Result: no broken option references.

## Test-data cleanup

Previous final audit also confirmed:

- 0 MCP write-test characters;
- 0 rollback-test outfits;
- 0 rollback-test scenes;
- 0 test/rollback idempotency keys.

The three historical Character rows that existed before the correction package retain the same active/archive/public status as the pre-change backup snapshot.

## Background relation validation

A transactional Scene persistence test additionally confirmed that `background_slug` resolves to a real `backgrounds.id` UUID and can be read back as the same stable slug. The transaction was rolled back and left no test rows.

## Backup references

Pre-change recovery points:

- Git branch `backup/dev-2026-08-07-pre-core-mcp-fixes`;
- Supabase snapshot schema `backup_20260807_1548`;
- GitHub recovery artifact workflow `.github/workflows/backup-pre-core-mcp.yml`;
- recovery documentation `docs/backups/2026-08-07-recovery-artifact.md`.
