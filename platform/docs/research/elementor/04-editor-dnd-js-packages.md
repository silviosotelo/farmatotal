# Elementor Pro — Editor / JS / Drag-and-Drop y paquetes que extienden la UI del editor

> **Alcance y honestidad sobre el repo.** Esta documentación analiza el código de
> **Elementor Pro** en `C:\Users\sotelos\Downloads\Elementor\elementor-pro`.
> Es un **plugin distribuido (build de producción)**, NO el monorepo de desarrollo:
> - Los "paquetes" bajo `assets/js/packages/` son **bundles Webpack ya compilados**
>   (`*.js` legible + `*.min.js` + `*.asset.php` manifest + `*.strings.js` i18n).
>   **No hay `package.json` ni `src/`** acá; los paths `./packages/packages/pro/<pkg>/src/...`
>   que se ven dentro de los bundles son rutas del monorepo original conservadas por Webpack.
> - **El motor núcleo de drag-and-drop NO está en este repo.** Vive en el plugin
>   *Elementor free* (Backbone/Marionette + jQuery UI sortable/draggable, el command
>   bus `$e`, `elementor.modules.controls.*`, y los paquetes `@elementor/editor-*`).
>   Pro **sólo extiende** ese editor. Cuando abajo cito `@elementor/editor`,
>   `@elementor/editor-editing-panel`, etc., son dependencias **externas** (del free),
>   no código presente en este árbol.
>
> Toda referencia `archivo:línea` es real y verificable en este repo salvo donde se
> indique explícitamente "(núcleo free, fuera del repo)".

---

## 0. TL;DR / Mapa mental

Pro engancha en el editor del core por **dos generaciones de API que conviven**:

1. **Legacy (Backbone/Marionette + jQuery UI):** el bundle `assets/js/editor.js`
   extiende `elementor.modules.controls.*`, llama `elementor.addControlView(type, view)`,
   registra filtros/acciones vía `elementor.hooks` y escucha el bus `elementor.channels`.
   El **drag-drop legacy** se implementa como **Marionette `Behavior`** inyectada con el
   filtro `controls/base/behaviors` (ej. `LoopBuilderBehavior`). No hay `.sortable()` crudo
   en Pro: el sortable real es del core free.

2. **Nuevo "v2 / Editor V4" (React + paquetes `@elementor/*`):** los 12 paquetes bajo
   `assets/js/packages/`. Cada uno es un bundle que expone `window.elementorV2.<pkg>` y
   ejecuta un `init()` que **registra controles React, inyecta UI en el panel y conecta
   con el command bus legacy `$e` vía data-hooks** (`@elementor/editor-v1-adapters`).
   El loader PHP es `core/editor/editor.php::enqueue_editor_v2_scripts()`.

El puente entre ambos mundos es `@elementor/editor-v1-adapters` (`registerDataHook`,
`$e.shortcuts`, `$e.commands`), que deja que el código React se cuelgue de los comandos
del editor v1 — incluido **`preview/drop`** (el evento de soltar en el canvas).

---

## 1. Arquitectura JS del editor: legacy vs nuevo, cómo conviven

### 1.1 Legacy — Backbone/Marionette + jQuery UI (bundle `assets/js/editor.js`)

`assets/js/editor.js` es el bundle del editor "clásico" de Pro. No reimplementa el
framework; se cuelga del singleton global `elementor` del free:

- **Modelos/colecciones Backbone:**
  - `editor.js:147` `this.collection = new Backbone.Collection(_.values(this.options.controls));`
  - `editor.js:3514` `panelWidgets = new Backbone.Collection();`
- **Vistas/behaviors Marionette:**
  - `editor.js:3725` `module.exports = Marionette.ItemView.extend({ id: 'elementor-panel-global-widget', template: '#tmpl-elementor-panel-global-widget', ... })`
  - `editor.js:4002` `class LoopBuilderBehavior extends Marionette.Behavior {`
