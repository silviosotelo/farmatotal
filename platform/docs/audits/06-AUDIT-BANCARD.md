# Auditoría del Plugin Bancard vPOS 2.0

**Fecha:** 26 de junio de 2026

## Estado: FUNCIONAL ✅

22 archivos, 8 endpoints, iframe SDK, webhook, card management.

## Archivos (22)

### Backend (6)
| Archivo | Líneas | Función |
|---|---|---|
| `api/src/services/bancard.ts` | 278 | SDK: 8 endpoints Bancard, token MD5, config desde DB |
| `api/src/modules/payments/payments.routes.ts` | 337 | Rutas HTTP + webhook + rate limiting |
| `api/src/modules/system/registry.ts` | 391 | ConfigSchema (14 campos) |
| `api/src/modules/plugins/plugins.routes.ts` | 89 | Plugin GET/PUT + sanitizeValues + webhook URL |
| `api/src/env.ts` | 46 | Legacy env vars (removidas) |
| `api/src/app.ts` | 170 | Registro de rutas + PUBLIC_WRITES |

### Store (14)
| Archivo | Función |
|---|---|
| PaymentBlock.tsx | Iframe loader (SDK Bancard) |
| pago/[id]/page.tsx | Página de pago |
| pago/retorno/page.tsx | Retorno con Ecme Alert |
| mis-tarjetas/page.tsx | Gestión de tarjetas |
| types/bancard.d.ts | Tipos TypeScript |
| 7× BFF proxy routes | Proxies API ↔ Store |

### Admin (1)
| Archivo | Función |
|---|---|
| plugins/bancard/Bancard.tsx | Wrapper → PluginConfig |

### Docs (2)
| Archivo | Función |
|---|---|
| docs/BANCARD_INTEGRATION.md | Auditoría completa |
| docs/BANCARD_ERROR_CODES.md | Códigos de error oficiales |

## 8 Endpoints Bancard vPOS 2.0

| # | Endpoint | Token MD5 | Función |
|---|---|---|---|
| 1 | single_buy | md5(pk+shopProcessId+amount+currency) | Pago iframe |
| 2 | cards/new | md5(pk+cardId+userId+"request_new_card") | Catastro |
| 3 | users_cards | md5(pk+userId+"request_user_cards") | Listar tarjetas |
| 4 | charge | md5(pk+shopProcessId+"charge"+amount+currency+aliasToken) | Pago con token |
| 5 | delete | md5(pk+"delete_card"+userId+cardToken) | Eliminar tarjeta |
| 6 | rollback | md5(pk+shopProcessId+"rollback"+"0.00") | Reversa |
| 7 | get_confirmation | md5(pk+shopProcessId+"get_confirmation") | Consultar estado |
| 8 | verify_confirmation | md5(pk+shopProcessId+"confirm"+amount+currency) | Validar webhook |

## Regla de aprobación
Solo `response_code === "0"` o `"00"` = APROBADA. Nunca usar `response === "S"`.

## Config del plugin (DB)
- Env, publicKey (sensitive), privateKey (sensitive), merchantCode
- publicApiUrl, storeUrl
- _webhookUrl (auto-derived, read-only)
- simpleEnabled, simpleCurrency, simpleMaxAmount, simpleAllowGuests
- recurringEnabled, recurringInterval, recurringMaxRetries
- qrEnabled, qrExpiration, qrMaxAmount

## Checkout: Métodos separados
- "Tarjeta guardada" → charge con alias_token (pago recurrente)
- "Tarjeta de crédito/débito" → single_buy iframe (pago simple)

## Issues pendientes
- recurring payments: configSchema existe, sin lógica de scheduler
- QR payments: configSchema existe, sin generación
- Sin rate limiting per-key (solo 5/min global)
