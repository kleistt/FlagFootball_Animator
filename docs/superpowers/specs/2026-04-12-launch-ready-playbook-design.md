# Design Spec: Launch-Ready Playbook App v2

**Date:** 2026-04-12
**Tournament:** April 18-19 (6 days)
**Scope:** Bug fixes + Rules Engine + QB Read Progressions + Mobile Polish
**Constraint:** Single-file HTML (`code/index.html`), no external dependencies, must work as `file://` and hosted URL

---

## 1. Bug Fixes (Must Ship)

### 1a. Orbit Dual Motion (ILLEGAL)

**Problem:** Play 8 (Orbit) route data shows F1 and F2 both starting motion at t=0. Only one player may be in motion at any time (PDF rule: "Only one player is allowed in motion at a time before the snap").

**Fix:** Restructure Orbit's route waypoints so F2's pre-snap motion completes (she gets set) before F1 begins moving. F2 motions from left to right and sets, THEN F1 motions from right to left. Update the strategy guide description to match.

**Verification:** At t=0 (snap), only one player may be mid-motion. The other must be stationary.

### 1b. Closed-Play Secondary Read Warnings

**Problem:** Out (play 12), Levels (play 13), and Scissors (play 15) list male targets as backup reads. When these plays run from Closed status, completing to a male (M-to-M) is illegal — no female is involved in the transaction beyond LOS.

**Fix:** In the reads[] data, mark these secondary reads with `closedLegal: false`. The Rules Advisor and read progression UI will surface warnings: "Read 2 (M1) only legal when run from Open status."

### 1c. Swipe-Tap Conflict

**Problem:** A swipe starting on a player circle fires both player-selection (pointerdown) AND swipe-navigation (touchend). A swipe over a player toggles selection unintentionally.

**Fix:** Add a `swipeDetected` flag. Set it in touchend when a swipe is recognized. In the pointerdown handler, check the flag and suppress player selection if a swipe just occurred. Reset the flag after a short timeout.

### 1d. HIT_R Constant Unused

**Problem:** `const HIT_R = 24` (line 305) is declared but the actual hit detection on line 1355 uses `r + 10`.

**Fix:** Use `Math.max(HIT_R, r + 10)` to guarantee a minimum 24px hit radius regardless of field size.

---

## 2. Rules Engine (Foundation Layer)

### 2a. Data Structure

Embed two data objects in the `<script>` block:

**RULES_DB** — Array of ~30 rule objects:
```js
{
  ruleId: string,           // e.g., 'qb-cannot-run'
  category: string,         // field|scoring|timing|passing|rushing|motion|penalties|open-closed|overtime|dead-ball
  shortText: string,        // 1-line summary, under 80 chars
  fullText: string,         // complete rule text from PDF
  relatedPlays: string[],   // play IDs this rule affects, or ['all']
  commonMistakes: string[], // things players get wrong
  situationalTips: string[] // when this rule matters most
}
```

**PENALTIES_DB** — Object with `defensive[]` and `offensive[]` arrays:
```js
{
  name: string,
  yardage: 10,              // always 10 in this ruleset
  fromSpot: 'LOS',
  downEffect: string,       // 'Automatic 1st down' or 'Loss of down'
  toggleEffect: string,     // 'Next play OPEN' or 'Toggle STAYS THE SAME'
  description: string
}
```

