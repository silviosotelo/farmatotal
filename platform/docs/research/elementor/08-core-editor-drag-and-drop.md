# Elementor CORE (free) — Motor de Drag-and-Drop y arquitectura JS del editor

> Repo analizado: `C:\Users\sotelos\Downloads\Elementor\elementor` (Elementor **free/core**, build de producción).
>
> Este documento es el **complemento del lado motor** de `04-editor-dnd-js-packages.md`. Aquel se
> escribió desde el repo de **Pro**, donde el DnD solo se podía *inferir* (Pro solo escucha el
> `preview/drop`). Acá está el **código real del motor**, porque en el free vive el bundle
> `assets/js/editor.js`, que — aunque es un build de Webpack — **no está minificado**: conserva los
> nombres de función, los comentarios JSDoc y hasta las rutas de los módulos fuente
> (`../assets/dev/js/editor/...`) en los headers de cada módulo. Todo lo de la sección legacy es
> **código leído literal**, no inferencia.
>
> Lo que sí es inferencia (marcado como tal) son los paquetes React `@elementor/editor-*` de
> `assets/js/packages/*/*.js`: ahí los `.js` son bundles en **una sola línea** (semi-minificados).
> Igual conservan los nombres de export y, en algunos casos, la ruta fuente `.ts` dentro de la
> definición del módulo Webpack, lo que permite reconstruir la API con bastante seguridad.

---

## 0. TL;DR / Mapa mental

Elementor tiene **dos motores de editor conviviendo**:

1. **Legacy (V1)** — Backbone.Model/Collection + Marionette.Views + jQuery, bundle `assets/js/editor.js`
   (handle WP `elementor-editor`). Es **el motor real de drag-and-drop** y el dueño del árbol de
   elementos, del preview y de la API de comandos `$e`.
2. **Nuevo (V2)** — paquetes React `@elementor/editor-*` en `assets/js/packages/`
   (handles WP `elementor-v2-editor-*`). **No reimplementa el DnD**: lo delega a V1 vía el puente
   `editor-v1-adapters` (`runCommand`, `registerDataHook`, `v1ReadyEvent`, channels). El V2 aporta
   el render de **atomic widgets** en el canvas, los paneles React y el sistema de estilos/props.

El DnD legacy **NO usa jQuery UI draggable** para arrastrar desde el panel. Usa **dos mecanismos
distintos** según el tipo de contenedor:

- **HTML5 Drag and Drop API nativa**, envuelta en un plugin propio `$.fn.html5Draggable` /
  `$.fn.html5Droppable` (definido en el mismo `editor.js`). Se usa para **Containers** (flexbox/grid,
  el modelo moderno) y para **Columns**. Es lo que maneja arrastrar un widget desde el panel y
  soltarlo en el canvas.
- **jQuery UI `.sortable()`**, encapsulado en un `Marionette.Behavior` llamado `SortableBehavior`
  (`behaviors/sortable.js`). Se usa para **reordenar secciones/columnas** del modelo legacy
  (sections/columns) y para el Navigator.

Flujo de alta de un widget (arrastrar panel → canvas):

```
PanelElementView.html5Draggable.onDragStart
  → channels.panelElements.reply('element:selected', view).trigger('element:drag:start')
        ↓ (arrastre HTML5 nativo; el helper visual se setea con dataTransfer.setDragImage)
ContainerView.html5Droppable.onDropping(side, event)   // o ColumnView
  → view.onDrop(event, {at: index})
      → $e.run('preview/drop', {container, model, options})
          → (hook/command) → $e.run('document/elements/create', {container, model, options})
              → BaseContainer.addElement(model) → collection.add → Marionette renderiza la vista
```

---

## 1. Arquitectura JS del editor: legacy vs nuevo

### 1.1 Legacy (V1) — Backbone/Marionette + jQuery

- **Bundle**: `assets/js/editor.js` (handle `elementor-editor`) + `assets/js/editor-modules.js`
  (handle `elementor-editor-modules`).
- **Registro PHP**: `core/editor/loader/editor-base-loader.php:40` registra `elementor-editor-modules`,
  `:144` registra `elementor-editor` (con dependencia de `elementor-editor-modules` en `:148`),
  `:172` aplica `wp_set_script_translations`. El enqueue se dispara en
  `core/editor/editor.php:332 enqueue_scripts()` → `$this->get_loader()->register_scripts()` /
  `enqueue_scripts()`.