- **Vistas de control subclaseando las del core:**
  - `editor.js:758` `module.exports = elementor.modules.controls.Repeater.extend({...})`
  - `editor.js:829` `class extends elementor.modules.controls.Repeater`
  - `editor.js:917` `class _default extends elementor.modules.controls.RepeaterRow`
- **`elementor.hooks` (sistema de filtros/acciones tipo WP en JS):**
  - `editor.js:3533` `addFilter('element/view', (DefaultView, model) => ...)`
  - `editor.js:3539` `addFilter('element/model', ...)`
  - `editor.js:3639` `addFilter('panel/elements/regionViews', ...)`
  - `editor.js:2555` `addAction('panel/open_editor/widget/form', onPanelShow)`
- **`elementor.channels` (event bus de Backbone.Radio):**
  - `editor.js:116/696/1197` `channels.editor.on('section:activated', ...)`

### 1.2 Nuevo — React + paquetes `@elementor/*` (`assets/js/packages/`)

12 paquetes, cada uno con el patrón de bootstrap idéntico al final del bundle:

```js
// editor-editing-panel-extended.js:432-435
(window.elementorV2 = window.elementorV2 || {}).editorEditingPanelExtended = __webpack_exports__;
// ...
window.elementorV2.editorEditingPanelExtended?.init?.();
```

Es decir: el bundle se auto-registra en el namespace global `window.elementorV2.<camelCase>`
y dispara su `init()`. Cada paquete importa dependencias `@elementor/*` (resueltas como
*externals* Webpack → otros scripts encolados, ver §1.3) y `react`/`react-dom`.

### 1.3 Cómo conviven — el puente `@elementor/editor-v1-adapters`

El código React no habla Backbone directamente: usa **data-hooks** sobre los comandos del
editor v1. Ejemplos en `editor-components-extended.js`:

```js
// editor-components-extended.js:4951
registerDataHook('dependency', 'editor/documents/close', args => { ... });
// editor-components-extended.js:4958  <-- engancha el DROP del canvas
registerDataHook('after', 'preview/drop', onElementDrop);
```

Y atajos de teclado vía el bus legacy `$e`:

```js
// editor-components-extended.js:5621
legacyWindow.$e.shortcuts.register(CREATE_COMPONENT_SHORTCUT_KEYS, { ... });
```

> **Conclusión:** el mundo React (v2) **no sustituye** al editor Backbone; se monta
> *encima* y reacciona a los comandos v1 (`document/elements/*`, `preview/drop`,
> `editor/documents/*`). El DnD sigue siendo del core; Pro sólo escucha el `after preview/drop`.

---

## 2. Drag and Drop: qué se infiere de la integración de Pro

**El motor DnD no está en este repo.** Lo que Pro aporta:

### 2.1 Lado legacy — Marionette Behavior inyectada (no jQuery UI crudo)

Pro añade comportamiento de edición tipo-DnD a través del filtro del core
`controls/base/behaviors` (módulo Loop Builder):

```js
// editor.js:4186
class loopBuilderModule extends elementorModules.editor.utils.Module {
// editor.js:4189
  elementor.hooks.addFilter('controls/base/behaviors', this.registerControlBehavior);
// editor.js:4196-4206
  registerControlBehavior = (behaviors = {}, view) => {
    ...
    behaviors.loopBuilder = { behaviorClass: _behavior.default, ... };
    return behaviors;
  }
```

Donde `_behavior.default` es `editor.js:4002 class LoopBuilderBehavior extends Marionette.Behavior`.

> **Importante / honestidad:** un `grep` de `.sortable()`, `jquery-ui-sortable`,
> `connectWith`, `droppable` en los bundles **legibles de Pro da 0 resultados**. El
> sortable/draggable de repeaters, secciones y el canvas es **100% del core free**.
> Los hits de "sortable/draggable/behaviors" en otros bundles (`off-canvas-editor`,
> `mega-menu-editor`, `contact-buttons`) son de **Swiper / frontend**, no DnD del editor.

