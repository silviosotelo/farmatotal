# Bancard vPOS 2.0 — Referencia de Códigos de Respuesta

**Fuente:** Documentación oficial Bancard vPOS 2.0

## Solo UN código = APROBADA

| Código | Significado |
|---|---|
| **0** | **APROBADA** |
| **00** | **APROBADA** (formato alternativo) |

**Cualquier otro código (1-99) = RECHAZADA**

## Códigos de rechazo más comunes

| Código | Significado |
|---|---|
| 1 | Llame centro autorización |
| 3 | Negocio inválido |
| 4 | Retenga tarjeta |
| 5 | No aprobado |
| 6 | Error de sistema |
| 9 | Solicitud en proceso |
| 12 | Transacción inválida |
| 13 | Monto inválido |
| 14 | Tarjeta inexistente o inválida |
| 17 | Cancelado por el cliente |
| 33 | Tarjeta vencida |
| 51 | Fondos insuficientes |
| 54 | Tarjeta vencida |
| 55 | Clave inválida |
| 61 | Excede monto límite |
| 73 | Código de seguridad inválido |

## Regla de validación

```typescript
const approved = response_code === "0" || response_code === "00";
// NUNCA usar: response === "S" (eso significa "procesado", NO "aprobado")
```
