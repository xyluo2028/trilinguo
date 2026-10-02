# Trilinguo

A small family language-learning prototype: English and Japanese lessons with Chinese or English explanations, separate learner histories, and review driven by previous attempts.

The child sample targets a **five-year-old Chinese speaker beginning Japanese**, learning with an adult. It uses pictures and tap answers; it does not require reading or typing.

## Run locally

Requires **Node 24** and npm. The cloud environment uses Node 24.19.0. Dependencies are pinned by `package-lock.json`; npm's cache stays in the ignored `.cache/npm` directory.

```sh
npm ci
npm run dev
```

The development command starts Vite on port **5173** and the API on port **3001**, both on loopback. Vite proxies `/api` to the API. Stop both with Ctrl+C. No credentials or external services are required.

For the production build and local server:

```sh
npm run build
npm start
```

The API then serves the built interface on port **3001**. If you change frontend code, rebuild before using `npm start`.

Learning data is saved in `.data/progress.sqlite`, an ignored local SQLite database. `TRILINGUO_DB` can select another database path; `PORT` can change the API port. These are optional settings. In development, `PORT` also changes Vite's API proxy target. The API is deliberately private: this prototype has no sign-in, and switching learners does not authenticate anyone. Do not deploy it publicly until access control is implemented.

## Verify

```sh
npm run check       # content validation, service tests, TypeScript, production build
npm run test:e2e    # production build and Chromium browser tests
```

Browser tests use `/usr/bin/chromium` when available. Otherwise run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium executable. Browser tests start their own API/server on port **3102** and use a separate temporary database; they do not change your learning data.

To regenerate the exported content schema after editing its TypeScript source:

```sh
npm run content:schema
npm run validate:content
```

## Current scope

The lesson player supports bilingual explanations, hints, picture choices, bounded typed answers for adults, saved feedback/resume, notebooks, learner creation, and due-item review. SQLite records recognition/production and assistance separately. The sample pack has adult English/Japanese lessons and an assisted child Japanese variant.

Lesson content and answer sets are **drafts awaiting human review**. Audio is a browser preview using an available local device voice, with failure feedback; reviewed audio files are not included. MCP authoring, media uploads, sign-in, remote hosting, and backups remain the next milestones.

## Project map

| Path | Purpose |
| --- | --- |
| `src/` | Responsive React lesson interface |
| `server/` | Loopback API and SQLite learning store |
| `shared/` | Content contract, answer feedback, review rules, and shared types |
| `content/` | Versioned sample pack and exported JSON Schema |
| `tests/` | Content, store, HTTP API, and browser checks |

See the [original design brief](docs/language-learning-design-v0.1.md) and [kickoff decisions and next milestones](docs/project-kickoff.md).

See [cloud recovery notes](docs/cloud-recovery.md) for source completeness and the Node 24 runtime installed in this WSL checkout.
