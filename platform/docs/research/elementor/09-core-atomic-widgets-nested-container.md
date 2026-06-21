# 09 — Core gratuito de Elementor: Atomic Widgets, Nested Elements y Container (la arquitectura v4)

> Documentación del **motor nuevo** de Elementor (Editor v4 / experimento `e_opt_in_v4`): el sistema **atomic-widgets** (props tipadas con schema), el **Container** (flexbox + grid, reemplazo de section/column), el módulo **nested-elements** (anidamiento repetible de tabs/accordion) y cómo se **activa** todo (atomic-opt-in).
>
> Base de código analizada: `C:\Users\sotelos\Downloads\Elementor\elementor\` (CORE gratuito).
> Todas las referencias son `archivo:línea` relativas a `modules/atomic-widgets/`, salvo que se indique otra ruta.
>
> **Por qué importa para la plataforma propia (Farmatotal page builder):** este es exactamente el patrón que necesitamos para un builder serializable y validable: **props tipadas `{$$type, value}` con schema declarativo**, transformers que convierten el modelo de datos en HTML/CSS final, y estilos atómicos con classes reutilizables. Es el reverso del sistema clásico de "controles sueltos" sin contrato. Ver §7 para el resumen accionable.

---

## 0. Mapa mental rápido

```
DEFINICIÓN          define_props_schema()  →  { key => Prop_Type }      (contrato tipado)
PERSISTENCIA        get_data_for_save()    →  Props_Parser valida/sanea  (datos = {$$type,value})
EDITOR (config)     get_initial_config()   →  schema + controls al JS    (React lee el schema)
EDITOR (runtime JS) createPropUtils + Zod  →  controles React vía useBoundProp
RENDER (settings)   get_atomic_settings()  →  Render_Props_Resolver::for_settings()  →  Twig
RENDER (estilos)    Style_Definition       →  Render_Props_Resolver::for_styles()    →  CSS
TRANSFORM           Transformer::transform() : {$$type,value} → valor CSS/HTML plano
```

El wrapper `{$$type, value}` es el átomo de TODO el sistema: lo **genera** `Has_Generate::generate()`, lo **detecta** `Has_Transformable_Validation::is_transformable()`, lo **valida** cada `validate_value()`, lo **resuelve** el transformer registrado por su `$$type`.

---

## 1. Atomic Widgets: filosofía y clase base

### 1.1 Filosofía: props tipadas con schema vs controles sueltos

| | Sistema clásico (Widget_Base) | Sistema atómico (Atomic_Widget_Base) |
|---|---|---|
| Definición de datos | `register_controls()` con arrays asociativos sin tipo | `define_props_schema()` que devuelve objetos `Prop_Type` |
| Forma del dato | strings/arrays planos sin contrato | wrapper tipado `{$$type, value}` |
| Validación | manual / inexistente | `Prop_Type::validate()` + `sanitize()` automáticos contra el schema |
| Render | `render()` con `echo` de PHP concatenado | plantillas **Twig** + resolver de props (o render nativo para elementos) |
| Estilos | controles → CSS vars / selectores | `Style_Definition` + `Style_Variant` con props tipados, classes reutilizables |
| Serialización al editor | controles Backbone | schema JSON (`jsonSerialize`) consumido por React |

La clave: el schema **es el contrato**. Los controles (UI del panel) se **atan** a props del schema (`bind_to`), y si un control apunta a un prop inexistente, el sistema lanza error (`has-atomic-base.php:43-76`).

### 1.2 Clase base `Atomic_Widget_Base`

`elements/base/atomic-widget-base.php:13-23` — extiende el `Widget_Base` clásico y mezcla los traits `Has_Atomic_Base` (la maquinaria) y `Has_Meta`:

```php
abstract class Atomic_Widget_Base extends Widget_Base {
	use Has_Atomic_Base;
	use Has_Meta;

	public static $widget_description = null;