### 2.2 Lado React (v2) — escuchar el `preview/drop`

El único punto concreto donde Pro toca el drop del canvas:

```js
// editor-components-extended.js:4958
registerDataHook('after', 'preview/drop', onElementDrop);
// editor-components-extended.js:6823  (redirige drops dentro de un Component)
registerDataHook('dependency', 'preview/drop', args => { ... });
```

`onElementDrop` viene de `@elementor/editor-components` (núcleo free). Pro lo usa para la
lógica de **Components** (saneo de overridable-props, prevenir anidar no-atómicos, etc.).

### 2.3 Panel de widgets y categorías (PHP — cómo entran los elementos arrastrables)

Los widgets se vuelven arrastrables porque se registran como widgets del core y se
asignan a una **categoría del panel**. Pro:

- Cada módulo expone sus widgets: `modules/forms/module.php:53`
  `public function get_widgets() { return API::filter_active_features( static::WIDGET_NAME_CLASS_NAME_MAP ); }`
  (el `Module_Base` del free los auto-registra en `elementor/widgets/register`).
- Categoría por defecto de todos los widgets Pro: `base/base-widget-trait.php:15`
  `public function get_categories() { return [ 'pro-elements' ]; }`
  (cada widget puede overridear: `modules/search/widgets/search.php:92`,
  `modules/nav-menu/widgets/nav-menu.php:34`).

El render del elemento ya soltado (preview/canvas) en Pro es mínimo:
`core/preview/preview.php:10 class Preview extends App` sólo encola estilos
(`elementor/preview/enqueue_styles`, línea 13). El JS de preview de Pro
(`assets/js/preview.js`) es **lado-frontend**, no Backbone:

```js
// preview.js:2907
class Preview extends elementorModules.ViewModule {
// preview.js:2910
  elementorFrontend.on('components:init', () => this.onFrontendComponentsInit());
// preview.js:2956
window.elementorProPreview = new Preview();
```

> O sea: el canvas/preview de Pro **inicializa handlers de frontend** (carruseles,
> popups, etc.) dentro del iframe de preview; el arrastre y el reordenamiento los maneja
> el editor del core.

---

## 3. Controles en el editor: de control PHP a vista JS

Hay **dos mecanismos**, uno por generación.

### 3.1 Legacy — `elementor.addControlView(type, JsView)`

El control PHP define un `get_type()` (string); el JS asocia ese string a una vista
Backbone/Marionette:

```js
// editor.js:2403-2404
elementor.addControlView('Fields_map', __webpack_require__('../modules/forms/assets/js/editor/fields-map-control.js'));
elementor.addControlView('form-fields-repeater', ...);
```

Lado PHP del mismo control:

```php
// modules/forms/controls/fields-map.php:22
class Fields_Map extends Control_Repeater {
//   const CONTROL_TYPE = 'fields_map'; get_type() => 'fields_map'  (líneas 26-28)

// modules/forms/module.php:112-114  (registro en el manager del core)
public function register_controls( Controls_Manager $controls_manager ) {
    $controls_manager->register( new Fields_Repeater() );
    $controls_manager->register( new Fields_Map() );
}
// hook: modules/forms/module.php:228  add_action('elementor/controls/register', ...)
```

Controles basados en plantilla Underscore (`content_template()` — patrón legacy puro):

```php
// modules/query-control/controls/template-query.php:10
class Template_Query extends Control_Select2 { // get_type() => 'template_query' (:17)
  // content_template() (:21-47) emite markup Marionette:  <# if (...) #> {{ data.actions.new.label }}
```

Group controls se registran en `elementor/controls/register`:

```php
// modules/query-control/module.php:889-896
$controls_manager->add_group_control( Group_Control_Query::get_type(), new Group_Control_Query() );
// hook: module.php:1024 add_action('elementor/controls/register', [$this,'register_controls']);
```

