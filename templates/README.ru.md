# Шаблоны контейнеров

**English:** [README.md](README.md)

JSON в `templates/`. Пустая папка → копирование из `templates-default/` при старте.

## Имя контейнера

**Не в JSON шаблона.** Задаётся при deploy: UI или `containerName` в API.

Тома: `{{DEPLOY_BASE_PATH}}/instances/{{CONTAINER_NAME}}/…`.

## Подстановки

`{{CONTAINER_NAME}}` — из deploy. `{{KEY}}` из `params` / env. Без значения → ошибка.

## Формат

**id**, **name**, **image** обязательны. **containerName** в корне JSON не используется.