	protected $version = '0.0';
	protected $styles = [];
	protected $interactions = [];
	protected $editor_settings = [];
	protected $origin_id = null;
```

Métodos **abstractos** que cada widget concreto DEBE implementar:

```php
// elements/base/atomic-widget-base.php:59
abstract protected function define_atomic_controls(): array;   // UI del panel
// elements/base/atomic-widget-base.php:94
abstract protected static function define_props_schema(): array; // contrato de datos
```

(además de `get_element_type(): string`, abstracto en el trait — `has-atomic-base.php:37`).

`get_initial_config()` es lo que viaja al editor JS (schema, controles, estilos base, mapeo de dependencias):

```php
// elements/base/atomic-widget-base.php:69-84
public function get_initial_config() {
	$config = parent::get_initial_config();
	$props_schema = static::get_props_schema();

	$config['atomic'] = true;
	$config['atomic_controls'] = $this->get_atomic_controls();
	$config['base_styles'] = $this->get_base_styles();
	$config['base_styles_dictionary'] = $this->get_base_styles_dictionary();
	$config['atomic_props_schema'] = $props_schema;
	$config['atomic_pseudo_states'] = $this->define_atomic_pseudo_states();
	$config['dependencies_per_target_mapping'] = Dependency_Manager::get_source_to_dependents( $props_schema );
	$config['version'] = $this->version;
	$config['meta'] = $this->get_meta();

	return $config;
}
```

### 1.3 El trait `Has_Atomic_Base` — la maquinaria

`get_props_schema()` envuelve a `define_props_schema()`, auto-añade el prop `_cssid` y aplica un filtro extensible:

```php
// elements/base/has-atomic-base.php:310-321
public static function get_props_schema(): array {
	$schema = static::define_props_schema();

	if ( ! isset( $schema['_cssid'] ) ) {
		$schema['_cssid'] = String_Prop_Type::make()->meta( Overridable_Prop_Type::ignore() );
	}

	return apply_filters( 'elementor/atomic-widgets/props-schema', $schema );
}
```

`validate_schema()` exige que cada entrada sea un `Prop_Type`:

```php
// elements/base/has-atomic-base.php:78-86
private static function validate_schema( array $schema ) {
	$widget_name = static::class;
	foreach ( $schema as $key => $prop ) {
		if ( ! ( $prop instanceof Prop_Type ) ) {
			Utils::safe_throw( "Prop `$key` must be an instance of `Prop_Type` in `{$widget_name}`." );
		}
	}
}
```

`get_atomic_settings()` — el corazón del render: resuelve props tipados → valores planos vía `Render_Props_Resolver`:

```php
// elements/base/has-atomic-base.php:243-256
public function get_atomic_settings(): array {
	$schema = static::get_props_schema();
	$props = $this->get_settings();

	$merged_attribute_values = array_merge(
		$this->get_initial_attributes()['value'] ?? [],
		$props['attributes']['value'] ?? []
	);
	$props['attributes'] = Attributes_Prop_Type::generate( $merged_attribute_values );

	$parsed = Render_Props_Resolver::for_settings()->resolve( $schema, $props );

	return $this->transform_link_for_render( $parsed );
}
```

**Persistencia:** al guardar, `get_data_for_save()` → `parse_atomic_settings()` (`has-atomic-base.php:106-117`) usa `Props_Parser::make( $schema )->parse(...)` y lanza excepción si no valida. Nótese que `get_controls()` y `get_stack()` quedan **vacíos a propósito** (`has-atomic-base.php:175-181`, `236-241`): los widgets atómicos NO usan el stack de controles clásico.

---

## 2. El wrapper de prop tipada `{$$type, value}`

### 2.1 Generación — `Has_Generate`

`prop-types/concerns/has-generate.php:11-23`:

```php
trait Has_Generate {
	public static function generate( $value, $disable = false ): array {
		$value = [ '$$type' => static::get_key(), 'value' => $value ];
		if ( $disable ) { $value['disabled'] = true; }
		return $value;
	}
	abstract public static function get_key(): string;
}
```

Por eso `String_Prop_Type::generate('center')` → `['$$type' => 'string', 'value' => 'center']`.

### 2.2 Detección de la forma — `Has_Transformable_Validation`

`prop-types/concerns/has-transformable-validation.php:9-27`:

```php
protected function is_transformable( $value ): bool {
	$satisfies_basic_shape = (
		is_array( $value ) &&
		array_key_exists( '$$type', $value ) &&
		array_key_exists( 'value', $value ) &&
		static::get_key() === $value['$$type']
	);
	$supports_disabling = ( ! isset( $value['disabled'] ) || is_bool( $value['disabled'] ) );
	return ( $satisfies_basic_shape && $supports_disabling );
}
```

### 2.3 El contrato — interfaz `Prop_Type`

`prop-types/contracts/prop-type.php:11-24` — extiende `JsonSerializable` (clave para la serialización al editor):

```php
interface Prop_Type extends \JsonSerializable {
	public static function get_key(): string;
	public function get_type(): string;
	public function get_default();
	public function validate( $value ): bool;
	public function sanitize( $value );
	public function get_meta(): array;
	public function get_settings(): array;
	public function set_dependencies( ?array $dependencies ): self;
	public function get_dependencies(): ?array;
	public function get_initial_value();
}
```

### 2.4 Las tres familias base de prop-type

Según la forma del `value`, hay TRES clases base abstractas:

**`Plain_Prop_Type`** (`prop-types/base/plain-prop-type.php`) — `value` escalar, `$KIND = 'plain'`. Define el `jsonSerialize()` que viaja al editor:

```php
// prop-types/base/plain-prop-type.php:52-86
public function validate( $value ): bool {
	if ( is_null( $value ) || ( $this->is_transformable( $value ) && empty( $value['value'] ) ) ) {
		return ! $this->is_required();
	}
	return ( $this->is_transformable( $value ) && $this->validate_value( $value['value'] ) );
}
public function sanitize( $value ) {
	$value['value'] = $this->sanitize_value( $value['value'] );
	return $value;
}
public function jsonSerialize(): array {
	return [
		'kind' => static::$KIND, 'key' => static::get_key(),
		'default' => $this->get_default(), 'meta' => (object) $this->get_meta(),
		'settings' => (object) $this->get_settings(), 'dependencies' => $this->get_dependencies(),
		'initial_value' => $this->get_initial_value(),
	];
}
abstract public static function get_key(): string;
abstract protected function validate_value( $value ): bool;
abstract protected function sanitize_value( $value );
```

Las subclases solo implementan `get_key()`, `validate_value()` y `sanitize_value()`.

**`Object_Prop_Type`** (`prop-types/base/object-prop-type.php`) — `value` es un mapa de sub-props ("shape"), `$KIND = 'object'`. Define `abstract protected function define_shape(): array;` (`:152`) y valida recursivamente cada campo (`:95-111`).

**`Array_Prop_Type`** (`prop-types/base/array-prop-type.php`) — `value` es una lista de items de un tipo único, `$KIND = 'array'`. Define `abstract protected function define_item_type(): Prop_Type;` (`:115`).

**Caso especial `Union_Prop_Type`** (`prop-types/union-prop-type.php:13-33`) — implementa `Prop_Type` directamente; elige la rama por `value['$$type']` o por tipo PHP del escalar (`:79-97`).

### 2.5 Concerns reutilizables (API fluida)

- `Has_Default` (`concerns/has-default.php:19-27`): `->default($v)` envuelve con `generate()` (el default ya queda en `{$$type,value}`).
- `Has_Initial_Value`, `Has_Settings` (enum/regex/available_units), `Has_Required_Setting` (`->required()`/`->optional()`), `Has_Meta` (`->meta()`, `->description()`).
- Patrón de instanciación: `make()` (constructor estático) + encadenado fluido: `String_Prop_Type::make()->enum(['h1'..'h6'])->default('h2')->required()`.

---

## 3. Catálogo de prop-types disponibles (PHP)

### 3.1 Primitivos (`kind: plain`)

| Clase | `$$type` | `value` | Ref |
|---|---|---|---|
| `String_Prop_Type` | `string` | string; `->enum([...])`, `->regex($p)` | `prop-types/primitives/string-prop-type.php:12-77` |
| `Number_Prop_Type` | `number` | numérico; `->float()` | `prop-types/primitives/number-prop-type.php:11-34` |
| `Boolean_Prop_Type` | `boolean` | bool | `prop-types/primitives/boolean-prop-type.php:11-26` |
| `Classes_Prop_Type` | `classes` | array de strings `/^[a-z][a-z-_0-9]*$/i` | `prop-types/classes-prop-type.php:11-46` |
| `Color_Prop_Type` | `color` | string (extiende String) | `prop-types/color-prop-type.php:11-15` |
| `Image_Attachment_Id_Prop_Type` | `image-attachment-id` | int (extiende Number) | `prop-types/image-attachment-id-prop-type.php:12-24` |

```php
// prop-types/primitives/string-prop-type.php:55-69 — validación con enum/regex
protected function validate_value( $value ): bool {
	return (
		is_string( $value ) &&
		( ! $this->get_enum() || $this->validate_enum( $value ) ) &&
		( ! $this->get_regex() || $this->validate_regex( $value ) )
	);
}
```

### 3.2 Objetos (`kind: object`) — value es un shape

| Clase | `$$type` | Campos del shape | Ref |
|---|---|---|---|
| `Size_Prop_Type` | `size` | `unit` (string enum, req), `size` (union string\|number) | `prop-types/size-prop-type.php:15-104` |
| `Dimensions_Prop_Type` | `dimensions` | `block-start`, `inline-end`, `block-end`, `inline-start` (cada uno `size`) | `prop-types/dimensions-prop-type.php:12-38` |
| `Image_Prop_Type` | `image` | `src` (`image-src`, req), `size` (string enum) | `prop-types/image-prop-type.php:13-27` |
| `Image_Src_Prop_Type` | `image-src` | `id`, `url`, `alt`; valida `id XOR url` | `prop-types/image-src-prop-type.php:12-39` |
| `Link_Prop_Type` | `link` | `destination` (url\|query), `isTargetBlank` (bool), `tag` (enum `a`/`button`, def `a`) | `prop-types/link-prop-type.php:14-49` |
| `Key_Value_Prop_Type` | `key-value` | `key` (string), `value` (string) | `prop-types/key-value-prop-type.php:12-35` |

```php
// prop-types/size-prop-type.php:95-104 — ejemplo canónico de object con union interno
protected function define_shape(): array {
	return [
		'unit' => String_Prop_Type::make()->enum( Size_Constants::all_supported_units() )->required(),
		'size' => Union_Prop_Type::make()
			->add_prop_type( String_Prop_Type::make() )
			->add_prop_type( Number_Prop_Type::make() ),
	];
}
```

### 3.3 Arrays (`kind: array`)

| Clase | `$$type` | Item type | Ref |
|---|---|---|---|
| `Attributes_Prop_Type` | `attributes` | `Key_Value_Prop_Type` | `prop-types/attributes-prop-type.php:11-19` |
| `String_Array_Prop_Type` | `string-array` | `String_Prop_Type` | `prop-types/primitives/string-array-prop-type.php:12-20` |

### 3.4 Catálogo extendido (estilo, filtros, transform, contenido, fecha)

Todos en `prop-types/` (cada uno con su `get_key()`):

- **Estilo/CSS**: `Background_Prop_Type`, `Background_Overlay_*` (color/gradient/image + size-scale/position-offset), `Color_Stop_Prop_Type`, `Gradient_Color_Stop_Prop_Type`, `Shadow_Prop_Type`, `Box_Shadow_Prop_Type`, `Stroke_Prop_Type`, `Border_Radius_Prop_Type`, `Border_Width_Prop_Type`, `Position_Prop_Type`, `Flex_Prop_Type`, `Layout_Direction_Prop_Type`, `Selection_Size_Prop_Type`, `Span_Prop_Type`, `Transition_Prop_Type`.
- **Filtros** (`prop-types/filters/`): `Filter_Prop_Type`, `Backdrop_Filter_Prop_Type`, `Css_Filter_Func_Prop_Type` + funciones `Blur`, `Color_Tone`, `Intensity`, `Hue_Rotate`, `Drop_Shadow_Filter`.
- **Transform** (`prop-types/transform/`): `Transform_Prop_Type`, `Transform_Functions_Prop_Type`, `Transform_Origin_Prop_Type`, `Perspective_Origin_Prop_Type` + `Move/Scale/Rotate/Skew`.
- **Contenido/medios**: `Html_Prop_Type`, `Html_V2_Prop_Type`, `Html_V3_Prop_Type`, `Url_Prop_Type`, `Svg_Src_Prop_Type`, `Video_Src_Prop_Type`, `Video_Attachment_Id_Prop_Type`, `Email_Prop_Type`, `Options_Prop_Type`, `Query_Prop_Type`.
- **Fecha/hora/rangos**: `Date_Time_Prop_Type`, `Date_String_Prop_Type`, `Date_Range_Prop_Type`, `Time_String_Prop_Type`, `Time_Range_Prop_Type`, `Number_Range_Prop_Type`.

---

## 4. Ejemplo completo: el widget `Atomic_Button`

Archivo: `elements/atomic-button/atomic-button.php`. Extiende `Atomic_Widget_Base` y usa `Has_Template` (render Twig).

**Identidad** (`:31-45`): `get_element_type()` → `'e-button'`.

**Schema de props** (`:47-69`):

```php
protected static function define_props_schema(): array {
	return [
		'classes' => Classes_Prop_Type::make()->default( [] ),
		'text' => Html_V3_Prop_Type::make()
			->default( [
				'content'  => String_Prop_Type::generate( __( 'Click here', 'elementor' ) ),
				'children' => [],
			] )
			->description( 'The text displayed on the button.' ),
		'link' => Link_Prop_Type::make(),
		'tag'  => String_Prop_Type::make()->default( 'button' )
			->description( 'The HTML tag for the button element.' ),
		'attributes' => Attributes_Prop_Type::make()->meta( Overridable_Prop_Type::ignore() ),
	];
}
```

**Controles del panel** (`:71-96`) — agrupados en `Section`s, cada control `bind_to` un prop del schema:

```php
protected function define_atomic_controls(): array {
	return [
		Section::make()->set_label( __( 'Content', 'elementor' ) )->set_items( [
			Inline_Editing_Control::bind_to( 'text' )
				->set_placeholder( __( 'Type your button text here', 'elementor' ) )
				->set_label( __( 'Button text', 'elementor' ) ),
		] ),
		Section::make()->set_label( __( 'Settings', 'elementor' ) )->set_id( 'settings' )
			->set_items( $this->get_settings_controls() ),
	];
}
```

**Render vía Twig** (trait `Has_Template`). El widget declara su plantilla:

```php
// atomic-button.php:145-149
protected function get_templates(): array {
	return [ 'elementor/elements/atomic-button' => __DIR__ . '/atomic-button.html.twig' ];
}
```

El render real lo hace `Has_Template::render()` (`elements/base/has-template.php:39-68`), armando el contexto con los settings **ya resueltos**:

```php
// elements/base/has-template.php:53-62
$context = [
	'id' => $this->get_id(),
	'type' => $this->get_name(),
	'settings' => $this->get_atomic_settings(),   // ← props {$$type,value} resueltos a valores planos
	'base_styles' => $this->get_base_styles_dictionary(),
];
echo $renderer->render( $this->get_main_template(), $context );
```

La plantilla Twig consume `settings.text`, `settings.link`, `settings.classes`... ya planos (el `{$$type:'string',value:'button'}` ya se transformó a `'button'`).

### Variante contenedor: `Atomic_Element_Base`

Para elementos anidables (div, flexbox, tabs) existe `Atomic_Element_Base` (`elements/base/atomic-element-base.php`), que extiende `Element_Base` (no `Widget_Base`) pero comparte `Has_Atomic_Base`. Diferencias: render nativo con `before_render()`/`after_render()` que imprimen la etiqueta HTML (`:227-243`), `print_html_tag()` (valida el tag, `:178-181`), config extra `support_nesting`/`default_children`/`allowed_child_types`/`default_html_tag` (`:77-101`). Para render Twig con hijos usa `Has_Element_Template`, que sustituye el placeholder `<!-- elementor-children-placeholder -->` por los hijos (`has-element-template.php:69-95`).

---

## 5. Atomic Styles & Global Classes

### 5.1 Transformers: el puente `{$$type,value}` → valor final

Clase base — `props-resolver/transformer-base.php:8-10`:

```php
abstract class Transformer_Base {
	abstract public function transform( $value, Props_Resolver_Context $context );
}
```

El `$value` que recibe `transform()` es ya el `value` interno (el resolver extrae `$value['value']` antes). El `$context` (`props-resolver/props-resolver-context.php:11-51`) da `get_key()` (nombre de la propiedad CSS/atributo), `is_disabled()` y `get_prop_type()`.

**Registry** — `props-resolver/transformers-registry.php:12-30` (mapa `key → Transformer_Base` + `fallback`):

```php
class Transformers_Registry extends Collection {
	private ?Transformer_Base $fallback = null;
	public function register( string $key, Transformer_Base $transformer ): self { ... }
	public function register_fallback( Transformer_Base $transformer ): self { ... }
	public function get( $key, $fallback = null ) { return parent::get( $key, $fallback ?? $this->fallback ); }
}
```

Ejemplos concretos de transformers:

```php
// transformers/plain-transformer.php:12-16 — identidad (color, strings: caen al fallback)
public function transform( $value, Props_Resolver_Context $context ) { return $value; }

// transformers/styles/size-transformer.php:12-27 — {size,unit} → string CSS
$size = $value['size']; $unit = $value['unit'];
if ( 'custom' === $unit ) { return $size; }
if ( 'auto' === $unit ) { return 'auto'; }
return +$size . $unit;   // 10 + "px" => "10px"

// transformers/settings/classes-transformer.php:12-22 — array de clases (filtro + limpia vacíos)
if ( ! is_array( $value ) ) { return null; }
$value = apply_filters( 'elementor/atomic-widgets/settings/transformers/classes', $value, $context );
return array_filter( $value );

// transformers/styles/shadow-transformer.php:12-24 — objeto → string box/text-shadow
$val = array_filter([ $value['hOffset'], $value['vOffset'], $value['blur'],
	$value['spread'], $value['color'], $value['position'] ?? '' ]);
return implode( ' ', $val );
```

> Detalle importante: **color NO tiene transformer propio**; cae al fallback `Plain_Transformer` y devuelve el string tal cual (`#fff` o `var(--e-...)`).

**Transformers multi-propiedad** (`Multi_Props`): un prop puede expandirse a varias declaraciones CSS. `props-resolver/multi-props.php:9-28` define el sobre `['$$multi-props'=>true,'value'=>[...]]`; `transformers/styles/multi-props-transformer.php:15-37` renombra subclaves con un `key_generator`. Ej: `Dimensions_Prop_Type` (`module.php:414-417`) → `padding-block-start`, etc.; `Background_Transformer` devuelve `background-color` + `background-clip`.

### 5.2 El props-resolver

Clase abstracta `props-resolver/props-resolver.php:15-118` (singleton por contexto; al crearse dispara el action de registro de transformers). Núcleo `transform()` (`:48-106`): resuelve uniones por `$$type`, valida el tipo, resuelve recursivamente objetos (su shape) y arrays (item por item), busca el transformer y lo invoca pasándole solo `$value['value']`.

`Render_Props_Resolver` (`props-resolver/render-props-resolver.php`):
- Dos contextos: `for_styles()` / `for_settings()` (`:28-34`).
- `resolve()` (`:36-63`): recorre el `$schema` (`key => Prop_Type`); si el resultado es `Multi_Props`, lo **fusiona** en el array plano (`:53-57`).
- `resolve_item()` (`:65-85`): recursión con límite `TRANSFORM_DEPTH_LIMIT = 3` (`:23`); corta si `disabled === true`.
- **Dynamic tags**: `get_validated_value()` (`:87-102`) detecta props dinámicos y los resuelve vía `Plugin::$instance->dynamic_tags`.

### 5.3 Render de estilos atómicos: Style Definition + Variants → CSS

**Estructura del objeto style** (builders):
- `styles/style-definition.php:5-42`: `{ id, type:'class', label, variants:[] }`.
- `styles/style-variant.php:5-45`: cada variant = `{ meta:{breakpoint,state}, props:{...} }`. Builders `set_breakpoint()`, `set_state()`, `add_prop()`.

**Renderer** — `styles/styles-renderer.php`:
- `get_base_selector()` (`:91-114`): `type='class'` → selector `"{prefix} .{cssName||id}"` (prefix por defecto `.elementor`).
- `variant_to_css_string()` (`:116-137`) — corazón del render de una variant:

```php
$css = $this->props_to_css_string( $variant['props'] ) ?? '';
if ( isset( $variant['meta']['state'] ) ) {
	$selector = Style_States::get_selector_with_state( $base_selector, $variant['meta']['state'] );
} else { $selector = $base_selector; }
$style_declaration = $selector . '{' . $css . $custom_css . '}';
if ( isset( $variant['meta']['breakpoint'] ) ) {
	$style_declaration = $this->wrap_with_media_query( $variant['meta']['breakpoint'], $style_declaration );
}
return $style_declaration;
```

- `props_to_css_string()` (`:140-153`) conecta con el resolver: `Render_Props_Resolver::for_styles()->resolve( Style_Schema::get(), $props )` → genera `prop:value;`. `Style_Schema::get()` (`styles/style-schema.php:34-51`) arma el schema CSS completo (size, position, typography, spacing, border, background, effects, layout, alignment) y es filtrable.

**Orquestación y cache** — `styles/atomic-styles-manager.php`: agrupa variants por breakpoint (`group_by_breakpoint()`, `:180-198`, default `'desktop'`), genera **un archivo CSS por breakpoint**, valida cache (`Cache_Validity`) y hace `wp_enqueue_style` (`render()`, `:109-150`). El proveedor de styles es `styles/atomic-widget-styles.php:40-69` (recorre los elementos del post y extrae `$element_data['styles']`).

### 5.4 Breakpoints y states

**States** — `styles/style-states.php`: pseudo-states `HOVER`, `ACTIVE`, `FOCUS`, `FOCUS_VISIBLE`, `CHECKED` y un class-state `SELECTED='e--selected'` (`:6-12`). Mapa de estados adicionales (`:30-34`): `hover => [focus-visible]` (pedir `hover` genera también `:focus-visible`).

```php
// styles/style-states.php:36-45
public static function get_selector_with_state( $base_selector, $state ) {
	$all_states = [ $state, ...self::get_additional_states( $state ) ];
	foreach ( $all_states as $current_state ) {
		$selector_strings[] = $base_selector . self::get_state_selector( $current_state );
	}
	return implode( ',', $selector_strings );  // ".sel:hover,.sel:focus-visible"
}
```

`get_state_selector()` (`:51-61`): class-state → `.estado`; pseudo-state → `:estado`.

**Breakpoints** — `styles/styles-renderer.php:161-184`: `wrap_with_media_query()` envuelve el bloque. Cada breakpoint trae `{direction:'min'|'max', value:int, is_enabled:bool}`; `min` → `min-width`, `max` → `max-width`. Resultado: `@media(min-width:768px){ .elementor .clase:hover{...} }`.

### 5.5 Global Classes (lado JS/React)

Paquete `assets/js/packages/editor-global-classes/`. Una **clase global** = `StyleDefinition` = `{ id, type:"class", label, variants:[ {meta:{breakpoint,state}, props, custom_css} ] }` (idéntico al PHP).

- **Estado** (Redux slice `"globalClasses"`, `src/store.ts`): `data:{ items:{id→StyleDefinition}, order:[id] }`, `classLabels`, `initialData:{frontend, preview}`, `isDirty`. Reducers CRUD + historial: `add`, `delete`, `setOrder`, `update`, `updateProps`, `undo`/`redo`, `reset`.
- **Aplicación**: se registra como *styles provider* (`src/global-classes-styles-provider.ts`, `createStylesProvider({key:"global-classes", priority:30, ...})`). Un elemento referencia las clases por sus ids (`g-xxxx`) en su prop `classes`.
- **Persistencia REST** (`src/api.ts`, base `elementor/v1/global-classes`): `publish` = `PUT ?context=frontend`, `saveDraft` = `PUT ?context=preview`. `saveGlobalClasses` (`src/save-global-classes.tsx`) calcula diff `{added, deleted, modified, order}` por `hash()` entre `data` e `initialData[context]`. Dos contextos: **preview** (borrador) y **frontend** (publicado).

### 5.6 Styles Repository y cascada (JS)

Paquete `editor-styles-repository/`. `createStylesRepository` (`src/utils/create-styles-repository.ts`) mantiene providers ordenados por prioridad descendente. Providers registrados:

1. `documentElementsStylesProvider` — **priority 50** — estilos locales por elemento.
2. `globalClassesStylesProvider` — **priority 30** — clases globales.
3. `elementBaseStylesProvider` — estilos base del widget (`getWidgetsCache().base_styles`).

El orden de prioridad (local 50 > global 30 > base) define la **cascada CSS** en el editor. Validación de label (`validateStyleLabel`): máx 50 chars, empieza por letra, sin espacios, `[a-zA-Z0-9_-]`, no reservados.

---

## 6. Container: flexbox + CSS grid (reemplazo de section/column)

Archivo: `includes/elements/container.php` (extiende `Element_Base`).

### 6.1 El switch flex/grid

`container.php:372-389` — control `container_type` con `default => 'flex'`, opciones `flex`/`grid`. Todo el layout se aplica vía **CSS custom properties**, no propiedades CSS directas:

```php
'prefix_class' => 'e-',                                  // → clase e-flex / e-grid
'options' => [ 'flex' => 'Flexbox', 'grid' => 'Grid' ],
'selectors' => [ '{{WRAPPER}}' => '--display: {{VALUE}}' ],
```

### 6.2 Ancho / contenido

- `content_width` (`:391-405`): `boxed`/`full` (`prefix_class => 'e-con-'` → `e-con-boxed`/`e-con-full`).
- `width` (full) → `--width` (`:429-454`); `boxed_width` → `--content-width` con placeholder del kit (`:456-482`); `min_height` → `--min-height` (`:484-504`).

### 6.3 Controles flex (group control)

`container.php:506-526`: `add_group_control( Group_Control_Flex_Container::get_type(), ..., 'condition' => ['container_type' => ['flex']] )`. Campos reales en `includes/controls/groups/flex-container.php:16-244`:
- **direction** (`:28-62`): `CHOOSE` row/column/reverse; usa `selectors_dictionary` que setea varias vars a la vez (`--flex-direction`, `--container-widget-width`, etc.).
- **justify_content** (`:90-125`) → `--justify-content`; **align_items** (`:127-153`) → `--align-items`; **gap** (`:155-180`, tipo `GAPS`) → `--gap/--row-gap/--column-gap`; **wrap** (`:182-201`) → `--flex-wrap`; **align_content** (`:203-241`, si `wrap=wrap`) → `--align-content`.

### 6.4 Controles grid

`container.php:528-537`: `add_group_control( Group_Control_Grid_Container::get_type(), ..., 'condition' => ['container_type' => ['grid']] )`. Campos en `includes/controls/groups/grid-container.php:18-289`:
- **columns_grid** (`:41-68`): `SLIDER` units `fr`/`custom`; fr → `--e-con-grid-template-columns: repeat({{SIZE}}, 1fr)`; default 3fr.
- **rows_grid** (`:70-93`) → `--e-con-grid-template-rows`, default 2fr.
- **gaps** (`:95-112`); **auto_flow** (`:114-128`) → `--grid-auto-flow`; **justify_items**/**align_items** (`:130-183`); **justify_content**/**align_content** (`:185-263`).

### 6.5 Render y anidamiento

- **Wrapper**: `add_render_attributes()` (`:118-129`) añade clases `e-con` + `e-parent` (top-level) o `e-child` (anidado, según `get_data('isInner')`).
- **Tag HTML**: `print_html_tag()` (`:271-279`) lee `html_tag` (div/header/footer/main/article/section/aside/nav/a), validado con `Utils::print_validated_html_tag`.
- **before/after_render** (`:286-323`): aplica link si hay `link['url']`; en boxed abre `<div class="e-con-inner">` (limitado por `--content-width`); video background y shape dividers.
- **Anidamiento**: `_get_default_child_type()` (`:336-348`) permite **tanto widgets como otros containers** como hijos — esto reemplaza el modelo rígido section→column→widget. No hay `nesting_level` numérico; la distinción es binaria (`e-parent`/`e-child`). Sin límite de profundidad: un `e-con` puede contener otros recursivamente.
- **Grid item** (`:1401-1497`): `grid_column`/`grid_row` (span 1–12 o custom). **Flex item** (`:1499-1514`): `Group_Control_Flex_Item` (align_self, order, grow, shrink, basis).

### 6.6 Flexbox atómico y Div Block (v4)

En `modules/atomic-widgets/elements/`, extienden `Atomic_Element_Base` y usan `Has_Element_Template` (Twig). Difieren del Container clásico:

| | Container clásico | Flexbox / Div Block atómicos |
|---|---|---|
| Definición | `register_controls()` (arrays) | `define_props_schema()` (tipado) + `define_atomic_controls()` |
| Estilo base | controles → CSS vars | `define_base_styles()` con `Style_Definition`/`Style_Variant` |
| Render | PHP `before/after_render` | Twig (`get_templates()`) |
| Layout | switch flex↔grid | **especializado**: flexbox ES flex, div-block ES block |

**Flexbox atómico** (`elements/flexbox/flexbox.php`): `get_element_type()` → `'e-flexbox'`; constructor `$this->meta('is_container', true)` (`:29-32`); schema `classes`/`tag`(enum)/`link`/`attributes` (`:54-87`); base styles `display:flex; flex-direction:row; padding:10px` (`:139-159`). **Div Block** (`elements/div-block/div-block.php`): `'e-div-block'`, base `display:block; padding:10px; min-width:30px`.

---

## 7. Nested Elements: anidamiento repetible (tabs / accordion)

### 7.1 `Widget_Nested_Base`

`modules/nested-elements/base/widget-nested-base.php` (extiende `Widget_Base`). Métodos abstractos (`:14-28`):

```php
abstract class Widget_Nested_Base extends Widget_Base {
	abstract protected function get_default_children_elements();          // :21 — los containers hijos por defecto
	abstract protected function get_default_repeater_title_setting_key(); // :28 — qué campo del repeater da el título
```

El corazón está en `get_initial_config()` (`:80-91`), que publica los `defaults` consumidos por el editor JS y `support_nesting => true`:

```php
protected function get_initial_config() {
	return array_merge( parent::get_initial_config(), [
		'defaults' => [
			'elements'                             => $this->get_default_children_elements(),
			'elements_title'                       => $this->get_default_children_title(),
			'elements_placeholder_selector'        => $this->get_default_children_placeholder_selector(),
			'child_container_placeholder_selector' => $this->get_default_children_container_placeholder_selector(),
			'repeater_title_setting'               => $this->get_default_repeater_title_setting_key(),
		],
		'support_nesting' => true,
	] );
}
```

`print_child($index)` (`:124-130`) imprime el container hijo por índice — el puente item-del-repeater ↔ container. `get_raw_data()` (`:98-117`) serializa cada hijo dentro de `elements`. La clave por item se arma en la base común (`includes/base/widget-base.php:863-865`): `get_repeater_setting_key('tab_title','tabs',$index)` → `"tabs.0.tab_title"`.

### 7.2 El control `nested-elements-repeater`

`modules/nested-elements/controls/control-nested-repeater.php` (completo):

```php
class Control_Nested_Repeater extends Control_Repeater {
	const CONTROL_TYPE = 'nested-elements-repeater';
	public function get_type() { return static::CONTROL_TYPE; }
}
```

En PHP **no difiere** de un repeater normal salvo en el `type`. Toda la sincronización item↔container la hace el editor JS: el `type` distinto es el marcador que dice "sincronizá 1:1 los items con los `defaults.elements`".

### 7.3 Ejemplo: `nested-tabs`

`modules/nested-tabs/widgets/nested-tabs.php` (extiende `Widget_Nested_Base`). Define **tres** containers hijos por defecto y el campo de título:

```php
// :71-90
protected function get_default_children_elements() {
	return [ $this->tab_content_container(1), $this->tab_content_container(2), $this->tab_content_container(3) ];
}
protected function get_default_repeater_title_setting_key() { return 'tab_title'; }
protected function get_default_children_placeholder_selector() { return '.e-n-tabs-content'; }
```

El repeater se registra con el control nested (`:171-188`), con 3 items por defecto (simetría con los 3 containers):

```php
$this->add_control( 'tabs', [
	'type'        => Control_Nested_Repeater::CONTROL_TYPE,
	'fields'      => $repeater->get_controls(),
	'default'     => [ ['tab_title'=>'Tab #1'], ['tab_title'=>'Tab #2'], ['tab_title'=>'Tab #3'] ],
	'title_field' => '{{{ tab_title }}}',
] );
```

En `render()` (`:1165-1215`) se recorren `$settings['tabs']`: por cada item se generan los `<button>` (títulos) y al final los containers. La **asociación item↔container** vive en `print_child()` sobreescrito (`:1130-1152`), que inyecta atributos ARIA (`role=tabpanel`, `aria-labelledby`) al container correcto y luego imprime `get_children()[$index]`.

`nested-accordion` (`modules/nested-accordion/widgets/nested-accordion.php`) es el mismo patrón: `get_default_repeater_title_setting_key()` → `'item_title'`, render con `<details>/<summary>`, `is_dynamic_content() => true` + schema FAQ opcional.

---

## 8. Activación: cómo se enciende el sistema atomic (atomic-opt-in)

Dos experimentos en dos módulos trabajan juntos.

### 8.1 Página de opt-in — `modules/atomic-opt-in/module.php`

```php
const EXPERIMENT_NAME = 'e_opt_in_v4_page';   // :11
```

`get_experimental_data()` (`:19-28`): experimento **oculto**, activo por defecto, alpha — solo controla mostrar la *página de opt-in* en Ajustes. El constructor (`:34-49`) activa en cascada: chip alpha → (si activo) registra el experimento real + pestaña "Atomic Editor" → (si activo) welcome popover.

### 8.2 El experimento real — `modules/atomic-widgets/opt-in/opt-in.php`

```php
class Opt_In { const EXPERIMENT_NAME = 'e_opt_in_v4'; }   // :15
```

`register_feature()` (`:42-55`): oculto, `STATE_INACTIVE` por defecto, pero **auto-activo en instalaciones nuevas ≥ 4.0.0** (`new_site.default_active = true`). **Qué habilita** (el bundle, `:25-33`):

```php
const OPT_IN_FEATURES = [
	self::EXPERIMENT_NAME,                    // e_opt_in_v4
	'container',
	NestedElementsModule::EXPERIMENT_NAME,    // nested-elements
	AtomicWidgetsModule::EXPERIMENT_NAME,     // atomic-widgets (e_atomic_elements)
	GlobalClassesModule::NAME,                // global classes
	VariablesModule::EXPERIMENT_NAME,         // variables (design tokens)
	ComponentsModule::EXPERIMENT_NAME,        // components
];
```

**Mecanismo en DB** — `opt_in_v4()` (`:57-69`): escribe `update_option()` por cada feature con la clave `experiments->get_feature_option_key($feature)` = `STATE_ACTIVE`. **Disparadores** (`:35-40`): AJAX (`editor_v4_opt_in`/`opt_out`) y REST (`POST elementor/v1/operations/opt-in-v4`), ambos con guard `current_user_can('manage_options')`.

### 8.3 Registro del módulo atomic — `modules/atomic-widgets/module.php`

Gobernado por el experimento `e_atomic_elements` (`:135`); si no está activo, el constructor retorna temprano (`:161-163`). Hooks (`:168-186`):

```php
add_filter( 'elementor/widgets/register', fn($wm) => $this->register_widgets($wm) );
add_action( 'elementor/elements/elements_registered', fn($em) => $this->register_elements($em) );
add_filter( 'elementor/editor/localize_settings', fn($s) => $this->add_styles_schema($s) );
add_action( 'elementor/atomic-widgets/settings/transformers/register', fn($t) => $this->register_settings_transformers($t) );
add_action( 'elementor/atomic-widgets/styles/transformers/register', fn($t) => $this->register_styles_transformers($t) );
```

Widgets registrados (`:297-306`): `Atomic_Heading`, `Atomic_Image`, `Atomic_Paragraph`, `Atomic_Svg`, `Atomic_Button`, `Atomic_Youtube`, `Atomic_Divider`, `Atomic_Self_Hosted_Video`. Elementos contenedores (`:308-325`): `Div_Block`, `Flexbox`, `Atomic_Tabs`. El registro de transformers settings (`:327-342`) y styles (`:344-418`) mapea `Prop_Type::get_key()` → transformer, con fallback `Plain_Transformer`. `add_styles_schema()` (`:279-287`) inyecta `Style_Schema::get()` en `localize_settings['atomic']['styles_schema']` (que el JS lee como `window.elementor.config.atomic.styles_schema`).

---

## 9. Capa JS/React (resumen de arquitectura)

> Nota: el plugin distribuido trae **bundles webpack no-minificados** (`<pkg>.js`) sin `.ts` fuente; las claves de módulo conservan rutas TS originales. Cada paquete se publica en `window.elementorV2.<camelCase>`.

### 9.1 Prop-types en JS — `createPropUtils` + Zod

No existe `createPropType` en JS (eso es PHP). El equivalente es `createPropUtils` (`editor-props/editor-props.js`, `src/utils/create-prop-utils.ts`):

```js
function createPropUtils(e, r) {
  const t = z.strictObject({ $$type: z.literal(e), value: r, disabled: z.boolean().optional() });
  return { extract: v => isValid(v) ? v.value : null, isValid, create, schema: t, key: e };
}
```

Mismo shape `{$$type, value, disabled?}` que PHP, validado con **Zod** (`@elementor/schema`). Ejemplos: `stringPropTypeUtil = createPropUtils("string", z.string().nullable())`, `sizePropTypeUtil` (unión `{unit,size}` con enums de unidades), `classesPropTypeUtil` (`z.array(z.string().regex(/^[a-z][a-z-_0-9]*$/i))`). El schema real (`kind`, `key`, `default`, `settings`) viene del servidor.

### 9.2 Controles React y binding

`createControl` (`editor-controls/editor-controls.js`, `src/create-control.tsx`) + el hook `useBoundProp(<propTypeUtil>)` (`src/bound-prop-context/use-bound-prop.ts`): cada control declara con qué `propTypeUtil` se enlaza, y el hook hace extract/create/validate contra el valor atomic del store, resolviendo uniones. Controles: `TextControl`→string, `SelectControl`→string, `SwitchControl`→boolean, `SizeControl`→size, etc. (catálogo completo en `editor-controls/src/controls/`).

### 9.3 Paquetes editor-* (modular)

| Paquete | Rol |
|---|---|
| `editor-props` | Prop-types atomic (createPropUtils, Zod, validación, LLM schema) |
| `editor-controls` | Controles React + `useBoundProp` |
| `editor-styles` | Helpers: schema de estilos (`getStylesSchema`), variantes por meta, selectores con state |
| `editor-styles-repository` | Repositorio de providers de estilos (cascada por prioridad) |
| `editor-global-classes` | Clases globales: slice Redux, CRUD, REST preview/frontend, undo/redo |
| `editor-variables` | Variables globales (design tokens) |
| `editor-elements` | Modelo/estado de elementos (getElements, updateElementStyle) |
| `editor-responsive` | Breakpoints + device-mode (desde `window.elementor.config.responsive`) |
| `editor-v1-adapters` | Puente al editor v1 (Backbone/Marionette): comandos, eventos |
| `editor-editing-panel` | Panel de edición (monta controles según schema) |
| `editor-canvas`, `editor-elements-panel`, `editor-documents`, `editor-mcp`, ... | Canvas, navigator, documentos, integración IA |

States soportados (JS `src/utils/state-utils.ts`): `hover`, `focus`, `active`, `focus-visible` (pseudo) + `e--selected` (clase). `getAdditionalStates("hover") = ["focus-visible"]` — idéntico al PHP. Una variante de estilo = tupla `(breakpoint, state)`.

---

## 10. Por qué importa para una plataforma propia

El sistema atómico de Elementor es un **modelo de referencia directo** para un page builder propio serializable y robusto:

1. **Props tipadas con schema = validación + serialización limpia.** Cada dato es `{$$type, value}`, autovalidado contra un schema declarativo (`define_props_schema()` en PHP / `createPropUtils` + Zod en JS). El mismo contrato sirve para validar al guardar, serializar al editor, y resolver al renderizar. Es la diferencia entre un JSON de configuración "libre" (frágil) y un documento tipado (robusto). Para Farmatotal: nuestros bloques CMS (`chaiBlocks`, `sectionBlocks`, `CatalogBlock`) ganarían un contrato `{$$type,value}` validable en `shared-types` y serializable sin pérdida.

2. **Transformers = separación modelo ↔ presentación.** El dato nunca contiene HTML/CSS; un transformer registrado por `$$type` lo convierte en el render final. Cambiar la presentación no toca los datos guardados. Permite versionado y migración de schema sin reescribir contenido.

3. **Estilos atómicos + global classes = design system reutilizable.** Variantes `(breakpoint, state)` + classes globales con CRUD/diff por hash + cascada por prioridad de providers. Es exactamente el modelo que necesita un builder multi-tema (como nuestros 3 temas dinámicos): estilos como datos, no como CSS hardcodeado.

4. **Container flex/grid + nested = layout componible sin jerarquía rígida.** Reemplazar section→column→widget por containers anidables recursivamente (y widgets nested para tabs/accordion) es el patrón de layout moderno; un container puede contener containers, un widget nested sincroniza items repetibles con containers hijos 1:1.

5. **Activación por feature flags.** El bundle `OPT_IN_FEATURES` muestra cómo introducir un motor nuevo junto al legacy sin romper compatibilidad: experimentos en DB, opt-in/opt-out por opción, auto-activo en instalaciones nuevas. Modelo aplicable para migrar nuestro builder gradualmente.

**Tablas de referencia rápida** (para implementar): catálogo de prop-types §3, transformers §5.1, estructura style/variant §5.3, states/breakpoints §5.4, nested config §7.1.
