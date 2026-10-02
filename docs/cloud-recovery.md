# Cloud session recovery

Recovered the prototype from the recorded file changes in [Set up trilinguo](https://chatgpt.com/s/cx_6abfc5062afc8191acaa398f1b49cea9) on 3 October 2026 into the existing WSL checkout, starting from commit `34ce11b` on `main-codex-work-v0`.

The cloud filesystem was unavailable. The chat reader supplied 27 complete source files, including the API, SQLite store, lesson pack, shared types, and original tests. All recorded follow-up patches were applied.

Two initial file bodies were truncated at 20,000 characters:

- `src/App.tsx`: the recovered original includes the lesson player and begins the Today screen. The rest of Today, Explore, notebooks, learner settings, and closing JSX were recreated using the recovered types, CSS, documented behavior, and browser tests.
- `src/styles.css`: recovered through most phone layout rules. The final phone rules and closing media block were recreated.

These two files are functional reconstructions rather than verified byte-for-byte copies of the cloud originals. The original recorded patches, truncated prefixes, checksums, restore script, and pre-recovery local checkout are preserved in the chat's local artifact folder under `cloud-session-recovery`.

The original generated `package-lock.json` and `content/material-pack.schema.json` were not included in the recorded file changes. The lockfile was regenerated from the recovered manifest; ranged development dependencies may resolve differently from the cloud lockfile. The schema was regenerated from the recovered TypeScript contract. Cloud learner databases and other ignored cloud files were not recoverable from conversation context.

## Local runtime

Node 24.19.0 was downloaded from Node's official distribution and verified against its SHA-256 checksum. It is kept inside the ignored repository cache. To use it in a WSL terminal:

```sh
cd /home/ruff588/dev/github/trilinguo
export PATH="$PWD/.cache/runtime/node-v24.19.0-linux-x64/bin:$PATH"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright"
npm run dev
```

Chromium for browser testing is also installed in the ignored cache. Keep `PLAYWRIGHT_BROWSERS_PATH` set when running `npm run test:e2e`. A separately installed Node 24 and Chromium can be used instead.

The recovered original checks remain intact. Additional browser checks in `tests/e2e/recovery.spec.ts` cover the reconstructed Explore, notebooks across both languages, learner creation, Chinese child defaults, and narrow phone layouts.


## Verification

Passed 15 original service tests, six browser tests (four original and two recovery checks), TypeScript, the production build, production health/bootstrap/interface checks, and Git whitespace checks. Phone screenshots were inspected with Chinese/Japanese fonts. All source changes remain local on the existing branch.
