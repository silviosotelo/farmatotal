# Elementor Core (gratuito) — Modelo de datos de elementos y persistencia

> Análisis del código real en `C:\Users\sotelos\Downloads\Elementor\elementor`.
> Objetivo: entender cómo Elementor **representa, serializa, guarda y renderiza** una
> página/componente, para poder replicar el page builder en `platform/`.
> Todas las referencias son `archivo:línea` sobre el core gratuito.

---

## 0. Resumen ejecutivo (la idea en 6 puntos)

1. Una página Elementor es un **árbol de nodos JSON**. Cada nodo tiene la forma
   `{ id, elType, settings:{}, elements:[], isInner }` (los widgets agregan `widgetType`).
2. Ese árbol se guarda como **un único string JSON** en el postmeta `_elementor_data`
   del post de WordPress (no en tablas propias).
3. Un **Document** envuelve un post de WP: sabe leer/escribir ese JSON, contiene los
   "page settings", y construye instancias PHP de cada elemento desde el JSON.
4. Al **renderizar**, el árbol se recorre recursivamente: cada nodo se instancia
   (`create_element_instance`) y se imprime (`print_element` → `before_render` / contenido / `after_render`).
   Contenedores imprimen a sus hijos; widgets imprimen su HTML propio.
5. Al **guardar**, los datos entrantes se rehidratan a objetos, se sanitizan, se
   re-serializan a JSON y se escriben con `update_metadata`. Versionado vía `_elementor_version`.
6. Las **migraciones** son funciones versionadas (`_v_X_Y_Z`) que cargan el JSON de cada
   documento, lo transforman recursivamente y lo vuelven a guardar.

---

## 1. Estructura de datos de un elemento (el JSON)

### 1.1 Forma de cada nodo

Cada nodo del árbol se serializa con esta forma. El método canónico es
`Element_Base::get_raw_data()` — `includes/base/element-base.php:643`:

```php
public function get_raw_data( $with_html_content = false ) {
    $data = $this->get_data();

    $elements = [];
    foreach ( $this->get_children() as $child ) {
        $elements[] = $child->get_raw_data( $with_html_content );   // recursión
    }

    $raw_data = [
        'id'       => $this->get_id(),
        'elType'   => $data['elType'],
        'settings' => $data['settings'],
        'elements' => $elements,
        'isInner'  => $data['isInner'],
    ];

    if ( ! empty( $data['isLocked'] ) ) {
        $raw_data['isLocked'] = $data['isLocked'];
    }

    return $raw_data;
}
```

Los **widgets** sobrescriben `get_raw_data()` (`includes/base/widget-base.php:755`):
quitan `isInner` y agregan `widgetType` (y opcionalmente `htmlCache` si se pide HTML):

```php
public function get_raw_data( $with_html_content = false ) {
    $data = parent::get_raw_data( $with_html_content );
    unset( $data['isInner'] );
    $data['widgetType'] = $this->get_data( 'widgetType' );
    if ( $with_html_content ) {
        ob_start();
        $this->render_content();
        $data['htmlCache'] = ob_get_clean();
    }
    return $data;
}
```

### 1.2 Campos del nodo

| Campo        | Tipo    | Significado |
|--------------|---------|-------------|
| `id`         | string  | ID único corto (hex, p.ej. `"a1b2c3d"`). Genera la clase CSS `.elementor-element-{id}` (`element-base.php:699`). `get_id_int()` lo convierte con `hexdec` (`controls-stack.php:226`). |
| `elType`     | string  | Tipo estructural: `container` \| `section` \| `column` \| `widget`. Viene de `get_type()`. |
| `widgetType` | string  | SOLO en widgets. Nombre del widget (`heading`, `image`, `text-editor`…). Permite resolver la clase concreta. |
| `settings`   | object  | Mapa control→valor. Todo lo que el usuario configuró (texto, colores, paddings responsive, etc.). Solo se guardan valores ≠ default. |
| `elements`   | array   | Hijos (mismo formato, recursivo). Vacío en widgets-hoja. |
| `isInner`    | bool    | `true` si es una sección/columna anidada dentro de otra (legacy sections). |
| `isLocked`   | bool    | Opcional, elemento bloqueado en el editor. |

