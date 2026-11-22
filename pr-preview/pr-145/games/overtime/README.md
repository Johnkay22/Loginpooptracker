# PoopProfit: Overtime (current: Build 29)

Live game: https://www.poopprofit.com/overtime (the file `overtime.html` in the repo root, built from this folder). The old address, `beta-test-survival-game.html`, is now a small redirect page; do not build into it.
The old private prototype link (https://poopprofit-overtime-prototype.johnkay.chatgpt.site) is out of date.

## How to build
**This folder (`games/overtime/`) is the source of the game. Never edit `overtime.html` in the repo root directly**: it is generated, and any hand edit is lost on the next build.

1. Edit only files in `games/overtime/dist/` (code, page, styles, art, sounds). Add tests in `games/overtime/tests/` when you change behavior.
2. From `games/overtime/`, run `npm install` (first time only), then `npm run build`. This writes `../../overtime.html`.
3. Run `npm test`. Every suite must pass.
4. Commit **both** the source changes and the rebuilt `overtime.html` in the same pull request.

Requirements: Node 20 or newer, and Python 3 with Pillow (the build re-encodes the PNG sprites to WebP). The build is reproducible: the same source with the same esbuild (pinned in `package.json`) and Pillow versions gives a byte-identical page. Build 15 was produced with Node 22.23, esbuild 0.24.0 and Pillow 12.3.0; a different Pillow or libwebp version can change the inlined sprite bytes without changing how the game plays.

What the build does (`tools/build-single-file.mjs`): bundles and minifies the modules with esbuild, re-encodes the PNG sprites to WebP at the same size, inlines every file in `dist/assets/sfx/`, `dist/assets/icons/`, `dist/assets/menu/`, `dist/assets/cabinet/` and `dist/assets/end/` as data URIs (in the code, the page and the stylesheet), inlines the stylesheet, and adds a noindex tag. Passing a password instead of `--plain` produces the old encrypted, password-gated page using `tools/gate.html` (not used since Build 10).

## Folder layout
- `dist/`: the game source. `app.mjs` (screens, input, sound, drawing), `engine.mjs` (game rules), `stages.mjs`, `progress.mjs`, `scene.mjs`, `navigation.mjs`, `index.html`, `style.css`, and `assets/` (sprites, `sfx/` sounds, `icons/` the 18 custom icons, `menu/` the menu stall art and coin, `cabinet/` the promotion cabinet and its 15 shelf items).
- `tests/`: Node test suites; `npm test` runs all of them (`tools/run-tests.mjs`).
- `tools/`: the build script, the old password gate template, the test runner, and `prepare-sfx.py` (trims and levels new sound picks).
- `art-sources/`: originals kept for reference, not used by the build: the untrimmed sound picks (`sfx-originals/`), Johnny's icon sheet, the menu mockup, and `cabinet/` (the promotion mockup, the empty cabinet without the note lettering, and all 18 item renders at 640 px).

## Premise and mission
Herman intercepts a proposed corporate plan to cut paid bathroom breaks. Each stage now follows one clear loop: survive the swarm for 180 seconds, then defeat one executive boss. A six-second warning announces the boss. At zero the HUD switches to BOSS and shows a persistent named health bar. The boss pursues Herman around furniture and marks a fixed circular attack area for 1.1 seconds before it bursts. Step out to dodge it. Boss fights have no time limit. Zero player health is the only defeat condition; crossing a map edge never causes defeat. Boss defeat clears the stage immediately and unlocks the next playable location.

Office boss: The Floor Manager, 14,000 HP, 85 movement speed, 100-radius marked attack every four seconds after detonation. Lobby boss: The Lobby Director, 18,000 HP, 95 movement speed, 125-radius marked attack every 3.4 seconds. Both attacks deal 22 damage and share the existing 0.65-second player invulnerability with contact damage. Bosses resist bomb lure but take blast damage and evolved gas slow. Ordinary reinforcements slow to one per 1.2 seconds during boss combat, with a 70-enemy spawn cap; no new ring rushes start. Existing enemies remain.

## Controls
Drag to move. Tap the Stink Bomb button with a second finger while moving. Desktop: WASD/arrows, Space/B for bomb, P/Escape to pause. Other weapons attack automatically. Bomb starts unlocked, drops behind Herman, lures normal enemies, interrupts runners and explodes after three seconds. Its initial recharge is 12 seconds. The boss resists the lure. Tab switching pauses play. Sound is on by default and can be toggled in the briefing.

## Builds and evolutions
Five weapons with five ordinary levels and a sixth evolved form. Evolutions require the weapon at level five, at least one rank in the matching passive, and 45 elapsed mission seconds. Eligible evolutions are prioritized among upgrade choices.

| Weapon | Passive | Evolution | Actual effect |
|---|---|---|---|
| Plungerang | Double Espresso | Double Plunge | Six giant, stronger returning projectiles |
| TP Tornado | Expense Account | Wrap Sheet | Twelve rolls in two counter-rotating rings |
| Silent But Deadly | Hot Sauce | Chemical Warfare | Large long-lasting clouds slow and damage |
| Courtesy Flush | Double Espresso | Royal Flush | Two broad, powerful waves |
| Stink Bomb | Hot Sauce | Weapons of Ass Destruction | Larger lure and explosion, followed by a second blast |

Passives also give recharge speed, Petty Cash collection range/XP, and weapon damage. Briefcase upgrade support is retained in the engine, but the current two-stage boss missions do not spawn mid-run executives or briefcases. Every 60 KOs produces an token magnet pickup. Kill chains break on taking damage or 2.5 seconds without a kill and keep a personal run record. Neither chains nor cosmetic callouts change damage.

## Persistent progression
Enemies drop Petty Cash: ordinary enemies drop one and guards four. The final boss ends the mission and does not add an uncollected currency drop or a separate cash bonus. Herman must collect them. Each collected token adds one to the run's spendable total and supplies XP; XP bonuses do not multiply currency. A completed attempt, win or loss, deposits only the collected total. Uncollected drops, KOs and victory do not independently award currency. Tokens replace the blue XP gems visually and the credit counter in the HUD/shop.

Spend Petty Cash in the Break Room on health, damage or collection range. Each permanent perk has three ranks, costing 250, 550 and 850 tokens. Build 03 saved credits convert once at 10 tokens per credit, matching the shop price conversion. Existing purchased ranks and unlocks are preserved. Starting TP Tornado unlocks after 200 lifetime KOs. Clearing the office unlocks the Corporate Lobby, gas starting loadout and optional Overtime difficulty. Each stage starts a fresh build; purchased permanent perks carry over. The lobby uses a distinct marble reception/security layout with six solid islands and connected walkable corridors. Clearing the lobby completes the two-stage prototype; no executive-floor stage is implemented yet. A stage selector supports replay, and the office victory screen offers Continue to Corporate Lobby. Stink Bomb is present with every loadout.

Version 3 preserves Build 04/05 balances one-to-one and grants existing winners lobby access. Petty Cash is separate from the real PoopProfit Turd Token wallet.

Progress is browser-local localStorage, not account-synced. No real money, payments, bathroom tracking or earnings records are affected. Restarting an unfinished run gives no rewards. A settled run cannot award credits twice.

## Graphics
New transparent Herman battle asset preserving the official face, suit and short legs; full body replaces the portrait medallion. Four generated corporate enemy sprites replace the original primitive figures. Canvas-drawn office includes desks, chairs, monitors, boardroom, coffee station, carpeted atrium, perimeter walkway, window light and paper clutter. Four central desks have collision; perimeter decoration is scenery. Herman uses a four-frame walk atlas with alternating feet and arms. Frames advance with actual travel distance and mirror for left/right motion; idle uses the original battle sprite. This is a front-view walk cycle, not a separate eight-direction animation set. Damage numbers, evolving weapon effects, gas canister bombs, screen shake and audio cues add feedback. No intro cinematic yet.

## Validation
- `node tests/engine.test.mjs`: lure, timed explosion, executive resistance, upgrades/pause, boundaries, defeat/victory, charge telegraphs, bomb interruption, rush warnings, no escape defeats and idle-play pressure.
- `node tests/progression.test.mjs`: manual bomb and recharge, all five behavioral evolutions, briefcase rewards, purchases, save-data normalization, duplicate reward prevention, furniture collision.
- `node tests/stages.test.mjs`: stage unlocks, legacy save migration, boss warning and one-boss spawning, lobby collision/corridor clearance, damage streak reset, both stage victories and loss headlines.
- `node tests/boss.test.mjs`: pursuing boss, no escape defeats, fixed and dodgeable attack zones, paused attack timers, shared damage cooldown, lure resistance/blast damage, unrestricted boss time, clear-on-defeat and navigation around every solid desk/gate.
- `node tests/health.test.mjs` and `node tests/recovery-rewards.test.mjs`: earned health kits, supply stations, coffee and the post-promotion countdown.
- `node tests/nov7-sounds.test.mjs`: per-weapon hit sounds, heavy boss hits, knockout impacts, quiet bomb hits, throw, gas puff, runner charge, boss slam, first aid, coffee and a single bomb drop sound.
- `node tests/nov7-assets.test.mjs`: all 18 icons, every sound file and event, the menu markup and art, and that the build packs every asset in.
- `npm test` runs every suite above.
- Syntax checks on modules.
- Seeded evasive-player simulations check mission completion, evolution access and bomb damage. Simulations assess feasibility, not whether humans find it fun.
- Browser QA checked new art rendering, movement, bomb deployment/cooldown and Break Room locked/affordability states. Actual simultaneous two-finger input and performance on the user's S25 Ultra still require device testing.

## Art production
Built-in image-generation tool used for both assets; no video generated. Files are checked into the Site repository:
- `dist/assets/herman-battle.png`
- `dist/assets/corporate-sprites.png`

Herman prompt: game-ready transparent single full-body character based closely on official attached reference; same brown swirl, large brown eyes, smile, navy suit, white shirt, gold patterned tie, stubby legs and brown shoes. Replace cash with red plunger, front three-quarter slight overhead view, polished stylized 3D shading, clean silhouette, all body/prop visible, no text or background.

Enemy prompt: four isolated full-body corporate enemies in equal horizontal slots, same slight overhead three-quarter style; navy manager with clipboard, red-shirt runner, bulky blue HR guard with shield, gold-suit bald executive with briefcase. Transparent alpha, distinct silhouettes, feet visible. Follow-up edit removed background/glow and added spacing so the HR guard fits its own slot. The atlas is rendered using equal quarters while preserving aspect ratio.

## Running locally
Buildless HTML and ES modules: serve `dist/` over HTTP (for example `python3 -m http.server -d dist`) and open it in a browser. Sounds load with `fetch`, so opening `index.html` straight from disk won't play them. The old `.openai/hosting.json` prototype hosting is no longer used.

## Build 04 asset status
The attached turdtoken2026.png was unavailable as a workspace file. The pickup currently uses a temporary canvas-drawn gold poop coin. The supplied exact artwork has NOT been integrated; re-upload is needed. Token pickups, XP, HUD, shop, receipt and balance migration are implemented.

## Build 05: promotion pacing and movement
After any upgrade selection, at least seven seconds of active gameplay pass before another promotion or briefcase upgrade opens. Paused time does not advance this interval. All excess XP and collected briefcase rewards remain banked. The HUD indicates when an upgrade is banked.

Bathroom Dash is a promotion passive with three ranks: +10%, +20%, +30% movement speed. Rank one is guaranteed among the first promotion choices. A shoe icon in the loadout shows the active bonus.

`dist/assets/herman-walk.png` is a transparent 2×2 atlas made with the built-in image-generation tool using the current battle sprite as reference. Prompt requested four sequential walking poses with alternating stubby legs, natural arm/plunger swings, consistent navy suit/gold tie/brown swirl face, equal square cells, fixed front three-quarter camera, transparency, and no labels.

Regression checks cover stacked XP, paused time, multiple queued briefcases, actual movement speed at all ranks, and animation distance at boundaries. Browser QA verified selecting Bathroom Dash and moving with the new sprite.

## Build 06 history (superseded mission rules)
Browser QA used an isolated in-memory completed-office fixture to check victory-to-lobby navigation, fresh lobby gameplay, stage HUD, artwork, upgrades and opaque overlays. QA-only files were removed before packaging. Five seeded evasive simulations per stage produced 3/5 office wins and 4/5 lobby wins; other runs lost to executive escape. This proves feasibility, not human difficulty or relative stage difficulty. No physical phone input or performance measurement was performed.

The misleading shared currency labels and universal defeat headline are corrected. The arbitrary simulated-wage receipt has been removed pending a real pay-rate integration. Game asset compression is still outstanding; existing PNG graphics are retained. Stage one retains its original map size.

## Build 07: clear survival-to-boss progression
Replaces the three escaping executive teams with one final pursuing boss per stage. All briefing, pause, HUD, mini-map and result messages now describe survival and boss defeat. Red exit markings and exit loss logic are removed. Currency, permanent perks, stage unlocks and prior saves are preserved.

All four Node test suites pass. Browser QA used an isolated test fixture to check the actual boss health HUD, targeted attack circle and boss-defeat-to-stage-clear screen. Five seeded evasive-player runs per stage completed the full survival and boss loop. Automated success demonstrates feasibility, not human balance; mobile two-finger testing is still needed. All temporary QA controls are removed from release files. Boss routing uses a small visibility graph around inflated furniture corners, recalculated only for the single boss every 0.45 seconds.


## Build 08: locations, image branding and promotion recovery
The office now uses woven blue carpet, cream paths, walnut cubicle desks, a detailed break room and boardroom, window light and framed Herman posters. Its four solid desks move inward by 100 units to remain visible on a phone while preserving the three clear crossing lanes. Starting health pickups sit outside the desks. The lobby uses bright ivory marble with veins, brass inlays, a dark circular brand medallion, reception counters, security gates, elevators, lounge seating and larger plants. Lobby collision positions are unchanged. Maps are still 1800 by 1800. Both cached environments draw actual imagery from the supplied logo and official Herman battle asset. Logo rendering uses the wordmark portion, excluding the old earnings tagline.

Every promotion or briefcase choice enters a 1.8-second recovery countdown: 3, 2, 1 at 0.6 seconds each. The arena remains visible. Player and enemy movement, stage time, boss attacks, damage, weapon cooldowns, bomb fuses, pickups and temporary boosts freeze. Existing movement input is cleared; the player can position a fresh joystick drag during the countdown. Leaving the tab pauses the countdown too. The seven-second gap between promotions still counts only active gameplay.

Six one-use breakable stations per stage provide two coffee pickups, two first-aid pickups and two cash caches. They are low, passable props and do not add collision. Any weapon can break them (45 HP); Plungerang targets nearby enemies first, then a station within 260 units. Stations never inflate KO/chain counts. First aid restores 16 health; a cache drops six collectible Petty Cash with ordinary XP behavior. Coffee grants eight active seconds of +25% movement speed and 35% shorter automatic-weapon recharge intervals, stacks with Bathroom Dash, and refreshes rather than stacks duration. It does not accelerate manual bomb cooldown. The HUD shows remaining boost time. No station respawns within a run.

Stink bombs swell before detonation, draw inward-moving lure sparks, display the lured crowd count and produce a large local KO callout when they score kills. Blast damage, lure rules and cooldown are unchanged.

Validation: all five Node suites pass, including `node tests/recovery-rewards.test.mjs` for a fully frozen countdown, pause/resume, one-time rewards, all five weapon-to-station interactions, boost expiry and safe station placement. Browser QA at a 390-pixel game width checked both locations, logo rendering, actual promotion recovery and coffee HUD feedback using isolated in-memory fixtures. Temporary fixtures are removed before release. Physical S25 input/performance and subjective balance remain unverified.


## Build 09: quieter recovery, red health kits and Herman branding
Promotion recovery lasts exactly two active seconds. A green disc sweeps clockwise starting at twelve o'clock; no visible numbers, countdown copy, or panel. Fill is derived from remaining recovery time every frame. Recovery consumes real elapsed frame time, while combat remains timestep-capped, so slow frames do not stretch the countdown. Tab/pause freezes and resumes it accurately. All existing combat freeze rules still apply. Tests verify the game remains frozen after 1.95 seconds and resumes at 2.0 seconds.

All dropped health pickups use a red rectangular first-aid box with a white circle and a red plus centered inside. Breakable first-aid stations use the same design at larger size; healing amounts and pickup ranges are unchanged. The regular player health bar stays as before.

The supplied cash-holding Herman portrait is now the image used for world signage, framed posters, the office mat, lobby medallion, reception badges, supply stamps and the briefing brand badge. Text wordmark images have been removed from these surfaces. Artwork is contained without stretching, and scenery is still cached. The playable battle and walking sprites are unchanged. Source portrait: `dist/assets/herman-brand.jpg`.


## Build 10: smoother first minute, phone polish (made with Claude)
- iPhone fix: the game re-measures the screen on any size change (ResizeObserver, visual viewport, orientation, back/forward cache) and has a 100vh fallback. Previously it measured once while the iOS keyboard was open and drew squashed and blurry.
- Gentler opening: first Corporate Rush at 45 seconds (was 18). Spawn interval is doubled at second 0 and eases to the normal curve by second 30. Everything after 30 seconds is unchanged.
- Sound starts OFF ("STALL-SAFE") and remembers the player's choice (`pp-overtime-sound`). Toggle on the briefing and pause screens.
- Streak callouts and toasts are positioned from the real HUD height, so they never hide under it.
- Slimmer HUD (about 100px instead of about 150px), removed the "THIS RUN · PICK UP TO KEEP" line, and raised the tiny 6 to 9px labels to 8 to 11px.
- Title screen: start button sits above the fold on small phones (duplicate brand badge removed, story memo moved below the button). Internal "BUILD" label removed.
- "UPGRADE BANKED" replaced with "PROMOTION IN Ns". Evolution copy rewritten in plain English.
- Herman floor art at the start point faded, and a "YOU" ring and label show for the first 5 seconds.
- End screen "Track your real Poop Profit" button and a briefing link back to poopprofit.com (UTM tagged: utm_source=overtime).
- Display text uses "Poop Profit" (two words) per brand rules.
- Test update: the rush test now uses the 45-second timing.


## Build 11: ElevenLabs sound effects (made with Claude)
- 12 sound effects generated with ElevenLabs Sound Effects v2 and picked by Johnny, plus 4 Herman voice clips ("ah!") that rotate on every hit. Files live in `dist/assets/sfx/` (mono 64 kbps mp3, trimmed, loudness-matched; about 135 KB total) and are inlined into the single-file build.
- Event map: pickup = coin, hurt = Herman hit (rotates hit-1..4), deploy = bomb drop, boom = fart blast, flush = flush, level = cha-ching, upgrade = stamp, evolve = power-up, alert = siren, exec = boss, supply = box pop (first 1 s of the take), stage clear = victory, defeat = sad trombone.
- Frequent sounds are rate-limited and quieter (coin max one per 0.06 s at 28% volume, slight pitch variation). Siren capped to one per second.
- Sound defaults to ON (plain "SOUND ON / SOUND OFF" toggle; the choice is remembered). Sounds decode on the first tap (Clock In or the toggle). Missing sounds fall back to the old synth beeps.
- Enemy knockouts are intentionally silent (too many happen at once).


## Build 12: earned health (made with Claude)
- Removed all free health: the 4 kits at the start of each stage, the 2 First Aid supply boxes, and the 0.8% random kit drop from enemies. Coffee and cash boxes stay.
- Health now comes from surviving a Corporate Rush: 6 seconds after the crowd arrives, 1 first aid kit (+16 health) drops 220 units from Herman. The last rush before the boss (from 170 s) drops 2. That is up to 8 kits per stage.
- Kits are ignored unless Herman is missing at least 8 health (not pulled in, not used), and vanish after 20 seconds (blinking for the last 5).
- Second Wind (+35) remains as the promotion fallback.
- New test suite: tests/health.test.mjs.


## How to build the site file (before Build 15)
Superseded by **How to build** at the top. Until Build 15 this source lived outside the repo and was built with `node tools/build-single-file.mjs dist path/to/beta-test-survival-game.html --plain`.


## Build 13: drawn weapon icons
- Plungerang and TP Tornado icons (promotion menu, in-run weapon badges, Break Room starting weapons) are now drawn on a canvas in the game's own style instead of the 🪠 and 🧻 emoji, which some phones and Windows 10 can't display. The 🧲 magnet (Expense Account, Deep Pockets, and the cash-magnet pickup on the map) is drawn the same way. Double Plunge (the evolved Plungerang) gets its own drawn icon of two crossed plungers, on its promotion card and its in-run badge. These were the only emoji newer than 2015; all other icons stay emoji.


## Build 14: custom icons and the full sound pass (made with Claude, Nov 7; PRs #121, #122, #124)
These changes first went straight into the built page; Build 15 rewrote them here as readable source.
- **Icons (#121):** Johnny's 18 custom icons (`dist/assets/icons/`, 96 px WebP, transparent) replace the emoji and drawn icons on promotion cards, the Break Room, the starting-weapon list, the HUD weapon badges, the Bathroom Dash badge and the Stink Bomb button. Every weapon now has an evolved icon (`<weapon>2`), and Deep Pockets and Expense Account no longer share the magnet. The drawn magnet stays for the cash-magnet pickup on the map. See `ICON_FILES` and `iconFor()` in `app.mjs`.
- **Hit sounds (#122):** `hit()` in `engine.mjs` now takes the weapon that landed the blow, and `hitSound()` raises `hit-plunger`, `hit-tp`, `hit-gas` or `hit-flush`; executives and bosses get `hit-boss`. The final blow raises `ko` instead. Stink Bomb blows stay quiet (the blast covers them).
- **New moments (#122):** `throw` (Plungerang thrown), `puff` (gas cloud dropped), `charge` (runner winds up), `slam` (boss slam lands), `heal` (first aid; two takes of Herman's relieved "ahh" picked at random), `coffee` (replaces the stamp on coffee pickups), `combo` (every 25 KOs, now audible) and `heartbeat` (about once a second under 25% health).
- **Knockout impacts (#124):** the voice "oof" was replaced by 5 voice-free punch impacts (`ko-1` to `ko-5`: two ElevenLabs takes and three of Johnny's), leveled to the same loudness and picked at random.
- **Mixing:** frequent sounds are quieter, rate-limited and pitch-varied (`SFX_MIX` in `app.mjs`); new sounds stay silent until loaded instead of playing the fallback beep (`SILENT_UNTIL_LOADED`). Sounds with several takes pick one at random; Herman's hurt clips still rotate in order.
- **Fix:** the Stink Bomb button no longer plays the drop sound itself, so each bomb plays it once (the engine's `deploy` event covers it).
- Supersedes the Build 11 note that knockouts are silent.

## Build 15: one-screen menu, and the source moves into the repo (made with Claude; PR #125 and this PR)
- **Menu (#125):** rebuilt from Johnny's mockup: Petty Cash coin pill, OVERTIME logo, Herman in the bathroom stall (`dist/assets/menu/stall.webp`), a stage card with arrows (locked stages show how to unlock and disable CLOCK IN), CLOCK IN, Break Room and How to Play, and a footer with a speaker icon and the Poop Profit link. The mission memo, tips and next unlock moved into the How to Play sheet; keyboard controls only show on computers. The gear icon from the mockup was left out (there is no settings screen). See `renderStageCard()` in `app.mjs`.
- **Source in the repo:** this folder is now the only source of truth (it previously lived outside the repo). Added `package.json` (`npm run build`, `npm test`), the test runner, two new test suites, `tools/prepare-sfx.py` and the `art-sources/` originals. The build script now also inlines `assets/icons/` and `assets/menu/`, including image paths in `style.css`; Build 13 still rebuilds byte for byte with it.
- **Rebuild check:** the page built from this source matches the live Build 15 page (PR #125) in its markup, its 59 embedded files and how every screen and sound behaves. The only differences are the minifier's short variable names, readable event names (`hit-boss` was `hboss`, `heartbeat` was `heart`) and equivalent code forms. Rebuilding replaced the hand-patched page once; from now on every build comes from here.

## Build 16: the promotion screen is a supply cabinet (made with Claude, Nov 13)
- **Look:** rebuilt from Johnny's mockup and art. The screen is his lit supply cabinet (`dist/assets/cabinet/cabinet.webp`); each choice sits on a shelf as one of his item renders (`CABINET_ART` in `app.mjs`, 240 px WebP) with a tag, the name, a short description and a CHOOSE button. Title is PROMOTION EARNED with "More responsibility. Same pay." (SEVERANCE PACKAGE for a briefcase). The cabinet label shows the level. The sticky note ("TAKE ONE. HR IS COUNTING.") is lettered into the cabinet image; the unlettered original is in `art-sources/cabinet/`.
- **Whole shelf is the button.** CHOOSE is only a visual. Taps in the first 350 ms after the cabinet opens are ignored (`UPGRADE_TAP_GUARD_MS`), so a thumb that is already steering cannot pick by accident.
- **Less reading:** passives show one big number plus a short line (`PASSIVE_CARD`); weapons show one gold line naming the perk that evolves them; the "how evolving works" line sits in the cabinet's bottom panel only through level 4. An evolution lights its shelf gold and always takes the top shelf (the engine already lists it first).
- **Sizing:** everything is a fraction of the stage width (`--u` in `style.css`), so the art and the text scale together and all three shelves fit without scrolling. Screens under 600 px tall keep the text size and let the note and floor run off the bottom.
- **Not changed:** the 18 flat icons still serve the HUD, Break Room and Stink Bomb button. Paid Sick Leave, Hazard Pay and Deep Pockets renders are stored in `art-sources/cabinet/` for a later Break Room pass.
- New suite `tests/cabinet.test.mjs`; the build script also inlines `dist/assets/cabinet/`.

## Build 17: promotions a little less often (made with Claude, Nov 13)
- **Why:** a player who chases coins was hitting the 7-second minimum gap and seeing the promotion screen about 7 times a minute for the first two minutes (about 17 promotions before the boss).
- **Change:** the coins needed for the next promotion come from `promotionCost(level)` in `engine.mjs`: `6 + 4.5 x level + 0.35 x level squared`. The first promotion costs 12 (was 5), so it arrives about 14 seconds in for a player who chases coins instead of about 7. The 2nd to 8th now cost 16, 22, 29, 37, 45, 54, 64 (they were 11, 14, 18, 22, 26, 30, 35).
- **Result in simulated 3-minute runs (coin-chasing bot, unlimited health):** about 13 promotions before the boss instead of about 17; roughly 6, 5 and 2 per minute instead of 7, 7 and 3. A bot that plays for an evolution got one in 12 of 16 runs (15 of 16 before), about 20 seconds later.
- **Tried and rejected:** a much steeper curve (`10 + 8 x level + level squared`) cut promotions to about 10 but left an evolution in only 2 of 16 runs, because an evolution takes about 10 picks.
- The 7-second minimum gap is unchanged. Nothing else about the rules changed.
- New suite `tests/xp-curve.test.mjs` pins the cost table, the promotion rate and the evolution rate.

## Build 18: new end screens (made with Claude, Nov 13)
- **Look:** rebuilt from Johnny's Stage Clear mockup (`art-sources/end/stage-clear-mockup.webp`). One layout serves a clear and a loss: art at the top, a gold eyebrow, a big slanted headline, one line of text, four stat tiles, one gold main button, two outline buttons and the PoopProfit.com logo, which is the tracker link.
- **Stage clear:** victory art cropped from the mockup (`dist/assets/end/clear.webp`), "STAGE CLEAR!", and CONTINUE / CORPORATE LOBBY after Stage 1. After Stage 2 the main button is PLAY AGAIN.
- **Loss:** "CLOCKED OUT", with either "The boss shows up at 03:00." or how much health the boss had left. Main button is TRY AGAIN. Art is Johnny's slumped Herman, cropped from his Clocked Out mockup (`dist/assets/end/clocked-out.webp`; full mockup in `art-sources/end/`).
- **Stats:** Petty Cash collected, best KO chain, Stink Bomb KOs, time survived. The boss result, total KOs and final level rows are gone, per the mockup.
- **Fit:** the art takes whatever height is left, so the screen fits one phone screen without scrolling; very short screens scroll.
- No rule changes. New suite `tests/end-screen.test.mjs`; the build script also inlines `dist/assets/end/`.

## Build 19: survival mode, "Survival of the Shittest" (made with Claude, Nov 14)
A third mode on the menu card (the ∞ entry). The run never ends and time survived is the score. Both stages work exactly as before; nothing in stage mode reads the survival settings.

- **Where the numbers live:** every tuning value is in the `SURVIVAL` object at the top of `dist/engine.mjs`, each with a one-line comment, plus `survivalPromotionCost`. The mode itself is `SURVIVAL_STAGE` in `dist/stages.mjs` (id 10, Office Floor map). `MODES` is what the menu lists.
- **Tiers:** a tier is 3 minutes. Each tier adds enemy speed (capped) and damage, a faster spawn pace, a higher enemy cap and more runners and guards. Enemy health also climbs smoothly: from 2:30 on it multiplies by 2.3 every 3 minutes, on top of the old steady growth.
- **Tighter opening:** spawns start at about twice stage mode's pace, runners join at 0:06, the first Corporate Rush is at 0:28.
- **Bosses:** the Floor Manager arrives at every tier change (3:00, 6:00, ...), tougher each time. The swarm does not let up while a boss is alive, so stalling a boss buys nothing, and an unbeaten boss is still there when the next one arrives. A beaten boss drops a briefcase, 40 Petty Cash and 2 first aid kits.
- **Briefcase executives:** a gold executive walks in at 1:00 and 2:00 of every tier. Knock it out for a briefcase.
- **Promotions the Vampire Survivors way:** a run holds at most 4 weapons (Stink Bomb counts) and 3 perks. Promotions never offer an evolution. A briefcase evolves a ready weapon (level 5 plus its partner perk); with none ready it is a free upgrade. Once everything is maxed a promotion offers a Petty Cash bonus or Second Wind.
- **First aid:** one kit per survived rush, two from tier 3; kits heal a little more each tier.
- **End screen:** time survived is the big number, with "new personal best" or the best to beat, then Petty Cash, KOs and bosses beaten. The line under the headline says what ended the run. Personal best is saved as `bestSurvival` (saved-data version 4; older saves upgrade without losing anything).
- **Fair scores later:** the rules file stays deterministic (the same random function and inputs give the same run), and Hard mode is ignored in survival. Break Room perks and the starting weapon still apply; that needs a decision before a leaderboard.
- **Menu:** the card remembers the last mode picked.
- **Tuning tool:** `node tools/survival-sim.mjs` plays seeded bot runs and prints a report (about a minute). At this build: standing still is hit at about 0:12 and out by 0:24; a dodging bot that picks for evolutions passes 3:00 in 8 of 12 runs and lasts about 11 to 12 minutes when it does; the same bot with random picks rarely passes the first boss. An unlimited-health bot sees 4 to 5 promotions a minute early and about 2 later, its first evolution between 2:15 and 3:30, and all four by about 7:00. Bots are a rough guide; playtests decide.
- **Known soft spot:** between about minute 5 and 9 a strong build is barely threatened outside boss fights, then the health climb catches up fast around minute 10 to 12.
- New suite `tests/survival.test.mjs`. `tests/cabinet.test.mjs` now expects the Petty Cash bonus shelf art (`dist/assets/cabinet/cash.webp`, from the Deep Pockets render).

## Build 20: swipe carousel on the menu (made with Claude, Nov 14)
- **Look:** from Johnny's mockup. The single Herman image and the small mode bar are replaced by a carousel of three art cards under "CHOOSE YOUR SHIFT": Office Floor, Corporate Lobby, Survival of the Shittest. The middle card is the mode CLOCK IN starts; the cards on either side peek in, smaller and dimmed.
- **Art:** Johnny's three cards (`dist/assets/menu/card-*.webp`, 720 px wide; full size in `art-sources/menu-cards/`). The mode name, tagline, gold frame and rounded corners are part of each image. To change a card, swap its file; to add a mode, add it to `MODES` and `CARD_ART` in `app.mjs`.
- **Moving it:** swipe, tap a side card, tap an arrow, or tap a dot. Cards snap to the middle one at a time. It is a native scrolling row with scroll snap, so it follows the finger without any drag code.
- **Under the cards:** dots, then one line for the middle card (what the stage asks, the unlock rule, or the survival best time).
- **Locked mode:** its card is greyed with a lock and the unlock rule, and CLOCK IN is disabled while it is in the middle.
- **Kept from the old menu:** Petty Cash coin, sound button (now top left), CLOCK IN in gold, Break Room, How to Play, PoopProfit.com link. On screens under 700 px tall the link row and the "A POOP PROFIT ORIGINAL" line give their space to the cards.
- **Removed:** `dist/assets/menu/stall.webp` (the old menu image; the end screens have their own art).
- New suite `tests/menu-carousel.test.mjs`. The built page is about 2.7 MB (was 2.2 MB).

## Build 21: new Break Room (made with Claude, Nov 15)
- **Look:** rebuilt from Johnny's mockup (`art-sources/breakroom/break-room-mockup.webp`). Header with Herman and his coffee, a Petty Cash pill, "Permanent perks" rows (art, name, what it does, rank pips, a buy button with the price), "Starting weapon" tiles, a switch for Overtime difficulty, and a BACK TO MENU button that stays docked at the bottom.
- **Nothing about the rules changed.** Perk names, effects and prices still come from `PERKS`, `cost()` and `buy()` in `progress.mjs`; weapon unlocks are still 200 KOs for TP Tornado and one stage clear for Silent But Deadly.
- **Art:** perks use Johnny's renders (`dist/assets/breakroom/health.webp`, `damage.webp`, and the Deep Pockets render already used by the cabinet). Weapon tiles reuse the cabinet renders. **The header Herman is cropped out of the mockup** (`herman.webp`), faded on the left where the mockup's title was; a clean break-room image without text would be sharper and could run full width.
- **Colour:** this screen uses cyan for things you press (buy, selected, back), as in the mockup. The menu, promotion and end screens use gold. Pick one before launch.
- **Wording:** "win a mission" became "clear a stage", since survival has no win. Overtime difficulty says it applies to stages only.
- New suite `tests/break-room.test.mjs`; the build script also inlines `dist/assets/breakroom/`.

## Build 22: Break Room buttons are gold (made with Claude, Nov 15)
- Johnny picked gold over the mockup's cyan, so the Break Room's buy buttons, selected weapon, difficulty switch and BACK TO MENU now match the menu, promotion and end screens. Colours only; nothing else changed.

## Build 32: no more standing still (made with Claude, Nov 22)
Johnny's playtest: once his weapons were gold he could stand still next to a health pack forever. Two causes: evolved gas (Chemical Warfare) dropped a new cloud every half second on the same spot, so a still Herman sat in about 15 stacked clouds; and nothing could get through the evolved weapons' push, so nothing ever reached him. Johnny chose fixing the cause over gimmicks (no warning circles, no unkillable timer enemy, which would flatten the leaderboard).
- **Gas clouds refresh instead of stacking:** a new cloud dropped where one of the same size already is just restarts that cloud. A moving Herman still leaves a trail; a still one sits in one cloud, not 15.
- **Middle Managers (Survival, from 4:00):** big guards with 8x a guard's health, 1.5x damage and speed 120 (Herman walks 180). TP rings and flushes barely move them and item effects treat them like executives (Air Horn half push, no stun; Out of Order 1.5s; no Wet Floor slip; the Bidet does not one-shot them). One every 14s at first, 2s sooner each tier (never under 4s), with 6 + 3 per tier allowed at once, no ceiling, so every run ends eventually. The first one gets a banner. Drawn as a bigger guard with an orange ring, "MIDDLE MGR" tag and health bar. All numbers are `manager*` in `SURVIVAL`.
- **Wrap Sheet:** the evolved rings hit each enemy every 0.55s (was 0.35s) and push 6 (was 10).
- **Extra Hot Sauce tapers:** each adds 12% less than the one before (`boostTaper`), topping out near +83% instead of growing forever.
- **Bots (fully built, standing still, no healing):** from 4:00, median 17s alive (was: until the boss); from 7:00, median 6s.
- Pause tip about Middle Managers. `BUILD` is 32 (rules changed). New suite `tests/no-camping.test.mjs`.

## Build 31: mystery boxes, Herman's pocket, a calmer squeak and groan (made with Claude, Nov 21)
Johnny's call: the cash boxes were dead weight (6 promotion coins), so every supply box is now a mystery box. The stronger the item, the rarer. Numbers live in `dist/mystery.mjs`.
- **Odds (out of 100):** Cash Sweep 20, Coffee 18, Wet Floor 18, Out of Order 12, Free Stink Bomb 11, Air Horn 10, Executive Bidet 6, Company Health Plan 4, Company Credit Card 1.
- **Boxes:** the same 4 spots, in Survival and both levels. A broken box comes back 90 seconds later (and still restocks when a boss arrives). Drawn in code from above: a taped cardboard box with a gold "?" and a MYSTERY tag.
- **Use now (picked up off the floor):** Cash Sweep (every coin flies to you for 5s), Coffee (8s of speed and rapid fire), Out of Order (every enemy freezes 3s, executives and bosses 1.5s; frozen enemies cannot hurt you), Executive Bidet (5s of spray the way Herman faces, about 3 enemy bodies long: heavy damage and push-back). Wet Floor goes straight down where the box was: a yellow puddle for 10s; everyone in it slows, and 1 in 6 regular enemies slip and go down (a KO). Executives and bosses only slow.
- **Herman's pocket (2 slots, above the Stink Bomb; keys 1 and 2):** Free Stink Bomb (one extra bomb; the recharging one is untouched), Air Horn (blasts everyone in a large radius far back and stuns them; executives and bosses get half the push), Company Health Plan (full heal; refuses at full health and stays in the pocket), Company Credit Card (pauses on a menu of every common and uncommon item plus one rare, Executive Bidet and Health Plan taking turns; never another card). With the pocket full, a pocket item is swapped for a random use-now item ("POCKET FULL · ... INSTEAD").
- **Art:** Johnny's six icons (`art-sources/mystery/`, game copies in `dist/assets/icons/`). Cash Sweep, Coffee and the Stink Bomb reuse existing icons (the pocket bomb gets a +1 badge). Puddle, spray and the frozen look are drawn in code. Air Horn, Out of Order, Wet Floor and Bidet sounds are made in code (no new files).
- **Sounds:** Johnny cut the Plungerang hit (the squeak) and the executive and boss grunt (the groan) entirely; knockouts still sound. `hitSound()` in `engine.mjs` no longer raises them (the clips stay in `SFX_FILES` in case they come back).
- **Air Horn (after Johnny's playtest):** everyone within 520 (was 300) flies 450 back (was up to 170) over 0.35s instead of jumping, and regular enemies are stunned 1.2s. Executives and bosses get half the push and no stun.
- **Desks:** the eight desks painted along the top and bottom walls of the office (Office Floor and Survival) had no collision, so Herman and enemies walked over them. They now block like the four in the middle (`OFFICE_FURNITURE` in `scene.mjs`). The boardroom table, kitchenette and other decor are still walk-through.
- **Executive Bidet (Johnny's call):** regular enemies in the spray die instantly. Executives, bosses and boxes still take heavy damage instead, so it cannot one-shot a boss.
- **Herman explains each item once:** the first time a player gets an item on a device (`pp-overtime-items-seen`), the run pauses, the screen dims except a spotlight on Herman, and a speech bubble above him shows the item's art, name and Johnny's line (`INTRO` in `mystery.mjs`). Pocket items light up the pocket with a "SAVED IN YOUR POCKET" pointer. GOT IT resumes with the usual countdown. The engine raises a `got` event for every way of getting an item (box, pickup, pocket-full swap, Credit Card), and pauses with `intro()` / `endIntro()`.
- **How to Play:** a seventh card, Mystery Boxes (step 5), with a moving picture of a ? box popping items and the pocket.
- Pause tips updated. `BUILD` is 31. New suite `tests/mystery-box.test.mjs`.

## Build 30: gold on the clock, and no more surprise logouts (made with Claude, Nov 20)
Johnny's playtest: once weapons turn gold the run gets easy, and gold could come as early as 1:18. Separately, his best run did not post: his saved login had expired, the game played him as a guest, and the end screen said "SIGN IN TO POST YOUR TIME", which sent him to the sign-in page and lost the run.
- **Gold unlocks on a clock in Survival** (`SURVIVAL.goldAt`): the 1st gold weapon no earlier than 3:00, the 2nd no earlier than 4:00, the 3rd and later no earlier than 5:00. Before that, briefcases still give level-ups and perks.
- **Early briefcases are saved, not wasted:** grab a briefcase while a weapon is ready but gold is locked and it is saved ("GOLD BRIEFCASE SAVED · OPENS AT 3:00"). It opens by itself the moment gold unlocks. If nothing is ready to turn gold any more, a saved briefcase opens as a normal one. If gold unlocks with a weapon ready and nothing saved, a "GOLD UNLOCKED" banner says the next briefcase turns it gold.
- **Bots:** first gold went from as early as 1:18 (median about 3:30) to never before 3:00; second gold never before 4:00. Damage taken from 2:00 to 3:30 is up about 17% (an immortal circling bot); after 3:30 it is unchanged.
- **Players are told:** a pause tip ("Gold unlocks at 3:00, a 2nd at 4:00...") and the Survival How to Play card. The two levels are unchanged.
- **Login check before Survival:** CLOCK IN on Survival now checks the login is really still good (the site library refreshes it, or finds it was revoked). Logged out, a sheet says "YOU'RE NOT LOGGED IN · This run won't count on the leaderboard" with LOG IN and PLAY ANYWAY. Asked once per visit. Slow or offline never blocks a run. If the player opens the Break Room or How to Play, or switches mode, while the check runs, the start is dropped.
- **Who is playing:** the menu shows "PLAYING AS <name>" or "NOT LOGGED IN · LOG IN TO POST TIMES" under Survival.
- **Honest end screen:** a logged-out run now says "NOT POSTED · LOG IN BEFORE YOUR NEXT RUN" (was "SIGN IN TO POST YOUR TIME", which sounded like it would post the run just played). If the server will not take a run at the start, a toast says so.
- **Back to the game after logging in:** game links go to `auth.html?next=overtime`, and the sign-in page returns there (only that page is allowed; email links still go to the app).
- `BUILD` is 30 (rules changed). New suite `tests/gold-and-login.test.mjs`.

## Build 29: Herman speaks, separate Sound Effects and Music switches (made with Claude, Nov 16)
- **Herman's voice lines:** 13 lines Johnny picked, made with his "Herman B" ElevenLabs voice. Audio only, no speech bubble. Clips are in `dist/assets/voice/`; which line goes with which moment is in `dist/voice.mjs`.
  - Clock in: "Time to do my business." / "Let's get this potty started." (always one, never the same twice running)
  - Promotion: "I'm kind of a big dump around here."
  - Evolution: "Number two just became number one." / "Now THAT'S a movement."
  - KO streak (every 25 in a row): "I'm on a roll! Preferably two-ply!" / "Wipe 'em out!"
  - Stink Bomb gets 5 or more: "Silent? No. Deadly? Oh yes."
  - Health under 25%: "'Tis but a skid mark."
  - Rush survived: "Tight squeeze. I know the feeling." / "Slipped right out. Like a pro."
  - Executive walks in: "Look who it is. A professional brown-noser."
  - Clocked out: "Welp. I'm pooped." (always)
- **How often:** apart from the clock-in and clocked-out lines, at least 45 seconds of run time between lines (`VOICE_GAP`), and each clip at most once per run. A 3-minute run hears about 4 lines.
- **To swap a take or add a line:** each line was generated twice; the other takes are in Johnny's ElevenLabs flow. Replace the mp3 in `dist/assets/voice/` (mono, short), or add a file and list it under a moment in `voice.mjs`.
- **Two switches:** Sound Effects and Music are separate, on the menu (two icons) and on the pause screen. Voice lines follow Sound Effects. Sound Effects keeps its old saved setting (`pp-overtime-sound`); Music has its own (`pp-overtime-music`) and starts out matching it.
- **Music is wired but there are no tracks yet,** so the Music switch stays hidden. To add music: put the mp3s in `dist/assets/music/` and write the file names in `dist/music.mjs`. Slots: `menu`, `levels`, `survival`, `boss` (loops) and `win`, `lose` (play once). A missing loop borrows the nearest one (survival and levels stand in for each other). Loops crossfade; the boss loop fades in while a boss is on the floor; on the pause and promotion screens the music is muffled like it is coming through a bathroom door. A `win`/`lose` track replaces the old fanfare/trombone.
- **Voice and music are not packed into the game page.** The build points them at `games/overtime/dist/assets/...` on the site, so the page stays about 3 MB. Voice clips (about 250 KB in all) are fetched in the background after the page loads.
- **Warnings sound different now:** rush, executive, "boss in 6 seconds" and boss arrival were one shared siren. Each has its own event (`rush`, `exec-in`, `boss-warn`, `boss-arrive`). For now they are the same siren clip at four pitches; proper sounds can replace them in `SFX_FILES`.
- **Runner charge sound:** quieter, at most once every 2.5 seconds (was 0.6), rotating three pitches.
- New suite `tests/audio.test.mjs`. No rule changes; `BUILD` stays 28.

## Build 28: survival feel (made with Claude, Nov 16)
Johnny's playtest: 2:30 to 3:30 was a wall and it was hard to tell when the boss arrives. Rushes were never faster there; four things piled into one minute (spawns doubling, extra enemy health from 2:30, bigger rush rings, and a rush 2 seconds after the boss). This build spreads them out. **The two levels are unchanged** except where noted.
- **Spawn pace:** same as before until 2:00, then it eases down and reaches full pace at 4:30 (was 2:53). About 5 enemies a second when the first boss arrives, was 9.
- **Rushes:** every 22 seconds until 2:00, then every 30. No rush starts within 10 seconds of a boss arriving.
- **Enemy health:** the extra growth starts at 3:30 (was 2:30). From 6:00 it multiplies by 1.9 every 3 minutes (was 2.3), so a strong build can push past the old 9 to 12 minute wall. It still climbs forever, so every run ends.
- **Extra Hot Sauce:** once everything is maxed, promotions offer +10% weapon damage that stacks with no limit (plus the old Petty Cash and Second Wind choices). It uses the Hot Sauce render.
- **Briefcases steer:** with nothing ready to evolve, a briefcase offers the missing partner perk first, then levels for the weapon closest to level 5. No luck. It used to be three random choices.
- **Every perk evolves something:** Bathroom Dash is now Courtesy Flush's partner (was Double Espresso, which still evolves Plungerang). This applies in the two levels too.
- **First aid kits (survival):** heal 25 (was 16, about one hit), up to 40 late on, and wait 45 seconds (was 20). They still blink for the last 5. The rush warning now says "SURVIVE FOR A FIRST AID KIT".
- **Supply boxes restock** every time a boss arrives, so coffee comes back.
- **Boss clarity:** a red "BOSS IN 0:30" countdown in the status row (levels too), and a big centre-screen banner with the boss's name when it arrives. The boss arrow at the screen edge is bigger and red. Briefcases (CASE) and first aid kits (KIT) get edge arrows too; the kit arrow only shows while Herman can use one.
- **Live leaderboard moments:** in survival, a banner when the run beats your own best ("NEW PERSONAL BEST") and each time it passes a time on the public top 10 ("YOU PASSED #3"). The board is read once when the run starts (`dist/rivals.mjs`). Usernames go in as text.
- **Wording:** Expense Account no longer says "XP".
- **`BUILD` in `app.mjs` is now 28** because the rules changed. Times posted from older builds were played on harder rules.
- **Bots (`node tools/survival-sim.mjs`), before to after:** dodging bot that picks for evolutions: past 3:00 in 8/12 to 9/12 runs, median 11:11 to 15:24, best 12:27 to 18:15. Dodging bot with random picks: past 3:00 in 3/12 to 7/12, median 2:44 to 3:41. The opening minute is unchanged (stand still: out at 0:24). Bots dodge better than people, so treat these as direction, not as real times.
- All tuning numbers are in the `SURVIVAL` table at the top of `dist/engine.mjs`.
- New suite `tests/survival-feel.test.mjs`. The engine event for a boss arriving is now `boss-arrive` (was a plain `alert`).

## Build 27: game analytics (made with Claude, Nov 15)
- **What it is:** the game page now reports to the same Google Analytics property as the rest of poopprofit.com, set up the same way (loader at the bottom of `dist/index.html`). Page views are counted, plus five game events.
- **Consent works like the site:** Google Analytics runs cookieless (no cookies, anonymous pings only) until the visitor taps **Got it**. The notice is on the game's menu. It uses the site's consent key (`pp_analytics_consent_v1`), so Got it on the site counts for the game and the other way round.
- **Events** (sent from `app.mjs` through `dist/track.mjs`):
  - `overtime_run_start`: mode (`survival`, `stage_1`, `stage_2`), hard mode on or off
  - `overtime_run_end`: mode, won or lost, a time range (for example `6_9m`), bosses beaten
  - `overtime_howto`: finished or skipped, whether it was the first-run showing, which card they were on
  - `overtime_share`: mode, and whether it was shared, copied, cancelled or failed
  - `overtime_board_open`: whether the player was signed in
- **Nothing exact or personal is sent.** Time goes out as a range, matching the promise on the privacy page. No usernames, emails or scores.
- **Not counted:** runs on a developer's machine (the loader skips localhost) and pull request previews (the workflow swaps the property id out of `.html` files, which is why the id must stay in `index.html` and never move into a `.mjs` file).
- **Know this about the numbers:** visitors who never tap Got it are only sent as cookieless pings, which Google Analytics shows through modelling, if at all. Expect the counts to run low, the same as on the rest of the site.
- **Privacy page:** section 04 now lists the game events, and its last line was corrected. It used to say analytics does not load until the notice is used; the site has loaded it in cookieless mode for everyone since the Consent Mode setup.
- On the two smallest phone sizes the notice covers part of BREAK ROOM / HOW TO PLAY until Got it is tapped.
- No rule changes. `BUILD` in `app.mjs` stays 23.

## Build 26: launch address, share button, restart confirm (made with Claude, Nov 15)
- **New address:** the game now lives at **poopprofit.com/overtime** (`overtime.html` in the repo root; GitHub Pages serves it without the `.html`). The build writes there. `beta-test-survival-game.html` is now a tiny redirect that keeps anything after `?` or `#`, so old links still work. Progress is kept: it is stored per site, not per page.
- **Findable:** the public build is no longer marked "noindex". The page has a real title and description, a canonical address, share-preview tags and a VideoGame description for search engines (all in `dist/index.html`). Only the password-gated build stays noindex.
- **Share preview:** `/images/overtime-share.jpg` (1200x630), made from the three mode cards. The same picture as `/images/overtime-banner.webp` is the banner on the home page (above the FAQ) and at the top of the app's Soon tab. Both link to `/overtime`. The home page footer has a link too.
- **Site files:** `/overtime` is in `sitemap.xml` and `llms.txt`. `robots.txt` blocks `/games/overtime/` so the working copy in this folder is not indexed as a second copy of the game.
- **SHARE on the end screen:** opens the phone's share sheet with one line and the link ("I lasted 07:42 in Survival of the Shittest. Think you can outlast me?"). Where there is no share sheet (most desktop browsers) it copies the line and says so. Words are in `dist/share.mjs`.
- **RESTART MISSION needs two taps:** the first tap turns the button into TAP AGAIN TO RESTART for 3 seconds. A slip can no longer wipe a run.
- **Previews:** a pull request preview is now at `.../pr-preview/pr-<number>/overtime`.
- No rule changes. `BUILD` in `app.mjs` stays 23.

## Build 25: How to Play as swipe cards with moving pictures (made with Claude, Nov 15)
- **What players see:** HOW TO PLAY is now six swipe cards instead of a list of sentences. Each card has a small animated picture made from the game's own art, a title and one line: Move, Get Promoted, Evolve, Stink Bomb, Stay Alive, The Mission. Swipe, tap a dot, or tap NEXT. SKIP is in the corner.
- **Shows once by itself.** The first time a player taps CLOCK IN, the cards open first. The last button (CLOCK IN) and SKIP both start the run. After that it only opens from the HOW TO PLAY button. The "seen" flag is `pp-overtime-howto` in the browser's storage.
- **Cards fit the mode on the menu.** Survival: Evolve shows weapon + partner perk + briefcase, and The Mission shows the clock, a boss every 3 minutes and the leaderboard. Levels: Evolve has no briefcase, and The Mission shows the timer, the boss fight and that level's briefing.
- **Where things live:** the words and picture markup are in `dist/howto.mjs` (names and numbers come from the engine). The drawing and animation are the `.hs` rules at the end of `dist/style.css`; inside a picture, 1em is 1% of its width, so it scales as one piece. Only the card in view animates. With "reduce motion" on, each picture is a still that reads on its own.
- **New art:** `assets/howto/` has Herman's four walk frames, the four enemies and the gold briefcase (Johnny's render, original in `art-sources/howto/`). The build inlines this folder.
- **Briefcases on the floor now use the gold briefcase render** instead of the small brown box, so the game matches the card. Still labelled BONUS.
- **Gone:** the old text sheet (`#howSheet`). The level briefing moved to the last card. The NEXT UNLOCK line shows under the last card.
- No rule changes. `BUILD` in `app.mjs` stays 23.

## Build 24: pause screen with rotating tips (made with Claude, Nov 15)
- **What players see:** the pause screen from Johnny's mockup. The game stays visible behind it, dimmed and blurred. A card with Herman on his coffee break, PAUSED, "ON A BREAK.", a gold BACK TO BUSINESS button, an outlined RESTART MISSION button and a Sound switch. Under the card, WHILE YOU'RE HERE shows three tips, each with an icon.
- **Tips change.** Every 5 seconds one of the three fades out for the next, so each stays up about 15 seconds. Each mode remembers how far it got, so the next pause shows different tips. The first pause of a session shows the three must-knows for that mode (for survival, the exact three in the mockup).
- **Tips fit the run.** Stage mode and survival have their own lists (stage mode never mentions briefcases, slots or the leaderboard). Each weapon in hand that can still evolve gets a line naming its real partner perk. The keyboard tip only shows on a computer.
- **Tips cannot go stale:** `dist/tips.mjs` builds them from the engine's own numbers and names (minutes per boss, slots, kits, weapon and perk names). `tests/pause-screen.test.mjs` checks each against the engine.
- **To add or change a tip:** edit `tipsFor()` in `dist/tips.mjs`. Keep it under 96 characters so it fits three lines on a small phone. Icons are in `TIP_ICONS` in the same file.
- **Sound switch is gold**, not the mockup's blue, to match Johnny's gold-buttons call and the Break Room switch.
- **Small screens:** short phones show two tips or one so nothing scrolls. Phone landscape scrolls.
- The portrait is `assets/breakroom/break.webp`, cropped from the Break Room header art.
- No rule changes. `BUILD` in `app.mjs` stays 23 because survival was not retuned.

## Build 23: survival leaderboard (made with Claude, Nov 15)
- **What players see:** a LEADERBOARD button on the survival card, and a line on the survival end screen ("YOU ARE #4 ON THE LEADERBOARD", or "SIGN IN TO POST YOUR TIME" for guests). Both open the board: the top 10 survival times with usernames, plus your own row if you are outside the top 10.
- **Who gets on it:** signed-in Poop Profit accounts only (the same sign-in as the rest of the site; the game reads it from the site's own storage). One spot per player, their best time. The board only changes when a run beats that player's best. A best set before signing in does not post; it takes a fresh run.
- **Break Room perks count.** Johnny's call: Petty Cash should matter in the main mode, and perks cap out after a few runs.
- **How it works:** `dist/leaderboard.mjs` calls three database functions from `supabase/migrations/20261115110043_overtime_survival_leaderboard.sql`. `overtime_start_run()` marks the start of a survival run and returns a one-time run id. `overtime_submit_run()` takes the id back with the time, KOs, level and bosses beaten, and decides whether it is a new best. `overtime_leaderboard()` returns the board. The table (`overtime_survival_scores`) has no direct access from the browser.
- **Cheat checks (basic on purpose):** a time can never be longer than the real time since the run started on the server (plus 20 seconds for slow connections), a run id works once, and the other numbers must be possible. It is not cheat-proof: a modified game left running would pass. Set `hidden = true` on a row to take a score off the board.
- **Guests** read the board with one plain request; the database library (the same script the site loads) is only fetched for signed-in players.
- **Fails quietly:** offline, the game plays as before and the board says it is on a break.
- **Database change applied Nov 15** (recorded on the live database as version 20261115110043, which is why the file carries that number). Checked there in a rolled-back test: guests cannot start or post runs, an instant 10-minute claim is rejected, a real one posts, a run id works once, a shorter run changes nothing, impossible numbers are rejected, hiding a row removes it from the board.
- **Privacy page:** `privacy.html` now says that a posted username and best survival time are public.
- **Retuning warning:** times from before a difficulty change are not comparable. Each posted time stores the game build (`BUILD` in `app.mjs`); bump it when survival is retuned.
- New suite `tests/leaderboard.test.mjs` (game module against a stand-in database, plus checks on the database change file).
