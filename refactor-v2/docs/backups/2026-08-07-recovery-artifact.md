# CharacterMaker recovery artifact - 2026-08-07

This supplements the pre-Core/MCP backup documented in:

`docs/backups/2026-08-07-pre-core-mcp-fixes.md`

## Existing pre-change backups

- Git source branch: `backup/dev-2026-08-07-pre-core-mcp-fixes`.
- Supabase snapshot schema: `backup_20260807_1548`.
- The Supabase snapshot includes all 25 public tables/data plus manifests for functions, policies and row counts.
- Public and backup table row counts were verified 1:1 before changes.

## Recovery artifact workflow

Workflow:

`.github/workflows/backup-pre-core-mcp.yml`

Artifact name:

`charactermaker-pre-core-mcp-2026-08-07`

Retention:

90 days in GitHub Actions.

The workflow checks out the exact pre-fix backup branch, runs its original V2 checks/build and stores:

- complete `refactor-v2` source from the backup branch;
- rebuilt production `dist` from that exact source;
- source commit/branch metadata;
- the Supabase backup schema name;
- SHA-256 checksums;
- a snapshot of InfinityFree `/htdocs/media`.

The media snapshot is included because physical images are intentionally not stored in Supabase. The correction/testing work did not leave new test media files or delete user media, so the media set remains the user data set associated with the pre-fix state.

## Recovery order

For a full recovery of the pre-Core/MCP state:

1. restore code from `backup/dev-2026-08-07-pre-core-mcp-fixes` or the artifact source/dist;
2. restore database objects/data from `backup_20260807_1548` using the documented manifest/function/policy snapshots as the recovery source;
3. restore `/media` from the recovery artifact if physical media recovery is required;
4. redeploy the reconstructed `dist` to `/htdocs/dev`;
5. verify `build-info`/DEV behavior before any new migration is applied.

## Important

The Git backup branch and Supabase backup schema are persistent project recovery points. The GitHub Actions artifact is an additional convenient binary/media recovery package and is not the only backup copy.
