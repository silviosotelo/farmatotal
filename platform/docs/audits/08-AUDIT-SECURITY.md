# Auditoría de Seguridad

**Fecha:** 26 de junio de 2026

## Issues de Seguridad Encontrados

### CRÍTICOS (ya corregidos)
1. ✅ Plugin keys expuestas al frontend → `sanitizeValues()` con `configSchema.sensitive`
2. ✅ `lib/bancard.ts` con `BANCARD_PRIVATE_KEY` en client-side → ELIMINADO
3. ✅ `response === "S"` marcaba pagos como aprobados → FIX: solo `response_code === "0"`

### ALTOS (pendientes)
4. 🔴 `GET /erp-sync/runs` sin tenant filter — muestra datos de todos los tenants
5. 🔴 `token` field en erp_sync configSchema sin `sensitive: true` — se expone al frontend

### MEDIOS
6. 🟡 BFF routes sin input validation (5 routes: charge, rollback, delete-card, users-cards, cards/new)
7. 🟡 Sin rate limiting per-endpoint en `/payments/bancard/create` (solo 5/min global)
8. 🟡 Sin idempotency key en webhook de Bancard

### BAJOS
9. 🟢 `syncCursors` table definida pero nunca usada
10. 🟢 Legacy env vars en `env.ts` (BANCARD_*) — ya no se usan pero siguen definidas

## Security Rules del Codebase

### Plugin Config
- Sensitive fields: `privateKey`, `secretKey`, `token`, `password`, `secret` → `"••••••••"` en GET
- Campo `sensitive: true` en `configSchema` del registry
- `sanitizeValues()` lee del configSchema, no hardcodeado
- PUT endpoint: admin trusted (JWT required)

### API Network
- API en Docker network: `api:4000`
- Externamente: `api.rohekawebservices.online` vía cloudflared
- `localhost:4000` es `sedia-local-api` (otro proyecto), NO el API de farmatotal

### Auth
- JWT en cookies (ft_at, ft_rt)
- Auto-refresh on 401/419/440
- 2 roles: ADMIN, USER
- Multi-tenant por header `x-tenant`

### Pagos
- Card data nunca toca nuestro server (iframe de Bancard)
- Keys stored in DB, read server-side only
- Webhook token verification (MD5)
- Rate limiting en /payments/bancard/create

### CORS
- `CORS_ORIGINS` en .env.demo.api
- Incluye admin.rohekawebservices.online y tienda.rohekawebservices.online
