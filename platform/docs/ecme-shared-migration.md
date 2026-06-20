# Migración: Ecme como librería compartida (packages/ui) para admin + 3 temas del store

> **ESTADO: COMPLETADA ✅** — Fases 0-4 hechas y verificadas. admin (Vite) y store
> (Next) compilan y buildean consumiendo `@ft/ui` con una sola instancia de React.
> Componente Ecme (`Button`) renderizando en los 3 temas vía `FloatingButtons`;
> build completo del store OK con la API arriba.

**Decisiones del usuario:** (1) **Unificar en monorepo** — store dentro del workspace pnpm, una
sola instancia de React, `packages/ui` consumido por admin Y store. (2) **Portar todo Ecme**
(38 UI + 32 shared + utils/hooks/hoc).

## Estado actual (relevamiento)

| Hecho | Detalle |
|------|---------|
| Repos | `clone/` es app **npm separada** (Next 16); `platform/` es monorepo **pnpm + turbo** (`apps/*`, `packages/*`). Root NO es workspace. |
| Versiones | admin React 19.2.3 / Vite 7 / Tailwind v4 (`tailwind.config.cjs`). store React 19.2.4 / Next 16 / Tailwind v4 (CSS `@theme`, sin config). Compatibles. |
| Tamaño | `components/ui` 207 archivos · `components/shared` 69 · `utils` 29. |
| Imports | admin usa `@/components/ui/*` **1496** veces, `@/components/shared` **332**, `@/utils` muchos. → resolver con **alias**, NO reescribir. |
| Acoplamiento app-level de ui/shared | Pocos: `@/configs/chart.config` (Chart), `@/constants/theme.constant` (Chart, DoubleSidedImage), `@/store/themeStore` (DoubleSidedImage), `@/assets` (3). Resolver moviéndolos al paquete. |
| Tokens | Ecme define `--primary/--error/--success/--warning/--info` en `admin/src/assets/styles/tailwind/index.css` y los mapea en `tailwind.config.cjs` (`colors.primary = var(--primary)`). Store v4 usa `@theme inline { --color-X: var(--X) }`. |
| Store legacy | Aún arrastra deps Payload/Puck/libsql (cuidar en migración a pnpm). |

## Riesgos que se diseñan (no se descubren)

1. **Una sola instancia de React** — package vía `file:` entre dos node_modules = "Invalid hook call". Por eso el store DEBE entrar al workspace pnpm (hoist único de React).
2. **Capa de tokens Tailwind** — componentes Ecme usan `bg-primary`, `ring-primary`, etc. El store v4 debe emitir esas utilidades mapeando los tokens en `@theme`. (Validado en Fase 0.)
3. **`"use client"`** — los componentes interactivos Ecme necesitan la directiva en Next (mecánico, codemod).
4. **pnpm estricto** — re-resuelve las deps pesadas del store (Payload/Puck); puede aflorar phantom deps.
5. **Rutas hardcodeadas a `clone/`** — deploy/tunnels/harness `_pwshot` (externo). Inventariar antes del move.

## Arquitectura objetivo

```
platform/
  packages/
    ui/                 # ← Ecme extraído
      src/{ui,shared,utils, theme/{tokens.css, theme.constant, chart.config, themeStore}}
      package.json (name @ft/ui, exports)
  apps/
    admin/   → consume @ft/ui (alias @/components/ui/* → @ft/ui/ui/*) sin tocar 1496 imports
    store/   ← ex clone/, en pnpm; consume @ft/ui; importa tokens.css en globals
```

## Fases (cada una con verificación y rollback por git)

### Fase 0 — Spike del puente de tokens (no destructivo) ✅ EN CURSO
- Agregar bridge de tokens Ecme al `@theme` del store + raw vars en `:root`.
- Página temporal con `bg-primary/text-primary-deep/bg-error`; `next build`; grep CSS compilado por el color.
- **Verifica:** Tailwind v4 del store emite las utilidades de Ecme. Borra la página (tokens quedan).

### Fase 1 — Crear packages/ui y extraer Ecme del admin (reversible)
- `pnpm` ya toma `packages/*`. Crear `packages/ui/{package.json,tsconfig}`.
- `git mv` `components/ui`, `components/shared`, `utils` → `packages/ui/src/`.
- Mover acoplamientos: `theme.constant`, `chart.config`, `themeStore`, assets usados → `packages/ui/src/theme/`. Actualizar referencias del admin a esos 4 (theme.constant/themeStore se usan app-wide → re-alias o re-export shim).
- Admin: alias `@/components/ui/*`→`@ft/ui/...`, `@/components/shared/*`, `@/utils/*` en `tsconfig.json` + `vite.config`. **Imports del admin NO cambian.**
- **Verificar:** `pnpm --filter admin build` OK. Rollback: `git restore`.

### Fase 2 — Mover store al workspace (riesgo pnpm)
- Inventariar refs a `clone/` (deploy, tunnels, `_pwshot`, NEXT_PUBLIC_API_URL).
- `git mv clone platform/apps/store`. Borrar `package-lock.json`. `pnpm install` desde platform.
- Ajustar paths rotos. **Verificar:** `pnpm --filter store build` OK.

### Fase 3 — Cablear store ↔ @ft/ui + tokens + "use client"
- store `package.json`: dep `@ft/ui` (workspace:*). Alias en `tsconfig`/`next.config` si hace falta.
- Importar `@ft/ui/theme/tokens.css` en `globals.css` (bridge ya probado en Fase 0).
- Codemod `"use client"` a componentes interactivos de `@ft/ui` (o marcar el barrel).
- Integración: usar `<Button/>` Ecme en UN tema. **Verificar:** build store.

### Fase 4 — Usar en los 3 temas + limpieza + commit
- Reemplazos puntuales donde aporte (botones/inputs/dialog/tabs de farmatotal, anvogue, ekomart).
- Quitar duplicados muertos. **Verificar:** ambos builds + typecheck. Commit/push.

## Notas
- "Compartido de verdad" exige Fase 2 (workspace). Sin ella sería copia vendorizada (descartado).
- Las libs pesadas (ApexCharts, tiptap, FullCalendar, @tanstack/react-table) viajan con el paquete aunque los temas no las usen (decisión "todo Ecme"). Tree-shaking del bundler evita que entren al bundle del store si no se importan.
