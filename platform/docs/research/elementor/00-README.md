# Elementor — Arquitectura completa (drag-and-drop + componentes configurables)

Documentación de ingeniería inversa del codebase de **Elementor free (core)** + **Elementor Pro**, leída archivo por archivo. Objetivo: entender **cómo funciona el arrastrar-y-soltar** y **cómo se vuelven libremente configurables los componentes**, para replicar lo aplicable en la plataforma Farmatotal (`platform/`, builder ChaiBuilder + bloques data-bound).

Fuentes leídas:
- `C:\Users\sotelos\Downloads\Elementor\elementor` (core free — el motor: editor, controles, modelo de datos, render, dynamic tags, atomic widgets)
- `C:\Users\sotelos\Downloads\Elementor\elementor-pro` (widgets y extensiones: query/loop, theme builder, forms, woo, popup, efectos)

## Reparto de responsabilidades

- **El core free tiene el MOTOR**: editor drag-and-drop, Controls Manager, modelo de datos de elementos, persistencia, render frontend, generación de CSS, dynamic tags (infraestructura), responsive, y el sistema nuevo atomic-widgets (v4).
- **Pro agrega CAPACIDAD**: widgets ricos (forms, woo, slides…), el **Query Control** y **Loop Builder** (el origen de datos configurable, lo más relevante para nosotros), **Theme Builder** (templates condicionales), **Dynamic Tags concretos**, **Popup**, y los **efectos** (Motion FX, Interactions, Transitions).

Regla mental: si es "cómo se edita/serializa/renderiza" → core. Si es "qué widget o qué fuente de datos" → Pro.

## Los dos ejes que pediste

### A) Arrastrar y soltar (drag-and-drop)
- **`08-core-editor-drag-and-drop.md`** — EL motor de DnD: paquetes JS del editor (`editor-canvas`, `editor-elements`, `editor-elements-panel`, `editor-editing-panel`), el modelo de elementos en el editor, cómo el panel de widgets se arrastra al canvas, el árbol de elementos, sortable/draggable, drop zones, el iframe del canvas.
- **`04-editor-dnd-js-packages.md`** — los paquetes JS de Pro que EXTIENDEN el editor (collection-loop, editing-panel-extended, controls-extended, interactions, variables) y cómo se enchufan al core.
- **`07-core-data-model-persistence.md`** — qué se guarda al soltar/editar: el árbol `_elementor_data` (JSON), `element-base`/`widget-base`, documents-manager, cómo persiste y se recarga.

### B) Componentes libremente configurables
- **`06-core-controls-manager-types.md`** — EL sistema de configuración: Controls Manager, los TABS (Content/Style/Advanced), el catálogo COMPLETO de ~40 tipos de control, group controls (typography/background/border…), repeater, y el mecanismo **`selectors` (control → CSS)** que hace editable el Style tab.
- **`01-widget-control-architecture.md`** — cómo un widget de Pro declara sus controles (`register_controls`, secciones, condiciones), la base de widgets, el patrón Skin.
- **`09-core-atomic-widgets-nested-container.md`** — el sistema NUEVO (v4): props tipadas `{$$type, value}` con schema, transformers, atomic styles + global classes, el **Container** (flexbox/grid, reemplazo de section/column), y nested elements (tabs/accordion anidables).
- **`10-core-dynamic-tags-frontend-render.md`** — cómo un control acepta valor **dinámico** (`dynamic => ['active'=>true]`), el formato `[elementor-tag …]`, la resolución en render, y el pipeline settings→HTML + generación de CSS scopeado por elemento (`{{WRAPPER}}`).

### C) Fuente de datos configurable (lo más relevante para Farmatotal)
- **`02-query-loop-dynamic.md`** — el **Query Control** (el "query builder" estilo Elementor que ya replicamos parcialmente), Posts widget, **Loop Builder** (template de tarjeta + grilla data-bound), collection-loop, loop-filter, y los dynamic tags.
- **`03-theme-builder-conditions-library.md`** — Theme Builder (header/footer/single/archive como templates), **Display Conditions**, global widgets, librería de templates, mega-menu/nav-menu.

### D) Widgets interactivos / comercio / efectos
- **`05-interactive-widgets-forms-woo.md`** — Forms (form builder + actions-after-submit), WooCommerce (widgets sobre WC), Popup (triggers/conditions), Motion FX / Interactions / Transitions (efectos), y el resto de widgets ricos.

## Hallazgos clave (transversales)

1. **Todo elemento es un nodo JSON tipado** con `id`, `elType` (widget/container/section/column), `widgetType`, `settings` (mapa de valores de controles) e `elements` (hijos). Eso ES el árbol del builder. → `07`.
2. **El tab no lo fija el control**: lo hereda de `start_controls_section`. Lo que clasifica un campo como "de estilo" es tener **`selectors`** (control→CSS). → `06`.
3. **`selectors` es el corazón del Style tab**: `{{WRAPPER}} .x { prop: {{VALUE}}{{UNIT}} }` se compila a CSS por elemento, scopeado con un id único. → `06`, `10`.
4. **Dynamic = binding**: cualquier control con `dynamic.active` puede recibir `[elementor-tag …]`; en render se resuelve contra la fuente (post actual, ACF, etc.). El core trae solo la infraestructura; los tags concretos los pone Pro. → `10`, `02`.
5. **Loop Builder = template + query**: una tarjeta editable (un template) se repite sobre el resultado de un Query Control. Es exactamente nuestro modelo de bloque data-bound. → `02`.
6. **v4 (atomic) va a props tipadas con schema** (`{$$type,value}` + transformers + global classes), con paridad PHP↔JS (Zod). Es el patrón limpio de validación+serialización+render que conviene mirar para crecer. → `09`.
7. **Forms**: el POST usa `form_fields[<custom_id>]` y el handler históricamente **no valida nonce**; las acciones post-envío son un registry extensible (email/redirect/webhook/CRM). → `05`.
8. **Woo es envoltorio fino sobre WooCommerce** (shortcodes/templates); lo propio es `products-renderer.php` (query) y los fragments AJAX del carrito. → `05`.

## Mapeo a la plataforma Farmatotal (qué tomar)

| Concepto Elementor | Dónde está | Estado en Farmatotal |
|---|---|---|
| Query Control (origen configurable) | `02` | YA replicado en `blocks.tsx`/`productQuery.ts` (source/category/brand/sort/stock/precio/manual) |
| Loop Builder (template + query) | `02` | Parcial: bloques data-bound; falta "tarjeta-template" totalmente editable (Repeater Chai existe) |
| `selectors` control→CSS | `06`,`10` | Equivalente: StylesProp de Chai + `cls()` en el store |
| Dynamic tags (bindings) | `10`,`02` | Pendiente: bindings tipados (mejor que el shortcode regex de Elementor) |
| Display conditions (template por contexto) | `03` | Pendiente |
| Props tipadas `{$$type,value}` + schema | `09` | Pendiente — patrón recomendado si crecemos el motor |
| Persistencia árbol JSON | `07` | Equivalente: `pages.blocks` JSONB |
| Preview real (render del store) | `08` | YA: ruta `/preview/[slug]` + botón "Ver página real" |

## Lectura recomendada por objetivo

- "Entender el editor DnD para nuestro builder": `08` → `07` → `04`.
- "Mejorar configurabilidad de bloques": `06` → `01` → `09`.
- "Mejorar el query/loop de productos": `02` → `03`.
- "Sumar dynamic bindings / theming por contexto": `10` → `03`.
- "Forms / Woo / efectos": `05`.