- **Modelo de datos**: cada elemento es un `Backbone.Model` con `elType` (`section` | `column` |
  `container` | `widget`) y una colección hija `elements` (`Backbone.Collection`). Cada Model tiene
  una **Vista Marionette** (`SectionView`, `ColumnView`, `ContainerView`, `WidgetView`) que extiende
  `BaseElementView` (`../assets/dev/js/editor/elements/views/base.js`).
- **Container (bridge)**: Elementor envuelve model+view+settings+children+parent en un objeto
  `Container` (`elementor.getContainer(id)`). Es el argumento canónico de todos los comandos `$e`.
- **Behaviors**: comportamientos Marionette reutilizables que se inyectan en las vistas: `Sortable`,
  `Resizable`, `contextMenu`, `widget-draggable`, etc. (ver `editor.js` `behaviors: function(){...}`
  en cada vista, p.ej. `editor.js:34997` para `ColumnView`, `:35272` para `ContainerView`).

### 1.2 Nuevo (V2) — paquetes React `@elementor/editor-*`

- **Ubicación**: `assets/js/packages/<paquete>/<paquete>.js` (+ `.min.js`, `.asset.php`, `.strings.js`).
- **Handles WP**: `elementor-v2-<paquete>` (ej. `elementor-v2-editor-canvas`). Deps en el
  `<paquete>.asset.php`. El **paquete raíz** `editor` (handle `elementor-v2-editor`,
  `editor.asset.php`) depende de `editor-current-user`, `editor-ui`, `editor-v1-adapters`,
  `locations`, `query`, `store`, `ui`, `react`, `react-dom`.
- **Registro PHP**: `core/editor/loader/v2/editor-v2-loader.php` — `get_packages_to_enqueue()`
  (`:229`) decide qué paquetes V2 cargar; `:108` registra cada paquete con dependencia de
  `elementor-editor` (¡el bundle V1!), confirmando que **V2 corre encima de V1**.
- **State**: store estilo Redux (`@elementor/store`, export `__createStore` en el bundle `editor`),
  no Backbone.

### 1.3 Cómo conviven — el puente `editor-v1-adapters`

`assets/js/packages/editor-v1-adapters/editor-v1-adapters.js` expone la API con la que React habla
con el `$e`/`elementor` legacy. Exports reales (extraídos del bundle):

| Export | Qué hace |
|---|---|
| `runCommand` / `runCommandSync` | Wrapper de `$e.run(...)` desde React (async/sync). |
| `registerDataHook` | Registra hooks de datos sobre comandos V1 (ej. interceptar `document/elements/create`). |
| `registerCommandListener` / `commandStartEvent` / `commandEndEvent` | Escuchar el ciclo de vida de comandos `$e`. |
| `listenTo` / `useListenTo` / `registerWindowEventListener` | Bridge de eventos V1 → React (hook). |
| `registerRoute` / `registerRouteListener` / `routeOpenEvent` / `routeCloseEvent` | Bridge del router de paneles `$e.route`. |
| `v1ReadyEvent` / `getV1LoadingPromise` / `dispatchReadyEvent` | Sincronización de arranque V1↔V2. |
| `getCanvasIframeDocument` | Devuelve el `document` del **iframe del preview** (clave para el canvas). |
| `getElementorConfig` / `getElementorFrontendConfig` | Acceso a `elementor.config`. |
| `blockCommand` | Bloquear un comando V1 (usado por promociones Pro / validaciones). |

> Nota: los nombres con prefijo `__private*` (`__privateRunCommand`, `__privateRunCommandSync`,
> `__privateListenTo`, `__privateRegisterRoute`, ...) son la implementación interna que los exports
> públicos envuelven.

---

## 2. Drag and Drop — el mecanismo concreto (lado legacy = motor real)

### 2.1 El plugin propio: `$.fn.html5Draggable` / `$.fn.html5Droppable`

Elementor **no** usa jQuery UI para el arrastre panel→canvas. Implementa la **HTML5 Drag & Drop API
nativa** (`dragstart`/`dragenter`/`dragover`/`drop`/`dragleave`) en dos plugins jQuery definidos al
final de `editor.js`:

`editor.js:66665`
```js
var plugins = {
  html5Draggable: Draggable,
  html5Droppable: Droppable
};
$.each(plugins, function (pluginName, Plugin) {
  $.fn[pluginName] = function (options) { ... $.data(this, pluginName, new Plugin(options)); ... };
});
```

**Droppable** (la zona de soltado). Engancha eventos HTML5 sobre los `items` y gestiona el
*placeholder* y los *sides*:

`editor.js:66642`
```js
var attachEvents = function attachEvents() {
  elementsCache.$element
    .on('dragenter', settings.items, onDragEnter)
    .on('dragover',  settings.items, onDragOver)
    .on('drop',      settings.items, onDrop)
    .on('dragleave drop', settings.items, onDragLeave);
};
```

**Matching por grupos** (qué se puede soltar dónde): el draggable serializa sus grupos como un tipo
JSON dentro de `dataTransfer.types`, y el droppable los compara con sus propios `groups`:

`editor.js:66529 isDroppingAllowed()`
```js
if (settings.groups && hasFullDataTransferSupport(event)) {
  dataTransferTypes = event.originalEvent.dataTransfer.types;
  dataTransferTypes.forEach(function (type) {
    draggableGroups = JSON.parse(type);            // grupos viajan como JSON en dataTransfer.types
    settings.groups.forEach(function (groupName) {
      if (-1 !== draggableGroups.groups.indexOf(groupName)) { isGroupMatch = true; ... }
    });
  });
  if (!isGroupMatch) return false;
}
if ('function' === typeof settings.isDroppingAllowed) { ... }   // callback extra por-vista
```

El grupo usado por todos los elementos del editor es `['elementor-element']`.

**Placeholder + side**: en `onDragEnter`/`onDragOver` calcula el lado (`top`/`bottom`/`left`/`right`)
e inserta un placeholder visual antes/después del item objetivo:

`editor.js:66471`
```js
var insertMethod = ['bottom', 'right'].includes(currentSide) ? 'after' : 'before';
$(targetElement)[insertMethod](elementsCache.$placeholder);
```

Hay variantes de placeholder según el tipo de container: `insertGridRowPlaceholder`,
`insertFlexRowPlaceholder`, `insertDefaultPlaceholder` y `addLogicalAttributesToPlaceholder`
(`editor.js:66474-66528`), que calculan márgenes/anchos con `getComputedStyle` para que el
placeholder respete padding/border del container (flex y grid).

`onDrop` simplemente delega al callback de la vista:

`editor.js:66630`
```js
var onDrop = function onDrop(event) {
  event.preventDefault();
  setSide(event);
  if (!isDroppingAllowedState) return;
  if (settings.onDropping) settings.onDropping(currentSide, event);   // ← la vista decide qué crear
};
```

### 2.2 La fuente del arrastre: el panel de widgets

Cada widget del panel es una `PanelElementView`. En `onRender` se hace draggable con el plugin
nativo y, al empezar a arrastrar, publica el elemento seleccionado en el channel `panelElements`:

`editor.js:40331`
```js
this.ui.element.html5Draggable({
  onDragStart: function () {
    elementor.channels.editor.reply('element:dragged', null);              // resetea cache de sort
    elementor.channels.panelElements.reply('element:selected', _this)      // ← quién se arrastra
                                     .trigger('element:drag:start');
  },
  onDragEnd: function () { elementor.channels.panelElements.trigger('element:drag:end'); },
  groups: ['elementor-element']
});
```

Click (en vez de arrastrar) también inserta, vía `addToPage()` → `$e.run('preview/drop', ...)`
(`editor.js:40403`, comando en `:40483`). Si el widget no es editable (es Pro/promoción),
`onMouseDown` abre el diálogo "Upgrade" (`editor.js:40364`).

> El **panel de elementos / categorías / búsqueda** es la ruta `panel/elements/categories`
> (`$e.route('panel/elements/categories')`, p.ej. `editor.js:34971`, `:35752`, `:39156`). En V2 el
> panel se reusa: ver §6.

### 2.3 La zona de soltado: Containers y Columns

**ColumnView** (modelo legacy de columnas) — `editor.js:35156`:
```js
this.$el.html5Droppable({
  items: ' > .elementor-widget-wrap > .elementor-element, >.elementor-widget-wrap > .elementor-empty-view > .elementor-first-add',
  axis: ['vertical'],
  groups: ['elementor-element'],
  isDroppingAllowed: this.isDroppingAllowed.bind(this),
  currentElementClass: 'elementor-html5dnd-current-element',
  placeholderClass: 'elementor-sortable-placeholder elementor-widget-placeholder',
  hasDraggingOnChildClass: 'elementor-dragging-on-child',
  onDropping: function (side, event) {
    elementor.getPreviewView().onPanelElementDragEnd();          // fin de drag manual (iframe)
    _this.onDrop(event, { side: side, at: getDropIndex(side, event) });
  }
});
```
`ColumnView.isDroppingAllowed` (`editor.js:35077`) valida por `elType` (container siempre permitido,
section solo si no es inner, widget sí).