### 3.2 Nuevo — `controlsRegistry.register(...)` (React) en `editor-editing-panel-extended`

Acá un "control" es un **componente React** + un **PropTypeUtil** (validador Zod) +
un **layout**. El `init()` del paquete los registra contra el registry del core:

```js
// editor-editing-panel-extended.js:209-231 (init)
async function init() {
  settingsTransformersRegistry.register('attributes', proAttributesTransformer);
  controlsRegistry.register('attributes',  AttributesControl, 'full',        keyValuePropTypeUtil);
  controlsRegistry.register('options',     OptionsControl,    'full',        keyValuePropTypeUtil);

  const features = await fetchTierFeatures().catch(() => []);
  if (features.includes('atomic-custom-css')) {
    injectIntoStyleTab({ id: 'custom-css', component: CustomCssStyleSection, options: { overwrite: true } });
  }
  controlsRegistry.register('display-conditions', DisplayConditionsControl, 'two-columns', displayConditionsPropTypeUtil);

  // BC check, can be removed at 4.2.0 version
  if (typeof setLicenseConfig === 'function') {
    const isExpired = await fetchLicenseStatus().catch(() => false);
    setLicenseConfig({ expired: isExpired });
  }
}
```

Firma observada: `controlsRegistry.register(propTypeKey, ReactComponent, layout, propTypeUtil)`
donde `layout ∈ { 'full', 'two-columns', ... }`.

Los **PropTypeUtil** (puente schema PHP↔control React) se crean con `createPropUtils`
de `@elementor/editor-props` + Zod de `@elementor/schema`:

```js
// editor-controls-extended.js (prop-types/condition-group.ts)
const conditionGroupPropTypeUtil = createPropUtils('condition-group', z.array(unknownChildrenSchema));
// (prop-types/display-conditions.ts)
const displayConditionsPropTypeUtil = createPropUtils('display-conditions', z.array(z.any().nullable()));
```

La clave (`'condition-group'`, `'display-conditions'`, `'attributes'`, ...) es **el mismo
string** que el `get_key()` del Prop_Type PHP en `modules/atomic-widgets` (ver §6), de modo
que el valor serializado del servidor se matchea con el control React correcto.

### 3.3 `editor-controls-extended`: catálogo de controles React Pro

Bundle de 1876 líneas. Aporta, entre otros:
- **Monaco editor** embebido (Custom CSS) — `editor-controls-extended.js:240 init()` carga
  el loader de monaco; componentes `Editor`/`DiffEditor` memoizados (mismo archivo).
- **PropTypeUtils** `condition-group`, `display-conditions` (arriba).
- Su `init()` (líneas 1362-1366) es **license-gated**: sólo extiende propiedades de
  transición si el tier incluye `'transitions'`:
  ```js
  if (features.includes('transitions')) { extendTransitionProperties(isExpired); }
  ```
- Bootstrap: `editor-controls-extended.js:1877 window.elementorV2.editorControlsExtended?.init?.();`
- Deps (manifest `editor-controls-extended.asset.php`): `elementor-v2-editor-controls`,
  `-editor-props`, `-editor-ui`, `-schema`, `-license-api`, `react`, `wp-i18n`.

---

## 4. `editor-one` y el inventario de paquetes `@elementor/editor-*`

### 4.1 Módulo `modules/editor-one/`

Un único archivo: `modules/editor-one/module.php` (no tiene `Classes/`; los `Classes\*`
que importa son del **core free** `Elementor\Modules\EditorOne`).

- **Qué es:** "Editor One" es la **nueva área de administración unificada** de Elementor
  (un único menú/host "Elementor" en wp-admin). Este módulo Pro es una **capa puente fina**:
  **no encola ningún script**, sólo desbloquea features Pro dentro del menú del core y
  registra una entrada de menú "Custom Elements".