Plus a `notes` object with special rules (half-distance, game-can't-end-on-def-penalty, OT penalty effects, all-penalties-declinable).

### 2b. Rules Advisor UI

**Drawer integration:**
- Add a "Rules" tab to the existing tab bar (alongside All/Pass/Rush/Motion/NRZ)
- When active, the play-list area shows rules grouped by category
- Each rule card shows `shortText` with a category badge
- Tapping a rule card expands to show `fullText`, `commonMistakes`, and `situationalTips`
- Search input at top of the rules list filters by text match against shortText + fullText

**Contextual rules in play-info overlay:**
- When a play is selected, the play-info overlay gains a collapsible "Rules" section
- Shows only rules where `relatedPlays` includes the current play's ID (or 'all')
- Highlights warnings (e.g., "F1 must throw before crossing LOS" for Storm)
- For Closed-eligible plays with male secondary reads, shows: "Caution: Read 2 (M1) is illegal when this play is run from Closed status"

**Toggle Advisor enhancement:**
- The strategy bar already shows Open/Closed status and toggle arrow
- Add: if a play is selected that is illegal for the simulated toggle state, the strategy bar shows a red warning badge
- Example: selecting "Thunder" (Open-only) when toggle state is Closed shows "Requires Open"

### 2c. Rules Content

The Rules Analyst agent produced a complete RULES_DB with 30 entries and PENALTIES_DB with 13 penalties covering all rules from the PDF. Key rules to embed:

- Field: dimensions, NRZ locations, ball-on-ground snap, downs system, possession changes
- Scoring: TD/PAT values, 28-point mercy rule, game-can't-end-on-def-penalty
- Timing: 25s play clock (with warning grace), 7s pass clock, timeout, halftime
- Passing: forward-and-beyond-LOS, no laterals, handoff-then-throw, pass blocking
- Rushing: QB cannot run, male cannot rush across LOS, female-only rusher, NRZ no rushing, 7yd rush line, defenders at LOS
- Motion: one player only, spinning allowed
- Open/Closed: open definition, closed definition, toggle-female-involved, toggle-male-to-male, toggle-unsuccessful, toggle-def-penalty, toggle-off-penalty, toggle-start-possession
- Overtime: standard, championship, OT penalties, possession alternation
- Dead ball: conditions, no fumbles, ball-spotted-at-belt, one-foot-inbounds
- Penalties: defensive list (6), offensive list (7), all-declinable, half-distance, assessed-from-LOS

---

## 3. QB Read Progressions

### 3a. Data Model Extension

Each play in PLAYS[] gets a `reads` array:
```js
reads: [
  {
    readNumber: 1,
    target: 'F1',              // player role
    label: '7yd out',          // what the receiver is doing
    windowStart: 0.40,         // animation time when read opens
    windowEnd: 0.65,           // animation time when read closes
    isPrimary: true,           // is this the designed target?
    staysOpen: true,           // does completing here keep toggle Open?
    closedLegal: true,         // is this read legal when play is run from Closed?
    readKey: 'If flat defender sags -> throw. If jumps -> go to read 2'
  }
]
```

Read complexity breakdown:
- 9 single-read plays: Storm, Lightning, Screen Queen, Jet Sweep Fake, Orbit, Trips, Motion Hand-off, Motion Keep, Mismatch Motion
- 8 two-read plays: Thunder, Out, Scissors, Wheel, Boomerang, Stack Release, Rollout Choice, Motion Slants
- 3 three-read plays: Levels, Fades, Flood Right

Read type classifications: high-low, switch/crossing, flood, split, edge-read, sideline-read, play-action, rollout, wheel/delay, quick-game, motion-diagnostic, double-pass.

All timing windows cross-referenced against route waypoints in PLAYS[]. Complete data provided by QB Reads agent.

### 3b. Rendering Additions (in `drawPlayFrame()`)

**Read number badges:**
- When reads mode is active, draw small numbered circles (1, 2, 3) offset above-right of each receiver who appears in the reads[] array
- Badge is a 14px circle with white text, colored: green border if `staysOpen`, amber if not, red border if `closedLegal: false`
- Always visible when reads mode is on, regardless of animation time

**Active-read glow:**
- The receiver whose read window is "hot" (windowStart <= t <= windowEnd AND it's the lowest-numbered unresolved read) gets a pulsing glow ring
- Glow is a semi-transparent expanding circle animation (CSS keyframe or canvas)
- Only one read glows at a time — show read 1 while in its window, read 2 after read 1's window closes, etc.
- At t < first read's windowStart, no glow (pre-snap / early route running)

**Read progression strip:**
- A 20px-tall horizontal bar inserted between the field viewport and the strategy bar
- Divided into colored segments for each read's timing window (proportional to duration)
- Colors: green segments for staysOpen reads, amber for flips-Closed reads, red outline for closedLegal:false
- A vertical playhead line moves along the strip during animation
- Read labels ("1: F1 out", "2: M1 deep") appear inside or above segments
- Gaps between segments show "dead time" (no active read)
- Only visible when reads mode is active

**Read key in tooltip:**
- When reads mode is active and a read's receiver is tapped, the tooltip shows the `readKey` text below the existing action text
- This explains what the QB should look for and what triggers moving to the next read

### 3c. Reads Mode Toggle

- A "Reads" toggle button in the play-info overlay (or a small icon button near the transport bar)
- When active: read badges appear, active-read glow activates, read progression strip appears
- When inactive: default play view (current behavior)
- State persists across play changes but resets on page load
- Keyboard shortcut: "D" key toggles reads mode (mnemonic: "D" for decision/reads)

---

## 4. Mobile/Tablet Polish

### 4a. P0: Safe Area Insets

Add to existing CSS:
```css
.app {
  padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
}
.transport {
  padding-bottom: env(safe-area-inset-bottom);
}
```

This prevents content from being hidden behind iPhone notch/Dynamic Island (top) and home indicator (bottom).

### 4b. P0: Transport Button Sizing

Update the narrow-screen media query:
```css
@media (max-width: 700px), (orientation: portrait) {
  .tbtn { width: 40px; height: 40px; font-size: 14px; }
  .tbtn.play-btn { width: 48px; height: 48px; font-size: 18px; }
  .transport { height: 56px; }
}
```

### 4c. P0: Progress Bar Touch Target

```css
.progress { height: 12px; border-radius: 6px; }
.progress-handle { width: 28px; height: 28px; }
```

### 4d. P1: Other Touch Targets

- Speed buttons: `padding: 8px 12px; font-size: 11px;`
- QS button: `min-width: 36px; min-height: 36px; padding: 6px 10px;`
- Tab buttons: `padding: 14px 2px; font-size: 10px;`
- Quick Sheet strip cards: `padding: 10px 6px;`
- Quick Sheet goto cards: `padding: 10px 8px;`
- PAT rows: `padding: 8px 0;`

### 4e. P1: Font Floor

Set minimum 11px for all interactive/readable text on mobile. Specific overrides:
- Badge text: 9px (up from 8px) — acceptable as supplementary
- QS labels: 10px (up from 8px)
- QS card names: 10px (up from 8px)
- Time display narrow: 10px (up from 9px)

### 4f. P2: PWA Meta Tags

Add to `<head>`:
```html
<meta name="theme-color" content="#0F172A">
<meta name="apple-mobile-web-app-title" content="Playbook">
```

No external icon files (single-file constraint). No service worker (separate file constraint). The app already works offline when opened as a file.

### 4g. P2: Swipe Threshold Scaling

Change swipe threshold from fixed 50px to:
```js
const threshold = window.innerWidth < 500 ? 30 : 50;
```

---

## 5. Strategy Guide Updates

Update `project_files/KCCC-2026-Strategy-Guide.md`:

1. Fix Orbit description — sequential motion (F2 sets, then F1 motions)
2. Add "Open-only backup" labels to secondary reads on Out, Levels, Scissors
3. Fix interception wording — "intercepting team starts at their own 5-yard line"
4. Add to Quick Rules table: game-can't-end-on-def-penalty, half-distance rule, spinning-allowed, ball-spotted-at-belt, 25s-warning-grace, defenders-at-LOS
5. Add OT section details: tiebreaker hierarchy, penalty effects, possession alternation, first OT play is Closed
6. Add flag guarding to the trick play legality table

---

## 6. Implementation Order

1. Bug fixes (Orbit, swipe-tap, HIT_R) — ~30 min
2. Rules engine data (RULES_DB, PENALTIES_DB) — ~45 min
3. QB Read progressions data (reads[] on all 20 plays) — ~30 min
4. Mobile polish CSS (safe areas, touch targets, fonts) — ~30 min
5. Rules Advisor UI (drawer tab, contextual panel, toggle warnings) — ~60 min
6. QB Reads UI (badges, glow, progression strip, toggle) — ~60 min
7. Strategy guide updates — ~20 min
8. Full-device testing via preview — ~30 min

Each phase verified before proceeding. No regressions.

---

## 7. Out of Scope

- Defensive play modeling (parked in checkpoints/20260412_Defense_Research.md)
- Service worker / separate files
- External icon assets
- Build tools or dependencies
- Splash screen images
