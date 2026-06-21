# Diseño — Motor de componentes (`@ft/engine`) + widget Heading de prueba

Fecha: 2026-06-20
Sub-proyecto 1 de la iniciativa "ChaiBuilder ≈ Elementor (paridad de capacidades)".
Camino elegido: **híbrido** (capa-motor reutilizable; ChaiBuilder sigue de shell del editor).
Enfoque elegido: **A) Motor schema-first con adaptadores**, el motor es **dueño del CSS**.

## Objetivo del slice

Construir el **motor de componentes**: un paquete que define cada widget como un **schema de props tipadas**, del cual se derivan (1) el **render** compartido por store y editor, (2) el **CSS** (selectors→CSS scopeado por elemento + media queries responsive) y (3) un **adaptador a ChaiBuilder** que mapea props→controles del panel. Probarlo de punta a punta con un widget **Heading/Título** que demuestre: configuración + estilos por selector + **responsive** (font-size por breakpoint) + **un binding dinámico** (texto atado a un dato real del backend) + render idéntico en editor y store.

No-objetivos (v1): librería completa de widgets, theme builder, global classes/style-repository, clon 1:1 de atómico v4, paridad de UX del panel de Elementor.

## Arquitectura

Paquete nuevo `platform/packages/engine` (`@ft/engine`), framework-mínimo (core TS puro + capa React de render). Consumido por:
- **store** (Next): `renderWidget` (SSR) + `compileCss` (inyecta `<style>` scopeado) + `resolveBindings`.
- **admin** (Ecme/ChaiBuilder): `toChaiBlock(schema)` registra el widget en ChaiBuilder (controles del panel) y su render de canvas reutiliza `renderWidget` + el CSS compilado.

Módulos internos del paquete:
- `schema/` — `defineWidget()` y los tipos de prop (prop-types).
- `css/` — compilador selectors→CSS + responsive (breakpoints).
- `bindings/` — registry de fuentes + `resolveBindings()`.
- `render/` — `renderWidget()` (React) + helpers.
- `adapters/chai/` — `toChaiBlock()` + controles custom (responsive, binding, estilo).
- `widgets/` — definiciones de widgets (v1: `heading`).

Principio: el **schema es la única fuente de verdad**. Editor, store y CSS se derivan de él. Agregar un widget = agregar un schema; agregar una capacidad = agregar un prop-type + su mapeo en css/adapter.

## 1. Schema de props tipadas (`defineWidget`)

```ts
type PropType =
  | 'string' | 'richtext' | 'number' | 'boolean'
  | 'enum'                       // options:[{value,label}]
  | 'color' | 'length'          // length = {value,unit}
  | 'typography'                // grupo: fontFamily,size(resp),weight,lineHeight,letterSpacing,transform
  | 'media' | 'link'
  | 'categoryRef' | 'productRef' | 'productIds' // pickers por query (reusan los ya hechos)

interface PropDef {
  $type: PropType
  label: string
  default?: unknown
  options?: { value: string; label: string }[]
  group?: string                // sección del panel (Content/Style/Advanced ≈)
  responsive?: boolean          // valor = { desktop, tablet, mobile }
  dynamic?: boolean             // admite binding { $dynamic: {...} }
  style?: StyleBinding | StyleBinding[]   // control → CSS
  control?: Record<string, unknown>       // overrides de UI
}

interface StyleBinding {
  selector: string              // p.ej. "{{WRAPPER}}" o "{{WRAPPER}} .ft-h"
  css: string                   // p.ej. "color" | "font-size" | "text-align"
  unit?: boolean                // append {unit} si length
  format?: (v: unknown) => string
}

interface WidgetSchema {
  type: string                  // "heading"
  label: string
  group: string
  props: Record<string, PropDef>
  render: (s: ResolvedSettings, h: RenderHelpers) => ReactNode
}

function defineWidget(w: WidgetSchema): WidgetSchema
```

**Forma del valor guardado** (`settings`, en `pages.blocks[i]`):
- prop normal: `settings[key] = value`.
- prop responsive: `settings[key] = { desktop, tablet?, mobile? }`.
- prop dinámico: `settings[key] = { $dynamic: { source: 'store.name', args?: {} } }`.

Se adopta la *idea* de `{$$type,value}` de Elementor v4 pero el tipo vive en el schema (no en cada valor) para mantener `settings` liviano; el wrapper explícito solo se usa para `$dynamic`.

## 2. Motor CSS (selectors→CSS + responsive)

`compileCss(schema, settings, elementId, breakpoints) → string`:
- Para cada prop con `style`, toma el valor de `settings[key]` y arma la regla: `selector` con `{{WRAPPER}}` → `.ft-el-<id>`, propiedad `css`, valor (+`unit` si length, +`format`).
- **Responsive (desktop-first, como Elementor):** valor base = `desktop`; `tablet` envuelto en `@media (max-width:1024px)`; `mobile` en `@media (max-width:767px)`. Breakpoints configurables (default Elementor).
- Salida: bloque CSS del elemento. El store lo inyecta en un `<style data-el="<id>">`; el editor lo inyecta en el canvas. Scoping por `.ft-el-<id>` (id único del bloque) → sin colisiones.

