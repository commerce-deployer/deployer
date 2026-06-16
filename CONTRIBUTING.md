# Contributing

Thanks for your interest in Deployer. Pull requests are welcome.

**Русский:** [CONTRIBUTING.ru.md](CONTRIBUTING.ru.md)

## Before a PR

1. `npm install`
2. `npm test` — unit tests (required)
3. `npm run test:integration` — requires Docker on the host
4. API changes — update `server/openapi.json` and `docs/API-INTEGRATION.md` (+ Russian duplicate if user-facing)

## Style

- Follow conventions in `server/` and `public/`
- Code comments and new docs: **English** primary; Russian in `*.ru.md` duplicates
- Minimal diff: one task per PR
- No legacy data migrations (greenfield)

## Security

Report vulnerabilities via [SECURITY.md](SECURITY.md), not public issues.