Defaults estructurales: `element-base.php:1440` (`elements:[]`, `isInner:false`),
`controls-stack.php:2255` (`id:0`, `settings:[]`), `widget-base.php:815` (`widgetType:''`).
`elType` por nodo se inyecta desde `get_type()` (ver `get_initial_config` `element-base.php:1496`).

### 1.3 Los cuatro `elType` y su jerarquía

`get_type()` por clase:

- `container` — `includes/elements/container.php:53` (`return 'container'`)
- `section`   — `includes/elements/section.php:49`
- `column`    — `includes/elements/column.php:46`
- `widget`    — `includes/base/widget-base.php:63`
- (base genérica `stack` — `controls-stack.php:258`)

**Quién puede contener a quién** lo define `_get_default_child_type()` en cada elemento
(abstracto en `element-base.php:218`; resuelto vía `get_child_type()` `element-base.php:1538`):

- **Container** (`container.php:336`): hijo puede ser cualquier elemento registrado
  (`container`, `section`, `column`) **o** cualquier widget → permite anidamiento libre.
- **Section** (`section.php:1592`): su hijo SIEMPRE es `column`.
- **Column** (`column.php:1072`): hijo puede ser `section` (anidada), `container`, o widget.
- **Repeater** (`repeater.php:150`): elemento especial para ítems repetibles dentro de un widget.

Dos modelos de layout coexisten:

```
Modelo LEGACY (Sections):           Modelo MODERNO (Containers, flexbox/grid):
section                              container
 └─ column                           ├─ widget
     ├─ widget                       └─ container   (anidado)
     └─ section (inner, isInner)         └─ widget
         └─ column ...
```

`Elements_Manager::init_elements()` (`includes/managers/elements.php:259`) registra
siempre `section` y `column`, y registra `Container` solo si el experiment `container`
está activo (lo está por defecto en versiones modernas).

### 1.4 Ejemplo real del árbol (`_elementor_data`)

Así se ve el JSON guardado de una página simple (container con dos columnas/hijos):

```json
[
  {
    "id": "1f2a9c0",
    "elType": "container",
    "settings": {
      "flex_direction": "row",
      "content_width": "boxed",
      "background_background": "classic",
      "background_color": "#F7F7F7",
      "padding": { "unit": "px", "top": "60", "right": "0", "bottom": "60", "left": "0", "isLinked": false }
    },
    "elements": [
      {
        "id": "a3b7e21",
        "elType": "widget",
        "widgetType": "heading",
        "settings": {
          "title": "Bienvenido a Farmatotal",
          "header_size": "h1",
          "align": "center",
          "title_color": "#1A1A1A",
          "typography_typography": "custom",
          "typography_font_size": { "unit": "px", "size": 42 }
        },
        "elements": []
      },
      {
        "id": "c9d4f80",
        "elType": "widget",
        "widgetType": "button",
        "settings": {
          "text": "Ver productos",
          "link": { "url": "https://farmatotal.com.py/tienda", "is_external": "on" },
          "align": "center",
          "background_color": "#0A7E3D"
        },
        "elements": []
      }
    ],
    "isInner": false
  }
]
```

Notas:
- El valor TOP-LEVEL es un **array** de nodos raíz (puede haber varios containers/sections).
- `settings` mezcla valores escalares y objetos (p.ej. `padding`, `link`, `typography_*`).
  Cada control aporta sus keys; los responsive agregan sufijos `_tablet` / `_mobile`.
- Hay keys "meta" en settings con guion bajo, p.ej. `__dynamic__` (dynamic tags,
  `element-base.php:606`) y `_element_cache`.

---

## 2. Document — qué es y cómo contiene los elementos

### 2.1 Definición y tipos

Un **Document** (`core/base/document.php`) es la capa que envuelve un **post de WordPress**
y le da semántica de "documento Elementor": lee/escribe el JSON, gestiona page settings,
revisiones, autosave, CSS, render. Es subclase de `Controls_Stack` (de ahí que tenga `settings`).

Jerarquía de clases de documento:
- `Document` (abstracta) — `core/base/document.php`
- `PageBase` (abstracta) — `core/document-types/page-base.php:14` (extends `Document`)
- `Page`  — `core/document-types/page.php` (extends `PageBase`)
- `Post`  — `core/document-types/post.php`

Registro de tipos en `core/documents-manager.php:120` (`register_default_types`):

```php
'wp-post' => Post::get_class_full_name(),
'wp-page' => Page::get_class_full_name(),
```