- Registro: `core/modules-manager.php:86` (`'editor-one'`).
- Constructor (`modules/editor-one/module.php:28-48`):
  ```php
  add_filter( 'elementor/modules/editor-one/is_pro_module_enabled', '__return_true' );
  add_filter( 'elementor/editor-one/menu/legacy_pro_mapping', [ $this, 'add_legacy_pro_mapping' ] );
  add_action( 'elementor/editor-one/menu/register', function ( Menu_Data_Provider $menu_data_provider ) {
      $menu_data_provider->register_menu( new Editor_One_Custom_Elements_Menu() );
  } );
  add_filter( 'elementor_one/upgrade_url', fn() => self::UPGRADE_URL, PHP_INT_MAX );
  // si hay licencia activa, remueve el item de menú "Upgrade"
  ```
- `is_active()` (`:24-26`) depende de que el módulo `editor-one` del **core** esté cargado;
  **no registra experimento propio**. Helper: `base/editor-one-trait.php` (`Editor_One_Trait::is_editor_one_active()`).
- Otros módulos Pro alimentan ese mismo menú vía `elementor/editor-one/menu/register`
  (assets-manager, custom-code, forms, notes, popup, theme-builder).

> No confundir con `core/app/` (`core/app/app.php` + `core/app/modules/`), que es la
> **App React separada** de Pro (fuera del editor: finder, kit-library, etc.), distinta del
> editor y de Editor One.

### 4.2 Los 12 paquetes Pro y sus dependencias `@elementor/*` (de los `*.asset.php`)

Handle interno = `elementor-v2-<carpeta>`. Resumen (1-2 líneas c/u):

| Paquete (`assets/js/packages/`) | Qué hace |
|---|---|
| **core-adapter-utils** | Mínimo (sin deps). Exporta **una sola** función: `isCoreAtLeast(minVersion)` — compara `window.elementorCommonConfig.version` (`core-adapter-utils.js:13-23`) para *gatear features según la versión del Elementor free*. No tiene `init` real. Reusado por components/templates/variables/collection-loop. |
| **license-api** | Cliente de licencia/tier: `fetchLicenseStatus()`, `fetchTierFeatures()`. Deps: `http-client`, `query`. Lo consumen casi todos para *feature-gating*. |
| **editor-controls-extended** | Controles React Pro (Monaco/Custom CSS) + PropTypeUtils (`condition-group`, `display-conditions`). Catálogo de UI de control. (§3.3) |
| **editor-editing-panel-extended** | Registra esos controles en `controlsRegistry`, inyecta secciones en el Style/Settings tab (`injectIntoStyleTab`), registra transformers de settings. (§3.2) |
| **editor-components-extended** | El más grande (8036 líneas). Feature "Components" (símbolos reusables): tab de panel (`registerTab`), reemplazo de panel de edición, indicadores de campo, control replacement, **data-hooks sobre `preview/drop` y `document/elements/*`**, atajo crear-componente, integración MCP. (§2.2) |
| **editor-documents-extended** | Acciones en el menú del documento del App Bar (`documentOptionsMenu.registerAction`), bloqueo por licencia en `document/elements/create`, store. |
| **editor-templates-extended** | Integra plantillas/Global Classes con el repositorio de estilos (`editor-styles-repository`, `editor-global-classes`). |
| **editor-variables-extended** | Variables de diseño Pro (tokens) como controles/props (`editor-variables`, `editor-props`, `schema`). |
| **editor-interactions-extended** | Editor de **Interactions** (12691 líneas): registra controles por tipo de interacción (`trigger`, `easing`, `effect`...) vía `registerInteractionsControl`. (§5) |
| **editor-collection-loop** | **STUB hoy** — `init()` vacío con TODO (§ honesto abajo). Para la futura reconstrucción atómica del Loop. |
| **editor-site-navigation-extended** | Extiende la navegación de sitio del editor (App Bar). Deps mínimas (`editor-site-navigation`, `icons`). |
| **editor-notes** | Notas colaborativas en el App Bar. Deps: `editor-app-bar`, `editor-v1-adapters`, `icons`. |

