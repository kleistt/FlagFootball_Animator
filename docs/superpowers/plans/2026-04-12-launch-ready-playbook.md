# Launch-Ready Playbook v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rules engine, QB read progressions, and mobile polish to the KCCC 2026 Flag Football playbook app for tournament-ready deployment on April 18-19.

**Architecture:** Single-file HTML/Canvas app (`code/index.html`). All data (RULES_DB, PENALTIES_DB, reads[] arrays) and UI additions are embedded inline. No external dependencies, no build tools. Must work as both hosted URL and local `file://`.

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas, inline CSS. Target: iPad Safari landscape (primary), phones (secondary).

**Design Spec:** `docs/superpowers/specs/2026-04-12-launch-ready-playbook-design.md`

**Critical constraint:** The app is currently stress-tested and working. Every task MUST be verified by serving the app and confirming no regressions. Test command: `cd /Users/tk2748/ClaudeWorkspace/CC_FF2026/code && python3 -m http.server 3000` then open `http://localhost:3000/index.html`. Or use Claude Preview with the `playbook-preview` launch config.

---

## File Map

All changes are in two files:
- **Modify:** `code/index.html` — The entire app (currently ~1480 lines, ~62KB)
- **Modify:** `project_files/KCCC-2026-Strategy-Guide.md` — Sideline reference (728 lines)

### Sections within `code/index.html` (by logical area):

| Section | Current Lines | What Changes |
|---------|--------------|--------------|
| CSS tokens (`:root`) | 19-34 | Add new color tokens for reads, rules, warnings |
| CSS layout | 37-205 | Add read-strip, rules-tab, mobile touch-target overrides |
| CSS media query | 152-168 | Replace with expanded mobile polish |
| HTML drawer | 209-225 | Add rules tab, rules list container |
| HTML field viewport | 230-256 | No changes |
| HTML strategy bar | 260-266 | Add toggle warning badge |
| HTML transport | 268-284 | Add reads toggle button |
| Play data (PLAYS[]) | 313-815 | Add `reads[]` to each play |
| Quick Sheet data | 821-831 | No changes |
| State variables | 833-846 | Add `readsMode`, `showRulesTab` |
| Field renderer | 851-986 | No changes |
| Play frame renderer (`drawPlayFrame`) | 989-1143 | Add read badges, active-read glow |
| Animation engine | 1145-1180 | No changes |
| UI controllers | 1182-1299 | Add rules tab rendering, reads strip rendering |
| Interactions | 1339-1430 | Fix swipe-tap conflict, fix HIT_R |
| Swipe navigation | 1432-1453 | Fix threshold |
| Init | 1455-1476 | Add new initializers |

### New sections to add:

| New Section | Insert After | Content |
|-------------|-------------|---------|
| Rules data (RULES_DB) | After PLAYS[] (~line 815) | ~30 rule objects |
| Penalties data (PENALTIES_DB) | After RULES_DB | Penalty arrays |
| Read strip renderer | After `drawPlayFrame` (~line 1143) | `drawReadStrip()` function |
| Rules UI controller | After `renderQuickSheet` (~line 1273) | `renderRulesTab()`, `renderContextualRules()` |

---

## Task 1: Bug Fixes — Orbit Motion, Swipe-Tap, HIT_R

**Files:**
- Modify: `code/index.html:489-512` (Orbit play data — F1/F2 routes)
- Modify: `code/index.html:1339-1375` (pointerdown handler — swipe-tap fix)
- Modify: `code/index.html:1432-1453` (swipe handler — threshold + flag)
- Modify: `code/index.html:1350-1356` (hit detection — HIT_R usage)

- [ ] **Step 1: Fix Orbit dual motion**

In the Orbit play (PLAYS[] array, play with `id:'orbit'`), F2 currently starts motion at t=0 simultaneously with F1. Fix: F2 completes motion and sets by t=0.12, then F1 begins motion at t=0.12.

Replace the Orbit play object's `players` array. The key changes:
- F2 route: motion from [30,-3] across to [52,1] completing by t=0.12, then sets and holds position until her rush action at t=0.15
- F1 route: stays at start position [60,-2] until t=0.12, then begins motion

Find the Orbit play (id:'orbit') and replace the entire players array with:

```js
players:[
  {role:'QB',gender:'male',start:[50,0],
    route:[[50,0,0],[48,-1,.15],[45,-2,.30]],
    action:{type:'handoff',target:'F1',t:.47}},
  {role:'F1',gender:'female',start:[60,-2],
    route:[[60,-2,0],[60,-2,.12],[55,-1,.20],[50,0,.28],[48,0,.35],[45,1,.42],[40,3,.52],[35,6,.63],[30,10,.80]],
    action:{type:'rush',t:.47}},
  {role:'M1',gender:'male',start:[25,0.5],
    route:[[25,0.5,0],[22,4,.2],[18,10,.4],[15,16,.7]],
    catchT:null},
  {role:'M2',gender:'male',start:[72,0.5],
    route:[[72,0.5,0],[75,3,.15],[78,8,.4]],
    catchT:null},
  {role:'F2',gender:'female',start:[30,-3],
    route:[[30,-3,0],[35,-2,.03],[42,-1,.06],[48,0,.09],[52,1,.12],[52,1,.15],[55,2,.25],[58,3,.4],[65,6,.6]],
    action:{type:'rush',t:.15}}
]
```

Key change: F1 holds at [60,-2] from t=0 to t=0.12 (stationary while F2 completes motion). F2 completes her cross-formation motion by t=0.12 and holds at [52,1] from t=0.12 to t=0.15 (set before snap). Only F1 is in motion at t=0.12+.

- [ ] **Step 2: Fix swipe-tap conflict**

In the state variables section (around line 846), add a new state variable after `let quickSheetMode = false;`:

```js
let swipeInProgress = false;
```

In the swipe handler (`initSwipe` function), modify the touchend handler to set the flag when a swipe is detected. Find the existing touchend handler and replace it:

```js
canvas.addEventListener('touchend',(e)=>{
  const dt=Date.now()-startTime;
  if(dt>300)return;
  const touch=e.changedTouches[0];
  const dx=touch.clientX-startX;
  const dy=touch.clientY-startY;
  const threshold = window.innerWidth < 500 ? 30 : 50;
  if(Math.abs(dx)<threshold)return;
  if(Math.abs(dx)>Math.abs(dy)){
    swipeInProgress = true;
    setTimeout(()=>{ swipeInProgress = false; }, 100);
    const idx=PLAYS.indexOf(currentPlay);
    if(dx<0 && idx<PLAYS.length-1) selectPlay(PLAYS[idx+1]);
    else if(dx>0 && idx>0) selectPlay(PLAYS[idx-1]);
  }
},{passive:true});
```

This also incorporates the P2 swipe threshold scaling (30px on narrow screens).

In the pointerdown handler on the canvas (inside `initInteractions`), add a guard at the very top of the handler:

Find `canvas.addEventListener('pointerdown', (e)=>{` and add after the opening brace:

```js
    if(swipeInProgress) return;
```

- [ ] **Step 3: Fix HIT_R usage**

In the hit detection loop inside the pointerdown handler, find:
```js
if(Math.sqrt(dx*dx+dy*dy) < r + 10){
```

Replace with:
```js
if(Math.sqrt(dx*dx+dy*dy) < Math.max(HIT_R, r + 10)){
```

This guarantees a minimum 24px hit radius regardless of field size.

- [ ] **Step 4: Verify bug fixes**

Serve the app: `cd /Users/tk2748/ClaudeWorkspace/CC_FF2026/code && python3 -m http.server 3000`

Verify:
1. Select Orbit — play the animation. F2 should complete her cross-formation motion and stop before F1 begins moving.
2. On the canvas, try swiping horizontally over a player circle — the player should NOT get selected/deselected during the swipe. Only taps should toggle selection.
3. All 20 plays still render correctly. No console errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026
git add code/index.html
git commit -m "fix: Orbit dual motion (illegal), swipe-tap conflict, HIT_R usage

- Orbit: F2 completes pre-snap motion before F1 begins (one player
  in motion at a time, per KCCC rules)
- Swipe starting on player circle no longer triggers selection
- Hit detection uses Math.max(HIT_R, r+10) for minimum touch target
- Swipe threshold scales to 30px on narrow screens

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Mobile Polish CSS

**Files:**
- Modify: `code/index.html:1-8` (head meta tags)
- Modify: `code/index.html:19-34` (CSS tokens — no changes needed, tokens already cover new needs)
- Modify: `code/index.html:37-42` (`.app` — safe area)
- Modify: `code/index.html:123-126` (`.transport` — safe area + sizing)
- Modify: `code/index.html:136-142` (`.progress` / `.progress-handle` — touch targets)
- Modify: `code/index.html:144-148` (`.sbtn` — speed button sizing)
- Modify: `code/index.html:152-168` (media query — full replacement)
- Modify: `code/index.html:170-205` (Quick Sheet styles — touch targets)

