# 2026-08-07 - Web partial-update safety correction

## Change

Existing saved Persona, Outfit and Scene entities are no longer written back by Web as a complete editor-state overwrite.

`characterMakerService` now:

1. reloads the current normalized saved state;
2. builds a deterministic diff against the current editor state;
3. sends only changed columns and `catalog_id + position` parameter values to `public_patch_preset`;
4. sends delete patches for normalized values that are no longer present;
5. uses the selected entity `expected_version` for optimistic concurrency.

## Reason

MCP may create intentionally sparse entities where unknown facts are omitted.

Web controls can display fallback/default values for usability. Those values must not become persisted facts merely because the user opens a sparse entity and clicks Update.

The invariant is:

`UI default != persisted fact`

## AI context

Ordinary Web updates continue to preserve existing `ai_context` unless an explicit replacement/patch is provided.

## Tests

Added:

`src/core/character-maker.service.test.ts`

Regression coverage verifies:

- one changed eye-color produces only one normalized parameter patch;
- unchanged fallback/default state produces no state-value patch;
- female -> male removes obsolete female-only body parameters;
- Scene background change patches both `background_slug` and normalized `background` value.

## Documentation

Full rule:

`docs/WEB_PARTIAL_UPDATE_RULES.md`

PR #1 description was updated with the same invariant and implementation behavior.
