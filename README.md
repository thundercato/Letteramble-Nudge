# Letteramble Nudge

A standalone, mobile-friendly Letteramble bonus game: choose 3–8 alphabetical reels, spin, read a short clue, and find the answer within **10 shared nudges**.

## Play

Enable GitHub Pages under **Settings → Pages → Deploy from a branch → main → / (root) → Save**. Once GitHub finishes publishing, the game will be at:

https://thundercato.github.io/Letteramble-Nudge/

The root entrypoint forwards to the game in `dist/`. All asset URLs are relative, so the repository subpath works without configuration.

## Local development

No dependencies, account, API key, build step or paid workflow is needed.

```sh
npm start
```

Open `http://localhost:8000`. This command uses Python 3's static server. Any static HTTP server pointed at `dist/` also works. Opening the HTML directly as a `file://` URL is not supported because the game loads ES modules and JSON.

```sh
npm test
```

Tests use Node's built-in test runner. They check the full clue bank, 12,000 generated rounds, wraparound, final-move wins and losses, invalid moves, shuffled decks and local asset references.

## Rules and controls

- Choose 3–8 letters, default five, then spin.
- A clue appears after the last reel settles.
- Each arrow press moves one letter back or forwards and spends one nudge. A and Z wrap.
- Ten nudges are shared across all reels. No timer.
- Starting positions are always 4–8 moves from the answer; some letters can already be correct.
- The answer is checked after every move, including the tenth. A different dictionary word does not count.
- Reveal word ends a round and shows its answer. Length selection becomes available between rounds.
- Each length has an independent shuffled bag of twenty puzzles. No repeats until that bag is exhausted, and no immediate repeat across bags. The bags reset when the page reloads.
- Keyboard: Tab to a reel; up/down change its letter, left/right select its neighbour.
- Touch: use arrow buttons, or swipe a reel up for the next letter and down for the previous letter.
- Sound is optional, synthesised locally and enabled by the first user interaction. The mute preference is saved on the current device where browser storage is available.
- Reduced-motion preferences replace the long spin with a short staggered reveal.

## Future Letteramble integration

`dist/engine.js` is a DOM-free ES module containing round generation, move evaluation and shuffled clue decks. `dist/app.js` owns the standalone interface. Reuse the engine and `dist/data/puzzles.json` inside Letteramble without adopting this page layout.

The clue file contains 120 hand-authored word/clue pairs in UK English, with stable IDs, word lengths, uppercase answers, a language tag and a schema version. Each length from three to eight has twenty entries. Add new entries without changing the interface.

## Validation and limitations

The source and game logic have automated checks. Real-device Safari audio, swipe behaviour and visual layout still need hands-on playtesting. Haptics are reserved for a future native version. No analytics, advertising, third-party fonts or remote runtime services are used.
