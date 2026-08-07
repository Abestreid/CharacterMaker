# CharacterMaker V2 - final current-HEAD verification

Date: 2026-08-07

## DEV commit verification

The final audit compared:

- current GitHub HEAD of `refactor/domain-catalog-v2`;
- `https://charmaker.free.nf/dev/build-info.json` commit value with cache-busting query.

Result:

The two commit SHAs matched exactly before the final browser/device audit was run.

Therefore the final device test below was performed against the currently published branch HEAD, not a previous successful deployment.

## Final browser/device rerun

After exact HEAD/DEV SHA equality was confirmed, the complete independent interactive audit was run again against published DEV with:

- Desktop Chrome;
- iPhone 13 / WebKit;
- Pixel 5 / Chromium.

For all three profiles the audit revalidated:

- `#/character` -> `Персона`;
- `#/wardrobe` -> `Образ`;
- `#/scene` -> `Сцена`;
- `#/results` -> `Результаты`;
- `#/catalogs` -> `Все списки`;
- no material horizontal overflow;
- mobile input computed font size >= 16 px;
- mobile bottom navigation opens `#/wardrobe`;
- temporary Scene reference Data URL does not persist in Zustand localStorage.

Result:

All final current-HEAD device assertions passed.

## Related verification

- local checkout of the current branch also passed `npm install`, `npm run check` and `npm run build`;
- database integrity assertions passed;
- remote MCP protocol smoke passed;
- remote MCP write validation passed and its fixture was cleaned;
- pre-change Git/DB recovery points and the lean recovery artifact workflow are documented separately.
