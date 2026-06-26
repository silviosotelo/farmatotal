# Next.js Commerce Core Blueprint

Esqueleto TypeScript del núcleo de un e-Commerce inspirado en los patrones funcionales de WooCommerce, pero diseñado como un monolito modular.

## Principios

- El frontend nunca define precios ni totales.
- El dominio no depende de Next.js, Prisma ni Redis.
- Toda mutación crítica es idempotente.
- Inventario usa reservas.
- Pedido, pago y fulfillment tienen estados separados.
- Los efectos externos se publican mediante outbox.
- Las tablas de búsqueda son proyecciones, no fuente primaria.

## Estructura

```text
src/
  core/
  catalog/
  cart/
  pricing/
  inventory/
  promotions/
  tax/
  shipping/
  orders/
  payments/
  checkout/
```

## Integración con Next.js

Los Route Handlers deben:

1. autenticar o resolver sesión;
2. validar DTO;
3. llamar un application service;
4. convertir errores de dominio a HTTP;
5. devolver DTOs;
6. no contener reglas comerciales.

Ejemplo conceptual:

```ts
export async function POST(request: Request) {
  const session = await requireCartSession(request);
  const body = AddCartItemSchema.parse(await request.json());

  const cart = await container.addCartItem.execute({
    cartId: session.cartId,
    ...body,
  });

  return Response.json(cart);
}
```

## Persistencia sugerida

- PostgreSQL.
- `numeric` o minor units para dinero.
- Redis para cache y locks auxiliares, nunca como única fuente de stock.
- BullMQ, Temporal o una cola equivalente.
- Transactional outbox en la misma base del negocio.
