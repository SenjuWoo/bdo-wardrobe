<p align="center">
  <img src="docs/images/logo.svg" width="72" height="72" alt="BDO Wardrobe mark">
</p>

<h1 align="center">BDO Wardrobe</h1>

<p align="center"><strong>A gallery-first outfit viewer for Black Desert Online.</strong></p>

<p align="center">
  Browse <strong>4,343 outfits across 32 classes and 11 outfit boxes</strong>, with honest<br>
  image-quality badges, instant search, favorites / owned / wishlist tracking,<br>
  outfit-box value views, side-by-side comparison, and a shareable wardrobe export.
</p>

<p align="center">
  <a href="https://github.com/SenjuWoo/bdo-wardrobe/actions/workflows/ci.yml"><img src="https://github.com/SenjuWoo/bdo-wardrobe/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-c9a227?labelColor=0c0f12" alt="MIT License"></a>
  <a href="https://github.com/SenjuWoo/bdo-wardrobe/releases/tag/v1.0.0"><img src="https://img.shields.io/badge/release-v1.0.0-d4af37?labelColor=0c0f12" alt="v1.0.0"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a>
  ·
  <a href="#how-images-work">How images work</a>
  ·
  <a href="#verification">Verification</a>
  ·
  <a href="#honest-status">Honest status</a>
</p>

<p align="center">
  <img src="docs/screenshot-grid.png" alt="BDO Wardrobe gallery: Agent outfits with Official, HQ, and FALLBACK badges" width="100%">
</p>

## What you get

- **4,343 outfits** — the full Pearl Shop catalog in this tree: every class, every box, including the Agent class launch roster
- **Honest badges, never faked** — every preview is labeled by what it actually is: `Official` / `HQ` / `Standard` / `Upscaled` / `Fallback` / `Missing`, derived from measured pixel dimensions plus provenance
- **Sibling fallbacks that admit it** — if a class has no render for an outfit (and one exists in-game), the app borrows the closest gender-matched sibling render and labels it `FALLBACK: <Class>`. Berserker and Shai never borrow or lend — their frames would misrepresent any outfit
- **Instant search and filters** — debounced full-text search over 4,343 cards; filter by class, box, rarity, and image quality
- **Lightbox with metadata** — rarity, provider, source page link, outfit boxes, resolution
- **My Wardrobe** — mark outfits Favorite / Owned / Wishlist, persisted locally; export/import your collection as JSON
- **Compare view** — put two outfits side by side
- **Zero runtime dependencies** — plain Node 22 + vanilla JS. No `npm install` to run the gallery.

<p align="center">
  <img src="docs/screenshot-lightbox.png" alt="Lightbox for Agent Hexround Reaper: official 3840×2160 render with metadata and wardrobe actions" width="100%">
</p>

<p align="center"><sub>Every card tells the truth about its own picture — including borrowed ones.</sub></p>

<p align="center">
  <img src="docs/screenshot-fallback.png" alt="Primavera search: Berserker has no source image; Hashashin shows FALLBACK: CORSAIR" width="100%">
</p>

## Quick start

Node.js 22 or newer.

```powershell
git clone https://github.com/SenjuWoo/bdo-wardrobe.git
cd bdo-wardrobe
node server.mjs
```

Open [http://127.0.0.1:7861](http://127.0.0.1:7861). No build step.

**Windows desktop:** double-click `BDO Wardrobe UI.exe`. `launcher.ps1` provisions a private Node 22.16.0 runtime (SHA-256 verified) and a WebView2 shell into `%LOCALAPPDATA%\BDO Wardrobe`, so it never touches your system Node.

A packed zip also ships on [Releases](https://github.com/SenjuWoo/bdo-wardrobe/releases/tag/v1.0.0).

## How images work

Previews live in `public/assets/images/` and are indexed by `data/images.json` (`{id → file, width, height, provider, sourceUrl}`). The catalog is `data/catalog.json` (4,343 outfits, 32 classes, 11 boxes). Both ship in the repo so the app works offline.

Quality tiers are computed from **measured facts only**:

| Tier | Meaning |
| --- | --- |
| `Official` | Pearl Abyss' own product render |
| `HQ` | Measured ≥ 500px on the short side |
| `Standard` | Smaller than HQ but real |
| `Upscaled` | Enlarged from a tiny native thumbnail (blurry at full size) |
| `Fallback` | Borrowed from a gender-matched sibling class |
| `Missing` | No verified image exists yet |

This tree indexes **4,339** images for those 4,343 outfits.

The crawler scripts in `scripts/` can re-fetch or expand the catalog from public sources (mmo-fashion, Altar of Gaming) — see `scripts/*.mjs` headers. They are development tools; the shipped catalog already covers everything they found.

## More views

<p align="center">
  <img src="docs/screenshot-boxes.png" alt="Outfit Boxes view with honest per-box counts, including nested choices marked not in catalog" width="100%">
</p>

<p align="center">
  <img src="docs/screenshot-compare.png" alt="Side-by-side compare view for two outfits" width="100%">
</p>

## Repository layout

```text
server.mjs              static + API server (zero-dep)
launcher.ps1            Windows desktop bootstrap (private runtime)
BDO Wardrobe UI.exe     WebView2 shell
public/                 UI (vanilla JS) + 4,339 previews
data/
  catalog.json          4,343 outfits / 32 classes / 11 boxes
  images.json           image index + quality metadata
lib/                    fetch / matching helpers used by crawler scripts
scripts/                catalog builder, crawler, E2E verify harness
docs/                   real UI screenshots
docs/images/logo.svg    README mark
```

## Verification

`scripts/verify.mjs` is a Playwright end-to-end suite (**13 checks**: boot counts, search, filters, lightbox navigation, favorites persistence, badge honesty, fallback labels, compare, wardrobe). It expects the server running on `127.0.0.1:7861`.

```powershell
node server.mjs
npm ci
npx playwright install chromium
node scripts/verify.mjs
```

CI (`.github/workflows/ci.yml`) runs the suite on every push and pull request: JS syntax, catalog integrity, API boot, Playwright, and an image-budget guard.

## Honest status

Verified in this tree:

- `data/catalog.json` — 4,343 outfits, 32 classes, 11 boxes
- `data/images.json` — 4,339 indexed images
- real UI screenshots under `docs/`
- CI workflow `.github/workflows/ci.yml`
- latest GitHub release **v1.0.0**

Not claimed:

- affiliation with Pearl Abyss
- that `package.json` version `2.0.0` is a GitHub release (it is not; v1.0.0 is the latest tag)
- that every class has a unique official render for every outfit (fallbacks and missing images are labeled on purpose)

## Data sources and credits

Outfit data compiled from public community sources: [mmo-fashion.com](https://mmo-fashion.com) and [altarofgaming.com](https://altarofgaming.com), plus official Pearl Shop announcement renders. All outfit names/descriptions and Black Desert Online are © **Pearl Abyss Corp.** This is an unofficial fan tool; no game assets are redistributed — previews are screenshots/renders as permitted by Pearl Abyss' fan-content policy.

## License

[MIT](LICENSE)