**ContainerView** (flexbox/grid, modelo moderno) — `getDroppableOptions()` en `editor.js:35336`.
Es más rico: calcula el `axis` según `flex_direction`/`grid_auto_flow` (`getDroppableAxis`,
`:35330`), y en `onDropping` (`:35352`) decide entre **mover** (si el elemento ya existe en el árbol)
o **crear** (si viene del panel):

`editor.js:35352`
```js
onDropping: function (side, event) {
  event.stopPropagation();
  elementor.getPreviewView().onPanelElementDragEnd();
  var draggedView = elementor.channels.editor.request('element:dragged'), ...
  // ...calcula newIndex excluyendo el propio elemento si se arrastra dentro del mismo padre...
  if (draggedView) {                                  // reordenar/mover dentro del canvas
    // bloquea meter un container dentro de su propio hijo
    elementor.channels.editor.reply('element:dragged', null);
    $e.run('document/elements/move', {
      container: draggedView.getContainer(),
      target: _this.getContainer(),
      options: { at: newIndex }
    });
    return;
  }
  _this.onDrop(event, { at: newIndex });              // viene del panel → crear
}
```

### 2.4 `BaseElementView.onDrop` → `preview/drop`

El callback común de soltado (en `base.js`) decide entre import de archivos, o alta de elemento:

`editor.js:46241`
```js
onDrop: function onDrop(event, options) {
  var input = event.originalEvent.dataTransfer.files;
  if (input.length) {                                  // soltaste un archivo (img/json)
    $e.run('editor/browser-import/import', { input, target: this.getContainer(), options: {...} });
    return;
  }
  var args = {};
  args.model = Object.fromEntries(Object.entries(
      elementor.channels.panelElements.request('element:selected').model.attributes)
      .filter(([key]) => ['elType','widgetType','custom','editor_settings'].includes(key)));
  args.container = this.getContainer();
  args.options = options;
  $e.run('preview/drop', args);                        // ← comando central de alta por DnD
  // ...dispatch de evento de analítica 'add_element' (location: editor_panel)...
}
```

`addElementFromPanel` (`editor.js:32832`) es el camino equivalente cuando se selecciona desde panel
sin DnD, y termina igual en `$e.run('document/elements/create', {container, model, options})`
(`:32861`).

### 2.5 El otro mecanismo: `SortableBehavior` (jQuery UI sortable)

Para **reordenar** sections/columns del modelo legacy (y para el Navigator) Elementor sí usa jQuery
UI `.sortable()`, encapsulado como `Marionette.Behavior`:
`../assets/dev/js/editor/elements/views/behaviors/sortable.js` (`editor.js` ~34200-34510).

`editor.js:34332 applySortable()`
```js
var defaultSortableOptions = {
  placeholder: 'elementor-sortable-placeholder elementor-' + this.getOption('elChildType') + '-placeholder',
  cursorAt: { top: 20, left: 25 },
  helper: this._getSortableHelper.bind(this),
  cancel: 'input, textarea, button, select, option, .elementor-inline-editing, .elementor-tab-title',
  start: function () { $childViewContainer.sortable('refreshPositions'); }
};
var sortableOptions = _.extend(defaultSortableOptions, this.view.getSortableOptions());
if (this.isSwappable()) { $childViewContainer.addClass('e-swappable'); sortableOptions = _.extend(sortableOptions, this.getSwappableOptions()); }
$childViewContainer.sortable(sortableOptions);
```

- `getSortableOptions()` lo aporta cada vista. Ej. **Column** usa `connectWith` para permitir mover
  widgets entre columnas: `editor.js:35116`
  ```js
  getSortableOptions: function () { return { connectWith: '.elementor-widget-wrap', items: '> .elementor-element' }; }
  ```
  **Sections container** usa un `handle`: `editor.js:34406`
  ```js
  getSortableOptions: function () { return { handle: '> .elementor-element-overlay .elementor-editor-element-edit', items: '> .elementor-section, > .e-con' }; }
  ```
- Helper visual: `_getSortableHelper` arma un `<div class="elementor-sortable-helper">` con icono +
  título del modelo (`editor.js:34377`).
- Callbacks de sort (`startSort`/`updateSort`/`receiveSort`/`onSortReceive`/`onSortUpdate`,
  `editor.js:34410-34488`) usan los channels `elementor.channels.data` (`dragging:model`,
  `dragging:view`, `dragging:parent:view`) para coordinar, y finalmente:
  ```js
  moveChild: function (child, index) {                  // editor.js:34500
    return $e.run('document/elements/move', { container: child, target: this.view.getContainer(), options: { at: index } });
  }
  ```
