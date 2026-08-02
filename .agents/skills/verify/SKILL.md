---
name: verify
description: Run the full check suite for this plugin the correct way
---

# Verify changes

Run the whole gate:

```
deno task check
```

That is `deno fmt --check && deno lint && deno check && deno test -A`.

Key points:

- Tests import the public plugin barrels, so the program build runs in every
  test isolate. This is intentionally not bypassed or disabled.
- `deno lint` on this repo uses `jsr:@cunarist/deno-import-check`, not this
  plugin itself — so linting the repo does **not** build a program.
- The build writes nothing to disk. If any file appears in the repo root after a
  lint or a test run, that is a bug — see the memory note.
- Fix all fmt/lint/check/test problems before saying done. `deno task fix` runs
  `deno fmt && deno lint --fix`.

To iterate on one test file, run `deno test -A tests/<name>_test.ts`.
