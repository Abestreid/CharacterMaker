# CharacterMaker V2 - desktop/iOS/Android interactive DEV audit

Date: 2026-08-07

Target:

`https://charmaker.free.nf/dev/`

This audit was performed independently from the normal GitHub deployment screenshots against the actually published DEV site.

## Browser/device profiles

Validated headlessly with Playwright:

- Desktop Chrome;
- iPhone 13 profile using WebKit;
- Pixel 5 profile using Chromium.

## Routes

Each profile loaded and verified the expected visible page title on:

- `#/character` -> `Персона`;
- `#/wardrobe` -> `Образ`;
- `#/scene` -> `Сцена`;
- `#/results` -> `Результаты`;
- `#/catalogs` -> `Все списки`.

## Layout

For every route and every profile:

- `document.documentElement.scrollWidth - window.innerWidth <= 2px`;
- no material horizontal page overflow was detected.

## Mobile form behavior

On iPhone/WebKit and Pixel/Chromium:

- the first rendered form input computed to at least 16 px font size;
- this protects iOS Safari from automatic form zoom caused by sub-16px input text.

## Mobile navigation

On both mobile profiles:

- bottom navigation was present;
- clicking `Образ` navigated to `#/wardrobe` successfully.

## Scene reference persistence

On both mobile profiles:

1. Scene page was opened;
2. `Референс` section was selected;
3. a temporary test PNG was assigned through the Scene file input;
4. Zustand localStorage key `charactermaker-refactor-v2` was inspected;
5. the persisted payload did not contain `data:image`.

Result:

Temporary Scene image Data URLs remain in transient editor state and are excluded from localStorage persistence as designed.

## Result

All assertions completed successfully for all three browser/device profiles.

This complements the mandatory GitHub deployment workflow device screenshots and provides an explicit interaction/layout validation of the published DEV site.