- **Swappable** (containers flex): `getSwappableOptions` (`editor.js:34307`) crea un placeholder
  `e-swappable--item-placeholder` y refresca posiciones, para evitar arrastrar un container dentro de
  sí mismo.

> Hay además `widget-draggable.js` (`editor.js:34514`) e `initDraggable()` (`editor.js:33595`) que
> hacen **draggable nativo a los propios widgets dentro de un container** (mover por arrastre, no
> reordenar por sortable). `initDraggable` solo se activa para containers/hijos, con
> `getDraggableHelper()` (`:33582`) que clona el chip con icono+título y lo setea como
> `dataTransfer.setDragImage(helper, 25, 20)` (`:33626`).

---

## 3. El canvas / preview

- El preview es un **`<iframe>`**. El bundle V1 lo referencia como `elementor.$preview` y
  `elementor.getPreviewView()`. El puente V2 lo obtiene con
  `editor-v1-adapters.getCanvasIframeDocument()`.
- **Render legacy**: el árbol Backbone se renderiza con Marionette dentro del iframe.
  `BaseContainer.addElement(data, options)` (`editor.js:46096`) hace `collection.add(model, {at})` y
  Marionette construye/inserta la vista hija automáticamente (`buildChildView`,
  `editor.js:46335`, parcheado por Elementor para fijar `_parent`). Por eso **soltar = crear el model**
  y el render del DOM es consecuencia.
- `createElementFromModel` (`editor.js:46164`) abre un history-log, resuelve el container destino (y
  el "wrapping container" para atomic widgets / V3), y corre `document/elements/create` (`:46197`).
- **Comunicación editor↔preview**: como el preview vive en otro `window` (iframe), Elementor:
  - dispara fin-de-drag manualmente porque el evento no cruza el iframe:
    `elementor.getPreviewView().onPanelElementDragEnd()` (en cada `onDropping`).
  - en drag-start oculta videos de fondo y deshabilita eventos de iframes anidados para no romper el
    drag de Chrome (`onPanelElementDragStart`, `editor.js:46419`).
  - **V2 (atomic widgets)** despacha `CustomEvent` al `contentWindow` del preview para notificar
    render (inferencia del bundle `editor-canvas.js`):
    ```js
    elementor?.$preview?.[0]?.contentWindow.dispatchEvent(
      new CustomEvent(t, { detail: { id, type, element } }))
    ```

---

## 4. Panel de elementos (widgets arrastrables)

- **Lista y categorías (origen PHP)**: las categorías y el catálogo de widgets vienen de
  `elementor.config` (localizado por PHP), y la UI legacy las pinta como `PanelElementView`
  arrastrables (§2.2). La ruta del panel es `panel/elements/categories`.
- **Búsqueda**: filtro en el panel legacy (input `placeholder: 'Filter by name...'`,
  `editor.js:6089` aprox.).
- **Drag source**: cada item llama `html5Draggable` con `groups:['elementor-element']` y publica
  `element:selected` en `channels.panelElements` (§2.2). Esa publicación es la que leen los
  droppables del canvas en su `onDropping`/`onDrop`.
- **V2 reusa el panel legacy**: `editor-elements-panel` (bundle React) **no** reimplementa el panel;
  lo envuelve. Exports reales: `createLegacyView`, `getLegacyElementsPanelComponent`,
  `LEGACY_ELEMENTS_PANEL_COMPONENT_NAME`, `LEGACY_ELEMENTS_PANEL_ROUTE_PREFIX`, `registerTab`,
  `ElementsPanelTab`, `createTabNavItem`, `getNavigationWrapperElement`. O sea: la lista de widgets
  arrastrables sigue siendo la Marionette legacy; React solo agrega **tabs/navegación** alrededor.
  (Inferencia de los nombres de export del bundle.)

---

## 5. Modelo JS de elementos y la API de comandos `$e`

### 5.1 El árbol (V1)
- `elType`: `section` | `column` | `container` | `widget`. Container moderno = `e-con` (clases
  `e-parent`/`e-child`, `editor.js:35226`). Inner-section = `section` con `isInner:true`.
- `getChildType()` define qué acepta cada contenedor: el **Container** acepta todos los tipos
  registrados menos `section`/`column`, más `widget` (`editor.js:35220`); las reglas de validez de
  hijo se aplican además en hooks (ver `is-valid-child.js`).

