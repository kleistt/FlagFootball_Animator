# Playbook App — QC & Overhaul Prompt

> For use in **Claude CLI** (claude command). Prior work was done in the
> Claude Desktop app. This prompt is designed for CLI's strengths:
> autonomous multi-agent orchestration, model routing, and bash access.
> Preview tools are available via .claude/launch.json ("playbook-preview").

---

## THE PROMPT

```
You are taking over a 2339-line single-file HTML/Canvas flag football
playbook app (code/index.html). Prior sessions were in the Claude Desktop
app. You are now in Claude CLI with full autonomy to orchestrate agents,
choose models, and verify work.

Tournament: April 18 (6 days). Target: iPad Safari + Chrome, also desktop.

Read CLAUDE.md and USER_PREFS.md first. Read checkpoints/20260412_Checkpoint_5.md
for full project history.

## CONSTRAINTS (non-negotiable)

- Single-file HTML. No build tools, no dependencies, no frameworks.
- Do NOT modify play data (the PLAYS array with [x,y,t] waypoints).
- Do NOT change field coordinate math or the coordinate system.
- Preserve the Open/Closed toggle system — it's the core strategic mechanic.

## MODEL SELECTION GUIDANCE

You have access to Opus, Sonnet, and Haiku via the Agent tool's model
parameter. Use your judgment, but here are the principles:

- **Haiku** (model:"haiku"): Read-only tasks. Scanning for patterns,
  validating data structures, checking CSS class usage, counting elements.
  Fast and cheap. Use when the agent doesn't need to reason deeply.

- **Sonnet** (model:"sonnet"): Implementation with clear instructions.
  Fixing bugs at known line numbers, writing CSS, mechanical refactoring.
  Good balance of speed and capability. Default choice for most agents.

- **Opus** (model:"opus"): Architectural decisions, subtle cross-cutting
  bugs, synthesizing multiple findings into a coherent fix strategy.
  Use sparingly — reserve for problems where getting it wrong wastes
  more time than the slower model costs.

The main thread (you) should handle triage, synthesis, and sequencing
decisions. Delegate execution to agents.

## KNOWN BUGS (confirmed with line numbers)

These were found by a prior code review. Fix them directly — no need
to re-audit.

### Critical

BUG-1: tickReadsGlow runaway RAF loop (lines ~1596-1600, ~2043, ~2064)
  Every reads-mode toggle spawns a NEW requestAnimationFrame loop with
  no stored ID and no cancellation. After several toggles, multiple
  loops call drawPlayFrame simultaneously → frame judder on iPad.

BUG-2: pointercancel unhandled on scrubber (lines ~2032-2034)
  If iOS interrupts touch (notification banner, rotation), scrubbing
  stays true permanently. Scrubber follows phantom touch.

### Major

BUG-3: isMobile() disagrees with CSS breakpoint (line ~1819)
  JS uses: innerWidth <= 700 || (innerWidth < innerHeight)
  CSS uses: @media (min-width:700px) and (orientation:landscape)
  iPad portrait (820x1180): CSS says "desktop" but JS says "mobile"
  → handleLayoutChange() reparents DOM incorrectly → drawer content
  moves to bottom sheet → FUNCTIONS DISAPPEAR ON iPAD.
  This is likely the root cause of "iPad Chrome missing basic functions."

BUG-4: drawFieldBG lacks DPR transform guard (line ~1270)
  drawPlayFrame correctly applies ctx.setTransform(dpr,...) at entry.
  drawFieldBG does not. Currently masked because resizeCanvases always
  precedes it, but fragile.

BUG-5: Pass arc persists past catchTime (lines ~1409-1435)
  Throw arc draws from thrower.action.t through t=1.0, even after the
  ball is "caught." Arc endpoint freezes while receiver keeps running.

### Minor

BUG-6: Transport buttons lack aria-label (lines ~481-494)
  Icon-only buttons. VoiceOver says "button" with no context.

## VISUAL LAYOUT PROBLEMS (observed via screenshots)

LAYOUT-1: Desktop — no sidebar visible. Portrait field centered in
  dead space. The intended 3-column layout isn't activating.

LAYOUT-2: Tablet (768x1024) — field stays ~290px wide with ~500px
  dead space. Canvas not filling available width.

LAYOUT-3: Mobile — bottom sheet + transport + info strip crowd the
  bottom ~25% of screen, squeezing the field.

## GOALS (in priority order)

1. App works on iPad Safari AND Chrome — all 20 plays selectable,
   animatable, and readable. No missing UI elements.
2. Field canvas uses available space at every viewport — no dead zones.
3. Layout responds correctly: 3-column desktop, 2-column tablet,
   full-width mobile with bottom sheet.
4. Touch interactions work without conflict: scrubber, canvas swipe,
   player tap, bottom sheet drag.
5. Animation is smooth — no RAF leaks, no frame judder after toggling.
6. Transport bar fully visible and functional at all viewport sizes.

## VERIFICATION

Use the preview tools (playbook-preview is configured in .claude/launch.json)
to verify changes visually. Screenshot at mobile (375x812), tablet (768x1024),
and desktop (1280x800). Check console for errors. Do not claim something
works without evidence.

## WORKING STYLE

- All changes go to code/index.html (single-file app).
- Commit after completing each logical group of fixes.
- If a fix in one area breaks another, stop and reassess.
- Create a checkpoint when done.
```

---

## NOTES FOR THE USER

### What this prompt does differently

1. **States goals, not steps.** Tells Claude WHAT needs to be true, not
   HOW to get there. Claude can decide whether to audit first, fix
   incrementally, or batch everything.

2. **Model guidance is principled, not rigid.** Explains when to use
   each tier and why, then trusts Claude to route correctly per task.

3. **Known bugs are pre-loaded.** Saves ~15 minutes of audit time.
   Line numbers are approximate (marked with ~) since prior edits may
   have shifted them — Claude should grep to confirm before editing.

4. **Desktop→CLI context.** Notes the tool transition so Claude doesn't
   try to reference Desktop-specific UI or assume a human is clicking.

### How to run

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026

# Launch Opus as orchestrator (recommended — it routes agents best)
claude --model claude-opus-4-6

# Then paste the prompt block above, or:
# Extract just the prompt and pipe it
sed -n '/^```$/,/^```$/{ /^```$/d; p; }' QC_PROMPT.md | claude -p "$(cat)"
```

### What to watch for

- If Claude dispatches all 6 bug fixes as a single agent, that's fine —
  they're independent enough.
- If Claude decides to audit before fixing, that's also fine — the
  prompt doesn't forbid it, it just says the audit isn't *needed*.
- The layout problems (LAYOUT-1/2/3) may require investigation before
  fixing. The prompt separates them from the confirmed bugs for this reason.
