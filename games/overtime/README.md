# PoopProfit: Overtime (current: Build 17)

Live game: https://poopprofit.com/beta-test-survival-game.html (built from this folder).
The old private prototype link (https://poopprofit-overtime-prototype.johnkay.chatgpt.site) is out of date.

## How to build
**This folder (`games/overtime/`) is the source of the game. Never edit `beta-test-survival-game.html` in the repo root directly**: it is generated, and any hand edit is lost on the next build.

1. Edit only files in `games/overtime/dist/` (code, page, styles, art, sounds). Add tests in `games/overtime/tests/` when you change behavior.
2. From `games/overtime/`, run `npm install` (first time only), then `npm run build`. This writes `../../beta-test-survival-game.html`.
3. Run `npm test`. Every suite must pass.
4. Commit **both** the source changes and the rebuilt `beta-test-survival-game.html` in the same pull request.

Requirements: Node 20 or newer, and Python 3 with Pillow (the build re-encodes the PNG sprites to WebP). The build is reproducible: the same source with the same esbuild (pinned in `package.json`) and Pillow versions gives a byte-identical page. Build 15 was produced with Node 22.23, esbuild 0.24.0 and Pillow 12.3.0; a different Pillow or libwebp version can change the inlined sprite bytes without changing how the game plays.

What the build does (`tools/build-single-file.mjs`): bundles and minifies the modules with esbuild, re-encodes the PNG sprites to WebP at the same size, inlines every file in `dist/assets/sfx/`, `dist/assets/icons/`, `dist/assets/menu/` and `dist/assets/cabinet/` as data URIs (in the code, the page and the stylesheet), inlines the stylesheet, and adds a noindex tag. Passing a password instead of `--plain` produces the old encrypted, password-gated page using `tools/gate.html` (not used since Build 10).

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
- **Change:** the coins needed for the next promotion come from `promotionCost(level)` in `engine.mjs`: `6 + 4.5 x level + 0.35 x level squared`. The first promotion still costs 5. The 2nd to 8th now cost 16, 22, 29, 37, 45, 54, 64 (they were 11, 14, 18, 22, 26, 30, 35).
- **Result in simulated 3-minute runs (coin-chasing bot, unlimited health):** about 13 promotions before the boss instead of about 17; roughly 6, 5 and 2 per minute instead of 7, 7 and 3. A bot that plays for an evolution got one in 12 of 16 runs (15 of 16 before), about 20 seconds later.
- **Tried and rejected:** a much steeper curve (`10 + 8 x level + level squared`) cut promotions to about 10 but left an evolution in only 2 of 16 runs, because an evolution takes about 10 picks.
- The 7-second minimum gap is unchanged. Nothing else about the rules changed.
- New suite `tests/xp-curve.test.mjs` pins the cost table, the promotion rate and the evolution rate.