### 5.2 La API `$e` (comandos / hooks / rutas)
`$e` es la fachada de comandos (definida en `common.js`/`editor-modules.js`). Patrones vistos:

| Llamada | Significado |
|---|---|
| `$e.run('document/elements/create', {container, model, options})` | **Crear** un elemento bajo `container` en `options.at`. |
| `$e.run('document/elements/move', {container, target, options:{at}})` | **Mover** un elemento existente a otro target/índice. |
| `$e.run('preview/drop', {container, model, options})` | **Alta por DnD** desde el preview; orquesta la creación + history + UI. |
| `$e.run('document/ui/paste', {container})` | Pegar. |
| `$e.run('editor/browser-import/import', {...})` | Importar archivo soltado (img/JSON). |
| `$e.internal('document/history/start-log' \| 'end-log', {...})` | Transacción de undo/redo. |
| `$e.route('panel/elements/categories')` | Navegar paneles. |
| `$e.components.get('document/elements').utils.isPasteEnabled(container)` | Utilidades del componente. |

**Hooks sobre comandos** (Data/UI): el motor define hooks que se enganchan a `document/elements/create`.
Sus rutas fuente aparecen en los headers de módulo del bundle, p.ej.
`editor.js:24211 .../document/hooks/data/document/elements/create/create-section-columns-reset-layout.js`,
`.../inner-section-columns.js`, `.../is-valid-child.js`, `.../section-columns-limit.js`,
`.../section-columns.js`, y UI hooks en `.../hooks/ui/document/elements/create/move-resizeable-handle.js`
(`editor.js:25835`). Cada hook implementa `getCommand()` (a qué comando engancha), `getConditions()`,
`apply()`. Ejemplo Pro: `block-birthday-easter-egg-drop` engancha `getCommand()='preview/drop'` y
devuelve `false` en `apply()` para bloquear el drop (`editor.js:56403`).

### 5.3 API V2 de elementos (`editor-elements`) — bridge a V1
El paquete React expone una capa funcional que **traduce a comandos V1**. Confirmado por el bundle:
la fuente `./packages/packages/libs/editor-elements/src/sync/drop-element.ts` define:
```js
function dropElement({containerId, model, options}) {
  const o = getContainer(containerId);
  return __privateRunCommandSync("preview/drop", {container: o, model, options});  // ← delega a V1
}
```
Exports relevantes (reales del bundle `editor-elements.js`):

- **Mutaciones**: `createElement`, `createElements`, `dropElement`, `moveElement`/`moveElements`,
  `duplicateElement(s)`, `deleteElement`, `replaceElement`, `removeElements`,
  `removeModelFromParent`.
- **Lectura**: `getElements`, `getElementType`, `getWidgetsCache`, `getElementChildren`,
  `getSelectedElement(s)`, `getElementSettings`, `getElementStyles`, `getElementDOM`,
  `queryPreviewDOMByElementId`, `findElementIdOf`, `getNewElementContainer`, `toElementModel`,
  `generateElementId`.
- **Hooks React**: `useSelectedElement`, `useSelectedElementSettings`, `useElementChildren`,
  `useParentElement`, `useElementEditorSettings`.
- **Estilos/props**: `createElementStyle`, `updateElementStyle`, `deleteElementStyle`,
  `mutateElementStyles`, `ELEMENT_STYLE_CHANGE_EVENT`.
- **Errores tipados**: `ElementNotFoundError`, `ElementTypeNotExistsError`,
  `ElementParentNotFoundError`, `ElementIndexNotFoundError`, etc.

---

## 6. El canvas V2 (`editor-canvas`) — render de atomic widgets

`editor-canvas` es el paquete React que enseña a V1 a renderizar los **atomic widgets** (V4) dentro
del iframe del preview, creando clases de vista **compatibles con Marionette** al vuelo. Exports
reales del bundle:

- `registerElementType` / `createElementType` / `getElementType` — registro/fábrica de tipos de
  elemento para el canvas.
- `createElementViewClassDeclaration` — **genera dinámicamente una clase de vista Marionette V1**
  para un atomic widget (así V1 puede renderizar algo definido en V2).
- `createDomRenderer` / `createStylesRenderer` / `createStyleWrapper` — render del DOM y de los
  estilos (usa **twing**, el motor de templates Twig en JS; `editor-canvas.asset.php` depende de
  `elementor-v2-twing`).
- `createTemplatedElementType` / `createNestedTemplatedElementType` / `createTemplatedElementView` —
  tipos/vistas basadas en templates (incluye nested/replacements para widgets que anidan otros).