- [ ] **Step 1: Add PWA meta tags**

In the `<head>` section, after line 7 (`<meta name="apple-mobile-web-app-status-bar-style"...>`), add:

```html
<meta name="theme-color" content="#0F172A">
<meta name="apple-mobile-web-app-title" content="Playbook">
```

- [ ] **Step 2: Add safe area to app container**

Find the `.app` CSS rule:
```css
.app{display:flex;height:100vh;width:100vw}
```

Replace with:
```css
.app{display:flex;height:100vh;width:100vw;padding-top:env(safe-area-inset-top);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
```

- [ ] **Step 3: Add safe area to transport bar**

Find the `.transport{` rule and add `padding-bottom`:

```css
.transport{
  height:56px;background:var(--bg2);border-top:1px solid var(--bg3);
  display:flex;align-items:center;padding:0 16px;gap:10px;flex-shrink:0;
  padding-bottom:env(safe-area-inset-bottom);
}
```

- [ ] **Step 4: Enlarge progress bar and handle for touch**

Find the `.progress{` rule and replace:
```css
.progress{flex:1;height:10px;background:var(--bg3);border-radius:5px;cursor:pointer;position:relative;touch-action:none}
```

Find the `.progress-handle{` rule and replace:
```css
.progress-handle{
  position:absolute;top:50%;width:24px;height:24px;border-radius:50%;
  background:#fff;transform:translate(-50%,-50%);left:0%;cursor:grab;
  box-shadow:0 1px 4px rgba(0,0,0,.4);
}
```

- [ ] **Step 5: Enlarge speed buttons**

Find the `.sbtn{` rule and replace:
```css
.sbtn{
  padding:6px 10px;border-radius:3px;border:1px solid #475569;background:transparent;
  color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;
}
```

- [ ] **Step 6: Replace the mobile media query**

Find the entire `@media (max-width: 700px), (orientation: portrait)` block (lines 152-168) and replace with:

```css
@media (max-width: 700px), (orientation: portrait) {
  .app{flex-direction:column}
  .drawer{
    width:100%;min-width:unset;max-height:38vh;
    border-right:none;border-bottom:1px solid var(--bg3);
  }
  .play-list{max-height:calc(38vh - 90px)}
  .field-vp{min-height:35vh}
  .play-info{max-width:180px}
  .play-info .pi-name{font-size:13px}
  .legend{font-size:9px;padding:5px 8px}
  .strat-bar{height:38px;font-size:10px;padding:0 10px;gap:8px}
  .transport{height:56px;padding:0 10px;gap:8px}
  .tbtn{width:40px;height:40px;font-size:14px}
  .tbtn.play-btn{width:48px;height:48px;font-size:18px}
  .time-display{font-size:10px!important;min-width:62px!important}
  .tab{padding:14px 2px;font-size:10px}
  .badge{font-size:9px}
  .play-card .pd{font-size:10px}
  .qs-section-label{font-size:10px}
  .qs-strip-card{padding:10px 6px}
  .qs-strip-card .qsc-name{font-size:10px}
  .qs-strip-card .qsc-num{font-size:9px}
  .qs-goto-card{padding:10px 8px}
  .qs-goto-card .qg-name{font-size:10px}
  .qs-pat-row{padding:8px 0;font-size:10px}
}
```

- [ ] **Step 7: Enlarge QS button**

Find the `.qs-btn{` rule and replace:
```css
.qs-btn{
  background:transparent;border:1px solid var(--bg3);border-radius:4px;
  color:var(--text2);font-size:9px;font-weight:700;padding:6px 8px;
  cursor:pointer;letter-spacing:.04em;text-transform:uppercase;margin-top:2px;flex-shrink:0;
  min-width:36px;min-height:32px;display:flex;align-items:center;justify-content:center;
}
```

- [ ] **Step 8: Verify mobile polish**

Serve the app and use Claude Preview or browser devtools to test at:
1. iPad landscape (1024x768) — desktop layout with side drawer
2. iPad portrait (768x1024) — portrait layout triggers, field has room
3. iPhone 14 Pro (393x852) — drawer stacks, transport buttons are 40px+, progress handle is 24px
4. Check that safe areas don't affect desktop layout (env() returns 0 on non-notch devices)
5. Verify all 20 plays still render and animate correctly

- [ ] **Step 9: Commit**

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026
git add code/index.html
git commit -m "polish: mobile touch targets, safe areas, PWA meta tags

- Safe area insets for notched iPhones/iPads (status bar, home indicator)
- Transport buttons enlarged to 40px+ (was 30px) on mobile
- Progress bar/handle enlarged for touch scrubbing
- Speed buttons, QS button, tabs, Quick Sheet cards meet 44px minimum
- Font floor raised to 10px+ on mobile (was 8px in places)
- PWA meta: theme-color, apple-mobile-web-app-title
- Swipe threshold scales to 30px on narrow screens

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Rules Engine Data

**Files:**
- Modify: `code/index.html` — Insert RULES_DB and PENALTIES_DB after the PLAYS[] array (after line 815)

- [ ] **Step 1: Add CSS for rules UI elements**

After the Quick Sheet CSS (after the `.qs-pat-note` rule, around line 199), add new CSS rules:

```css
/* ========== RULES TAB ========== */
.rules-search{
  width:100%;padding:8px 10px;border:1px solid var(--bg3);border-radius:5px;
  background:var(--bg1);color:var(--text1);font-size:11px;margin-bottom:6px;
  outline:none;
}
.rules-search:focus{border-color:var(--accent)}
.rules-search::placeholder{color:var(--text3)}
.rule-card{
  padding:8px 10px;border-radius:6px;cursor:pointer;margin-bottom:3px;
  border:1px solid transparent;transition:background .15s;
}
.rule-card:hover{background:var(--bg3)}
.rule-card.expanded{background:var(--bg3);border-color:var(--bg3)}
.rule-card .rc-short{font-size:11px;font-weight:600;line-height:1.3}
.rule-card .rc-cat{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--accent);margin-bottom:3px}
.rule-card .rc-full{font-size:10px;color:var(--text2);margin-top:6px;line-height:1.4;display:none}
.rule-card.expanded .rc-full{display:block}
.rule-card .rc-mistakes{font-size:10px;color:#FCA5A5;margin-top:4px;line-height:1.3}
.rule-card .rc-tips{font-size:10px;color:#4ADE80;margin-top:4px;line-height:1.3}
.ctx-rules{margin-top:6px;border-top:1px solid var(--bg3);padding-top:6px}
.ctx-rules .ctx-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:4px}
.ctx-rule-item{font-size:10px;color:var(--text2);padding:3px 0;line-height:1.3}
.ctx-rule-item.warning{color:#FCA5A5}
.toggle-warning{
  background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);
  border-radius:4px;padding:3px 6px;font-size:9px;font-weight:600;
  color:#FCA5A5;margin-left:6px;
}
```

- [ ] **Step 2: Add rules list container to HTML drawer**

Find the Quick Sheet `<div>` in the drawer HTML:
```html
<div id="quickSheet" style="display:none;...">
```

