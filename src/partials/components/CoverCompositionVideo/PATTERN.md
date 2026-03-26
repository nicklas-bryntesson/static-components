# Stateful Cover Composition Media Pattern

This document captures a framework-agnostic pattern for decorative cover media that is both accessible and performant.

It is written as:
- a reusable pattern contract
- a concrete `CoverCompositionVideo v1` example from this project

## 1) Purpose and Scope

Use this pattern when:
- media is decorative/ambient (not required to understand core page content)
- media may autoplay under policy constraints
- component must degrade safely without JavaScript

Non-goals:
- full media-player feature parity
- transcript/caption workflows for informational media

## 2) Component Contract (Tech Agnostic)

Any implementation (Vanilla, React, Vue, CMS) should expose the same contract:

- **Root container**: owns config and state attributes
- **Media container**: stable positioning context for media and controls
- **Enhanced media element**: JS-upgraded video branch
- **Fallback media branch**: no-JS branch (native controls)
- **Control button**: injected (or rendered) toggle with accessible label updates

Required config inputs:
- `autoplayMode`: `off | policy`
- `playLabel`: localized string
- `pauseLabel`: localized string
- `posterUrl`: string
- `sources`: array of media sources

Optional future inputs:
- `muted` policy
- `loop` policy
- `decorative` boolean

## 2.1) Mode Matrix (Recommended)

Use explicit component modes to avoid ambiguous behavior.

- **decorative**
  - autoplay: `policy`
  - muted: `true`
  - controls: minimal play/pause toggle
  - captions/transcript: generally not required
  - semantics: presentational/decorative

- **ambient**
  - autoplay: `policy` (or `off`, product decision)
  - muted: `true` by default
  - controls: play/pause required
  - captions/transcript: usually not required unless audio conveys information
  - semantics: non-essential media with visual atmosphere role

- **content**
  - autoplay: `off`
  - muted: `false` allowed/expected
  - controls: full controls (native or equivalent custom set)
  - captions: required when speech/audio conveys meaning (`<track kind="captions">`)
  - transcript: strongly recommended and often policy/legal required
  - semantics: media is informational, not decorative

Guiding rule:
- if users must understand the video to understand the page content, treat it as `content` mode.

## 3) Progressive Enhancement Contract

The component uses two branches:

- **Enhanced branch (default markup)**:
  - custom controls
  - state machine + policy-based playback
  - no native controls

- **Fallback branch (`<noscript>`)**:
  - native controls enabled
  - independent no-JS playback path

Critical rule:
- avoid duplicate no-JS media rendering by hiding enhanced media in `<noscript>` with a component-local style.

## 4) State Machine Contract

Canonical states:
- `idle`
- `ready`
- `playing`
- `pausedByUser`
- `pausedByPolicy`
- `blocked`
- `error`

Canonical events:
- `INIT`
- `CANPLAY`
- `PLAY`
- `PAUSE`
- `PLAY_REJECTED`
- `POLICY_CHANGE`
- `ERROR`

Behavioral rule:
- UI icon/label reflects actual media state (`video.paused`), not only intended state.

## 5) Playback Policy Rules

Policy blockers:
- reduced motion preference
- not visible
- data saver enabled
- very slow connection (`slow-2g`, `2g`)
- autoplay mode disabled

Precedence:
- autoplay is allowed only when no blockers are active
- user play intent can bypass reduced-motion blocking in-session (if that is product-approved)
- policy changes can pause again when blocker rules require it

## 6) Accessibility Requirements

- Control must be keyboard reachable
- Control label must be localized and stateful (`Play`/`Pause`)
- Control should set `aria-controls` to media element id
- Decorative media wrapper should be presentational (for this pattern)
- Motion must be pausable by user

Note:
- for decorative muted media, captions are generally not required; do not add fake tracks only to satisfy tooling heuristics.

## 7) Performance Requirements

- Poster should be optimized (typically WebP for broad support)
- Add container background color for no-poster/slow-first-frame states
- For likely LCP cover media, preload poster from initial HTML:
  - `<link rel="preload" as="image" href="..." fetchpriority="high">`
- Do not globally preload posters for all component instances

## 7.1) LCP Rule for Hero Usage (Important)

When `CoverComposition` is used as a top-of-page hero (`PageHero`) and is a likely LCP candidate:

- poster preload in `<head>` is required to avoid LCP/request-discovery regressions
- use:
  - `<link rel="preload" as="image" href="/videos/poster.webp" fetchpriority="high" type="image/webp">`
- keep this as a page-level responsibility (composition layer), not component-internal JS logic

When `CoverComposition` is used lower in the page (`CoverBlock`):

- do not preload by default
- allow normal poster discovery/loading
- avoid multiple `fetchpriority="high"` media preloads on one page

## 8) Layout and Styling Requirements

- Media container provides positioning context (`position: relative`)
- Control overlay anchors to media container, not page/root grid
- Content contrast must remain acceptable with or without poster/frame loaded

## 9) Integration Recipes

- **Vanilla**: `Class.attach(parent = document)` scans and instantiates
- **React/Vue**: preserve same contract via props + lifecycle hooks
- **CMS**: map fields to contract (`data-*` / props), not implementation details

## 10) Test Matrix

- JS enabled / disabled
- reduced motion on / off
- autoplay policy pass / fail
- visible / offscreen
- keyboard and screen reader sanity checks
- slow connection/data saver
- poster decode fail path

---

## CoverCompositionVideo v1 (This Project)

### Current Markup Contract

- Root uses:
  - `data-component="CoverCompositionVideo"`
  - `data-autoplay="policy|off"`
  - `data-play-text`
  - `data-pause-text`
- Enhanced video:
  - `playsinline`
  - `preload="none"` in markup, upgraded by JS
  - `muted`
  - `loop`
  - `poster="/videos/poster.webp"`
- Fallback video in `<noscript>`:
  - `controls`
  - same source + poster path

### Current JS Contract

- `CoverCompositionVideo.attach(parent = document)` for bootstrapping
- Ensures stable video id for `aria-controls`
- Injects play/pause button and updates label/icon from playback state
- Uses policy blockers + user intent override model

### Current Perf Contract

- Poster preload is currently in `index.html` head for this component instance
- For `PageHero` usage, this is required to preserve LCP score
- This remains a page-level decision (LCP candidate), not universal default for all instances

### Evolution Notes

Potential next-step inputs:
- `data-muted`
- richer `data-autoplay` modes
- mode matrix (decorative / ambient / content)

Potential next-step output from this pattern:
- add `data-mode="decorative|ambient|content"` as the single high-level intent switch
- derive autoplay/muted/captions expectations from mode instead of ad-hoc combinations
