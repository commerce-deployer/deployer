# HTTP API — интеграция клиентов (v1)

**English:** [API-INTEGRATION.md](API-INTEGRATION.md)

Deployer — standalone-сервис. Спецификация: **`/api-docs`**.

## Аутентификация

| Режим | Env | Как |
|-------|-----|-----|
| UI | `ADMIN_USER` / `ADMIN_PASSWORD` | cookie после `POST /api/login` |
| API | `API_KEY` | `X-API-Key` |
| Оба | `DEPLOYER_AUTH_MODE=dual` | сессия или ключ |

Для server-to-server — **только API key**.

## Deploy (async)

`POST /api/deploy` → **202** + poll `GET /api/operations/:id`.

Тело: `templateId`, `containerName`, `params`.

- `{{CONTAINER_NAME}}` в шаблоне — из deploy context.
- Дубликат активного `containerName` → **409**.
- Legacy: `DEPLOYER_SYNC_LEGACY=1` → **200**.

## Lifecycle

Async **202**: list, logs, start/stop/restart, delete (`removeData=false` сохраняет тома).

## Managed-контейнеры

`MANAGED_LABEL` / `MANAGED_LABEL_VALUE` (default `managed-by=deployer`).

## Шаблоны

`templates/README.ru.md`. Все `{{KEY}}` должны быть в `params`.

## Health

`GET /api/health` без auth.

## curl

См. полный пример в [API-INTEGRATION.md](API-INTEGRATION.md).