After the closing `</div>` of quickSheet (and before the drawer's closing `</div>`), add:

```html
<div id="rulesPanel" style="display:none;flex:1;overflow-y:auto;padding:8px 10px;flex-direction:column">
  <input type="text" class="rules-search" id="rulesSearch" placeholder="Search rules...">
  <div id="rulesList"></div>
</div>
```

- [ ] **Step 3: Add contextual rules section to play-info overlay**

Find the play-info overlay's notes div:
```html
<div class="pi-notes" id="piNotes"></div>
```

After it, add:
```html
<div class="ctx-rules" id="ctxRules"></div>
```

- [ ] **Step 4: Add toggle warning container to strategy bar**

Find the strategy bar's Key `<span>`:
```html
<div class="si"><span class="sl">Key</span><span id="sbKey" style="font-weight:600"></span></div>
```

After it, add:
```html
<span id="sbWarning"></span>
```

- [ ] **Step 5: Insert RULES_DB data**

After the closing `];` of the PLAYS array (line 815) and before the CATEGORIES line, insert the RULES_DB. This is a large data block. Insert it as:

```js
/* ========== RULES DATABASE ========== */
const RULES_DB = [
  {ruleId:'field-dimensions',category:'field',shortText:'Field is 54 yds long x 22 yds wide with 7-yd end zones',fullText:'Field dimensions: 54 yards long by 22 yards wide. End Zone: 7 yards deep.',relatedPlays:['all'],commonMistakes:['Forgetting the field is only 22 yards wide -- sideline routes have less room than expected'],situationalTips:['The narrow field favors flood concepts that overload one side']},
  {ruleId:'nrz-locations',category:'field',shortText:'4 No-Run Zones: 5 yds each side of midfield + 5 yds before each end zone',fullText:'"No Running Zones" are located 5 yards before midfield and 5 yards before the end zone in each offensive direction.',relatedPlays:['screen-queen','flood-right','stack-release','rollout','lightning','motion-handoff'],commonMistakes:['Calling a rush play when LOS is in the NRZ','Thinking NRZ means you cannot pass -- passing is always legal'],situationalTips:['In NRZ, use Screen Queen or Flood Right instead of rushing plays']},
  {ruleId:'downs-system',category:'field',shortText:'3 plays to cross midfield, then 3 plays to score',fullText:'The offensive team takes possession at their 5-yard line and has 3 plays to cross midfield. Once a team crosses midfield, they have 3 plays to score.',relatedPlays:['all'],commonMistakes:['Thinking you get 4 downs like regular football -- it is only 3'],situationalTips:['With only 3 plays, every play matters. Script your 3-play sequences in advance.']},
  {ruleId:'possession-start',category:'field',shortText:'All possession changes start at the 5-yard line (except interceptions)',fullText:'All possession changes, except interceptions, start on the offensive team\'s 5-yard line.',relatedPlays:['all'],commonMistakes:['Thinking you take over where the opponent was stopped'],situationalTips:['After any turnover on downs, the new offense starts at their own 5-yard line']},
  {ruleId:'ball-on-ground',category:'field',shortText:'Ball must be on the ground at snap; bad snap = dead ball',fullText:'Ball must be on the ground at the snap. Any incomplete snap shall result in a dead ball.',relatedPlays:['all'],commonMistakes:['Shotgun snap that bounces -- dead ball, replay the down'],situationalTips:['Practice direct snaps with ball on the ground']},
  {ruleId:'scoring-values',category:'scoring',shortText:'TD=6, PAT from 5yd=1pt, PAT from 12yd=2pts, Safety=2pts',fullText:'Touchdown = 6 points. Extra Point: 1pt (5 yards out), 2pt (12 yards out). Safety = 2 points.',relatedPlays:['all'],commonMistakes:['Confusing PAT distances -- 1pt is from 5 yards, 2pt is from 12 yards'],situationalTips:['Default to 1pt PAT unless trailing by 2, 5, 8, or 9']},
  {ruleId:'mercy-rule',category:'scoring',shortText:'Game ends at 28 points or 24 minutes, whichever comes first',fullText:'Games are played to 28 points or 24 minutes (two 12-minute halves), whichever comes first.',relatedPlays:['all'],commonMistakes:['Not tracking score -- game can end mid-drive at 28 points'],situationalTips:['At 22 or 26 points, go for 2 on the PAT to reach 28 and end it']},
  {ruleId:'game-no-end-def-penalty',category:'scoring',shortText:'Game CANNOT end on a defensive penalty (unless offense declines)',fullText:'Games cannot end on a defensive penalty, unless the offense declines it.',relatedPlays:['all'],commonMistakes:['Thinking the game is over after the last play when a defensive penalty occurred'],situationalTips:['On the last play, take a deep shot -- if defense commits a penalty you get another play']},
  {ruleId:'play-clock',category:'timing',shortText:'25 seconds to snap after ball spotted; 1 warning then penalty',fullText:'Each time the ball is spotted a team has 25 seconds to snap the ball. Teams will receive one warning before a delay of game penalty is enforced.',relatedPlays:['all'],commonMistakes:['Taking too long in the huddle -- you only get one free warning'],situationalTips:['When leading, use the full 25 seconds every snap to burn clock']},
  {ruleId:'pass-clock',category:'timing',shortText:'QB has 7 seconds to throw; violation = dead ball, loss of down',fullText:'QB has a 7-second pass clock. If a pass is not thrown within 7 seconds, play is dead, loss of down, ball returns to LOS. Once the ball is handed off the 7-second rule is no longer in effect.',relatedPlays:['storm','thunder','fades','out','levels','scissors','wheel','flood-right','screen-queen','stack-release','rollout','jet-sweep','mismatch','motion-keep','trips','motion-slants','boomerang'],commonMistakes:['Holding the ball too long on Storm','Forgetting the 7-second clock stops after a hand-off'],situationalTips:['After a hand-off, the new ball carrier has unlimited time']},
  {ruleId:'timeout',category:'timing',shortText:'1 timeout per team, 60 seconds, clock stops',fullText:'Each team has one 60-second timeout per game, in which the clock stops.',relatedPlays:['all'],commonMistakes:['Using the timeout too early'],situationalTips:['Save for trailing late, need to stop clock on your own possession']},
  {ruleId:'forward-pass-beyond-los',category:'passing',shortText:'All passes must be forward and received beyond the LOS',fullText:'All passes must be forward and received beyond the line of scrimmage. Shovel passes are allowed but must be received beyond the LOS.',relatedPlays:['all'],commonMistakes:['Completing a pass behind the LOS -- offensive penalty','Confusing hand-offs (legal behind LOS) with passes (must be received beyond LOS)'],situationalTips:['Short passes near the LOS must be caught by a receiver who has crossed the LOS']},
  {ruleId:'no-laterals',category:'passing',shortText:'No laterals or pitches; only direct hand-offs behind LOS',fullText:'Only direct hand-offs behind the line of scrimmage are legal. No laterals or pitches of any kind. Offense may use multiple hand-offs.',relatedPlays:['storm','lightning','orbit','boomerang','motion-handoff','jet-sweep'],commonMistakes:['Tossing or pitching the ball instead of directly handing it off'],situationalTips:['The hand-off must be a direct physical transfer, not a toss']},
  {ruleId:'handoff-then-throw',category:'passing',shortText:'Hand-off receiver may throw if behind LOS; QB becomes eligible receiver',fullText:'The player who takes the hand-off can throw the ball as long as they do not pass the LOS. All players are eligible to receive passes including the QB after a hand-off.',relatedPlays:['storm','orbit','boomerang','lightning'],commonMistakes:['F1 crossing the LOS before throwing on Storm -- illegal forward pass','Forgetting the QB becomes eligible after handing off'],situationalTips:['On Storm, F1 must throw BEFORE her feet cross the LOS']},
  {ruleId:'qb-cannot-run',category:'rushing',shortText:'QB CANNOT run the ball, even if female',fullText:'The quarterback CANNOT run the ball, even if the quarterback is a female.',relatedPlays:['all'],commonMistakes:['Female QB thinking she can scramble past LOS -- she cannot','QB rolling out past the LOS on Rollout Choice'],situationalTips:['QB can move behind the LOS (rollout, scramble) but cannot cross it with the ball']},
  {ruleId:'male-no-rush',category:'rushing',shortText:'Males may NOT advance the ball across the LOS by running',fullText:'A male player may not advance the ball across the line of scrimmage.',relatedPlays:['all'],commonMistakes:['Males CAN receive passes beyond LOS and run after the catch. They cannot take a hand-off and rush across the LOS.'],situationalTips:['Males can run after a catch. They cannot rush (hand-off + run across LOS).']},
  {ruleId:'female-only-rusher',category:'rushing',shortText:'Only females may rush (advance ball across LOS by running)',fullText:'A female player is the only player allowed to advance the ball across the line-of-scrimmage by rushing.',relatedPlays:['lightning','orbit','boomerang','motion-handoff'],commonMistakes:['Handing off to a male and expecting him to rush -- illegal'],situationalTips:['F1 and F2 are the only players who can take hand-offs and rush past the LOS']},
  {ruleId:'rush-line',category:'rushing',shortText:'Defensive rushers must start 7 yds from LOS; all can rush after hand-off',fullText:'All players that rush the passer must be a minimum of 7 yards from the LOS when the ball is snapped. Once the ball has been handed off, the 7-yard rule is no longer in effect and all defenders are eligible to rush.',relatedPlays:['all'],commonMistakes:['Starting the rush from inside the 7-yard marker'],situationalTips:['After a hand-off, ALL defenders can rush freely -- no 7-yard rule']},
  {ruleId:'one-motion',category:'motion',shortText:'Only 1 player in motion pre-snap; must not move toward LOS at snap',fullText:'Only one player is allowed in motion at a time before the snap, that player may not be moving towards the line of scrimmage at the time of the snap.',relatedPlays:['jet-sweep','orbit','trips','motion-handoff','motion-keep','mismatch','motion-slants'],commonMistakes:['Two players moving at the snap','Motion player moving toward LOS at snap -- illegal motion'],situationalTips:['Motion must be lateral or away from LOS at the moment of the snap']},
  {ruleId:'spinning-allowed',category:'motion',shortText:'Ball carriers may spin; cannot leave feet (no diving/jumping)',fullText:'Spinning is allowed, but players cannot leave their feet to avoid a defensive player (no diving). Any player with possession cannot jump; ball spotted at the spot of the jump.',relatedPlays:['lightning','orbit','motion-handoff','boomerang'],commonMistakes:['Diving to avoid a flag pull -- spotted where you left your feet'],situationalTips:['Spin moves are a legal way to avoid flag pulls']},
  {ruleId:'open-play',category:'open-closed',shortText:'Open: any player may pass to any player; female still only rusher',fullText:'In an open play, the offensive team may pass the ball from any player to any player without penalty. A female is still the only player allowed to rush across the LOS.',relatedPlays:['thunder','fades','wheel','flood-right','stack-release','rollout','mismatch','motion-keep'],commonMistakes:['Thinking Open means males can rush -- they still cannot'],situationalTips:['Open plays give maximum passing flexibility but rushing rules are unchanged']},
  {ruleId:'closed-play',category:'open-closed',shortText:'Closed: female must be passer, receiver, or non-QB rusher',fullText:'In a closed play the offensive player must have a female involved in the transaction of the ball beyond the LOS. A female must be the passer, the receiver, or the non-QB rusher.',relatedPlays:['storm','lightning','screen-queen','jet-sweep','orbit','boomerang','out','levels','scissors','trips','motion-handoff','motion-slants'],commonMistakes:['Male QB throwing to male receiver on a Closed play -- ILLEGAL'],situationalTips:['On Closed plays, the female MUST be involved in the completion beyond LOS']},
  {ruleId:'toggle-female',category:'open-closed',shortText:'Completed play with female involved -> next play OPEN',fullText:'If the previous play involves a female in a completed successful play (as passer, receiver, or rusher) then the next play is Open.',relatedPlays:['all'],commonMistakes:['Incomplete passes do not change the toggle'],situationalTips:['Target a female on every completion to maintain Open status']},
  {ruleId:'toggle-male',category:'open-closed',shortText:'Completed male-to-male (no female) -> next play CLOSED',fullText:'If the previous play involves a male passer AND male receiver in a completed successful play then the next play is Closed.',relatedPlays:['mismatch','motion-keep'],commonMistakes:['Accidentally completing male-to-male when you wanted to stay Open'],situationalTips:['Mismatch Motion and Motion Keep deliberately flip to Closed']},
  {ruleId:'toggle-unsuccessful',category:'open-closed',shortText:'Unsuccessful play (incomplete, sack) -> toggle stays the same',fullText:'If a play is unsuccessful (did not advance ball beyond LOS), the next play retains the same open/closed status.',relatedPlays:['all'],commonMistakes:['Thinking an incomplete pass changes the toggle -- it does not'],situationalTips:['A sack, incomplete pass, or pass-clock violation does NOT change Open/Closed']},
  {ruleId:'toggle-def-penalty',category:'open-closed',shortText:'Accepted defensive penalty -> next play OPEN',fullText:'All defensive penalties will result in the next play being open.',relatedPlays:['all'],commonMistakes:['Forgetting to take advantage of the free Open play after a defensive penalty'],situationalTips:['After a defensive penalty, plan your best Open play']},
  {ruleId:'toggle-off-penalty',category:'open-closed',shortText:'Offensive penalty -> toggle stays the same',fullText:'All offensive penalties will result in the following play being the same open/closed determination as the penalized play.',relatedPlays:['all'],commonMistakes:['Thinking an offensive penalty flips the toggle'],situationalTips:['If you commit an offensive penalty on a Closed play, you are still Closed']},
  {ruleId:'toggle-new-possession',category:'open-closed',shortText:'Start of each new possession -> CLOSED',fullText:'Each new possession begins with Closed status (no previous female involvement to trigger Open).',relatedPlays:['all'],commonMistakes:['Assuming the first play of a drive is Open -- it is always Closed'],situationalTips:['Script your first play as a Closed-eligible play (Storm, Out, Trips)']},
  {ruleId:'dead-ball',category:'dead-ball',shortText:'Dead: flag pulled, OOB, TD, interception, knee/hand/ball on ground, flag falls',fullText:'Play is dead when: flag pulled, ball carrier OOB, TD scored, interception (no returns), knee/hand/ball touches ground, flag falls off, receiver flag falls out (dead at catch point).',relatedPlays:['all'],commonMistakes:['Trying to return an interception -- ball is dead immediately','Ball hitting the ground = dead, no fumble recovery'],situationalTips:['There are NO fumbles. Ball is dead where it hits the ground.']},
  {ruleId:'ball-spotted-belt',category:'dead-ball',shortText:'Ball spotted where the BELT is when flag pulled, not where ball is',fullText:'The ball is spotted where the ball carrier\'s belt is when the flag is pulled, not where the ball is. Ball and flags must break the plane for a 1st down and TD.',relatedPlays:['all'],commonMistakes:['Reaching the ball forward before flag pull -- does not matter, spot is at the belt'],situationalTips:['Extending the ball forward does NOT gain extra yardage']},
  {ruleId:'one-foot-inbounds',category:'dead-ball',shortText:'1 foot in bounds required for a legal catch',fullText:'Players must have at least one foot in bounds when making a catch.',relatedPlays:['fades','wheel','out','stack-release','flood-right'],commonMistakes:['Catching near the sideline without a foot in'],situationalTips:['On a 22-yard-wide field, sideline catches are common -- drill one-foot-in']},
  {ruleId:'no-contact',category:'penalties',shortText:'No contact allowed, NO BLOCKING of any kind',fullText:'No contact allowed. NO BLOCKING. No tackling, elbowing, cheap shots, blocking or any unsportsmanlike conduct.',relatedPlays:['all'],commonMistakes:['Setting a pick with body contact -- illegal','Blocking for the ball carrier -- not allowed'],situationalTips:['On Scissors and bunch plays, crossing paths is legal but contact is not']},
  {ruleId:'flag-guarding',category:'penalties',shortText:'Flag guarding is an offensive penalty (arm movement to prevent flag pull)',fullText:'Flag guarding: any arm/hand movement by the ball carrier to prevent their flag from being pulled is an offensive penalty.',relatedPlays:['lightning','orbit','motion-handoff','boomerang'],commonMistakes:['Naturally swinging arms while running can be called flag guarding'],situationalTips:['Ball carriers must keep arms away from their flags when running']},
  {ruleId:'half-distance',category:'penalties',shortText:'Within 10 yds of goal, penalty is half the distance to the goal',fullText:'Within 10 yards of goal, ball is placed half the distance to the goal.',relatedPlays:['all'],commonMistakes:['Expecting a full 10-yard penalty in the red zone'],situationalTips:['In the red zone, offensive penalties are less costly yardage-wise but still cost a down']},
  {ruleId:'ot-standard',category:'overtime',shortText:'Standard OT: 1 play from 5-yd line; most yards wins',fullText:'Each team receives one play from the 5-yard line toward the opposite end zone. Most yards wins. Negative yardage is better than interception. Incomplete pass is the worst result.',relatedPlays:['all'],commonMistakes:['Incomplete pass is WORSE than an interception in OT','Throwing an interception is worse than negative yardage'],situationalTips:['In standard OT, prioritize yardage. An incomplete pass is the worst result.']},
  {ruleId:'ot-championship',category:'overtime',shortText:'Championship OT: 3 plays from midfield, mandatory 2-pt conversion',fullText:'Each team gets 3 plays from midfield. If a team scores, they attempt a 2-pt conversion from the 12-yard mark. All extra point conversions in championship OT are 2 points.',relatedPlays:['all'],commonMistakes:['Going for 1-pt PAT in championship OT -- all are 2-pt from 12 yards'],situationalTips:['Plan a 3-play scoring sequence from midfield. First play is Closed.']}
];
```

- [ ] **Step 6: Insert PENALTIES_DB data**

Immediately after the RULES_DB closing `];`, add:

```js
const PENALTIES_DB = {
  defensive:[
    {name:'Offsides',yardage:10,downEffect:'Auto 1st down',toggleEffect:'Next play OPEN',description:'Defender crosses LOS before the snap'},
    {name:'Interference',yardage:10,downEffect:'Auto 1st down',toggleEffect:'Next play OPEN',description:'Defender impedes receiver\'s ability to catch'},
    {name:'Illegal Contact',yardage:10,downEffect:'Auto 1st down',toggleEffect:'Next play OPEN',description:'Holding, bump and run, blocking, jumping with contact'},
    {name:'Illegal Flag Pull',yardage:10,downEffect:'Auto 1st down',toggleEffect:'Next play OPEN',description:'Pulling flag before receiver has the ball'},
    {name:'Illegal Rushing',yardage:10,downEffect:'Auto 1st down',toggleEffect:'Next play OPEN',description:'Starting rush from inside the 7-yard marker'},
    {name:'Unsportsmanlike Conduct',yardage:10,downEffect:'Auto 1st down',toggleEffect:'Next play OPEN',description:'Tackling, elbowing, cheap shots, blocking. May be ejected.'}
  ],
  offensive:[
    {name:'Illegal Motion',yardage:10,downEffect:'Loss of down',toggleEffect:'Toggle stays same',description:'More than 1 person moving at snap, false start, motion toward LOS'},
    {name:'Illegal Forward Pass',yardage:10,downEffect:'Loss of down',toggleEffect:'Toggle stays same',description:'Pass received behind the LOS'},
    {name:'Flag Guarding',yardage:10,downEffect:'Loss of down',toggleEffect:'Toggle stays same',description:'Ball carrier uses arm/hand to prevent flag pull'},
    {name:'Jumping by Ball Carrier',yardage:10,downEffect:'Loss of down',toggleEffect:'Toggle stays same',description:'Ball carrier leaves feet. Spotted at spot of jump.'},
    {name:'Delay of Game',yardage:10,downEffect:'Loss of down',toggleEffect:'Toggle stays same',description:'Failing to snap within 25 seconds after one warning'},
    {name:'Offensive Pass Interference',yardage:10,downEffect:'Loss of down',toggleEffect:'Toggle stays same',description:'Illegal pick play, receiver pushing defender'},
    {name:'Unsportsmanlike Conduct',yardage:10,downEffect:'Loss of down',toggleEffect:'Toggle stays same',description:'Any unsportsmanlike behavior. May be ejected.'}
  ],
  notes:{
    allDeclinable:'All penalties may be declined by the opposing team.',
    halfDistance:'Within 10 yards of goal, penalty is half the distance.',
    gameNoEnd:'Games cannot end on a defensive penalty unless offense declines.',
    otDefPenalty:'In OT, defensive penalties give 10 yards plus option for an extra play.',
    otOffPenalty:'In OT, offensive penalty = negative 10 yards and loss of down.'
  }
};
```

- [ ] **Step 7: Verify rules data loads**

Serve the app. Open browser console and type `RULES_DB.length` — should return the number of rules (approximately 34). Type `PENALTIES_DB.defensive.length` — should return 6. No console errors on page load.

- [ ] **Step 8: Commit**

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026
git add code/index.html
git commit -m "data: embed rules engine (RULES_DB + PENALTIES_DB)

34 structured rules and 13 penalties from KCCC PDF, cross-referenced
to all 20 plays. Includes common mistakes and situational tips.
Data layer for Rules Advisor UI and contextual warnings.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: QB Read Progressions Data

**Files:**
- Modify: `code/index.html` — Add `reads[]` array to each of the 20 play objects in PLAYS[]

- [ ] **Step 1: Add reads mode state variable**

In the state variables section (after `let quickSheetMode = false;` and `let swipeInProgress = false;`), add:

```js
let readsMode = false;
```

- [ ] **Step 2: Add reads data to plays 1-5**

For each play in PLAYS[], add a `reads` property after the `players` array. Add these reads arrays to the first 5 plays:

**Storm** (id:'storm') — add after `players:[ ... ]`:
```js
,reads:[{readNumber:1,target:'M1',label:'Deep corner/post',windowStart:.35,windowEnd:.87,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F1 throws. M1 is the only read. If M1 covered, F1 tucks and rushes.'}]
```

**Lightning** (id:'lightning'):
```js
,reads:[{readNumber:1,target:'F1',label:'Outside rush',windowStart:.26,windowEnd:.80,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F1 reads edge: soft = rush outside. Crashed = pull up and throw.'}]
```

**Thunder** (id:'thunder'):
```js
,reads:[{readNumber:1,target:'F2',label:'Deep route',windowStart:.55,windowEnd:.88,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F2 deep is the target (stays Open). If safety covers F2, go to read 2.'},{readNumber:2,target:'M2',label:'Crossing underneath',windowStart:.40,windowEnd:.60,isPrimary:false,staysOpen:false,closedLegal:true,readKey:'M2 crossing is the check-down. Completing here flips to Closed.'}]
```

**Screen Queen** (id:'screen-queen'):
```js
,reads:[{readNumber:1,target:'F1',label:'Flat screen',windowStart:.30,windowEnd:.52,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'Quick screen -- get the ball out fast to F1 in the flat.'}]
```

**Flood Right** (id:'flood-right'):
```js
,reads:[{readNumber:1,target:'M2',label:'Deep route (high)',windowStart:.30,windowEnd:.50,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'M2 deep is the first look. If deep defender covers M2, go to read 2.'},{readNumber:2,target:'F2',label:'Intermediate (mid)',windowStart:.30,windowEnd:.86,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F2 intermediate stays Open. The designed target.'},{readNumber:3,target:'F1',label:'Short flat (low)',windowStart:.30,windowEnd:.50,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'F1 flat is the low check-down.'}]
```

- [ ] **Step 3: Add reads data to plays 6-10**

**Jet Sweep Fake** (id:'jet-sweep'):
```js
,reads:[{readNumber:1,target:'F1',label:'Deep crossing route',windowStart:.60,windowEnd:.85,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'If defense flows with F2 motion, F1 crossing is wide open.'}]
```

**Stack Release** (id:'stack-release'):
```js
,reads:[{readNumber:1,target:'F1',label:'Right EZ corner',windowStart:.55,windowEnd:.84,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F1 right corner stays Open. If defender follows F1, go to read 2.'},{readNumber:2,target:'M1',label:'Left EZ corner',windowStart:.40,windowEnd:.60,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'M1 breaks left from the stack. Read which corner coverage vacates.'}]
```

**Orbit** (id:'orbit'):
```js
,reads:[{readNumber:1,target:'F1',label:'Rush / throw / dump',windowStart:.47,windowEnd:.80,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F1 reads defense post-handoff: edge soft = rush. Deep open = throw M1. Pressure = dump F2.'}]
```

**Boomerang** (id:'boomerang'):
```js
,reads:[{readNumber:1,target:'F2',label:'Rush right / throw option',windowStart:.39,windowEnd:.65,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F2 reads the right edge. Soft = rush. Coverage loose deep = throw to read 2.'},{readNumber:2,target:'M2',label:'Deep route',windowStart:.50,windowEnd:.80,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'M2 deep is the throw target if F2 decides to pass.'}]
```

**Mismatch Motion** (id:'mismatch'):
```js
,reads:[{readNumber:1,target:'M1',label:'Deep crossing route',windowStart:.50,windowEnd:.88,isPrimary:true,staysOpen:false,closedLegal:true,readKey:'F2 motion diagnoses man vs zone. M1 deep cross is the target. Male-to-male flips Closed.'}]
```

- [ ] **Step 4: Add reads data to plays 11-15**

**Rollout Choice** (id:'rollout'):
```js
,reads:[{readNumber:1,target:'F2',label:'Corner route (right)',windowStart:.60,windowEnd:.90,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F2 corner stays Open. QB rolls right, reads F2 first.'},{readNumber:2,target:'M1',label:'Crossing back of EZ',windowStart:.45,windowEnd:.75,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'M1 crosses back of end zone. QB can scramble right (cannot cross LOS).'}]
```

**Out** (id:'out'):
```js
,reads:[{readNumber:1,target:'F1',label:'7yd out-cut',windowStart:.40,windowEnd:.65,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'If flat defender sags, throw F1 out. If defender jumps F1, go to read 2.'},{readNumber:2,target:'M1',label:'12yd deep out',windowStart:.52,windowEnd:.75,isPrimary:false,staysOpen:true,closedLegal:false,readKey:'M1 deep out over the top. CAUTION: Only legal when run from Open status.'}]
```

**Levels** (id:'levels'):
```js
,reads:[{readNumber:1,target:'M1',label:'Deep corner (15yd)',windowStart:.50,windowEnd:.68,isPrimary:false,staysOpen:false,closedLegal:false,readKey:'M1 deep corner is the big play but M-to-M flips Closed. ONLY LEGAL WHEN OPEN.'},{readNumber:2,target:'F1',label:'10yd crossing',windowStart:.40,windowEnd:.68,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F1 crossing is the safe Closed completion (flips Open).'},{readNumber:3,target:'F2',label:'3yd outlet',windowStart:.25,windowEnd:.50,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'F2 outlet is the emergency dump. Short, safe, stays Open.'}]
```

**Fades** (id:'fades'):
```js
,reads:[{readNumber:1,target:'F1',label:'Right fade',windowStart:.40,windowEnd:.68,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F1 fade stays Open. If safety shades right, go to read 2.'},{readNumber:2,target:'M1',label:'Left fade',windowStart:.40,windowEnd:.72,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'M1 fade on opposite sideline. Whichever side the safety vacates is open.'},{readNumber:3,target:'F2',label:'Short outlet',windowStart:.25,windowEnd:.55,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'F2 outlet is the safety valve if both fades are covered.'}]
```

**Scissors** (id:'scissors'):
```js
,reads:[{readNumber:1,target:'F1',label:'Corner route',windowStart:.48,windowEnd:.78,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F1 corner is the Closed completion (flips Open). If defender switches, go to read 2.'},{readNumber:2,target:'M2',label:'Post route',windowStart:.48,windowEnd:.78,isPrimary:false,staysOpen:false,closedLegal:false,readKey:'M2 post comes open inside. CAUTION: Only legal when run from Open status.'}]
```

- [ ] **Step 5: Add reads data to plays 16-20**

**Wheel** (id:'wheel'):
```js
,reads:[{readNumber:1,target:'F1',label:'Wheel route',windowStart:.48,windowEnd:.80,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'Wait for F1 to turn upfield. Throw after the break. If wheel jumped, go to read 2.'},{readNumber:2,target:'M2',label:'Curl/cross underneath',windowStart:.28,windowEnd:.45,isPrimary:false,staysOpen:true,closedLegal:true,readKey:'M2 underneath is the check-down.'}]
```

**Trips** (id:'trips'):
```js
,reads:[{readNumber:1,target:'F1',label:'Quick slant from bunch',windowStart:.22,windowEnd:.52,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'Quick Closed completion. Bunch creates traffic that makes the slant hard to cover.'}]
```

**Motion Hand-off** (id:'motion-handoff'):
```js
,reads:[{readNumber:1,target:'F2',label:'Motion rush outside',windowStart:.28,windowEnd:.82,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'Get ball to F2 in motion. F2 rushes outside. If edge crashed, pull up and throw.'}]
```

**Motion Keep** (id:'motion-keep'):
```js
,reads:[{readNumber:1,target:'M1',label:'Deep corner/post',windowStart:.42,windowEnd:.88,isPrimary:true,staysOpen:false,closedLegal:true,readKey:'Fake to F2 sells the play. M1 deep is the only target. Deliberately flips Closed.'}]
```

**Motion Slants** (id:'motion-slants'):
```js
,reads:[{readNumber:1,target:'F1',label:'Quick slant from bunch',windowStart:.22,windowEnd:.55,isPrimary:true,staysOpen:true,closedLegal:true,readKey:'F1 slant is the primary Closed completion. If F1 covered, go to read 2.'},{readNumber:2,target:'M2',label:'Parallel slant',windowStart:.22,windowEnd:.55,isPrimary:false,staysOpen:false,closedLegal:false,readKey:'M2 parallel slant from bunch. CAUTION: M-to-M stays Closed. Only legal when Open.'}]
```

- [ ] **Step 6: Verify reads data**

Serve the app. Open browser console and run:
```js
PLAYS.forEach(p => console.log(p.name, p.reads ? p.reads.length + ' reads' : 'NO READS'));
```

All 20 plays should show a read count (1, 2, or 3). No "NO READS" entries. No console errors.

Also verify:
```js
PLAYS.filter(p => p.reads.some(r => !r.closedLegal)).map(p => p.name)
```
Should return: `["Out", "Levels", "Scissors", "Motion Slants"]` — the plays with illegal-when-Closed secondary reads.

- [ ] **Step 7: Commit**

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026
git add code/index.html
git commit -m "data: QB read progressions for all 20 plays

reads[] arrays with timing windows, scan order, read triggers,
toggle effects, and closed-legality flags. Cross-referenced
against route waypoints. 9 single-read, 8 two-read, 3 three-read.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Rules Advisor UI

**Files:**
- Modify: `code/index.html` — Add rules tab logic, contextual rules rendering, toggle warnings

- [ ] **Step 1: Update CATEGORIES and tab rendering to include Rules**

Find the CATEGORIES constant:
```js
const CATEGORIES = ['All','Pass','Rush','Motion','NRZ'];
```

Replace with:
```js
const CATEGORIES = ['All','Pass','Rush','Motion','NRZ','Rules'];
```

- [ ] **Step 2: Add rules rendering functions**

After the `renderQuickSheet()` function (and before `selectPlay()`), add:

```js
function renderRulesTab(){
  const panel = document.getElementById('rulesPanel');
  const searchVal = (document.getElementById('rulesSearch').value || '').toLowerCase();
  const filtered = searchVal ? RULES_DB.filter(r =>
    r.shortText.toLowerCase().includes(searchVal) ||
    r.fullText.toLowerCase().includes(searchVal) ||
    r.category.toLowerCase().includes(searchVal)
  ) : RULES_DB;

  const grouped = {};
  filtered.forEach(r => {
    if(!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  const catOrder = ['open-closed','passing','rushing','motion','field','scoring','timing','penalties','dead-ball','overtime'];
  let html = '';
  catOrder.forEach(cat => {
    if(!grouped[cat]) return;
    html += '<div class="qs-section-label" style="margin-top:8px">' + cat.toUpperCase().replace('-',' ') + '</div>';
    grouped[cat].forEach(r => {
      html += '<div class="rule-card" data-rid="'+r.ruleId+'">';
      html += '<div class="rc-cat">'+r.category.replace('-',' ')+'</div>';
      html += '<div class="rc-short">'+r.shortText+'</div>';
      html += '<div class="rc-full">';
      html += '<div style="margin-bottom:4px">'+r.fullText+'</div>';
      if(r.commonMistakes.length) html += '<div class="rc-mistakes">Common mistakes: '+r.commonMistakes.join('; ')+'</div>';
      if(r.situationalTips.length) html += '<div class="rc-tips">Tips: '+r.situationalTips.join('; ')+'</div>';
      html += '</div></div>';
    });
  });
  document.getElementById('rulesList').innerHTML = html;
  document.getElementById('rulesPanel').querySelectorAll('.rule-card').forEach(el => {
    el.addEventListener('pointerdown', () => {
      el.classList.toggle('expanded');
    });
  });
}

function renderContextualRules(){
  const play = currentPlay;
  if(!play) return;
  const relevant = RULES_DB.filter(r =>
    r.relatedPlays.includes('all') || r.relatedPlays.includes(play.id)
  );
  // Show only the most relevant (not 'all' unless few specific)
  const specific = relevant.filter(r => !r.relatedPlays.includes('all'));
  const show = specific.length > 0 ? specific.slice(0,4) : relevant.slice(0,3);

  let html = '<div class="ctx-label">RULES</div>';
  show.forEach(r => {
    html += '<div class="ctx-rule-item">'+r.shortText+'</div>';
  });

  // Closed-play warnings for reads with closedLegal:false
  if(play.reads){
    play.reads.forEach(r => {
      if(!r.closedLegal){
        html += '<div class="ctx-rule-item warning">Read '+r.readNumber+' ('+r.target+') only legal when run from Open status</div>';
      }
    });
  }

  document.getElementById('ctxRules').innerHTML = html;
}

function updateToggleWarning(){
  const play = currentPlay;
  const el = document.getElementById('sbWarning');
  if(!play){el.innerHTML='';return;}
  // Warn if play requires Open but is being viewed in a Closed context
  if(play.eligibility === 'open'){
    el.innerHTML = '<span class="toggle-warning">Requires Open</span>';
  } else {
    el.innerHTML = '';
  }
}
```

- [ ] **Step 3: Update tab click handler to show/hide rules panel**

In the `buildDrawer()` function, find the tab click handler:
```js
el.addEventListener('click',()=>{
  activeCategory = el.dataset.cat;
  tabsEl.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderPlayList();
});
```

Replace with:
```js
el.addEventListener('click',()=>{
  activeCategory = el.dataset.cat;
  tabsEl.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  const rulesPanel = document.getElementById('rulesPanel');
  const playList = document.getElementById('playList');
  if(activeCategory === 'Rules'){
    playList.style.display = 'none';
    rulesPanel.style.display = 'flex';
    renderRulesTab();
  } else {
    playList.style.display = '';
    rulesPanel.style.display = 'none';
    renderPlayList();
  }
});
```

- [ ] **Step 4: Add search input listener**

At the end of the `buildDrawer()` function, add:

```js
document.getElementById('rulesSearch').addEventListener('input', () => {
  if(activeCategory === 'Rules') renderRulesTab();
});
```

- [ ] **Step 5: Wire contextual rules and toggle warning into selectPlay**

In the `selectPlay()` function, find the line:
```js
if(quickSheetMode) renderQuickSheet();
```

After it, add:
```js
renderContextualRules();
updateToggleWarning();
```

Also add `renderContextualRules();` and `updateToggleWarning();` calls in the `init()` function after `updateStratBar();`.

- [ ] **Step 6: Verify Rules Advisor UI**

Serve the app and verify:
1. Click the "Rules" tab — rules list appears grouped by category
2. Type "QB" in the search box — filters to rules mentioning QB
3. Tap a rule card — it expands to show full text, common mistakes, tips
4. Select a play (e.g., Storm) — the play-info overlay shows contextual rules including "Hand-off receiver may throw if behind LOS"
5. Select Out — contextual rules show the warning "Read 2 (M1) only legal when run from Open status"
6. Select Thunder (Open-only) — strategy bar shows "Requires Open" warning badge
7. Select Storm (Closed-eligible) — no warning badge
8. Switch back to "All" tab — play list returns
9. QS button still works correctly
10. No console errors

- [ ] **Step 7: Commit**

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026
git add code/index.html
git commit -m "feat: Rules Advisor UI with contextual warnings

- Rules tab in drawer with searchable, expandable rule cards
- Contextual rules panel in play-info overlay (per-play relevant rules)
- Closed-play warnings for illegal secondary reads (Out, Levels, Scissors, Motion Slants)
- Toggle warning badge in strategy bar for Open-only plays
- 34 rules grouped by category with common mistakes and tips

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: QB Read Progressions UI

**Files:**
- Modify: `code/index.html` — Add read badges, active-read glow, read strip, reads toggle

- [ ] **Step 1: Add reads UI CSS**

After the rules CSS (added in Task 3 Step 1), add:

```css
/* ========== READ PROGRESSIONS ========== */
.read-strip{
  height:24px;background:var(--bg2);border-top:1px solid var(--bg3);
  display:none;align-items:center;padding:0 16px;position:relative;flex-shrink:0;
}
.read-strip.active{display:flex}
.read-strip-bar{flex:1;height:14px;background:var(--bg3);border-radius:3px;position:relative;overflow:hidden}
.read-seg{position:absolute;top:0;height:100%;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:rgba(255,255,255,.8);letter-spacing:.02em}
.read-seg.open{background:rgba(74,222,128,.3);border:1px solid rgba(74,222,128,.5)}
.read-seg.closed{background:rgba(251,191,36,.3);border:1px solid rgba(251,191,36,.5)}
.read-seg.illegal{background:rgba(252,165,165,.2);border:1px solid rgba(252,165,165,.5)}
.read-playhead{position:absolute;top:-2px;width:2px;height:18px;background:#fff;border-radius:1px;transition:none;z-index:2}
.reads-btn{
  width:32px;height:28px;border-radius:4px;border:1px solid var(--bg3);background:transparent;
  color:var(--text3);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.03em;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;
}
.reads-btn.active{background:var(--accent);border-color:var(--accent);color:#fff}
```

- [ ] **Step 2: Add reads strip HTML**

Find the strategy bar HTML:
```html
<div class="strat-bar">
```

Immediately BEFORE it, insert:
```html
<div class="read-strip" id="readStrip">
  <div class="read-strip-bar" id="readStripBar">
    <div class="read-playhead" id="readPlayhead"></div>
  </div>
</div>
```

- [ ] **Step 3: Add reads toggle button to transport**

Find the speed button group in the transport:
```html
<div class="speed-grp">
```

Immediately BEFORE it, insert:
```html
<button class="reads-btn" id="btnReads" title="Toggle read progressions (D)">R</button>
```

- [ ] **Step 4: Add read strip rendering function**

After the `drawPlayFrame()` function, add:

```js
function updateReadStrip(t){
  const strip = document.getElementById('readStrip');
  if(!readsMode || !currentPlay.reads || currentPlay.reads.length === 0){
    strip.classList.remove('active');
    return;
  }
  strip.classList.add('active');
  const bar = document.getElementById('readStripBar');
  const reads = currentPlay.reads;

  // Build segments (only on play change, not every frame)
  if(!bar.dataset.playId || bar.dataset.playId !== currentPlay.id){
    bar.dataset.playId = currentPlay.id;
    let segsHtml = '<div class="read-playhead" id="readPlayhead"></div>';
    reads.forEach(r => {
      const left = (r.windowStart * 100).toFixed(1);
      const width = ((r.windowEnd - r.windowStart) * 100).toFixed(1);
      const cls = !r.closedLegal ? 'illegal' : (r.staysOpen ? 'open' : 'closed');
      segsHtml += '<div class="read-seg '+cls+'" style="left:'+left+'%;width:'+width+'%">'+r.readNumber+': '+r.target+'</div>';
    });
    bar.innerHTML = segsHtml;
  }

  // Update playhead position
  document.getElementById('readPlayhead').style.left = (t * 100) + '%';
}
```

- [ ] **Step 5: Add read badges and glow to drawPlayFrame**

In the `drawPlayFrame(t)` function, find the player drawing loop:
```js
// Draw players
play.players.forEach((p,i)=>{
```

After the entire player drawing loop ends (after the closing `});`), add the read overlay rendering:

```js
  // Read progression overlays
  if(readsMode && play.reads && play.reads.length > 0){
    // Determine which read is currently active
    let activeRead = null;
    for(let ri = 0; ri < play.reads.length; ri++){
      const rd = play.reads[ri];
      if(t >= rd.windowStart && t <= rd.windowEnd){
        activeRead = rd;
        break; // first matching = lowest numbered = active
      }
    }

    play.reads.forEach(rd => {
      const targetPlayer = play.players.find(pl => pl.role === rd.target);
      if(!targetPlayer) return;
      const pi = play.players.indexOf(targetPlayer);
      const pos = positions[pi];

      // Read number badge
      const badgeX = pos.x + r * 0.8;
      const badgeY = pos.y - r * 0.8;
      const badgeR = Math.max(7, r * 0.5);
      ctx.beginPath();
      ctx.fillStyle = !rd.closedLegal ? 'rgba(239,68,68,.85)' : (rd.staysOpen ? 'rgba(34,197,94,.85)' : 'rgba(251,191,36,.85)');
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = 'bold ' + Math.max(7, badgeR * 1.1) + 'px -apple-system,sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rd.readNumber.toString(), badgeX, badgeY);

      // Active read glow
      if(activeRead && activeRead.readNumber === rd.readNumber){
        const glowPhase = (Date.now() % 1000) / 1000;
        const glowR = r + 8 + Math.sin(glowPhase * Math.PI * 2) * 4;
        ctx.beginPath();
        ctx.strokeStyle = !rd.closedLegal ? 'rgba(239,68,68,.5)' : (rd.staysOpen ? 'rgba(34,197,94,.5)' : 'rgba(251,191,36,.5)');
        ctx.lineWidth = 3;
        ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  // Update read strip every frame
  updateReadStrip(t);
```

- [ ] **Step 6: Wire up reads toggle button and keyboard shortcut**

In the `initInteractions()` function, after the speed button handlers, add:

```js
// Reads toggle
document.getElementById('btnReads').addEventListener('click',()=>{
  readsMode = !readsMode;
  document.getElementById('btnReads').classList.toggle('active', readsMode);
  const bar = document.getElementById('readStripBar');
  bar.dataset.playId = ''; // force re-render of segments
  drawPlayFrame(animT);
});
```

In the keyboard handler, after the ArrowUp handler, add:

```js
if(e.code==='KeyD'){readsMode=!readsMode;document.getElementById('btnReads').classList.toggle('active',readsMode);document.getElementById('readStripBar').dataset.playId='';drawPlayFrame(animT);}
```

- [ ] **Step 7: Add read key to tooltip**

In the `showTooltip` function, find where `actionText` is set and the line:
```js
document.getElementById('ttAction').textContent = actionText;
```

Replace that line with:

```js
  let fullAction = actionText;
  if(readsMode && currentPlay.reads){
    const readInfo = currentPlay.reads.find(r => r.target === player.role);
    if(readInfo){
      fullAction += ' | Read ' + readInfo.readNumber + ': ' + readInfo.label;
      if(!readInfo.closedLegal) fullAction += ' (OPEN ONLY)';
    }
  }
  document.getElementById('ttAction').textContent = fullAction;
```

- [ ] **Step 8: Ensure glow animates continuously when reads mode is active**

The glow uses `Date.now()` for its pulse, but `drawPlayFrame` only runs during animation or on interaction. When the animation is paused but reads mode is on, the glow won't pulse. Add a continuous redraw when reads mode is active and animation is paused.

In the `tick` function, after the `if(animT>=1)` block that sets `animState='idle'`, the animation stops. To keep the glow pulsing, add a helper. After the `tick` function, add:

```js
function tickReadsGlow(){
  if(!readsMode || animState === 'playing') return;
  drawPlayFrame(animT);
  requestAnimationFrame(tickReadsGlow);
}
```

In the reads toggle handler (the click handler from Step 6), after `drawPlayFrame(animT);`, add:
```js
if(readsMode && animState !== 'playing') requestAnimationFrame(tickReadsGlow);
```

- [ ] **Step 9: Verify QB Read Progressions UI**

Serve the app and verify:
1. Click the "R" button (or press D) — reads mode activates, button highlights
2. Select "Out" — two read badges appear: green "1" on F1, red "2" on M1 (illegal when Closed)
3. Play the animation — the active read gets a pulsing glow ring. Read 1 (F1) glows first, then Read 2 (M1) after Read 1's window closes
4. The read strip appears between field and strategy bar with colored segments
5. The playhead moves along the strip during animation
6. Select "Levels" — three read badges appear (1, 2, 3). Read 1 (M1) has red border (illegal when Closed)
7. Tap F1 while reads mode is on — tooltip shows "Read 2: 10yd crossing"
8. Select "Storm" — single read badge "1" on M1
9. Press D again — reads mode deactivates, badges/strip/glow disappear
10. All 20 plays work correctly with reads on and off
11. No console errors

- [ ] **Step 10: Commit**

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026
git add code/index.html
git commit -m "feat: QB read progression visualization

- Read number badges (green=stays Open, amber=flips Closed, red=illegal when Closed)
- Active-read pulsing glow ring during animation
- Read progression strip timeline with colored segments and playhead
- Read key info in player tooltips when reads mode active
- Toggle via R button or D key
- Continuous glow animation when paused in reads mode

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Strategy Guide Updates

**Files:**
- Modify: `project_files/KCCC-2026-Strategy-Guide.md`

- [ ] **Step 1: Fix Orbit description**

Find the Orbit play description section (Play 15). In the Formation and Play rows, change:

From: "F1 right side, motions left pre-snap. F2 left side, motions right pre-snap."
To: "F2 left side, motions right pre-snap and gets set. THEN F1 right side motions left pre-snap (only one player in motion at a time)."

From: "Both females are rush threats -- F2 motions from left and F1 motions from right."
To: "F2 motions from left to right and sets. Then F1 motions from right to left (sequential -- only one in motion at a time). Both females are rush threats."

- [ ] **Step 2: Add Open-only labels to secondary reads**

In the Out play description (Play 4), in the Play row, change:
"QB reads: F1 7yd out first (quick Closed completion), M1 deep out second (if Open)."
To:
"QB reads: F1 7yd out first (quick Closed completion), M1 deep out second (OPEN STATUS ONLY -- male-to-male is illegal when Closed)."

In the Levels play description (Play 5), in the Key read row, add at end:
"Note: M1 deep corner is ONLY a legal target when this play is run from Open status (male-to-male is illegal on Closed plays)."

In the Scissors play description (Play 7), in the Key read row, change:
"M2 post comes open inside (but stays Closed if completed)."
To:
"M2 post comes open inside (OPEN STATUS ONLY -- male-to-male is illegal when Closed)."

- [ ] **Step 3: Fix interception wording**

In the Quick Rules table, find:
"Interceptions | Dead at point of interception -- NO returns; offense takes over at opponent 5-yard line"

Replace with:
"Interceptions | Dead at point of interception -- NO returns; intercepting team starts their next drive at their own 5-yard line"

- [ ] **Step 4: Add missing rules to Quick Rules table**

After the last row in the Quick Rules table (before the `---`), add these rows:

```
| **Game ending** | Game CANNOT end on a defensive penalty (unless offense declines) |
| **Half-distance** | Within 10 yds of goal, penalties are half the distance to the goal |
| **Spinning** | Spinning is allowed; cannot leave feet (no diving/jumping with ball) |
| **Ball spotting** | Ball spotted where the BELT is when flag pulled, not where ball is held |
| **Play clock warning** | 1 free warning before delay of game penalty is enforced |
| **Defenders at LOS** | Non-rushing defenders may stand at the LOS |
| **Flag guarding** | Ball carrier using arm/hand to prevent flag pull is a penalty |
```

- [ ] **Step 5: Add OT details**

In the Overtime row of the Quick Rules table, replace:
"From 5-yard line, 1 play each, most yards wins; championship games: from midfield, 3 plays, must go for 2"

With:
"Standard: 1 play from 5-yd line, most yards wins (negative yardage > interception > incomplete pass). Championship: from midfield, 3 plays, mandatory 2-pt from 12 yds. OT starts CLOSED. Defensive penalty in OT = 10 yds + optional extra play."

- [ ] **Step 6: Add flag guarding to trick play legality table**

In Section 9 (Trick Play Legality), add a row:

```
| Flag guarding (arm over flags while running) | **ILLEGAL** | Offensive penalty, 10 yards + loss of down |
```

- [ ] **Step 7: Commit**

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026
git add project_files/KCCC-2026-Strategy-Guide.md
git commit -m "docs: fix strategy guide rules gaps and Orbit motion

- Fix Orbit: sequential motion (F2 sets, then F1 motions)
- Add Open-only labels to secondary reads on Out, Levels, Scissors
- Fix interception wording clarity
- Add 7 missing rules to Quick Rules table
- Add OT tiebreaker hierarchy and penalty effects
- Add flag guarding to trick play legality table

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Full-Device Testing and Final Verification

**Files:**
- Modify: `code/index.html` (only if bugs found during testing)

- [ ] **Step 1: Start the preview server**

Use Claude Preview with the `playbook-preview` launch config, or:
```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026/code && python3 -m http.server 3000
```

- [ ] **Step 2: Desktop verification**

Open the app at full desktop width. Verify:
1. All 20 plays render and animate correctly
2. All 5 category tabs work (All, Pass, Rush, Motion, NRZ) plus Rules tab
3. Rules tab: search works, cards expand/collapse, categories render
4. QS button toggles Quick Sheet mode
5. Reads mode: R button and D key toggle, badges/glow/strip work for all plays
6. Transport controls: play/pause, reset, step forward/back, scrub, speed
7. Player tap: select/deselect, tooltip appears with correct info (including read key when reads mode on)
8. Strategy bar shows correct Open/Closed info and toggle warnings
9. Play-info overlay shows contextual rules
10. Keyboard shortcuts: Space, Arrow keys, R, D
11. No console errors

- [ ] **Step 3: iPad portrait verification**

Using preview_resize or browser devtools, set viewport to 768x1024 (iPad portrait). Verify:
1. Layout switches to stacked (drawer on top, field below)
2. Drawer height is manageable, field has enough room
3. Transport buttons are large enough to tap (40px+)
4. Progress handle is large enough to grab (24px+)
5. Tab text is readable (10px+)
6. Reads strip is visible between field and strategy bar
7. All plays animate correctly

- [ ] **Step 4: iPhone verification**

Set viewport to 393x852 (iPhone 14 Pro). Verify:
1. Safe area insets are applied (no content hidden behind notch/home indicator)
2. Transport bar is fully visible above the home indicator area
3. Play cards are tappable
4. Player circles on canvas are tappable
5. Reads badges are visible (may be small but present)
6. Rules tab is scrollable and searchable
7. Speed buttons are tappable
8. Progress bar is scrubbable

- [ ] **Step 5: Regression check — all 20 plays**

Cycle through all 20 plays with reads mode ON:
1. Each play shows correct read badges (check count matches expected: 9 single, 8 double, 3 triple)
2. Animation timing feels right — read glow appears at correct moments
3. Read strip segments align with when receivers reach their spots
4. No overlapping badges or rendering artifacts
5. Toggling reads off returns to clean default view

- [ ] **Step 6: Fix any issues found**

If any bugs are found during testing, fix them and re-verify.

- [ ] **Step 7: Final commit (if fixes were needed)**

```bash
cd /Users/tk2748/ClaudeWorkspace/CC_FF2026
git add code/index.html
git commit -m "fix: testing fixes from full-device verification

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Key Deliverables |
|------|-------------|-----------------|
| 1 | Bug Fixes | Orbit motion legality, swipe-tap conflict, HIT_R |
| 2 | Mobile Polish | Safe areas, touch targets, font floors, PWA meta |
| 3 | Rules Engine Data | RULES_DB (34 rules), PENALTIES_DB (13 penalties) |
| 4 | QB Reads Data | reads[] arrays on all 20 plays |
| 5 | Rules Advisor UI | Rules tab, contextual rules, toggle warnings |
| 6 | QB Reads UI | Badges, glow, strip, toggle, tooltip integration |
| 7 | Strategy Guide | Orbit fix, Open-only labels, missing rules |
| 8 | Testing | Desktop, iPad, iPhone verification across all plays |