**`editor-collection-loop` — honestidad sobre lo que NO hace todavía:**

```js
// editor-collection-loop.js:15-17 (init)
function init() {
  // (cuerpo efectivamente vacío)
  // Future tickets will register custom views, panel controls, and edit-mode UI here.
}
// :100  window.elementorV2.editorCollectionLoop?.init?.();
```

Es decir: el paquete está **cableado y encolado** (vía `modules/collection-loop/module.php:48-51`)
pero su lógica de editor aún no está implementada en esta versión.

### 4.3 Dependencias `@elementor/*` que consumen (= API pública del editor del free)

De los `*.asset.php`, los handles `elementor-v2-*` más referenciados (todos **del core
free**, son los puntos de extensión oficiales):

`editor`, `editor-canvas`, `editor-controls`, `editor-props`, `editor-editing-panel`,
`editor-elements`, `editor-elements-panel`, `editor-panels`, `editor-ui`,
`editor-documents`, `editor-app-bar`, `editor-components`, `editor-current-user`,
`editor-notifications`, `editor-mcp`, `editor-v1-adapters`, `editor-styles-repository`,
`editor-global-classes`, `editor-variables`, `editor-site-navigation`,
y utilitarios `schema`, `store`, `ui`, `icons`, `events`, `http-client`, `query`, `utils`.

> `editor-v1-adapters` es el **puente** legacy↔React (data-hooks + `$e`). `editor-mcp` es
> la integración con el asistente AI/MCP (ej. `getMCPByDomain('components', ...)` en
> `editor-components-extended.js:5074 initMcp`).

---

## 5. Interactions (parte de editor)

Módulo `modules/interactions/` (PHP) + paquete `editor-interactions-extended` (React) +
bundles legacy `assets/js/editor-interactions-pro.js` / `interactions-pro.js`.

- **Gating** (`modules/interactions/module.php`): experimento `e_pro_interactions` (L19),
  requiere Atomic Widgets + Interactions del core + Elementor ≥4.0 (L62-68) + feature de
  licencia `pro-interactions` (L45).
- **Registro del paquete React** (`modules/interactions/hooks.php`):
  ```php
  const PACKAGES = [ 'editor-interactions-extended' ];                 // :16-18
  add_filter( 'elementor-pro/editor/v2/packages', function ( $packages ) {
      return array_merge( $packages, self::PACKAGES );                 // :28-34
  } );
  ```
- **Swap de handlers legacy** (`hooks.php:108-120`): *dequeue* del handle del core
  `elementor-editor-interactions` y *enqueue* del de Pro `elementor-editor-interactions-pro`
  (bundle `editor-interactions-pro.js`), luego
  `wp_localize_script( ... 'ElementorInteractionsConfig', $this->get_config() )`.
- **Registro de controles React por tipo de interacción**
  (`editor-interactions-extended.js`, `init()` ~L2390-2441):
  ```js
  registerInteractionsControl({ type: 'trigger',
      component: isLicenseExpired ? TriggerExpired : Trigger,
      options: Object.keys(TRIGGER_OPTIONS) });
  injectIntoTop({ id: 'scroll-grid-overlay', ... });   // overlay en el canvas
  ```
  Tipos registrados: `replay`, `easing`, `trigger`, `start`, `end`, `relativeTo`,
  `effect`, `customEffects`, `repeat`, `times` — cada uno con su componente normal y un
  fallback `*Expired` (license-gated por `fetchLicenseStatus()`).

> Modelo conceptual: una **interaction = { trigger (cuándo) + effect/customEffects (qué:
> move/rotate/scale/opacity...) + timing (easing/repeat/times) }**. Pro registra un control
> React por cada uno de esos campos contra el registry del core.

