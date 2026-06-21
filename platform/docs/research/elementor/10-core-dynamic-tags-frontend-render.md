# Elementor CORE (free) — Dynamic Tags, Pipeline de Render Frontend, Generación de CSS y Responsive

> Documentación de ingeniería del **núcleo gratuito** de Elementor.
> Rutas relativas a `C:\Users\sotelos\Downloads\Elementor\elementor\`.
> Todas las refs son `archivo:línea` sobre el código real leído.
>
> Estas piezas son las que los docs de **Pro** marcaron como "viven en el core, no presentes". Acá están documentadas con código.

---

## 0. Mapa de archivos clave

| Pieza | Archivo | Rol |
|---|---|---|
| Manager de dynamic tags | `core/dynamic-tags/manager.php` | registro, serialización, parseo, render AJAX |
| Clase base de un tag | `core/dynamic-tags/base-tag.php` | extiende `Controls_Stack`; categorías, grupo, controles |
| Tag de UI (markup) | `core/dynamic-tags/tag.php` | `get_content()` → HTML (`content_type = 'ui'`) |
| Tag de dato | `core/dynamic-tags/data-tag.php` | `get_content()` → valor crudo (`content_type = 'plain'`) |
| CSS dinámico | `core/dynamic-tags/dynamic-css.php` | CSS de tags inyectados en `selectors` |
| Módulo concreto | `modules/dynamic-tags/module.php` | grupos/categorías y hook de registro (free trae 0 tags) |
| Resolución en render | `includes/base/controls-stack.php` | `parse_dynamic_settings`, `get_settings_for_display` |
| Control acepta dinámico | `includes/controls/base-data.php` | `parse_tags()` |
| Render de elemento | `includes/base/element-base.php` | `print_element()`, `add_render_attributes` |
| Wrapper de widget | `includes/base/widget-base.php` | `before_render/after_render`, `print_content` |
| Entrada del frontend | `includes/frontend.php` | `get_builder_content()`, enqueue |
| Base CSS | `core/files/css/base.php` | compilación de `selectors` → reglas |
| CSS por post | `core/files/css/post.php` | archivo `post-{id}.css`, `{{WRAPPER}}` |
| Stylesheet | `includes/stylesheet.php` | acumula reglas + media queries |
| Breakpoints | `core/breakpoints/manager.php`, `core/breakpoints/breakpoint.php` | sistema responsive |

---

## 1. Dynamic Tags (núcleo)

### 1.1 El Manager y sus constantes

`core/dynamic-tags/manager.php:14-30`:

```php
class Manager {
	const TAG_LABEL = 'elementor-tag';          // prefijo del shortcode interno
	const MODE_RENDER = 'render';
	const MODE_REMOVE = 'remove';
	const DYNAMIC_SETTING_KEY = '__dynamic__';  // clave donde se guardan los valores dinámicos
	const CONTROL_OPTION_KEYS = [ 'id', 'label' ];
	private $tags_groups = [];                   // grupos (Base Tags, etc.)
	private $tags_info = [];                      // [name => ['class'=>..,'instance'=>..]]
	private $parsing_mode = self::MODE_RENDER;
```

El manager se instancia desde `Plugin` y se accede vía `Plugin::$instance->dynamic_tags`.
En el constructor registra dos acciones (`manager.php:533-536`):

```php
private function add_actions() {
	add_action( 'elementor/ajax/register_actions', [ $this, 'register_ajax_actions' ] );
	add_action( 'elementor/css-file/post/enqueue', [ $this, 'after_enqueue_post_css' ] );
}
```

### 1.2 Registro de tags

Registro lazy: los tags se cargan la **primera vez** que se piden, disparando el hook `elementor/dynamic_tags/register` (`manager.php:272-306`):

```php
public function get_tags() {
	// ...do_deprecated_action 'elementor/dynamic_tags/register_tags' (legacy)...
	if ( ! did_action( 'elementor/dynamic_tags/register' ) ) {
		do_action( 'elementor/dynamic_tags/register', $this ); // hook moderno (3.5.0)
	}
	return $this->tags_info;
}
```

Un tag se registra pasando una **instancia** (`manager.php:337-342`):

```php
public function register( Base_Tag $dynamic_tag_instance ) {
	$this->tags_info[ $dynamic_tag_instance->get_name() ] = [
		'class' => get_class( $dynamic_tag_instance ),
		'instance' => $dynamic_tag_instance,
	];
}
```

`unregister( $tag_name )` hace `unset()` (`manager.php:371-373`). Hay shims deprecados `register_tag()/unregister_tag()` que delegan en los modernos (`manager.php:315-359`).

### 1.3 Grupos y categorías

- **Grupos** (`register_group`, `manager.php:382-390`): agrupan tags en el panel del editor (`['title' => '...']`).
- **Categorías**: definidas como constantes en `modules/dynamic-tags/module.php:26-76` — qué *tipo de dato* produce un tag y por lo tanto a qué controles se puede asignar:

```php
const BASE_GROUP = 'base';
const TEXT_CATEGORY = 'text';   const URL_CATEGORY = 'url';
const IMAGE_CATEGORY = 'image'; const MEDIA_CATEGORY = 'media';
const POST_META_CATEGORY = 'post_meta'; const GALLERY_CATEGORY = 'gallery';
const NUMBER_CATEGORY = 'number'; const COLOR_CATEGORY = 'color';
const DATETIME_CATEGORY = 'datetime'; const SVG_CATEGORY = 'svg';
```

Un control declara qué categorías acepta vía `'dynamic' => ['categories' => [ Module::TEXT_CATEGORY ]]`. El manager y el editor cruzan `tag->get_categories()` contra esas categorías.

> **NOTA IMPORTANTE (free vs Pro):** El módulo core (`modules/dynamic-tags/module.php`) **define los grupos y categorías pero no registra ningún tag** — `get_tag_classes_names()` devuelve `[]` (`module.php:116-118`). Los tags concretos (Post Title, ACF, Site URL, etc.) los aporta **Elementor Pro** enganchándose al hook `elementor/dynamic_tags/register`. El core solo provee la **infraestructura**.

`register_tags()` (`module.php:162-169`) instancia clases desde el sub-namespace `\Tags\`:

```php
public function register_tags( $dynamic_tags ) {
	foreach ( $this->get_tag_classes_names() as $tag_class ) {
		$class_name = $this->get_reflection()->getNamespaceName() . '\Tags\\' . $tag_class;
		$dynamic_tags->register( new $class_name() );
	}
}
```

### 1.4 Formato de serialización `[elementor-tag ...]`

Cómo un tag se serializa a texto (`manager.php:141-143`):

```php
public function tag_to_text( Base_Tag $tag ) {
	return sprintf( '[%1$s id="%2$s" name="%3$s" settings="%4$s"]',
		self::TAG_LABEL, $tag->get_id(), $tag->get_name(),
		urlencode( wp_json_encode( $tag->get_settings(), JSON_FORCE_OBJECT ) ) );
}
```

Resultado típico almacenado en `_elementor_data`:

```
[elementor-tag id="a1b2c3d" name="post-title" settings="%7B%22before%22%3A%22%22%7D"]
```

- `id` → id único de la instancia del tag (8 chars).
- `name` → nombre registrado del tag.
- `settings` → JSON **url-encoded** de los settings del tag (`JSON_FORCE_OBJECT` garantiza `{}` aunque esté vacío).

El parseo inverso usa **regex** (`manager.php:113-127`):

```php
public function tag_text_to_tag_data( $tag_text ) {
	preg_match( '/id="(.*?(?="))"/', $tag_text, $tag_id_match );
	preg_match( '/name="(.*?(?="))"/', $tag_text, $tag_name_match );
	preg_match( '/settings="(.*?(?="]))/', $tag_text, $tag_settings_match );
	if ( ! $tag_id_match || ! $tag_name_match || ! $tag_settings_match ) return null;
	return [
		'id' => $tag_id_match[1],
		'name' => $tag_name_match[1],
		'settings' => json_decode( urldecode( $tag_settings_match[1] ), true ),
	];
}
```

### 1.5 Cómo un control marca un valor como dinámico (`__dynamic__`)

En `_elementor_data`, el valor "normal" del control queda en `settings[<control>]`, pero **si el usuario asignó un tag**, el shortcode se guarda en un mapa aparte:

```json
"settings": {
  "title": "Texto estático fallback",
  "__dynamic__": {
    "title": "[elementor-tag id=\"abc\" name=\"post-title\" settings=\"%7B%7D\"]"
  }
}
```

`__dynamic__` = `Manager::DYNAMIC_SETTING_KEY` (`manager.php:22`). La clave dentro del mapa es el **nombre del control**.

Un control **habilita** valor dinámico declarando en su definición:

```php
$this->add_control( 'title', [
	'label'   => 'Title',
	'type'    => Controls_Manager::TEXT,
	'dynamic' => [ 'active' => true, 'categories' => [ Module::TEXT_CATEGORY ] ],
] );
```

`'dynamic' => ['active' => true]` es lo que el editor lee para mostrar el icono de "tag dinámico"; `categories` filtra qué tags se ofrecen. Ver el consumo de `dynamic.active` en `controls-stack.php:1334` (render) y en `add_responsive_control` (`controls-stack.php:898`).

### 1.6 Resolución de un valor dinámico (lado control)

El control de dato (`includes/controls/base-data.php:84-92`) traduce el shortcode → valor llamando al manager:

```php
public function parse_tags( $dynamic_value, $dynamic_settings ) {
	$current_dynamic_settings = $this->get_settings( 'dynamic' );
	if ( is_array( $current_dynamic_settings ) ) {
		$dynamic_settings = array_merge( $current_dynamic_settings, $dynamic_settings );
	}
	return Plugin::$instance->dynamic_tags->parse_tags_text(
		$dynamic_value, $dynamic_settings,
		[ Plugin::$instance->dynamic_tags, 'get_tag_data_content' ] );
}
```

El manager hace `preg_replace_callback` sobre cada `[elementor-tag ...]` del texto (`manager.php:61-72`) y, por cada uno, llama al callback con `(id, name, settings)`:

```php
public function parse_tags_text( $text, array $settings, callable $parse_callback ) {
	if ( ! empty( $settings['returnType'] ) && 'object' === $settings['returnType'] ) {
		$value = $this->parse_tag_text( $text, $settings, $parse_callback );  // un único tag → objeto
	} else {
		$value = preg_replace_callback( '/\[' . self::TAG_LABEL . '.+?(?=\])\]/',
			function( $m ) use ( $settings, $parse_callback ) {
				return $this->parse_tag_text( $m[0], $settings, $parse_callback );
			}, $text );  // reemplazo in-line en texto
	}
	return $value;
}
```

El callback por defecto (`get_tag_data_content`, `manager.php:236-248`) crea el tag y pide su contenido; respeta el modo de parseo:

```php
public function get_tag_data_content( $tag_id, $tag_name, array $settings = [] ) {
	if ( self::MODE_REMOVE === $this->parsing_mode ) return null;   // modo "remove" → elimina tags
	$tag = $this->create_tag( $tag_id, $tag_name, $this->normalize_settings( $settings ) );
	if ( ! $tag ) return null;
	return $tag->get_content();
}
```

`create_tag` (`manager.php:211-224`) busca la clase en `tags_info`, normaliza settings y construye la instancia:

```php
public function create_tag( $tag_id, $tag_name, array $settings = [] ) {
	$tag_info = $this->get_tag_info( $tag_name );
	if ( ! $tag_info ) return null;
	$tag_class = $tag_info['class'];
	return new $tag_class([ 'settings' => $this->normalize_settings( $settings ), 'id' => $tag_id ]);
}
```

`normalize_settings` (`manager.php:164-186`) aplana wrappers tipados `{$$type, value}` y opciones `{id,label}` (los Atomic/V4 controls).

### 1.7 `Tag` (markup) vs `Data_Tag` (dato) vs `Base_Tag`

**`Base_Tag`** (`core/dynamic-tags/base-tag.php:19`) extiende `Controls_Stack` → **un tag ES un stack de controles** (tiene su propio panel de settings). Métodos abstractos: `get_categories()`, `get_group()`, `get_title()`, `get_content()`, `get_content_type()` (`base-tag.php:35-69`). `get_type()` siempre devuelve `'tag'` (`base-tag.php:26-28`). Sus controles se inicializan dentro de una sección "Settings" en `init_controls()` (`base-tag.php:172-195`).

**`Tag`** (UI / markup) — `core/dynamic-tags/tag.php`:

```php
final public function get_content_type() { return 'ui'; }   // tag.php:64-66

public function get_content( array $options = [] ) {        // tag.php:30-58
	$settings = $this->get_settings();
	ob_start();
	$this->render();                 // el tag emite HTML por echo
	$value = ob_get_clean();
	if ( ! Utils::is_empty( $value ) ) {
		if ( ! Utils::is_empty( $settings, 'before' ) ) $value = wp_kses_post( $settings['before'] ) . $value;
		if ( ! Utils::is_empty( $settings, 'after' ) )  $value .= wp_kses_post( $settings['after'] );
		if ( static::WRAPPED_TAG ) :
			$value = '<span id="elementor-tag-' . esc_attr( $this->get_id() ) . '" class="elementor-tag">' . $value . '</span>';
		endif;
	} elseif ( ! Utils::is_empty( $settings, 'fallback' ) ) {
		$value = wp_kses_post_deep( $settings['fallback'] );
	}
	return $value;
}
```

`Tag` agrega automáticamente una sección "Advanced" con los controles `before`, `after`, `fallback` (`tag.php:84-123`). La constante `WRAPPED_TAG` (default `false`, `tag.php:20`) decide si el output se envuelve en `<span class="elementor-tag" id="elementor-tag-{id}">` — esto es clave para que el **CSS dinámico** lo pueda apuntar (ver §3.4).

**`Data_Tag`** (valor crudo) — `core/dynamic-tags/data-tag.php`:

```php
abstract protected function get_value( array $options = [] );      // data-tag.php:25
final public function get_content_type() { return 'plain'; }       // data-tag.php:31-33
public function get_content( array $options = [] ) {               // data-tag.php:43-45
	return $this->get_value( $options );
}
```

| | `Tag` | `Data_Tag` |
|---|---|---|
| `content_type` | `'ui'` | `'plain'` |
| Produce | HTML (vía `render()` + ob) | valor escalar (`get_value()`) |
| before/after/fallback/wrapper | sí | no |
| Uso típico | títulos, shortcodes, lecturas formateadas | URLs, colores, números, src de imagen |

### 1.8 Render AJAX (editor)

En el editor los tags se resuelven por AJAX (`manager.php:442-486`): valida permisos, `switch_to_post`, dispara `elementor/dynamic_tags/before_render` / `after_render`, decodifica cada `tag_key` (`base64(name)-base64(urlencode(json))`) y devuelve `tag->get_content()`. Config para el editor: `get_config()` → `['tags' => get_tags_config(), 'groups' => $tags_groups]` (`manager.php:412-434`), con `get_editor_config()` por tag (`base-tag.php:91-110`).

---

## 2. Pipeline de render del frontend

### 2.1 Punto de entrada: `get_builder_content()`

`includes/frontend.php:1134-1223+`. De **post → HTML**:

1. `documents->get_doc_for_frontend($post_id)` y check `is_built_with_elementor()` (`frontend.php:1139-1143`).
2. `switch_to_document($document)` (`:1146`).
3. `$data = $document->get_elements_data()` → el árbol JSON de `_elementor_data` (`:1148`).
4. Filtros `elementor/document/load/data` y `elementor/frontend/builder_content_data` (`:1161-1173`).
5. **Encola el CSS del post**: `Post_CSS::create($post_id)` (o `Post_Preview` si es autosave) → `$css_file->enqueue()` (`:1183-1199`).
6. Si `$with_css` (AJAX/customizer), imprime el CSS inline con `print_css()` (`:1219-1221`).
7. `$document->print_elements_with_wrapper( $data )` (`:1223`) → recorre el árbol y llama `print_element()` por elemento.

### 2.2 De settings a "settings para mostrar"

El render NO usa los settings crudos: usa `get_settings_for_display()`, que combina **dynamic tags + visibilidad de controles** (`controls-stack.php:1267-1273`):

```php
public function get_settings_for_display( $setting_key = null ) {
	if ( ! $this->parsed_active_settings ) {
		$this->parsed_active_settings = $this->get_active_settings(
			$this->get_parsed_dynamic_settings(),   // (a) resuelve tags
			$this->get_controls() );                 // (b) filtra por condiciones
	}
	return self::get_items( $this->parsed_active_settings, $setting_key );
}
```

**(a) `parse_dynamic_settings()`** (`controls-stack.php:1289-1348`) — el corazón de la resolución:

```php
foreach ( $controls as $control ) {
	$control_obj = $controls_objs[ $control['type'] ] ?? null;
	if ( ! $control_obj instanceof Base_Data_Control ) continue;
	if ( $control_obj instanceof Control_Repeater ) { /* recursión por fila */ continue; }

	$dynamic_settings = $control_obj->get_settings( 'dynamic' ) ?: [];
	if ( ! empty( $control['dynamic'] ) )
		$dynamic_settings = array_merge( $dynamic_settings, $control['dynamic'] );

	// Sólo si el control es dinámico Y existe un valor en __dynamic__:
	if ( empty( $dynamic_settings ) || ! isset( $all_settings[ Manager::DYNAMIC_SETTING_KEY ][ $control_name ] ) )
		continue;

	if ( ! empty( $dynamic_settings['active'] ) && ! empty( $all_settings['__dynamic__'][ $control_name ] ) ) {
		$parsed_value = $control_obj->parse_tags( $all_settings['__dynamic__'][ $control_name ], $dynamic_settings );
		$dynamic_property = $dynamic_settings['property'] ?? null;
		if ( $dynamic_property ) $settings[ $control_name ][ $dynamic_property ] = $parsed_value; // ej. image: src
		else                     $settings[ $control_name ] = $parsed_value;                      // reemplazo total
	}
}
```

Cacheado vía `get_parsed_dynamic_settings()` (`controls-stack.php:1176-1186`, guarda en `$this->parsed_dynamic_settings`).

**(b) `get_active_settings()`** (`controls-stack.php:1202-1248`): descarta settings de controles ocultos por `condition/conditions` (pone `null` si `is_control_visible()` es false; ver `is_control_visible` en `controls-stack.php:1438-1465`).

### 2.3 `print_element()` — emisión del HTML

`includes/base/element-base.php:473-560+`:

```php
public function print_element() {
	$element_type = $this->get_type();
	if ( $this->should_render_shortcode() ) {   // cache de elemento → emite [elementor-element ...]
		echo '[elementor-element k="..." data="' . base64(json(get_raw_data())) . '"]'; return;
	}
	do_action( 'elementor/frontend/before_render', $this );
	do_action( "elementor/frontend/{$element_type}/before_render", $this );

	ob_start();
	$this->print_content();                     // contenido interno (widget render() o hijos)
	$content = ob_get_clean();

	$should_render = ( ! empty( $content ) || $this->should_print_empty() );
	$should_render = apply_filters( "elementor/frontend/{$element_type}/should_render", $should_render, $this );

	if ( $should_render ) {
		$this->add_render_attributes();         // calcula atributos del wrapper
		$this->before_render();                 // abre el <div wrapper> (widget-base)
		echo $content;                          // ya escapado por render()
		$this->after_render();                  // cierra </div>
		$this->enqueue_scripts();
		$this->enqueue_styles();
	}
	// ... do_action after_render ...
}
```

**Wrapper del widget** (`includes/base/widget-base.php:716-734`):

```php
public function before_render() { ?><div <?php $this->print_render_attribute_string( '_wrapper' ); ?>><?php }
public function after_render()  { ?></div><?php }
protected function print_content() { $this->render_content(); }   // widget-base.php:781-783
```

`render_content()` llama internamente a `render()` (método que cada widget implementa, usando `get_settings_for_display()` para leer valores ya resueltos).

### 2.4 `add_render_attribute()` — atributos del HTML

`includes/base/controls-stack.php:1918-1948`. Acumula atributos por "elemento lógico" (`_wrapper`, `button`, etc.) en `$this->render_attributes[ $element ][ $key ][]`:

```php
public function add_render_attribute( $element, $key = null, $value = null, $overwrite = false ) {
	if ( is_array( $element ) ) { /* { elem => attrs } */ }
	if ( is_array( $key ) )     { /* { key => values } */ }
	if ( empty( $this->render_attributes[ $element ][ $key ] ) )
		$this->render_attributes[ $element ][ $key ] = [];
	settype( $value, 'array' );
	if ( $overwrite ) $this->render_attributes[ $element ][ $key ] = $value;
	else              $this->render_attributes[ $element ][ $key ] = array_merge(
		$this->render_attributes[ $element ][ $key ], $value );
	return $this;
}
```

Luego `print_render_attribute_string('_wrapper')` serializa todo a `class="..." id="..." data-...="..."`. Por eso múltiples llamadas a `add_render_attribute(.., 'class', ..)` se **acumulan** (clases concatenadas), no se pisan (salvo `$overwrite = true`).

### 2.5 Resumen del flujo

```
_elementor_data (JSON)
  → Document::get_elements_data()
  → elements_manager->create_element_instance() por nodo
  → print_element() recursivo
       ├─ get_settings_for_display()
       │     ├─ parse_dynamic_settings()  → control_obj->parse_tags() → Manager->parse_tags_text() → Tag/Data_Tag->get_content()
       │     └─ get_active_settings()      → filtra por condition/conditions
       ├─ add_render_attributes()          → render_attributes[]
       ├─ before_render() <div wrapper>
       ├─ render() del widget  (echo HTML)
       └─ after_render() </div>
  + CSS encolado aparte (post-{id}.css)  ← §3
```

---

## 3. Generación de CSS

### 3.1 Jerarquía de archivos CSS

```
Core\Files\Base (core/files/base.php)
  └─ Core\Files\CSS\Base (core/files/css/base.php)   ← compilación de selectors
       ├─ Core\Files\CSS\Post (core/files/css/post.php)         → post-{id}.css
       │    ├─ Post_Preview (autosave)
       │    └─ Post_Local_Cache
       │         └─ Core\DynamicTags\Dynamic_CSS (core/dynamic-tags/dynamic-css.php)
       └─ Global_CSS / kits → variables globales (--e-global-*)
```

`Post` representa el CSS de un post: prefijo `post-`, meta `_elementor_css` (`post.php:27-29`).

### 3.2 De `selectors` de un control a reglas CSS

Un control declara `selectors`:

```php
$this->add_control( 'text_color', [
	'type' => Controls_Manager::COLOR,
	'selectors' => [ '{{WRAPPER}} .title' => 'color: {{VALUE}};' ],
] );
```

El recorrido empieza en `render_element_styles()` (`post.php:312-320`):

```php
$this->add_controls_stack_style_rules(
	$element,
	$this->get_style_controls( $element, null, $element->get_parsed_dynamic_settings() ),
	$element->get_settings(),
	[ '{{ID}}', '{{WRAPPER}}' ],
	[ $element->get_id(), $this->get_element_unique_selector( $element ) ]
);
```

`get_element_unique_selector()` (`post.php:100-102`) define el **scoping por elemento**:

```php
return '.elementor-' . $this->post_id . ' .elementor-element' . $element->get_unique_selector();
// p.ej. ".elementor-123 .elementor-element.elementor-element-a1b2c3d"
```

Es decir, `{{WRAPPER}}` se sustituye por ese selector único → **cada elemento tiene su propio scope CSS** sin colisiones.

`add_controls_stack_style_rules()` (`base.php:552-594`) itera los controles y, por cada uno con `selectors`, llama a `add_control_style_rules()` → `add_control_rules()`. También:
- recursión en repeaters con placeholder `{{CURRENT_ITEM}}` → `.elementor-repeater-item-{_id}` (`base.php:838-851`).
- detecta dinámicos (`__dynamic__`) y los **deriva a `Dynamic_CSS`** sacándolos del archivo estático (`base.php:572-586`).
- `Post::add_controls_stack_style_rules` además recursa en hijos (`post.php:221-229`).

### 3.3 `add_control_rules()` — el compilador de placeholders

`core/files/css/base.php:319-457`. Por cada `selector => css_property`:

1. **Globals** (`{{WRAPPER}}` con color/tipografía global): si hay `__globals__`, sustituye por `var(--e-global-...)` (`base.php:333-361`, `get_selector_global_value` `:876-919`).
2. **Placeholders de valor** `{{VALUE}}`, `{{SIZE}}`, `{{control_name.SUB}}`, con fallback `||` — vía regex y `parse_property_placeholder()` (`base.php:368-410`, `:474-501`):

```php
$output_css_property = preg_replace_callback(
	'/{{(?:([^.}]+)\.)?([^}| ]*)(?: *\|\| *(?:([^.}]+)\.)?([^}| ]*) *)*}}/',
	function( $matches ) use (...) {
		$parsed_value = $this->parse_property_placeholder( $control, $value, $controls_stack, $value_callback, $matches[2], $matches[1] );
		// ... soporta "|| fallback" (matches[3..4]) y "__EMPTY__"
		return $parsed_value;
	}, $css_property );
```

`parse_property_placeholder()` delega en `$control_obj->get_style_value( $placeholder, $value, $control )` (`base.php:500`) — cada control sabe cómo formatear su valor (color → string, slider → `12px`, etc.). Si el placeholder cruza a **otro control** (`matches[1]`), resuelve el sufijo responsive (`base.php:474-486`).

3. **Selector de media query**: el selector puede venir prefijado con `(tablet)`/`(mobile+)`. Se extrae con `device_pattern` (`base.php:420-444`) y arma `$query = ['max'=>..]` o `['min'=>..]` (`+` = `min`). Desktop se ignora (sin media query).
4. **Sustitución de placeholders de scope** `{{WRAPPER}}`/`{{ID}}` → `str_replace($placeholders, $replacements, $selector)` (`base.php:446`).
5. Inserta en el `Stylesheet`: `$stylesheet->add_rules( $parsed_selector, $output_css_property, $query )` (`base.php:456`).

### 3.4 CSS de los tags dinámicos (`Dynamic_CSS`)

Cuando un control con `selectors` tiene valor **dinámico**, su CSS no puede ir al archivo estático (cambia por request). `base.php:864-874`:

```php
protected function add_dynamic_control_style_rules( array $control, $value ) {
	Plugin::$instance->dynamic_tags->parse_tags_text( $value, $control, function( $id, $name, $settings ) {
		$tag = Plugin::$instance->dynamic_tags->create_tag( $id, $name, $settings );
		if ( ! $tag instanceof Tag ) return;
		$this->add_controls_stack_style_rules(
			$tag, $this->get_style_controls( $tag ), $tag->get_active_settings(),
			[ '{{WRAPPER}}' ], [ '#elementor-tag-' . $id ] );  // ← scope al <span id="elementor-tag-{id}">
	} );
}
```

`Dynamic_CSS` (`core/dynamic-tags/dynamic-css.php`) extiende `Post_Local_Cache`:
- `use_external_file()` = `false` (`dynamic-css.php:88-90`) → **siempre inline**, nunca archivo.
- `get_file_handle_id()` = `elementor-post-dynamic-{post}` (`:96-98`).
- `get_responsive_control_duplication_mode()` = `'dynamic'` (`:80-82`).
- `render_styles()` solo procesa elementos cuyo id está en `post_dynamic_elements_ids` (`:32-42`) — la lista que `Base::add_controls_stack_style_rules` fue acumulando en `$this->dynamic_elements_ids` (`base.php:583`) y guardó en meta (`base.php:155`).
- Se engancha tras encolar el CSS del post: `Manager::after_enqueue_post_css()` (`manager.php:511-519`) crea `Dynamic_CSS::create($post_id, $css_file)` y lo encola.

### 3.5 `{{WRAPPER}}` / `{{ID}}` — tabla de placeholders

| Placeholder | Reemplazo | Definido en |
|---|---|---|
| `{{WRAPPER}}` (post) | `.elementor-{post} .elementor-element.elementor-element-{id}` | `post.php:317-318`, `post.php:100-102` |
| `{{ID}}` | id del elemento | `post.php:317-318` |
| `{{WRAPPER}}` (tag dinámico) | `#elementor-tag-{id}` | `base.php:872` |
| `{{WRAPPER}}` (global widget) | `.elementor-widget-{name}` | `post.php:352-353` |
| `{{CURRENT_ITEM}}` | `.elementor-repeater-item-{_id}` | `base.php:839,847` |
| `{{VALUE}}`,`{{SIZE}}`,`{{UNIT}}`… | valor del control vía `get_style_value()` | `base.php:474-501` |

### 3.6 Archivo vs inline; cuándo se regenera

`core/files/css/base.php`:
- **Modo**: `use_external_file()` = `true` salvo `get_option('elementor_css_print_method') === 'internal'` (`base.php:118-120`).
- **`update()`** (`base.php:132-158`): regenera contenido, setea `meta['status']` ∈ {`file`, `inline`, `empty`}, guarda `meta['css']` (si inline) y `meta['dynamic_elements_ids']`.
- **`enqueue()`** (`base.php:203-286`): si `status` vacío o `is_update_required()` → `update()`. Luego `wp_enqueue_style()` (file) o `wp_add_inline_style()`/`<style>` (inline). Encola fonts e icon-fonts del meta. Evita reimpresión con `self::$printed[handle]`.
- **`parse_content()`** (`base.php:680-709`): activa `Performance::set_use_style_controls(true)`, fija el modo de duplicación responsive, llama `render_css()`, dispara `elementor/css-file/{name}/parse`, y devuelve `$stylesheet->__toString()`.
- `render_css()` en `Post` (`post.php:167-181`) recorre `get_data()` (= `document->get_elements_data()`), crea instancias y llama `render_styles()` por raíz.
- **Regeneración**: al guardar el documento Elementor borra el meta `_elementor_css`; el archivo se reconstruye en el próximo `enqueue()`. El "Regenerate CSS" global hace lo mismo masivamente.

### 3.7 Variables globales (Kit)

Colores/tipografías globales se compilan a `var(--e-global-color-{id})` / `var(--e-global-typography-{id}-{prop})` (`base.php:905,915`), definidas en el CSS del Kit. `render_element_global_styles()` (`post.php:322-357`) inyecta los defaults globales por widget (`.elementor-widget-{name}`).

---

## 4. Responsive / Breakpoints

### 4.1 El `Stylesheet` y las media queries

`includes/stylesheet.php`. Acumula reglas por `query_hash` (`add_rules`, `:141-187`). El hash de la query (`query_to_hash`, `:291-299`) es `min_{device}-max_{device}`. En `__toString()` (`:252-276`) cada grupo no-`all` se envuelve:

```php
$device_text = $this->get_query_hash_style_format( $query_hash ) . '{' . $device_text . '}';
```

`get_query_hash_style_format()` (`:403-413`) produce `@media(max-width:767px)` / `@media(min-width:...)and(max-width:...)`. `hash_to_query()` (`:314-330`) resuelve `max` con el valor del device y `min` con `Plugin::$instance->breakpoints->get_device_min_breakpoint()`. El orden de impresión se calcula en `add_query_hash()` (`:344-386`) — ordena min-width ascendente y max-width descendente para una cascada correcta.

Los devices se registran desde los breakpoints activos en `Base::init_stylesheet()` (`base.php:814-822`):

```php
$this->stylesheet_obj = new Stylesheet();
foreach ( Plugin::$instance->breakpoints->get_active_breakpoints() as $name => $bp ) {
	$this->stylesheet_obj->add_device( $name, $bp->get_value() );
}
```

### 4.2 Manager de breakpoints

`core/breakpoints/manager.php`. Claves y config default (`:17-23`, `:311-344`):

| Key | Default px | Direction |
|---|---|---|
| `mobile` | 767 | max |
| `mobile_extra` | 880 | max |
| `tablet` | 1024 | max |
| `tablet_extra` | 1200 | max |
| `laptop` | 1366 | max |
| `widescreen` | 2400 | min |
| `desktop` | (calculado) | — base |

`mobile` y `tablet` están **siempre activos** (`manager.php:462-464`). Los extra (`mobile_extra`, `tablet_extra`, `laptop`, `widescreen`) son **custom breakpoints** y requieren el experiment `additional_custom_breakpoints` (`manager.php:445-454`); sus valores activos se leen del Kit (`_elementor_page_settings` → `ACTIVE_BREAKPOINTS_CONTROL_ID`).

- `init_breakpoints()` (`:435-474`): instancia **todos** los `Breakpoint` (activos e inactivos).
- `init_active_breakpoints()` (`:483-488`): filtra los `is_enabled()`.
- `get_active_devices_list()` (`:133-160`): lista ordenada incluyendo `desktop` (insertado antes de `widescreen` si existe).
- `get_device_min_breakpoint()` (`:218-249`): el min de un device = (max del device anterior) + 1px; el más bajo siempre arranca en 320px; los `min`-direction usan su propio valor.
- `get_desktop_min_point()` (`:260-265`): valor del device previo a desktop + 1.

`Breakpoint` (`core/breakpoints/breakpoint.php`): objeto con `name/label/value/default_value/direction/is_enabled/is_custom`. `get_value()` (`:69-75`) hace lazy-load desde el Kit vía `init_value()` (`:129-143`); `is_custom` = el valor difiere del default.

### 4.3 Controles responsive

`controls-stack.php:868-...` `add_responsive_control()`:

```php
$args['responsive'] = [];
$active_breakpoints = Plugin::$instance->breakpoints->get_active_breakpoints();
$devices = Plugin::$instance->breakpoints->get_active_devices_list([ 'reverse'=>true, 'desktop_first'=>true ]);
// ...
$responsive_duplication_mode = Plugin::$instance->breakpoints->get_responsive_control_duplication_mode();
$control_is_dynamic = ! empty( $control_to_check['dynamic']['active'] );
// Con additional_custom_breakpoints + modo off/dynamic → un único control; los duplicados por device se crean en JS:
if ( $additional_breakpoints_active && ('off' === $mode || ('dynamic' === $mode && ! $control_is_dynamic)) && ! $is_frontend_available && ! $has_prefix_class ) {
	$args['is_responsive'] = true;
	// ...
}
```

**Modo de duplicación** (`breakpoints/manager.php:50-67`, getters `:382-399`):
- `'on'`: duplica el control por cada device (al generar **Post CSS** — `base.php:189-191`).
- `'dynamic'`: duplica solo si el control es dinámico (al generar **Dynamic CSS** — `dynamic-css.php:80-82`).
- `'off'`: no duplica (el editor crea las variantes en JS).

Históricamente cada device generaba un control `xxx_tablet`, `xxx_mobile`; con el experiment moderno se genera **uno** y las variantes se manejan en runtime. El sufijo del control responsive se resuelve con `Controls_Manager::get_responsive_control_device_suffix()` (usado en `base.php:478`).

### 4.4 Cómo un `selector` responsive se vuelve media query

Dos caminos (ver §3.3 punto 3):
1. **Prefijo en el selector**: `'(tablet){{WRAPPER}} .x' => '...'` → device_pattern extrae `tablet` (max) o `tablet+` (min) (`base.php:420-444`).
2. **`control['responsive']`**: si el control es responsive, `add_control_rules` toma `['min','max']` de ahí (`base.php:448-454`); desktop sin media query.

El valor `max` sale del breakpoint del device; `min` se calcula con `get_device_min_breakpoint()`. Resultado: `@media(max-width:1024px){ ... }`.

---

## 5. Mapeo conceptual a una plataforma propia (FARMATOTAL platform)

### 5.1 Dynamic Tags → "tokens/bindings de datos"

| Concepto Elementor | Equivalente sugerido |
|---|---|
| `[elementor-tag id name settings]` | binding serializado: `{ "$bind": { "source": "product.price", "args": {...} } }` (JSON nativo, evita el regex frágil) |
| `__dynamic__` map por control | en tu modelo de nodo: `props` (estático) + `bindings` (dinámico) separados |
| `Tag` (markup) vs `Data_Tag` (dato) | `RenderTag` (devuelve JSX/HTML) vs `ValueTag` (devuelve string/number/obj) |
| categorías (`text/url/image/...`) | `outputType` del binding; el editor filtra qué bindings ofrece por tipo de prop |
| `before/after/fallback/wrapper` | wrappers opcionales + `fallback` por binding |
| resolución en `parse_dynamic_settings` | `resolveBindings(node, ctx)` que recorre props y reemplaza por valor del contexto |
| registro vía hook lazy | registry `registerTag(name, resolver)`; resolución server-side en SSR |

Recomendación: **no** copiar el shortcode `[elementor-tag …]` (parseo por regex, url-encode anidado). Usar objetos JSON tipados. Mantené la **separación estática/dinámica** (es la idea valiosa: el valor estático sirve de fallback y de preview).

### 5.2 CSS scoping por elemento

La idea central de Elementor que SÍ conviene replicar:

1. Cada nodo tiene un **id único** y un selector scope `{{WRAPPER}}` → en tu plataforma: `[data-el="<id>"]` o una clase `.el-<id>`.
2. Los estilos del nodo se definen como `selector => "prop: {{VALUE}}"` y se compilan reemplazando `{{WRAPPER}}` por el scope único → **CSS aislado por elemento, sin colisiones**.
3. Generás **un stylesheet por página** (cacheado; regenerás al guardar), no estilos inline en cada tag → mejor para CDN/caché.
4. Variables globales (colores/tipografías de marca) como **CSS custom properties** (`--ft-color-primary`) referenciadas por los selectores → cambiar la marca = cambiar el `:root`, sin regenerar todo.
5. Responsive: guardá breakpoints como datos (no hardcode), generá `@media` ordenadas (min asc / max desc). En React/Tailwind podés emitir clases por breakpoint o un `<style>` por página equivalente al `Stylesheet`.
6. Valores dinámicos en CSS: igual que `Dynamic_CSS`, mantenelos **inline por request** (no en el archivo cacheado) y scoped a un id del valor resuelto.

### 5.3 Pipeline de render

```
DB (tree JSON: nodes + props + bindings)
  → loadTree()
  → resolveBindings(node, ctx)   // = parse_dynamic_settings
  → applyConditions(node)        // = get_active_settings
  → renderNode():
       attrs = buildAttributes(node)   // = add_render_attribute (acumular clases)
       <Wrapper data-el={id} {...attrs}>{ children/widget }</Wrapper>
  + compileCss(tree) → page.css (cacheado)  +  dynamicCss inline
```

Diferencias a tu favor con React/Next: en vez de `ob_start()`/`echo`, devolvés componentes; el "scope CSS por elemento" se puede hacer con CSS Modules, `data-el` + stylesheet generado, o styled-components con id estable. La regeneración de CSS la podés mover a build-time (ISR) en vez de runtime.

---

## 6. Hooks/extension points relevantes (core)

| Hook | Disparo | Ref |
|---|---|---|
| `elementor/dynamic_tags/register` | registrar tags (Pro) | `manager.php:302` |
| `elementor/dynamic_tags/before_render` / `after_render` | render AJAX de tags | `manager.php:460,483` |
| `elementor/css-file/post/enqueue` | engancha Dynamic_CSS | `manager.php:535` |
| `elementor/css-file/{name}/parse` / `enqueue` | parse/enqueue de CSS | `base.php:702,276` |
| `elementor/files/css/selectors` / `property` | mutar selectors/valores en compilación | `base.php:351,373` |
| `elementor/element/before_parse_css` / `parse_css` | CSS por elemento | `post.php:294,309` |
| `elementor/frontend/before_render` / `{type}/before_render` | render de elemento | `element-base.php:492,505` |
| `elementor/frontend/{type}/should_render` | abortar render | `element-base.php:531` |
| `elementor/frontend/builder_content_data` | mutar el árbol antes de render | `frontend.php:1173` |
| `elementor/core/breakpoints/get_stylesheet_template` | templates CSS responsive | `manager.php:535` (breakpoints) |

---

### Apéndice — funciones ancla (para volver al código)

- Dynamic tags: `Manager::tag_to_text` (`manager.php:141`), `tag_text_to_tag_data` (`:113`), `parse_tags_text` (`:61`), `get_tag_data_content` (`:236`), `create_tag` (`:211`), `register` (`:337`).
- Tag/Data_Tag: `Tag::get_content` (`tag.php:30`), `Data_Tag::get_content/get_value` (`data-tag.php:43/25`), `Base_Tag::get_editor_config` (`base-tag.php:91`).
- Render: `Frontend::get_builder_content` (`frontend.php:1134`), `Element_Base::print_element` (`element-base.php:473`), `Controls_Stack::get_settings_for_display` (`controls-stack.php:1267`), `parse_dynamic_settings` (`:1289`), `add_render_attribute` (`:1918`), `Base_Data_Control::parse_tags` (`base-data.php:84`).
- CSS: `Base::add_control_rules` (`base.php:319`), `add_controls_stack_style_rules` (`:552`), `add_dynamic_control_style_rules` (`:864`), `Post::get_element_unique_selector` (`post.php:100`), `Stylesheet::__toString` (`stylesheet.php:252`).
- Responsive: `Breakpoints\Manager::get_default_config` (`:311`), `get_device_min_breakpoint` (`:218`), `Controls_Stack::add_responsive_control` (`:868`).
