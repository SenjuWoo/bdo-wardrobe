# Changelog

All notable changes to BDO Wardrobe. Versions follow the GitHub release tags.

## [Unreleased]

## [1.0.1] - 2026-11-26

Patch release: the desktop zip on GitHub Releases carries these fixes. `/api/health`
now reports `1.0.1`.

### Fixed
- **Security:** `POST /api/crawl` accepted requests from any web page open in the
  browser, so a cross-site request or a DNS-rebinding page could start the image
  crawler. Every non-GET request now needs the server's own loopback `Host` and, when
  sent, a same-origin `Origin`; anything else gets HTTP 403. GET routes are unchanged.
- Studio "Re-crawl all" never re-crawled everything: the server read the request body
  with `fs.readFile`, which throws on a request stream, so every crawl option was
  dropped silently. The body is now read properly (4 KB cap) and `all`, `box` and
  `limit` are validated before they reach the crawler.
- Phone layout: at 390 px the top bar made the page 935 px wide, the page rendered
  zoomed out and taps on cards landed on the filters panel (the same overflow hit any
  window from 761 to 934 px). Below 960 px the top bar wraps with a sideways-scrolling
  navigation row; below 760 px filter chips scroll in one row; on touch screens card
  buttons stay visible. Every view now fits from 390 px up; the desktop layout is
  unchanged.

### Added
- `scripts/verify.mjs` grows from 13 to 20 checks: a foreign `Origin` and a foreign
  `Host` get 403 without starting the crawler, GET is unchanged, a same-origin crawl
  from the app page still starts it with its options (against a stub crawler, so CI
  never crawls), at 390x844 the page has no horizontal scroll and a card tap opens
  the lightbox, and an 820 px width has no horizontal scroll. `BDO_WARDROBE_CRAWL_SCRIPT` overrides the crawler path for that test.
- Phone and verify screenshots in `docs/presentation/` refreshed from the fixed app.

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