`register_document_type()` (`documents-manager.php:146`) y `get_document_type()`
(`documents-manager.php:304`, fallback `'post'`) resuelven la clase concreta por nombre
de tipo. El tipo concreto de un post se persiste en el meta `_elementor_template_type`
(`TYPE_META_KEY`, `document.php:42`, guardado por `save_template_type()` `document.php:1451`).

### 2.2 Constantes de meta keys (document.php:42-73)

```php
const TYPE_META_KEY               = '_elementor_template_type';   // tipo de documento
const PAGE_META_KEY               = '_elementor_page_settings';   // page settings
const ELEMENTOR_DATA_META_KEY     = '_elementor_data';            // el árbol JSON
const BUILT_WITH_ELEMENTOR_META_KEY = '_elementor_edit_mode';     // 'builder' si usa Elementor
// estados: STATUS_PUBLISH/DRAFT/PRIVATE/AUTOSAVE/PENDING
```

(`_elementor_version` se escribe aparte en `save_version()`, ver §5.)

### 2.3 Page settings (los settings del documento)

A diferencia de los settings de cada elemento (que viven dentro de `_elementor_data`),
los **page settings** del documento se guardan en su propio meta `_elementor_page_settings`
(`get_db_document_settings()` → `get_meta(PAGE_META_KEY)`, `document.php:1159`).
Incluyen cosas como plantilla de página, estilos de body, título oculto, etc.
`PageBase::register_controls()` (`page-base.php:69`) registra: `hide_title`,
campos de post (excerpt, featured image, menu_order, comments — `page-base.php:235`)
y estilos de body (margin/padding/background + custom CSS — `page-base.php:120`).
El selector CSS del documento: `body.elementor-page-{id}` (`page-base.php:61`).

### 2.4 De JSON a árbol de objetos (factory)

Lectura cruda del meta: `get_json_meta()` (`document.php:1026`) hace
`get_post_meta` + `json_decode(..., true)`.

`get_elements_data()` (`document.php:1124`) devuelve el array de datos del árbol,
resolviendo autosave/draft y "convert to elementor" si está vacío en modo edición:

```php
public function get_elements_data( $status = self::STATUS_PUBLISH ) {
    $elements = $this->get_json_meta( self::ELEMENTOR_DATA_META_KEY );
    // ... maneja draft/autosave y convert_to_elementor() si vacío
    return $elements;
}
```

`get_elements_raw_data()` (`document.php:1059`) es la **factory**: recorre los datos,
instancia cada elemento y devuelve su versión normalizada. La instanciación real ocurre
en `Elements_Manager::create_element_instance()` (`includes/managers/elements.php:77`):

```php
$element = Plugin::$instance->elements_manager->create_element_instance( $element_data );
// dentro de create_element_instance:
//   $element_type  = get_element( elType, widgetType )      // resuelve la clase registrada
//   $element_class = $element_type->get_class_name();
//   $element       = new $element_class( $element_data, $args );
```

`get_element()` (`elements.php:99`): si `elType === 'widget'` resuelve por `widgetType`
contra `widgets_manager`; si no, resuelve por `elType` contra los element types registrados.

El constructor `Element_Base::__construct` (`element-base.php:1606`) llama a
`Controls_Stack::init()` (`controls-stack.php:2485`):

```php
protected function init( $data ) {
    $this->data = array_merge( $this->get_default_data(), $data );
    $this->id   = $data['id'];
}
```

Los hijos NO se instancian de inmediato: son **lazy**. `get_children()`
(`element-base.php:322`) llama a `init_children()` (`element-base.php:1570`), que lee
`$this->get_data('elements')` y por cada hijo llama `add_child()` → resuelve el tipo
con `get_child_type()` (`element-base.php:1538`) y recursa.

---

## 3. Persistencia

### 3.1 Dónde se guarda

**Todo el árbol vive en un solo postmeta**: `_elementor_data`, como string JSON.
No hay tablas propias para el árbol. Metas relacionados:

| Meta key                    | Contenido |
|-----------------------------|-----------|
| `_elementor_data`           | Árbol JSON completo (string). |
| `_elementor_page_settings`  | Page settings del documento. |
| `_elementor_template_type`  | Tipo de documento (`wp-page`, `wp-post`, ...). |
| `_elementor_edit_mode`      | `'builder'` si la página usa Elementor. |
| `_elementor_version`        | Versión de Elementor con que se guardó (para migraciones). |
| `_elementor_css`            | (Módulo CSS) info del archivo CSS generado para el post. |

