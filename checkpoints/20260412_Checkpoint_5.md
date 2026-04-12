# Checkpoint 5 — Mobile-First Layout Redesign

**Date:** 2026-04-12
**Session type:** Multi-agent implementation — layout redesign
**Tournament:** April 18-19, 2026 (6 days)

---

## 1. Goal

Redesign the app layout so it displays neatly on mobile devices (iPhone/iPad). The field stays portrait orientation. Eliminate the play-info overlay that covered the canvas, the 38vh drawer that blocked the field, and the 800px desktop dead space.

---

## 2. What Was Accomplished

### Mobile-First Layout (complete)

| Component | Before | After |
|-----------|--------|-------|
| Play list (mobile) | Top 38vh drawer, had to scroll past | Bottom sheet (peek/half/full) with drag + fling |
| Field (mobile) | Hidden behind drawer + overlays | **Hero element** — fills maximum screen height |
| Play-info (mobile) | Absolute overlay on canvas, covered QB | Split into sticky **header** (44px) + **info strip** (32px) |
| Legend (mobile) | Overlaid on field canvas | Hidden on mobile (declutters canvas) |
| Desktop layout | 800px dead space around 220px field | **Three-column**: drawer (260px) + field + detail panel (300px) |
| Touch targets | 26-40px on narrow phones | **44px minimum** (Apple HIG compliant) |

### New Components Added

1. **Mobile header** (`.mobile-header`) — play name + status badge + toggle indicator, always visible
2. **Info strip** (`.info-strip`) — compact horizontal bar: Status | Toggle | Key | Field position
3. **Bottom sheet** (`.bottom-sheet`) — Apple Maps-style draggable panel with three snap states:
   - Peek (56px): handle pill + play name
   - Half (45vh): tabs + play list, scrollable
   - Full (85vh): full play list + QS + rules
4. **Detail panel** (`.detail-panel`) — desktop right sidebar with description, toggle analysis, player cards, read progression
5. **Backdrop** (`.bs-backdrop`) — semi-transparent overlay when sheet is expanded

### Technical Implementation

- **Layout approach:** Mobile-first CSS (base = mobile column layout). `@media (min-width:700px) and (orientation:landscape)` restores sidebar. `@media (min-width:1024px)` adds detail panel.
- **Bottom sheet:** Fixed position, `transform: translateY()` for GPU-accelerated positioning, velocity-based fling detection, snap-to-nearest on release.
- **DOM reparenting:** Drawer content (tabs, play list, QS, rules) moves between drawer and bottom sheet based on viewport via `handleLayoutChange()`.
- **Canvas resize:** `resizeCanvases()` now uses responsive padding (8px mobile, 24px desktop). Added `orientationchange` listener.
- **Touch isolation:** Sheet drag scoped to handle area only; canvas swipes, player taps, and scrubber all coexist without conflict.

### Stats

- `code/index.html`: +529 lines, -36 lines (565 net change)
- 5 subagents dispatched (Tasks 1+4, 2, 5, 6 as agents; Task 3 manual)
- Verified at 3 viewports: mobile (375x812), tablet (768x1024), desktop (1280x800)

---

## 3. Decisions Made

- **Portrait field kept** — no coordinate remapping needed. Portrait on portrait phone is a natural fit.
- **Bottom sheet over tab bar** — Apple Maps pattern is familiar to iPhone users, keeps field visible while browsing plays.
- **Info strip replaces strat-bar on mobile** — consolidates two redundant bars into one compact strip.
- **Detail panel at >=1024px only** — tablets get sidebar layout without detail panel (not enough width); desktop gets three columns.
- **Touch targets 44px minimum** — Apple HIG compliance for sideline use with cold/gloved fingers.
- **`orientation:landscape` removed from detail panel media query** — some viewport configurations report portrait even when wider than tall; pure min-width is more reliable.

---

## 4. What Remains

### Before Tournament (priority order)

1. **Commit + push** this layout redesign (in progress)
2. **GitHub Pages deployment** — enables sharing URL with teammates
3. **Real-device testing** on actual iPhone and iPad Safari
4. **Minor polish** — any issues found during real-device testing
5. **Print/share the Strategy Guide** — `project_files/KCCC-2026-Strategy-Guide.md`

### Nice-to-have (if time)

- iPad landscape: drawer could be wider for easier tap targets
- Bottom sheet: add momentum-based scroll within content area
- Offline support (service worker for PWA)

---

## 5. How to Begin Next Session

1. **Read this checkpoint** and `checkpoints/20260412_Checkpoint_4.md` for full context
2. **Commit the layout redesign** if not already done (single modified file: `code/index.html`)
3. **Set up GitHub Pages** — copy `code/index.html` to repo root or configure Pages to serve from `/code`
4. **Real-device test** — open on iPhone Safari and iPad Safari, verify:
   - Bottom sheet drag/fling works with real touch
   - Play selection snaps sheet to peek
   - Animation plays smoothly
   - Transport scrubber works
   - All 20 plays render
5. **Fix any issues** found in real-device testing
6. Tournament is **April 18** — final app should be deployed by April 17
