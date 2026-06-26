# Bancard vPOS 2.0 — Integración Completa

## Estado: Funcional ✅ (sandbox rechaza tarjetas de prueba — esperado)

## Arquitectura

```
Store (Next.js)          API (Fastify)           Bancard vPOS
┌──────────┐            ┌──────────┐           ┌─────────────┐
│ Checkout │──POST──→   │ create   │──POST──→  │ single_buy  │
│          │   /bancard │          │           │             │
│ Payment  │   /create  │ webhook  │←──POST──  │ confirm     │
│ Block    │            │ /confirm │           │ (server2srv)│
│ (iframe) │←─SDK────── │          │           │             │
│          │  Bancard   │ status   │←──GET──── │ confirmations│
│ Retorno  │──GET──→   │ /status  │           │             │
│ (poll)   │            │          │           └─────────────┘
│          │            └──────────┘
│ MisTarj  │──POST──→   │ cards/new│──POST──→  │ cards/new   │
│ (iframe) │  /cards    │ users-   │──POST──→  │ users_cards │
│          │  /new      │ cards    │──POST──→  │ delete      │
└──────────┘            └──────────┘           └─────────────┘
```

## Archivos (22 total)

### Backend (6 archivos)
| Archivo | Líneas | Función |
|---|---|---|
| `api/src/services/bancard.ts` | 278 | SDK completo: 8 endpoints, token MD5, config desde DB |
| `api/src/modules/payments/payments.routes.ts` | 332 | Rutas HTTP + webhook handler + confirmación |
| `api/src/modules/system/registry.ts` | 391 | ConfigSchema del plugin (14 campos) |
| `api/src/modules/plugins/plugins.routes.ts` | 89 | Plugin GET/PUT + sanitizeValues + webhook URL |
| `api/src/env.ts` | 46 | Legacy env vars (sin usar) |
| `api/src/app.ts` | 170 | Registro de rutas + PUBLIC_WRITES |

### Store (14 archivos)
| Archivo | Líneas | Función |
|---|---|---|
| `store/src/components/cms/PaymentBlock.tsx` | 164 | Iframe de pago (SDK loader) |
| `store/src/app/(site)/pago/[id]/page.tsx` | 23 | Página de pago |
| `store/src/app/(site)/pago/retorno/page.tsx` | 183 | Página de retorno (poll + status Ecme) |
| `store/src/app/(site)/mi-cuenta/mis-tarjetas/page.tsx` | 146 | Gestión de tarjetas (list/add/delete) |
| `store/src/types/bancard.d.ts` | 22 | Tipos TypeScript Window.Bancard |
| 7× BFF proxy routes | 7×11-63 | Proxies API ↔ Store |

### Admin (1 archivo)
| Archivo | Líneas | Función |
|---|---|---|
| `admin/src/views/concepts/plugins/bancard/Bancard.tsx` | 3 | Wrapper → PluginConfig |

### Docs (1 archivo)
| Archivo | Líneas | Función |
|---|---|---|
| `docs/BANCARD_ERROR_CODES.md` | 40 | Códigos de respuesta Bancard |

## 8 Endpoints Bancard vPOS 2.0

| # | Endpoint | Token MD5 | Función |
|---|---|---|---|
| 1 | `single_buy` | `md5(pk + shopProcessId + amount + currency)` | Pago ocasional (iframe) |
| 2 | `cards/new` | `md5(pk + cardId + userId + "request_new_card")` | Catastro de tarjeta |
| 3 | `users_cards` | `md5(pk + userId + "request_user_cards")` | Listar tarjetas |
| 4 | `charge` | `md5(pk + shopProcessId + "charge" + amount + currency + aliasToken)` | Pago con token |
| 5 | `delete` | `md5(pk + "delete_card" + userId + cardToken)` | Eliminar tarjeta |
| 6 | `rollback` | `md5(pk + shopProcessId + "rollback" + "0.00")` | Reversa |
| 7 | `get_confirmation` | `md5(pk + shopProcessId + "get_confirmation")` | Consultar estado |
| 8 | `verify_confirmation` | `md5(pk + shopProcessId + "confirm" + amount + currency)` | Validar webhook |

## URLs por entorno

| Entorno | API URL | JS SDK |
|---|---|---|
| Staging | `https://vpos.infonet.com.py:8888` | `bancard-checkout-4.0.0.js` |
| Production | `https://vpos.infonet.com.py` | `bancard-checkout-4.0.0.js` |

## Regla de aprobación

**Solo `response_code === "0"` o `"00"` = APROBADA**
Cualquier otro código (1-99) = RECHAZADA
NUNCA usar `response === "S"` como aprobación (S = procesado, no aprobado)

## Config del plugin (admin)

**Credenciales** (solo admin ve): env, publicKey (sensitive), privateKey (sensitive), merchantCode, publicApiUrl, storeUrl
**Webhook URL** (auto): `{publicApiUrl}/payments/bancard/confirm` — solo lectura en admin
**Pagos simples**: simpleEnabled, simpleCurrency, simpleMaxAmount, simpleAllowGuests
**Recurrentes**: recurringEnabled, recurringInterval, recurringMaxRetries (campos presentes, sin lógica aún)
**QR**: qrEnabled, qrExpiration, qrMaxAmount (campos presentes, sin lógica aún)

## Issues pendientes

1. `lib/bancard.ts` — DEAD CODE (120 líneas, risk de key leak si se importa client-side) → ELIMINAR
2. BFF routes inconsistent env vars (`API_URL` vs `NEXT_PUBLIC_API_URL`) → UNIFICAR
3. BFF routes sin input validation (5 routes) → AGREGAR Zod
4. `env.ts` tiene BANCARD_* legacy vars sin usar → ELIMINAR
5. `mis-tarjetas` usa inline styles → ECME Button
6. `cards/new` no retorna `jsUrl` → FALLBACK HARDCODEADO
7. Sin rate limiting en `/payments/bancard/create`
8. Sin implementar recurring payments
9. Sin implementar QR payments
