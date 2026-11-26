# Changelog

All notable changes to BDO Wardrobe. Versions follow the GitHub release tags.

## [Unreleased]

### Changed
- README rebuilt around a cover image and real screenshots of the app served locally
  (desktop gallery, lightbox and a phone-sized viewport) plus a captured run of the
  13-check end-to-end suite. The compare view is documented as up to four outfits,
  which is what the code allows, and the Studio and Classes views are now listed.
- Verification instructions: `npm ci` cannot work here (there is no lockfile and no
  declared dependency), so the README now gives the same install CI uses:
  `npm i --no-save playwright-core@1.49.1`.
- `scripts/verify.mjs` finds Opera GX through `%LOCALAPPDATA%` instead of a fixed
  home-folder path; `scripts/fix-hexround-bd9.mjs` takes the resources folder as an
  argument instead of a fixed drive path. App behaviour is unchanged.

## [1.0.0] - 2026-08-22

### Added
- First release: gallery-first viewer for 4,343 outfits across 32 classes and 11
  outfit boxes, with measured image-quality badges, labelled sibling fallbacks,
  search and filters, lightbox, compare, My Wardrobe with JSON export/import, and the
  Windows WebView2 launcher with a private Node runtime.
