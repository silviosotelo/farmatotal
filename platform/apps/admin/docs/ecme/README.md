# Ecme — Documentación del template (admin)

Catálogo de todo lo reutilizable que trae el template **Ecme** (el admin: React 19 + Vite,
en `platform/apps/admin`). Documenta las tres áreas pedidas, consolidadas desde el **código
fuente real** (`.tsx`/types), no desde el markdown de demo que renderiza Ecme en sus rutas
`/guide/utils-doc`, `/guide/shared-component-doc` y `/ui-components`.

## Índice

| Área | Archivo | Items |
|------|---------|-------|
| UI Components (`/ui-components/*`) | [ui-components.md](./ui-components.md) | 38 |
| Shared Components (`/guide/shared-component-doc/*`) | [shared-components.md](./shared-components.md) | 32 |
| Utils, Hooks & HOCs (`/guide/utils-doc/*`) | [utils.md](./utils.md) | 29 (11 funcs · 17 hooks · 1 HOC) |

Cada item sigue el mismo template: propósito, path de import real, props/firma sacadas del
source, variantes y un snippet mínimo.

## ¿Los 3 templates del front ya tienen los componentes de Ecme?

**No.** Los 3 temas del storefront (`farmatotal`, `anvogue`, `ekomart` en `clone/src/themes`)
son una app **independiente** (Next 16) con sus **propios** componentes. No importan nada de
Ecme — verificado: cero referencias a `@/components/ui` / `components/shared` de Ecme en
`clone/src/themes`.

Motivo estructural: Ecme (`components/ui` y `components/shared`) vive **solo** en el admin
(Vite, alias `@/` → `platform/apps/admin/src`). No es un paquete compartido del monorepo, así
que **no se puede importar cross-app** sin portarlo. El storefront y el admin comparten datos
vía la API (`apps/api`), no componentes de UI.

### Si se quisieran usar en el front

Habría que **portar** (copiar/adaptar) los componentes a un paquete compartido
(`packages/ui`) o al propio `clone`. A tener en cuenta:
- Ecme está pensado para **admin/dashboard** (DataTable, Charts, GanttChart, formularios densos),
  no para storefront. Para la tienda, los temas propios suelen ser mejor opción visual.
- Varios componentes arrastran **libs externas** (ApexCharts, tiptap, FullCalendar,
  @tanstack/react-table, react-simple-maps, gantt-task-react) — ver notas en cada catálogo.
- Estilos vía Tailwind + tokens de tema de Ecme; al portar hay que llevar también esa config.

**Recomendación**: reutilizar Ecme dentro del **admin** (que ya lo usa) y mantener los temas
del front con sus propios componentes. Si en el futuro se arma un design-system compartido,
estos catálogos son el inventario de partida.

## Alcance

Documentado: `ui-components` + `shared-components` + `utils/hooks/hoc`. **Fuera de alcance**
(no pedido): views, dashboards, auth, store, services del admin. Se ignoró el espejo `js/` de
los markdown para no duplicar.