- Transformers de props/estilos: `createTransformer`, `createTransformersRegistry`,
  `createPropsResolver`, `createMultiPropsTransformer`, `createClassesTransformer`, etc.
- Seguridad: `createDOMPurify` / `_sanitizeElements` / `_createTrustedTypesPolicy` — sanitiza el HTML
  inyectado en el canvas (Trusted Types + DOMPurify).
- DnD V2: `startDragElementFromPanel(e, t)` (llama `setDragGroups(t)`) y
  `endDragElementFromPanel()` (`getElementorChannels()?.panelElements?.trigger("element:drag:end")`).
  Es decir, **incluso el drag V2 termina disparando los channels V1** — el motor de DnD sigue siendo
  el de §2.
- `ElementsOverlays`, `createVirtualElement`, `createGridCellMap`, `createCoords` — overlays de
  edición y mapeo de celdas grid sobre el canvas.
- MCP/IA: `AVAILABLE_WIDGETS_URI` / `AVAILABLE_WIDGETS_URI_V4` — recursos para herramientas IA que
  solo operan sobre v4 (atomic).

(Todo §6 es inferencia de nombres de export + alguna ruta `.ts` visible en el bundle de una sola
línea; alta confianza por la nomenclatura, no verificado leyendo lógica completa.)

---

## 7. Inventario de paquetes `@elementor/editor-*` (free)

Directorio `assets/js/packages/`. Una línea por paquete:

| Paquete | Qué hace (1 línea) |
|---|---|
| `editor` | Paquete raíz: bootstrap del editor V2, store (`__createStore`), locations/slots, providers React. |
| `editor-v1-adapters` | **Puente V1↔V2**: `runCommand`, `registerDataHook`, channels, router, `getCanvasIframeDocument`. |
| `editor-canvas` | Render de atomic widgets en el iframe (vistas Marionette generadas, twing, estilos, sanitización, overlays). |
| `editor-elements` | API funcional de elementos (CRUD/drop/move) que delega a comandos V1; hooks React de elementos. |
| `editor-elements-panel` | Envuelve el panel de widgets legacy con tabs/navegación React (`createLegacyView`, `registerTab`). |
| `editor-elements-panel-notice` | Avisos/notices dentro del panel de elementos. |
| `editor-editing-panel` | Panel de edición (settings de un elemento) en React. |
| `editor-controls` | Controles React (inputs de settings) del nuevo editor. |
| `editor-props` | Sistema de **props** tipadas de atomic widgets (schema de propiedades). |
| `editor-styles` | Modelo/edición de estilos (clases CSS, variantes responsive). |
| `editor-styles-repository` | Repositorio/almacén de estilos (CRUD de style objects). |
| `editor-global-classes` | Gestión de clases globales reutilizables. |
| `editor-variables` | Variables de diseño (design tokens) editables. |
| `editor-responsive` | Breakpoints / modo dispositivo en V2. |
| `editor-documents` | Modelo de "documento" (página/template) en V2. |
| `editor-interactions` | Interacciones/animaciones declarativas sobre elementos. |
| `editor-widget-creation` | Flujo de creación de widgets (asistente / atomic). |
| `editor-app-bar` | Barra superior del editor (top bar) React. |
| `editor-panels` | Infraestructura de paneles React (registro, layout). |
| `editor-modal-shell` | Shell de modales del editor. |
| `editor-notifications` | Sistema de notificaciones/toasts. |
| `editor-ui` / `ui` | Librería de componentes UI (design system) del editor. |
| `editor-design-system` | Tokens/tema del design system del editor. |
| `editor-components` | Componentes compartidos del editor. |
| `editor-current-user` | Estado del usuario actual (capacidades, prefs). |
| `editor-site-navigation` | Navegación entre páginas/sitio dentro del editor. |
| `editor-templates` | Biblioteca de templates en V2. |
| `editor-mcp` / `editor-capabilities-mcp` / `elementor-*-mcp` | Integración MCP (herramientas IA sobre el editor). |
| `locations` / `menus` | Sistema de **slots/locations** (`injectIntoTop`, `registerLocation`) para inyectar UI. |
| `store` | State management estilo Redux. |
| `query` | Capa de data-fetching (estilo react-query). |
| `schema` | Validación de schemas (props/estilos). |
| `twing` | Motor de templates Twig en JS (render del canvas). |
| `http-client` / `session` / `env` / `utils` / `icons` / `wp-media` | Utilidades transversales (HTTP, sesión, entorno, helpers, iconos, media de WP). |