**Relación Loop:** `editor-collection-loop` (paquete v2, §4.2) es la reconstrucción atómica
del Loop; `modules/loop-builder/` y `modules/loop-filter/` son los módulos **legacy**
(widgets `loop-grid`/`loop-carousel`/`taxonomy-filter`) cuyo JS de editor se carga como
bundles clásicos (`assets/js/loop*.bundle.js`, `loop-filter-editor.*.bundle.js`) vía
`get_script_depends` de cada widget, **no** por el filtro `elementor-pro/editor/v2/packages`.

---

## 6. Atomic Widgets: de schema PHP a control React (sin JS propio)

`modules/atomic-widgets/` es **PHP puro** (no trae React). Inyecta prop-types en el schema
del core; el editor React del free los convierte en controles.

```php
// modules/atomic-widgets/module.php:32-37
add_filter( 'elementor/atomic-widgets/props-schema',
    fn( $schema ) => $this->inject_props_schema( $schema ), 10, 1 );
// :39-42  transformers servidor: prop-value -> salida resuelta
add_action( 'elementor/atomic-widgets/settings/transformers/register',
    fn ( $transformers ) => $this->register_settings_transformers( $transformers ) );
// :54-73  inject_props_schema(): $schema['display-conditions'] = $display_conditions_prop_type;
```

Cada Prop_Type extiende clases base del **core** y expone `get_key()`:

```php
// modules/atomic-widgets/prop-types/display-conditions/display-conditions-prop-type.php:12-20
class Display_Conditions_Prop_Type extends Array_Prop_Type {
  public static function get_key(): string { return 'display-conditions'; }
  protected function define_item_type(): Prop_Type { return Condition_Group_Prop_Type::make(); }
}
```

**Flujo PHP→React (inferido):**
1. El widget atómico declara `define_props_schema()` → mapa `nombre => Prop_Type`
   (ej. `modules/collection-loop/elements/collection-loop/collection-loop.php:62-70`:
   `Classes_Prop_Type`, `String_Prop_Type`, `Number_Prop_Type`, `Attributes_Prop_Type`).
2. El schema se serializa a JSON y viaja al editor (config del documento).
3. El registry React del core matchea cada `get_key()` (`'display-conditions'`,
   `'condition-group'`, primitivos `'string'`/`'number'`) con el componente React
   registrado para esa key.
4. Pro registra **sólo** el Prop_Type PHP + transformer (save/render). El control React
   sale del free, **salvo** los que Pro añade explícitamente en
   `editor-editing-panel-extended.init()` (§3.2) con su `PropTypeUtil` de `editor-controls-extended`.

> Por eso `createPropUtils('display-conditions', ...)` en el JS y
> `Display_Conditions_Prop_Type::get_key() === 'display-conditions'` en el PHP usan **la
> misma clave**: es el contrato schema↔control.

---

## 7. Cómo se guarda/serializa y se sincroniza con el preview

> El **modelo de datos canónico** (estructura del documento: árbol de elementos con
> `id`, `elType`, `widgetType`, `settings`, `elements[]`) y la **persistencia** (AJAX
> `document/save`, historia undo/redo) son **del core free**. Pro se engancha por hooks.

Lo que se observa en Pro:

- **Hooks de datos sobre comandos del editor v1** (todo en
  `editor-components-extended.js`), que es como Pro reacciona a cambios del modelo:
  ```js
  registerDataHook('after', 'preview/drop', onElementDrop);                       // :4958
  registerDataHook('dependency','document/elements/delete', (args,opts)=>{...});  // :6564
  registerDataHook('after','document/history/undo', async (_,res)=>{...});        // :6610
  registerDataHook('after','document/history/redo', (_,res)=>{...});              // :6637
  registerDataHook('after','editor/documents/attach-preview', ()=>{...});         // :6605
  registerDataHook('after','document/elements/duplicate', (_a,res)=>{...});       // :7051
  registerDataHook('after','document/elements/copy', args=>{...});                // :7057
  ```
  Estos `'dependency'` (validar/abortar antes) y `'after'` (post-proceso) son
  literalmente el sistema de **comandos `$e`** del editor v1 expuesto a React por
  `@elementor/editor-v1-adapters`.

