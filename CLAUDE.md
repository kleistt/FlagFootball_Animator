# CC_FF2026 — KCCC 2026 Coed Flag Football Playbook

> **Global Preferences:** Read `USER_PREFS.md` first. It is authoritative for all
> conventions not explicitly overridden below.

Interactive coaching app and strategy system for the 2026 Kansas City Corporate Challenge Coed Flag Football tournament (April 18-19, Mid-America Sports Complex, Shawnee KS).

## Directory Structure

```
CC_FF2026/
├── CLAUDE.md
├── USER_PREFS.md
├── project_files/
│   └── KCCC-2026-Strategy-Guide.md
├── assets/
├── checkpoints/
├── code/
│   └── index.html          ← The playbook app (single-file HTML/Canvas)
├── archive/
│   ├── ARCHIVE_LOG.md
│   └── design-mockup.html
├── inputs/
│   ├── 2026_flag_football_rules.pdf
│   └── IMG_38*.jpeg         ← 9 hand-drawn plays from 2025
└── outputs/
    ├── processed_data/
    └── results/
```

## Quick Start

```bash
# Serve the app locally
cd code && python3 -m http.server 3000
# Open http://localhost:3000/index.html
```

Or use Claude Preview: the `.claude/launch.json` is configured for `playbook-preview`.

## Data Organization

- **`inputs/`** — Official rules PDF and 9 hand-drawn play diagrams from 2025 season
- **`code/`** — Single-file HTML app (`index.html`, ~45KB). Self-contained with inline CSS/JS and Canvas rendering.
- **`project_files/`** — Strategy guide (printable markdown reference)
- **`outputs/results/`** — Deployed/versioned copies of the app for distribution

## Key References

| Topic | Document |
|-------|----------|
| Official Rules | `inputs/2026_flag_football_rules.pdf` |
| Strategy Guide | `project_files/KCCC-2026-Strategy-Guide.md` |
| The App | `code/index.html` |

## Working Style

- **Tech stack**: Single-file HTML with inline CSS/JS, Canvas-based rendering. No build tools, no dependencies.
- **Spatial accuracy**: Field is 54x22 yards TOTAL, including two 7-yard end zones (per KCCC 2026 rules diagram). Play area between goal lines is 40 yards. Midfield at yd 27. 4 No-Run Zones at {7-12}, {22-27}, {27-32}, {42-47}. All coordinates verified against rules.
- **Temporal accuracy**: Per-play durations computed from kinesiologist analysis of recreational athlete speeds.
- **Strategy data**: Open/Closed toggle system is the central mechanic. All plays tagged with eligibility and toggle effects.
- **Target device**: iPad Safari (landscape primary, portrait secondary). Also works on desktop browsers.
- **Shareability**: Must work as both a hosted URL and a locally-opened file.

## Global Preferences

`USER_PREFS.md` governs:
- Accuracy & Integrity
- Communication
- Coding
- Figures
- File Management
- Confidentiality

**Precedence:** If conflict arises between this file and `USER_PREFS.md`,
follow `USER_PREFS.md` unless overridden below.

**Project-specific overrides:**
- Default language: JavaScript/HTML (not Python) for app code
- Figures: Canvas rendering (not SVG/PNG export) for interactive field visualization

## Checkpoint Conventions

Naming: `YYYYMMDD_Checkpoint_N.md`

## Checkpoint Initiative

Claude should proactively manage session continuity.

### Automatic Checkpoints (Create and Briefly Notify)

**After:**
- Completing a major milestone or phase
- Resolving complex debugging with non-obvious solution
- Finalizing architectural decisions with significant rationale

**Before:**
- Destructive or hard-to-reverse operations
- Long-running processes that may timeout

### Suggested Checkpoints (Ask First)

- Conversation has grown long with substantial accumulated work
- Multiple decisions made not fully captured in artifacts
- User signals pausing or continuing later
- Transitioning between distinct work phases
- Uncertainty about details from earlier in session

### Soft Backstop

If session has accumulated substantial work AND no checkpoint yet, bias toward
suggesting one at the next natural breakpoint.

### Not Checkpoint Triggers

- Before batch operations (inputs, code, CLAUDE.md already document starting state)
- Arbitrary turn counts
- Minor clarifications or trivial tasks

### Quality Standard

A checkpoint must answer:
1. What was the goal?
2. What was accomplished?
3. What decisions were made and why?
4. What remains to be done?
5. How should the next session begin?
