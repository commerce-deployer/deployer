# Участие в разработке

Спасибо за интерес к Deployer. Pull request'ы приветствуются.

**English:** [CONTRIBUTING.md](CONTRIBUTING.md)

## Перед PR

1. `npm install`
2. `npm test` — unit-тесты (обязательно)
3. `npm run test:integration` — нужен Docker на хосте
4. При правках API — обновите `server/openapi.json` и `docs/API-INTEGRATION.md` (+ `docs/API-INTEGRATION.ru.md`)

## Стиль

- Следуйте соглашениям в `server/` и `public/`
- Комментарии в коде и новые доки — на **английском**; русский — в `*.ru.md`
- Минимальный diff: одна задача — один PR
- Без миграций legacy-данных

## Безопасность

Уязвимости — через [SECURITY.ru.md](SECURITY.ru.md), не в публичных issue.