- **Hook de guardado:** `editor-components-extended.js:4959`
  `window.elementorCommon.__beforeSave = beforeSave;` — Pro engancha un transform global
  justo antes de que el core serialice/guarde el documento (saneo de
  overridable-props de Components).

- **Transformers de settings (lado JS, atómico):**
  `editor-editing-panel-extended.js:210`
  `settingsTransformersRegistry.register('attributes', proAttributesTransformer)` —
  transforma el valor del prop `attributes` al aplicarse al canvas.
  En PHP, el espejo es `register_settings_transformers()` de atomic-widgets (§6).

- **Sincronización con el preview:** el canvas vive en un **iframe** (preview). Pro:
  - encola estilos al iframe (`core/preview/preview.php:13` `elementor/preview/enqueue_styles`),
  - corre handlers de frontend dentro del iframe (`preview.js:2907` `class Preview extends
    elementorModules.ViewModule`, escuchando `elementorFrontend.on('components:init', ...)`),
  - reacciona a `editor/documents/attach-preview` (hook arriba) para re-inicializar tras
    recargar el preview.
  La re-render del elemento al cambiar settings la hace el core (data-binding
  Backbone / re-render atómico); Pro no la reimplementa.

---

## 8. Resumen de puntos de integración (cheat-sheet)

**PHP (carga):**
- `core/editor/editor.php:52-54` action `elementor/editor/v2/scripts/enqueue` →
  `enqueue_editor_v2_scripts()` (`:115-150`): lee `assets/js/packages/<pkg>/<pkg>.asset.php`
  y `wp_enqueue_script` con handle+deps del manifest.
- Constantes: `APP_BAR_DEPS_V2` (siempre) y `EDITOR_V4_PACKAGES` (sólo si experimento
  Atomic Widgets activo) en `core/editor/editor.php:18-29`.
- Filtro de extensión: `apply_filters('elementor-pro/editor/v2/packages', ...)` — módulos
  añaden su paquete (interactions `hooks.php:28-34`, variables, notes, collection-loop).
- Legacy: `elementor/editor/before_enqueue_scripts` → `enqueue_editor_scripts()`
  (`core/editor/editor.php:49,96`) encola el bundle `assets/js/editor.js`.
- Widgets/controles: `get_widgets()`, `get_categories()` (`base/base-widget-trait.php:15`
  → `'pro-elements'`), `elementor/controls/register` + `Controls_Manager`.

**JS legacy (`assets/js/editor.js`):** `elementor.addControlView(type,view)`,
`elementor.modules.controls.*` (subclase), `elementor.hooks.addFilter/addAction`,
`elementor.channels.editor`, Marionette `Behavior` vía filtro `controls/base/behaviors`.

**JS nuevo (`assets/js/packages/*`):** `window.elementorV2.<pkg>.init()`;
`controlsRegistry.register(key, Component, layout, propTypeUtil)`;
`settingsTransformersRegistry.register`; `injectIntoStyleTab` / `injectIntoTop` /
`injectIntoLogic` / `injectIntoPanelHeaderTop`; `registerTab` (elements panel);
`registerControlReplacement`; `registerFieldIndicator`;
`documentOptionsMenu.registerAction` (App Bar);
`registerInteractionsControl`; `createPropUtils(key, zodSchema)`;
puente: `registerDataHook(phase, 'comando/v1', cb)` y `$e.shortcuts.register`.

**Lo que NO está en este repo (núcleo free):** el motor DnD (sortable/draggable del
canvas y repeaters), el command bus `$e`/`document/*`, la persistencia `document/save`,
la historia undo/redo, y todos los paquetes `@elementor/editor-*` base.
