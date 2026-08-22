# CharacterMaker recovery artifact v2 - authoritative binary/media package

Date: 2026-08-07

Use this document together with:

- `docs/backups/2026-08-07-pre-core-mcp-fixes.md`;
- Git branch `backup/dev-2026-08-07-pre-core-mcp-fixes`;
- Supabase snapshot schema `backup_20260807_1548`.

## Authoritative artifact workflow

Use:

`.github/workflows/backup-pre-core-mcp-v2.yml`

Artifact:

`charactermaker-pre-core-mcp-2026-08-07-v2`

Retention:

90 days in GitHub Actions.

## Contents

The v2 workflow:

1. checks out the exact pre-fix backup branch;
2. installs dependencies only for validation/build;
3. runs the original backup branch `npm run check`;
4. rebuilds the pre-fix production `dist`;
5. copies source while explicitly excluding `node_modules/` and generated `dist/`;
6. stores rebuilt `dist` separately;
7. snapshots InfinityFree `/htdocs/media`;
8. writes source branch/commit and Supabase backup schema metadata;
9. writes `RECOVERY_MANIFEST.txt` with file counts;
10. creates SHA-256 checksums for every artifact file.

## Why v2 exists

The first convenience artifact workflow copied the source tree after `npm install` and therefore could include `node_modules`. It is not the preferred recovery artifact.

The v2 workflow is the authoritative lean artifact because dependencies are reproducible from `package.json` and should not be stored in the recovery package.

The persistent recovery sources remain the Git backup branch and Supabase backup schema even after the 90-day artifact retention expires.