### 3.2 Flujo de guardado: `Document::save()` (document.php:795)

```php
public function save( $data ) {
    setlocale( LC_NUMERIC, 'C' );                 // evita coma decimal (issue #10992)
    $data = apply_filters( 'elementor/document/save/data', $data, $this );
    // ... permisos, set_is_saving(true)
    do_action( 'elementor/document/before_save', $this, $data );

    if ( ! current_user_can( 'unfiltered_html' ) ) {   // sanitización
        $data = map_deep( $data, fn($v) => is_bool($v)||is_null($v) ? $v : wp_kses_post($v) );
    }

    if ( ! empty( $data['settings'] ) ) {
        $this->save_settings( $data['settings'] );      // → _elementor_page_settings
        $this->refresh_post();
    }
    if ( isset( $data['elements'] ) && is_array( $data['elements'] ) ) {
        $this->save_elements( $data['elements'] );       // → _elementor_data
    }
    $this->save_template_type();                         // → _elementor_template_type
    $this->save_version();                               // → _elementor_version
    Post_CSS::create( $this->post->ID )->delete();       // invalida CSS
    $this->delete_cache();
    do_action( 'elementor/document/after_save', $this, $data );
    return true;
}
```

### 3.3 Serialización: `save_elements()` (document.php:1365)

```php
protected function save_elements( $elements ) {
    $editor_data = $this->get_elements_raw_data( $elements );   // rehidrata → normaliza

    // wp_slash evita el unslash de update_post_meta
    $json_value = wp_slash( wp_json_encode( $editor_data ) );

    // update_metadata (no update_post_meta) para soportar 'revision'
    $is_meta_updated = update_metadata( 'post', $this->post->ID,
        self::ELEMENTOR_DATA_META_KEY, $json_value );

    do_action( 'elementor/db/before_save', $this->post->post_status, $is_meta_updated );
    Plugin::$instance->db->save_plain_text( $this->post->ID );   // post_content plano (SEO/fallback)
    // ... iteración de acciones (usage data, etc.)
    do_action( 'elementor/editor/after_save', $this->post->ID, $editor_data );
}
```

Punto clave: antes de serializar, `get_elements_raw_data()` pasa por
`get_data_for_save()` (`element-base.php:667`) cuando `is_saving` está activo
(`document.php:1102`). Eso permite a cada elemento aplicar `on_save()` a sus settings.

### 3.4 Sanitización

Tres niveles:
1. **Al guardar el documento**: `wp_kses_post` recursivo si el usuario no tiene
   `unfiltered_html` (`document.php:839`).
2. **Al leer/usar settings**: `Controls_Stack::get_data()` (`controls-stack.php:1159`)
   ejecuta `sanitize_settings()` perezosamente la primera vez que se piden settings.
3. **Plain text** para `post_content`: `DB::get_plain_text_from_data()`
   (`includes/db.php:591`) renderiza y limpia tags (div/span/script/class) — usado como
   fallback si Elementor se desactiva y para búsqueda/SEO.

### 3.5 Autosave y revisiones

- **Autosave**: si `settings.post_status === 'autosave'` se define `DOING_AUTOSAVE`
  (`document.php:846`). El autosave es un post hijo; `get_elements_data(STATUS_DRAFT)`
  prioriza el JSON del autosave más nuevo (`document.php:1127`).
- **Revisiones**: por eso se usa `update_metadata('post', ...)` en lugar de
  `update_post_meta` — para poder escribir meta sobre posts tipo `revision`.
  `copy_elementor_meta()` (`db.php:357`) duplica todos los metas `_elementor*`
  (y aplica `wp_slash` a `_elementor_data`).
- `save_version()` (`document.php:1428`) graba `_elementor_version = ELEMENTOR_VERSION`
  por cada revisión (salvo durante upgrades).

---

## 4. Render server-side (JSON → HTML)

### 4.1 Punto de entrada del documento

`print_elements_with_wrapper()` (`document.php:1214`) envuelve y delega a
`print_elements()` (`document.php:1819`), que opcionalmente cachea y llama a
`do_print_elements()` (`document.php:1898`):

