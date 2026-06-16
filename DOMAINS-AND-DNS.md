# Domains and DNS for deployed containers

**Русский:** [DOMAINS-AND-DNS.ru.md](DOMAINS-AND-DNS.ru.md)

Containers deployed through Deployer get Traefik labels from the **Domain** field in the deploy form. Traefik routes by that hostname and requests a Let's Encrypt certificate. The app domain **does not** have to match the Traefik dashboard or registry domain — an A record to the server IP is enough.

---

## Example

Traefik on `infra.example.com` (dashboard `traefik.infra.example.com`, registry `registry.infra.example.com`). App from Deployer on `app.example.com` or `client1.apps.example.com`.

- Deploy form **Domain**: e.g. `client1.apps.example.com`.
- Template sets labels: `Host(\`client1.apps.example.com\`)`, `tls.certresolver=le`.
- Traefik server config does **not** list the app domain — only DNS to the server IP.

---

## DNS: A record to server IP

Public server IP e.g. `203.0.113.10`. In the app domain zone:

| Goal | Record | Value |
|------|--------|-------|
| One subdomain | A `client1` | Server IP |
| Several subdomains | A per name | Server IP |
| Any subdomain | A `*` | Server IP |
| Apex | A `@` | Server IP |

In Deployer use the full host: `client1.apps.example.com`, `apps.example.com`, etc.

Let's Encrypt: Traefik issues a cert **per** Host in container labels (TLS-01). Wildcard `*.zone` needs DNS-01 — not required for normal deploys.

---

## Verification

1. `dig client1.apps.example.com` → server IP.
2. Container on `proxynet`, labels include correct `Host(...)`.
3. Browser URL matches the deploy form domain.

For Traefik 404/504 troubleshooting see project issues or Setup Server Stack docs.