`typography` se expande a varias `StyleBinding` (font-size resp, weight, line-height, letter-spacing, transform).

## 3. Resolver de bindings (dynamic)

- `registerBindingSource(id, resolver)`: p.ej. `store.name`, `store.description`, `product.title`, `category.name`. Resolver `(args, ctx) => value`.
- `resolveBindings(settings, ctx) → settings`: reemplaza cada `{ $dynamic }` por su valor resuelto contra `ctx` (datos de la página/entidad). En store corre en SSR; en editor, contra un ctx de muestra (la config real de la tienda) para previsualizar.
- Equivale a los Dynamic Tags de Elementor pero con **bindings tipados** (sin el shortcode regex).

## 4. Render compartido

`renderWidget(schema, resolvedSettings, { elementId }) → ReactNode`:
- Llama `schema.render(settings, helpers)`.
- La raíz del widget recibe `className` con `ft-el-<id>` (el gancho del CSS). El CSS se maneja aparte (sección 2), no inline.
- **Misma función** en store (SSR) y en el componente de canvas de ChaiBuilder → fidelidad real editor↔store (cierra la brecha "ver la página real" para widgets del motor).

## 5. Integración con ChaiBuilder (adapter)

`toChaiBlock(schema)`:
- `registerChaiBlock(Component, config)` donde `config.props` se genera desde `schema.props`:
  - tipos simples (string/number/enum/boolean/color/media/link) → controles nativos del panel.
  - `responsive` → **widget custom** (3 inputs desktop/tablet/mobile) vía `registerChaiBlockSettingWidget`.
  - `dynamic` → **widget custom** de binding (toggle "dinámico" + selector de fuente).
  - `categoryRef/productRef/productIds` → reusan los pickers por query ya hechos.
  - props con `style` → viven en el panel y escriben a `settings`; **no** usan el StylesProp de ChaiBuilder (el CSS lo compila el motor).
- El componente de canvas: `({...settings}) => { const css = compileCss(...); return (<><style>{css}</style>{renderWidget(...)}</>) }`.
- El store: en `ChaiRender`, `case schema.type:` → resolveBindings → compileCss (inyecta `<style>`) → renderWidget.

## 6. Widget de prueba: Heading

Props:
- `text`: `string`, `dynamic:true` (puede atarse a `store.name`).
- `tag`: `enum` h1..h6 (semántica).
- `align`: `enum` left/center/right, `responsive:true`, `style:{selector:'{{WRAPPER}}', css:'text-align'}`.
- `color`: `color`, `style:{css:'color'}`.
- `typography`: `typography`, `responsive` en size → font-size por breakpoint + weight/line-height/letter-spacing.

Demuestra los 5 pilares: config + selectors→CSS + responsive + binding + render compartido.

## Modelo de datos / persistencia

Se reutiliza `pages.blocks` (JSONB). Un widget del motor se guarda como bloque `{ _id, _type:'heading', _parent, ...settings }`. El adapter asegura que ChaiBuilder lo lea/escriba; el store mapea `_type`→widget del motor. Compatible con los bloques actuales (no rompe lo existente).

## Validación / testing

- **Unit**: `compileCss` (settings→CSS, incl. responsive y unidades), `resolveBindings`.
- **E2E (harness :3000)**: en el editor, agregar Heading → configurar texto, color, alinear, font-size por breakpoint, atar texto a `store.name` → Publicar → en el store verificar (scrape + screenshot) que el `<h*>` sale con el texto bindeado, el CSS correcto y las media queries; comparar render editor vs store.

## Riesgos / decisiones abiertas

- **Doble fuente de estilo**: el motor compila CSS y NO usa el Style tab de ChaiBuilder para widgets del motor. Hay que evitar confusión: los widgets del motor muestran sus estilos en el panel de settings; el Style tab de Chai queda para los bloques legacy. (Aceptado.)
- **Responsive en el canvas**: ChaiBuilder tiene su propio switch de dispositivos; el preview de canvas debe respetar el breakpoint activo al compilar CSS. Si no expone el breakpoint activo de forma simple, el canvas muestra desktop y el responsive se valida 100% en el preview/store.
- **`registerChaiBlockSettingWidget`** ya validado; los controles custom (responsive/binding) son la parte de más trabajo del adapter.

## Orden de implementación (para writing-plans)

1. Scaffold `packages/engine` + wiring monorepo (tsconfig/paths, consumido por store y admin).
2. `schema/defineWidget` + prop-types.
3. `css/compileCss` (+ unit tests).
4. `bindings/resolveBindings` + registry (+ unit tests).
5. `render/renderWidget`.
6. Widget `heading` (schema + render).
7. Store: integrar en `ChaiRender` (resolve→css→render).
8. Adapter ChaiBuilder: `toChaiBlock` + controles custom (responsive, binding).
9. E2E :3000 (rebuild store, validar).