```php
protected function do_print_elements( $elements_data ) {
    $this->update_runtime_elements( $elements_data );
    foreach ( $elements_data as $element_data ) {
        $element = Plugin::$instance->elements_manager->create_element_instance( $element_data );
        if ( ! $element ) { continue; }
        $element->print_element();        // ← recorre el árbol
    }
}
```

### 4.2 Render de un nodo: `Element_Base::print_element()` (element-base.php:473)

```php
public function print_element() {
    $element_type = $this->get_type();
    // (modo shortcode/cache opcional → emite [elementor-element data="base64(json)"])
    do_action( 'elementor/frontend/before_render', $this );
    do_action( "elementor/frontend/{$element_type}/before_render", $this );

    ob_start();
    $this->print_content();               // contenido específico del tipo
    $content = ob_get_clean();

    $should_render = ( ! empty($content) || $this->should_print_empty() );
    if ( $should_render ) {
        $this->add_render_attributes();
        $this->before_render();           // abre el wrapper HTML
        echo $content;                    // ya escapado por render()
        $this->after_render();            // cierra el wrapper HTML
        $this->enqueue_scripts();
        $this->enqueue_styles();
    }
    do_action( "elementor/frontend/{$element_type}/after_render", $this );
    do_action( 'elementor/frontend/after_render', $this );
}
```

`before_render()` / `after_render()` son hooks de wrapper (vacíos en la base,
`element-base.php:228` y `:238`). En **widgets** abren/cierran el `<div>` del wrapper
con sus atributos: `widget-base.php:716` (`<div ..._wrapper>`) y `:730` (`</div>`).

### 4.3 Recursión: contenedores vs widgets

- **Contenedor** (`print_content()` de `element-base.php:1474`): imprime cada hijo:
  ```php
  protected function print_content() {
      foreach ( $this->get_children() as $child ) {
          $child->print_element();      // ← recursión
      }
  }
  ```
- **Widget** (`print_content()` → `render_content()`, `widget-base.php:617`): genera su
  HTML propio. Aplica skin si existe, envuelve en `.elementor-widget-container`,
  pasa por el filtro `elementor/widget/render_content`. El HTML real lo produce el
  método `render()` (Backbone/PHP) de cada widget concreto.

Resultado: el árbol JSON se traduce a HTML anidado wrapper-por-wrapper, donde cada
elemento lleva su clase `.elementor-element-{id}` para enganchar el CSS generado.

---

## 5. Migrations / versionado del esquema

### 5.1 Versión del esquema vs versión del plugin

- `DB::DB_VERSION = '0.4'` (`includes/db.php:25`) — versión lógica del formato de datos.
- `_elementor_version` por post (`document.php:1431`) — versión del plugin con que se
  guardó cada documento; es lo que dispara las migraciones por-documento.

### 5.2 Cómo se versiona y migra (alto nivel)

Las migraciones globales viven en `core/upgrade/upgrades.php` como métodos estáticos
nombrados por versión `_v_X_Y_Z[_descripcion]`. El runner (`core/upgrade/manager.php` +
`updater.php`, base en `core/database/base-database-updater.php` /
`base-migration.php`) ejecuta secuencialmente las que falten según la versión guardada,
en lotes (`$updater`), y corre `_on_each_version()` (`upgrades.php:30`) siempre.

Ejemplos reales (`upgrades.php`):
- `_v_0_3_2()` (:52) — cambia el link del widget image a `custom`.
- `_v_2_6_6_fa4_migration_button()` (:568) — registra callback por-elemento
  (`'callback' => ['Elementor\Core\Upgrade\Upgrades', '_migrate_icon_fa4_value']`, :571).
- `_v_3_16_0_container_updates()` (:809) — migración típica del árbol JSON:

```php
public static function _v_3_16_0_container_updates( $updater ) {
    $post_ids = self::get_post_ids_by_element_type( $updater, 'container' );
    foreach ( $post_ids as $post_id ) {
        $document = Plugin::$instance->documents->get( $post_id );
        $data     = $document->get_elements_data();   // lee _elementor_data
        $data     = self::iterate_containers( $data ); // transforma el árbol
        self::save_updated_document( $post_id, $data ); // re-guarda
    }
}
```

### 5.3 Patrón de transformación recursiva del árbol

El recorrido genérico está en `DB::iterate_data()` (`includes/db.php:259`): acepta
cualquier dato Elementor y un callback, y lo aplica recursivamente a cada nodo y a sus
`elements` hijos. Es el motor sobre el que se construyen las migraciones por-elemento.
También `DB::iterate_elementor_documents()` (`db.php:281`) itera todos los posts
construidos con Elementor en lotes (`meta_value = 'builder'`).