(El listado de "qué hace" combina lectura de `*.asset.php` + nombres; varias descripciones son
inferencia razonada del nombre/deps, no de leer cada bundle.)

---

## 8. Cheat-sheet de integración / puntos de extensión

- **Quiero crear un elemento por código**: `$e.run('document/elements/create', {container, model:{elType,widgetType,settings}, options:{at}})`.
- **Quiero soltar como si viniera del panel**: `$e.run('preview/drop', {container, model, options})`.
- **Quiero mover**: `$e.run('document/elements/move', {container, target, options:{at}})`.
- **Desde React**: `editor-elements.createElement(...)` / `dropElement({containerId, model, options})`
  / `moveElement(...)` (delegan a los comandos de arriba vía `editor-v1-adapters`).
- **Interceptar un alta (validación/bloqueo)**: hook V1 con `getCommand()='document/elements/create'`
  (o `'preview/drop'`) + `getConditions()` + `apply()`; o desde React `registerDataHook(...)`.
- **El DnD real**: plugin `$.fn.html5Droppable` (HTML5 nativo, no jQuery UI) en
  Containers/Columns; `getDroppableOptions()`/`onDropping` por vista. jQuery UI `.sortable()` solo
  para reordenar sections/columns y Navigator (vía `SortableBehavior`).
- **El canvas es un iframe**: cruzar la frontera con `getCanvasIframeDocument()` (V2) o
  `elementor.getPreviewView()` / `elementor.$preview` (V1); eventos de fin-de-drag se disparan a mano.

---

## Apéndice — Referencias archivo:línea (todas verificadas leyendo el bundle no-minificado)

- Plugin HTML5 DnD: `editor.js:66665` (registro), `:66642` (eventos), `:66529` (grupos por
  `dataTransfer.types` JSON), `:66471`/`:66474`/`:66485`/`:66492`/`:66502` (placeholders flex/grid),
  `:66630` (onDrop), `:66563` (onDragEnter).
- Panel drag source: `editor.js:40331` (html5Draggable), `:40335` (`element:selected` + `element:drag:start`),
  `:40403`/`:40483` (addToPage → preview/drop), `:40364` (onMouseDown promo Pro).
- Column droppable: `editor.js:35156` (html5Droppable), `:35164` (onDropping), `:35077` (isDroppingAllowed),
  `:35116` (getSortableOptions connectWith), `:35133` (addNewColumn → create).
- Container droppable: `editor.js:35336` (getDroppableOptions), `:35330` (getDroppableAxis),
  `:35352` (onDropping: move vs drop), `:35389` (move), `:35400` (onDrop), `:35424`/`:35428`
  (addNewContainer → create).
- SortableBehavior (jQuery UI): `editor.js:34332` (applySortable + `.sortable()`), `:34307`
  (swappable), `:34377` (helper), `:34410`-`:34488` (start/update/receive sort), `:34500`
  (moveChild → move).
- Sections container: `editor.js:46387` (BaseSectionsContainerView), `:46406` (getSortableOptions handle),
  `:46417` (escucha `panelElements element:drag:start/end`).
- Base view DnD/alta: `editor.js:46241` (onDrop → preview/drop `:46267`), `:46096` (addElement),
  `:46164` (createElementFromModel → create `:46197`), `:32832` (addElementFromPanel → create `:32861`).
- Widget draggable nativo: `editor.js:33595` (initDraggable), `:33608` (html5Draggable),
  `:33582` (getDraggableHelper), `:33626` (setDragImage).
- Hooks de create: `editor.js:24211`/`24260`/`24310`/`24388`/`24444`/`24504` (data),
  `:25813`/`:25835` (ui); ejemplo Pro bloqueo drop `:56403` (`getCommand`='preview/drop').
- PHP: `core/editor/editor.php:332` (enqueue_scripts); `core/editor/loader/editor-base-loader.php:40`/`:144`/`:148`/`:172`;
  `core/editor/loader/v2/editor-v2-loader.php:108`/`:229` (V2 deps de `elementor-editor`).
- React (single-line bundles, inferencia): `editor-v1-adapters.js` (exports `runCommand`/`registerDataHook`/
  `getCanvasIframeDocument`/`v1ReadyEvent`...), `editor-elements.js` (`dropElement` →
  `__privateRunCommandSync("preview/drop")`, fuente `src/sync/drop-element.ts`),
  `editor-canvas.js` (`createElementViewClassDeclaration`, `start/endDragElementFromPanel`, twing,
  DOMPurify), `editor-elements-panel.js` (`createLegacyView`, `registerTab`).
