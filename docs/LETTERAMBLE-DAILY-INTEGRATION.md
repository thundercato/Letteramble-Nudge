# Shared Letteramble daily integration

Adam approved the daily structure on 7 September 2026. The canonical contract and implementation are in [WordShape/quickfire/INTEGRATION.md](https://github.com/thundercato/WordShape/blob/main/quickfire/INTEGRATION.md) and [daily.mjs](https://github.com/thundercato/WordShape/blob/main/quickfire/daily.mjs).

Quickfire now has three daily boards (shape, agent, shape), one medal per board and a completion streak for all three. Each agent word must start or end with that letter. Make the Cut has one bomb with six wires, not six bombs. Eight themed villain/word banks are prepared in bomb-themes.mjs, with 365 distinct validated daily sets.

Crack the Case should eventually record `crack-the-case` completion only when all six daily cases are complete. The shared date key is Europe/London YYYY-MM-DD, and the shared completion ledger is `letteramble-progress-v1`, schemaVersion 1. Preserve existing case medals and saves when adding that adapter. Individual streaks use each game's completion; the ultimate streak requires all released games on the same day. Never award ultimate from one game alone.

This note shares the contract only. It does not claim that Crack the Case's current random-case engine, daily sequencing or completion writer has been updated. Other Sites origins and devices do not share localStorage; the future unified iOS app needs an explicit save migration. See the canonical contract for details and test coverage.
