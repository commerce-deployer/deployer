# Домены и DNS для развёрнутых контейнеров

**English:** [DOMAINS-AND-DNS.md](DOMAINS-AND-DNS.md)

Контейнеры получают метки Traefik из поля **Домен** в форме развёртывания. Домен **не обязан** совпадать с dashboard Traefik или registry — достаточно A-записи на IP сервера.

---

## Пример

Traefik на `infra.example.com`. Приложение — на `client1.apps.example.com`.

- Поле **«Домен»**: `client1.apps.example.com`.
- Метки: `Host(...)`, `tls.certresolver=le`.
- В конфиге Traefik домен приложения **не прописывают**.

---

## DNS

| Задача | Запись | Значение |
|--------|--------|----------|
| Поддомен | A `client1` | IP сервера |
| Wildcard | A `*` | IP сервера |
| Корень | A `@` | IP сервера |

---

## Проверка

1. `dig` → IP сервера.
2. Контейнер в `proxynet`, labels с `Host(...)`.
3. Браузер — тот же хост, что в форме.