### 5.4 Migraciones modernas (v4 / atomic)

Las versiones nuevas agregan sistemas de migración por **prop type** y por **clases
globales**, fuera de `core/upgrade`:
- `modules/atomic-widgets/prop-type-migrations/` (orchestrator, loader, interpreter,
  cache, schema-resolver) — migran el esquema tipado de los nuevos "atomic widgets".
- `modules/global-classes/database/migrations/` — migración de clases globales a posts.

A alto nivel, mismo principio: detectar versión, cargar datos, transformar, re-guardar.

---

## 6. Implicancias para replicar el page builder (platform/)

1. **Un solo blob JSON por documento** es simple y portable. Replicable como columna
   `jsonb` (`page.tree`) en PostgreSQL en vez de postmeta.
2. **Contrato del nodo** mínimo a respetar: `{ id, elType, widgetType?, settings, elements, isInner? }`.
   Mantenerlo estable habilita import/export y migraciones.
3. **Factory por registro de tipos**: un `ElementsRegistry`/`WidgetsRegistry` que mapea
   `elType`/`widgetType` → componente. Equivale a `create_element_instance`.
4. **Render = recorrido recursivo** con hooks `before/after` por nodo y wrapper con clase
   única por `id`. Separar "container imprime hijos" de "widget imprime HTML".
5. **Versionado**: guardar `schemaVersion` por documento y una cadena de migraciones
   idempotentes que cargan→transforman→re-guardan el árbol (patrón `iterate_data`).
6. **Settings ≠ page settings**: settings por nodo dentro del árbol; settings del
   documento (plantilla, body, SEO) en su propio campo.
7. **Sanitizar al guardar** (equivalente a `wp_kses_post`) y **generar un fallback plano**
   (texto/HTML) para SEO/resiliencia.

---

## 7. Índice de referencias clave

| Tema | Archivo:línea |
|------|----------------|
| Nodo serializado (base) | `includes/base/element-base.php:643` (`get_raw_data`) |
| Nodo serializado (widget, +widgetType) | `includes/base/widget-base.php:755` |
| Datos para guardar (`on_save`) | `includes/base/element-base.php:667` (`get_data_for_save`) |
| Defaults estructurales | `element-base.php:1440`, `controls-stack.php:2255`, `widget-base.php:815` |
| `get_type()` por elemento | `container.php:53`, `section.php:49`, `column.php:46`, `widget-base.php:63` |
| Jerarquía / child types | `container.php:336`, `section.php:1592`, `column.php:1072`, `repeater.php:150` |
| Init lazy de hijos | `element-base.php:322` / `:1570` / `:1538` |
| Constructor / init de datos | `element-base.php:1606`, `controls-stack.php:2485` |
| Factory de instancias | `includes/managers/elements.php:77` (`create_element_instance`), `:99` (`get_element`) |
| Registro de elementos | `elements.php:259` (`init_elements`), `:162` (`register_element_type`) |
| Meta keys | `core/base/document.php:42-46` |
| Lectura JSON | `document.php:1026` (`get_json_meta`), `:1124` (`get_elements_data`), `:1059` (`get_elements_raw_data`) |
| Guardado | `document.php:795` (`save`), `:1365` (`save_elements`), `:1428` (`save_version`) |
| Page settings | `document.php:1159` (`get_db_document_settings`), `page-base.php:120/235` |
| Render entrada | `document.php:1214/1819/1898` |
| Render nodo | `element-base.php:473` (`print_element`), `:1474` (`print_content`) |
| Render widget | `widget-base.php:617` (`render_content`), `:716/:730` (wrappers) |
| Plain text fallback | `includes/db.php:591`, `:225` (`save_plain_text`) |
| Iteración recursiva | `db.php:259` (`iterate_data`), `:281` (`iterate_elementor_documents`) |
| Tipos de documento | `core/documents-manager.php:120/146/304`, `core/document-types/*.php` |
| Migraciones | `core/upgrade/upgrades.php` (`_v_*`, `:30` on_each_version, `:809` ejemplo) |
| Migraciones v4 | `modules/atomic-widgets/prop-type-migrations/`, `modules/global-classes/database/migrations/` |
