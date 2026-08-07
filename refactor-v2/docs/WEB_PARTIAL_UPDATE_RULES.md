# CharacterMaker V2 - Web partial-update rules

Updated: 2026-08-07

## Why this rule exists

CharacterMaker can receive a Persona, Outfit or Scene from MCP with incomplete information. Unknown facts must remain unknown.

The Web editor still needs concrete fallback/default values to render some controls, but a displayed fallback is not evidence that the saved entity actually has that value.

Therefore:

```text
UI default != persisted fact
```

## New preset

When the user creates a brand-new preset in the Web editor, the current editor state is intentionally saved as the initial complete state. The user is creating that entity from the visible editor configuration.

This uses:

`public_upsert_preset`

## Existing preset

When an existing preset is loaded from Supabase and edited in Web, Web must never full-save all displayed controls automatically.

Current behavior:

1. Core reloads the current normalized saved state from Supabase.
2. The editor state is compared with that baseline.
3. Only changed top-level columns and normalized parameters are included in a patch.
4. Unchanged UI fallback/default values are omitted.
5. `public_patch_preset` applies only those changes.
6. `expected_version` prevents overwriting a newer concurrent change.

This is implemented in:

- `src/core/character-maker.service.ts`;
- `src/infrastructure/supabase/preset.repository.ts`.

## Parameter diff semantics

Normalized parameter identity is:

```text
catalog_id + position
```

For each parameter:

- missing before + present now -> insert/update;
- present before + changed now -> update;
- present before + absent now -> delete;
- unchanged -> omitted from patch.

This is especially important for:

- Persona gender-dependent body fields;
- Outfit colors/materials/accessory positions;
- Scene pose vs motion;
- Scene background;
- optional text/detail fields.

## Persona example

If MCP created a sparse Persona with only:

```text
gender = female
eye_color = green
```

and Web visually displays fallback values for other controls, clicking update without changing those controls must not create saved facts for height, weight, hair, face, makeup or other unknown attributes.

If the user explicitly changes eye color from green to blue, the patch contains only:

```json
{
  "parameters": [
    {
      "catalog_id": "eye_color",
      "position": 0,
      "option_id": "blue"
    }
  ]
}
```

plus normal entity metadata needed for the update.

## Gender transition

Character full-state mapping excludes female-only body parameters when gender is male.

Therefore a Web update changing Persona gender from female to male produces delete patches for previously persisted female-only parameter rows instead of leaving contradictory data in the database.

## Scene background

Changing Scene background produces both:

- `background_slug` patch for relational `backgrounds.id` resolution;
- normalized `background` parameter patch.

This keeps the relational Scene model and catalog parameter state synchronized.

## AI context

Web does not overwrite `ai_context` unless an explicit AI context value is supplied. This protects canonical instructions written through MCP from ordinary visual editing.

## Tests

Regression tests:

`src/core/character-maker.service.test.ts`

They verify:

- only a changed Persona parameter is sent;
- unchanged fallback/default state produces no state patch;
- changing female -> male deletes obsolete female-only normalized rows;
- Scene background slug and normalized parameter are patched together.

These tests run in the normal `npm run check` GitHub Actions pipeline.

## Mandatory rule

Do not reintroduce full overwrite for existing Web presets unless the product explicitly changes this data model.

Any future editor field must participate in the same diff/partial-update semantics so that incomplete MCP-imported entities remain lossless.
