# Letteramble Nudge agent instructions

Read the current README and approved request before work. Fetch remote state before resuming an older branch. Preserve the standalone game's behaviour and interface unless the task explicitly changes them; do not infer a native port from maintenance instructions.

## Local checks and delivery

- Use `npm test` for the existing Node built-in test suite and `npm start` for the documented local Python static server. Preserve substantive assertions.
- Keep `dist/`, its ES modules and clue JSON, and the root forwarding `index.html`: these are intentional source/delivery files, not expendable Actions output.
- Preserve the existing GitHub Pages publishing route, site address and relative asset paths. Ordinary Pages publishing may continue; do not disable it as a storage cleanup.
- Report actual checks separately from real-device Safari/audio/gesture acceptance. Do not claim tests or phone checks that were not performed.

## Build costs and storage: effective 7 September 2026

- Local testing remains the default. Do not add hosted test/build workflows, paid services, automatic retries, schedules or persistent runner services without Adam's explicit approval of scope, run count and cost.
- Any newly approved diagnostic/build archive upload must be opt-in and retained for one day unless another duration is explicitly agreed. This does not authorise changes to Pages internals or deployment-required files.
- Preserve source history, tags, releases, game saves and useful local diagnostic evidence. Never delete a source repository to reduce the Actions artefact meter.
- Before any approved artefact cleanup, inventory all pages and exact IDs/sizes/completed runs; verify successful deletions afterwards. Do not equate source sizes or accrued billing with current artefact bytes.
- Documentation-only housekeeping does not change game versions, authorise redesign, create a new product task or establish new device acceptance.
