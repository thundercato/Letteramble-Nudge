# Crack the Case · Letteramble

A standalone spy arcade mini-game. Choose one of six briefcases, work the alphabetical combination lock, and recover a medal. This replaces the first ten-nudge prototype while preserving its GitHub Pages address and the 120-puzzle clue bank.

## Play

https://thundercato.github.io/Letteramble-Nudge/

The root forwarding page leads to `dist/`. Keep **Settings → Pages → Deploy from a branch → main → / (root)**. All assets use relative paths. No hosted test/build workflow has been introduced.

## The assignment

- Six cases, numbered 3–8, select the length of the secret word.
- Each wheel has **five consecutive letters**, looping within that set. Windows can cross Z/A. The answer letter can occupy any of the five positions independently; it is not always the middle letter.
- Swipe or drag vertically, tap the upper/lower letters, or use the mouse wheel. There are no arrow buttons and no limit on moves or attempts.
- **Try the lock** checks the complete secret code. Aligning it does not automatically unlock. A different valid word is not necessarily this case's code.
- A wrong guess rattles the lock with a short sound. Optional vibration is used only where the browser supports it; the visible feedback always works.
- No clue is shown initially. **Request intel** delivers the existing clue as a message from Field Control, pinned above the case. Using it halves the points once.
- The case zooms in from selection. On success the lid lifts, the open case appears, and a medal pops out with a short fanfare and particles.

| Medal | Time from opening the case | Points | With intel |
| --- | --- | --- | --- |
| Gold | Under 5 minutes | 10 | 5 |
| Silver | 5 minutes to under 10 minutes | 6 | 3 |
| Bronze | 10 minutes or more | 4 | 2 |

There is no deadline. Time away from the game still counts, and the timer stops when the correct code is submitted. Requesting intel changes points, not the medal colour. Wrong attempts do not subtract points.

## Progress and accessibility

The current unsolved case, its wheel positions and hint, total points, cases cracked, best medal for each length and mute preference are saved on the current device. Reloading returns to case selection with a **Resume your case** option. Starting a different case asks before replacing an unfinished one. Storage failure leaves a playable session and explains that progress will not persist.

Each word length has its own shuffled bag of twenty puzzles, with no repeats until that session's bag is exhausted. Decks reset on reload. Saves are validated before use. Solved cases are removed from the resumable save and awarded once.

Keyboard: Tab to a wheel, use up/down to turn it, left/right to focus its neighbour, Home/End for the first/last position, and Enter to try the lock. Native dialogs contain focus. Reduced-motion preferences skip zoom, shake, lid and particle animations. Audio is generated locally after user interaction and can be muted.

## Local development

The production game is static HTML, CSS and ES modules; it needs no build, API key or runtime service.

```sh
npm start
```

This preserves the Python 3 static server at `http://localhost:8000`. Any static HTTP server pointed at `dist/` works. Opening HTML as `file://` is not supported because the game loads modules and JSON.

```sh
npm test
```

The dependency-free Node test suite checks 12,000 generated cases, five-letter bands and wraparound, explicit unlocks, unlimited wrong attempts, medal boundaries, one-time hint discounts, saved-state validation, the timer, shuffled decks and delivery assets.

For optional local browser development, install the locked development dependency and run:

```sh
npm ci
npm run dev
```

Vite is a local development server only. GitHub Pages continues to serve the authored `dist/` files directly. The existing Python server and test runner do not require it.

## Integration

`dist/engine.js` is DOM-free and owns round generation, wheel movement, hints, unlock checks, time and medals. `dist/app.js` owns the interface, local progress, sound and animation. Reuse the engine and `dist/data/puzzles.json` when integrating into Letteramble.

The JSON retains stable IDs, uppercase answers, lengths, short UK-English clues, its language tag and schema version. It has twenty entries for every length from three to eight.

## Design and artwork

The design uses a playful intelligence-division theme: warm paper, dark teal cases, brass mechanisms, coral actions and Letteramble purple. The game interaction remains the main surface. Research references were Fireproof's [The Room](https://www.fireproofgames.com/games/the-room) for tactile mechanisms and Yak & Co's [Agent A introduction](https://discussions.unity.com/t/agent-a-a-puzzle-in-disguise-spy-themed-puzzle-game/599893) for its light-hearted spy setting. No artwork or game text was copied from either.

Three original images were generated using the built-in image-generation tool and are tracked under `dist/assets/`:

- `case-closed.png`: a stylised dark teal attaché case with brass trim, a blank central panel and near-frontal framing.
- `case-open.png`: the matching open case with an empty, warmly lit compartment.
- `medal.png`: a circular gold star medal with a violet ribbon, used with visual colour treatments for silver and bronze.

Prompt direction: polished retro spy arcade product illustrations, readable silhouettes, no logos or text; consistent dark teal/brass materials and cutout-style framing.

## Validation

Ten automated tests pass, including 12,000 generated cases. Browser checks covered the selection screen, wrong-code feedback, pointer dragging, keyboard wheel changes, requesting a clue, restoring an aligned hinted case after reload, explicit unlock, a five-point hinted gold reward, and 390px/320px phone-width layouts with eight visible wheels and no horizontal overflow. These are desktop Chrome browser checks at mobile widths, not physical iPhone acceptance. Real-device Safari sound, vibration support and finger swipes still need hands-on checking.

## Agent workflow and storage

Read [AGENTS.md](AGENTS.md) before work. Effective 7 September 2026, local testing remains the default. Do not introduce hosted builds, paid services, automatic retries or routine diagnostic uploads without explicit approval. Newly approved optional diagnostic archives should expire after one day unless another duration is agreed.

Existing Pages publishing is preserved. The root forwarding page and `dist/` are intentional game delivery files and must not be removed as disposable Actions artefacts. This housekeeping changes no game logic, site address, tests or release version, and it claims no new device acceptance.
