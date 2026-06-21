# Elementor Pro — Arquitectura de Widgets y Controles Configurables

> Documentación técnica de referencia del **sistema de widgets y controles** de Elementor Pro.
> Base analizada: `C:\Users\sotelos\Downloads\Elementor\elementor-pro` (Elementor Pro **4.1.1**, requiere core Elementor ≥ 3.35, recomendado 4.1).
> Cubre: definición de un widget Pro, sistema clásico de controles (Content/Style/Advanced), conexión control→render (selectors CSS), el sistema **nuevo atomic-widgets** (props/schema/prop-types), y traits/clases base reutilizables.

> **Nota importante sobre alcance.** El motor de controles clásico (`Widget_Base`, `Controls_Manager`, `start_controls_section`, `add_control`, group controls, etc.) vive en el **core gratuito** de Elementor (`\Elementor\…`), no en Pro. Igual ocurre con el **núcleo** del sistema atomic-widgets (`\Elementor\Modules\AtomicWidgets\…`). Elementor Pro **consume y extiende** ambos. Esta doc explica cómo Pro define widgets sobre ese motor, con ejemplos reales de Pro, y describe el núcleo atomic a partir de las clases del core que Pro importa (el directorio del core no está presente localmente, por eso esas clases se documentan por su uso/contrato).

---

## 1. Bootstrap: cómo se carga Pro y se registran módulos/widgets

### 1.1 Entry point (`elementor-pro.php`)

`elementor-pro.php:50-68` define las constantes (`ELEMENTOR_PRO_VERSION`, `ELEMENTOR_PRO_PATH`, `ELEMENTOR_PRO_MODULES_PATH`, etc.) y en `elementor-pro.php:111` engancha el arranque:

```php
add_action( 'plugins_loaded', 'elementor_pro_load_plugin' );
```

`elementor_pro_load_plugin()` (`elementor-pro.php:77-99`) valida que el core esté cargado (`did_action('elementor/loaded')`) y que la versión mayor del core sea suficiente, y finalmente hace `require ELEMENTOR_PRO_PATH . 'plugin.php'`.

> ⚠️ Esta copia concreta está **nulled/cracked**: `elementor-pro.php:16-44` inyecta una licencia falsa y hace MITM de `pre_http_request` hacia `my.elementor.com`. No es parte de la arquitectura legítima; se ignora para esta doc.

### 1.2 Singleton `Plugin` (`plugin.php`)

`plugin.php:28` — `class Plugin` es un singleton (`instance()` en `plugin.php:138`). En el constructor privado (`plugin.php:463-499`):

- `spl_autoload_register([$this,'autoload'])` — autoloader PSR-ish propio (`plugin.php:146-179`): mapea `ElementorPro\Foo\BarBaz` → `foo/bar-baz.php` (camelCase→kebab, `_`→`-`, `\`→`/`, todo en minúsculas).
- `setup_hooks()` (`plugin.php:411-429`) engancha, entre otros:
  - `add_action('elementor/init', [$this,'on_elementor_init'])` ← **clave**.
  - scripts frontend/preview (`elementor/frontend/before_register_scripts`, etc.).

`on_elementor_init()` (`plugin.php:349-366`) instancia el **Modules_Manager** y dispara `do_action('elementor_pro/init')`.

`Plugin::elementor()` (`plugin.php:131`) es el atajo a `\Elementor\Plugin::$instance` (acceso al core).

### 1.3 `Modules_Manager` (`core/modules-manager.php`)

`core/modules-manager.php:17-110` — el constructor tiene un **array fijo de nombres de módulos** (`core/modules-manager.php:18-88`); incluye los widgets clásicos (`pricing`, `flip-box`, `call-to-action`, `carousel`, `forms`, `posts`…) y los nuevos (`atomic-widgets`, `atomic-form`, `variables`, `editor-one`, `interactions`, `display-conditions`…).

El loop (`core/modules-manager.php:90-109`) convierte cada nombre kebab a clase `\ElementorPro\Modules\<Pascal>\Module`, consulta `get_experimental_data()` (registra el experimento en el core y respeta su activación) y si `is_active()` la instancia:

```php
$class_name = '\ElementorPro\Modules\\' . $class_name . '\Module';
$experimental_data = $class_name::get_experimental_data();
if ( $experimental_data ) {
    Plugin::elementor()->experiments->add_feature( $experimental_data );
    if ( ! Plugin::elementor()->experiments->is_feature_active( $experimental_data['name'] ) ) continue;
}
if ( $class_name::is_active() ) {
    $this->modules[ $module_name ] = $class_name::instance();
}
```

`get_modules( $name )` (`core/modules-manager.php:117-127`) permite recuperar un módulo por nombre (o todos con `''`).

### 1.4 Módulo de widget (`modules/<x>/module.php`)

Cada módulo extiende `ElementorPro\Base\Module_Base` (que extiende `\Elementor\Core\Base\Module`). Ejemplo `modules/call-to-action/module.php:11-24`:

```php
class Module extends Module_Base {
    public function get_widgets() {            // ← el core lee este array y registra cada widget
        return [ 'Call_To_Action' ];
    }
    public function get_name() { return 'call-to-action'; }
}
```

`get_widgets()` devuelve los nombres de clase (relativos a `…\Module\Widgets\`). El **core** (`Module::init_widgets()` / hook `elementor/widgets/register`) instancia y registra esos widgets. El módulo además registra sus assets CSS/JS vía hooks de Elementor (`elementor/frontend/after_register_styles` en `module.php:16`, `register_styles()` en `module.php:47-71`).

**Flujo resumido:** `plugins_loaded` → `plugin.php` → `elementor/init` → `Modules_Manager` instancia cada `Module` → el core llama `Module::get_widgets()` → registra cada `Widget_Base`.

---

## 2. Definición de un widget Pro

### 2.1 Clase base: `Base_Widget` + traits

`base/base-widget.php:11-16` es deliberadamente mínima — solo compone traits:

```php
abstract class Base_Widget extends Widget_Base {   // \Elementor\Widget_Base
    use Base_Widget_Trait;
    use On_Import_Trait;
}
```

`base/base-widget-trait.php:10-18` aporta dos cosas a **todos** los widgets Pro:

```php
trait Base_Widget_Trait {
    public function is_editable() { return License_API::is_license_active(); }
    public function get_categories() { return [ 'pro-elements' ]; }   // categoría por defecto en el panel
}
```

Es decir, todo widget Pro cae por defecto en la categoría `pro-elements` y solo es editable con licencia activa.

### 2.2 Anatomía de un widget concreto

Ejemplo `modules/call-to-action/widgets/call-to-action.php:24-62` (mismo patrón en `flip-box.php:24-55` y `pricing/widgets/price-table.php:21-58`):

```php
class Call_To_Action extends Base_Widget {
    public function get_name() { return 'call-to-action'; }                       // id interno único
    public function get_title() { return esc_html__( 'Call to Action', 'elementor-pro' ); }
    public function get_icon() { return 'eicon-image-rollover'; }                 // icono del panel
    public function get_keywords() { return [ 'call to action', 'cta', 'button' ]; } // búsqueda
    public function get_style_depends(): array { return [ 'widget-call-to-action', 'e-transitions' ]; }
    // get_categories() → heredado de Base_Widget_Trait = ['pro-elements']
}
```

Métodos de identidad/ciclo de vida relevantes (declarados en estos widgets o heredados de `Widget_Base`):

| Método | Propósito | Ref |
|---|---|---|
| `get_name()` | id único del widget | cta:26 |
| `get_title()` | etiqueta visible | cta:30 |
| `get_icon()` | icono eicon en el panel | cta:38 |
| `get_keywords()` | términos de búsqueda | cta:42 |
| `get_categories()` | categoría(s); default `pro-elements` | base-widget-trait:15 |
| `get_group_name()` | grupo (para assets condicionales) p.ej. `'pricing'` | price-table:2033 |
| `get_style_depends()` / `get_script_depends()` | handles CSS/JS a encolar solo si el widget está en página | cta:46 |
| `has_widget_inner_wrapper()` | markup optimizado (experimento `e_optimized_markup`) | cta / price / flip |
| `register_controls()` | **define todos los controles** (ver §3) | cta:63… |
| `render()` | salida HTML server-side (PHP) | cta:1700+ |
| `content_template()` | plantilla JS (Underscore) para live-preview en el editor | cta:1896-2045 |

---

## 3. Sistema de controles clásico (Content / Style / Advanced)

Todos los controles se declaran dentro de `register_controls()`. El método arma **secciones** que se ubican en **tabs**.

### 3.1 Secciones y tabs

`start_controls_section( $id, $args )` / `end_controls_section()`. El tab se elige con la clave `tab` usando constantes de `Controls_Manager`:

- `TAB_CONTENT` → **es el default** (no hace falta pasar `tab`).
- `TAB_STYLE` → pestaña Estilo.
- `TAB_ADVANCED` → pestaña Avanzado (la inyecta el framework automáticamente; los widgets normalmente no la declaran).

```php
// Content (default) — call-to-action.php:65
$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Content', 'elementor-pro' ) ] );
// …add_control()…
$this->end_controls_section();

// Style — call-to-action.php:394
$this->start_controls_section( 'box_style', [
    'label' => esc_html__( 'Box', 'elementor-pro' ),
    'tab'   => Controls_Manager::TAB_STYLE,
] );
```

### 3.2 Tabs internas (Normal / Hover) — `start_controls_tabs`

Dentro de una sección de estilo se agrupan estados (típicamente Normal/Hover) con tabs:

```php
// call-to-action.php:1180
$this->start_controls_tabs( 'button_tabs' );
  $this->start_controls_tab( 'button_normal', [ 'label' => esc_html__( 'Normal', 'elementor-pro' ) ] );
    $this->add_control( 'button_text_color', [
        'type' => Controls_Manager::COLOR,
        'selectors' => [ '{{WRAPPER}} .elementor-cta__button' => 'color: {{VALUE}};' ],
    ] );
  $this->end_controls_tab();
  $this->start_controls_tab( 'button-hover', [ 'label' => esc_html__( 'Hover', 'elementor-pro' ) ] );
    $this->add_control( 'button_hover_text_color', [
        'type' => Controls_Manager::COLOR,
        'selectors' => [ '{{WRAPPER}} .elementor-cta__button:hover' => 'color: {{VALUE}};' ],
    ] );
  $this->end_controls_tab();
$this->end_controls_tabs();
```

Mismo patrón en `price-table.php:1236` y `flip-box.php:1398`.

### 3.3 Tipos de control (`add_control`)

`add_control( $id, $args )`. `$args` siempre lleva `type` (constante de `Controls_Manager`) más opciones. Tipos vistos en los widgets de ejemplo:

| Tipo (`Controls_Manager::`) | Args típicos | Ref |
|---|---|---|
| `TEXT` | `default`, `label_block`, `separator`, `dynamic` | cta:222 |
| `TEXTAREA` | `rows`, `default` | cta:259 |
| `SELECT` | `options` (mapa valor→label), `default` | cta:237 |
| `SELECT` agrupado | `groups` => `[ ['label'=>…,'options'=>[…]], … ]` | cta:1440 |
| `CHOOSE` (botones-icono) | `options` => `[ key => ['title'=>…,'icon'=>'eicon-…'] ]`, `toggle` | cta:152 |
| `SWITCHER` (toggle) | `label_on`, `label_off`, `return_value`, `default` | flip:397 |
| `COLOR` | `selectors`, `global`=>`['default'=>Global_Colors::…]` | cta:727 / price:457 |
| `MEDIA` | `default`=>`['url'=>Utils::get_placeholder_image_src()]`, `dynamic` | cta:117 |
| `ICONS` | `fa4compatibility`, `default`=>`['value'=>…,'library'=>…]`, `recommended`, `skin` | cta:205 |
| `URL` | `dynamic`=>`['active'=>true]`, `placeholder` | cta:308 |
| `NUMBER` | `default`, `min`/`max`, `condition` | price:203 |
| `DIMENSIONS` | `size_units`, `selectors` con `{{TOP}}{{RIGHT}}{{BOTTOM}}{{LEFT}}{{UNIT}}` | cta:849 |
| `SLIDER` | `size_units`, `range`, `selectors` con `{{SIZE}}{{UNIT}}` (ver responsive) | cta:402 |
| `HEADING` | separador visual / título de grupo de controles | cta:890 |
| `HIDDEN` | `default`, `prefix_class` (valor no editable, solo aporta clase) | cta:1499 |
| `HOVER_ANIMATION` | animación hover predefinida | price:1399 |
| `REPEATER` | `fields` => `$repeater->get_controls()`, `title_field` | price:242 |

Flags transversales útiles: `dynamic=>['active'=>true]` (habilita Dynamic Tags), `ai=>['active'=>false]` (desactiva el botón IA, p.ej. price-table:156), `frontend_available=>true` (expone el setting al JS de frontend), `render_type` (`'template'`/`'none'`/`'ui'`, controla qué se re-renderiza al cambiar), `separator`, `label_block`, `condition`/`conditions`.

### 3.4 Controles responsive (`add_responsive_control`)

Genera automáticamente variantes por breakpoint (desktop/tablet/mobile y los custom). Muy usado con `SLIDER` y `DIMENSIONS`:

```php
// SLIDER multi-unidad — call-to-action.php:402
$this->add_responsive_control( 'min-height', [
    'label' => esc_html__( 'Height', 'elementor-pro' ),
    'type'  => Controls_Manager::SLIDER,
    'size_units' => [ 'px', 'em', 'rem', 'vh', 'custom' ],
    'range' => [ 'px' => [ 'min' => 100, 'max' => 1000 ] ],
    'selectors' => [ '{{WRAPPER}} .elementor-cta__content' => 'min-height: {{SIZE}}{{UNIT}}' ],
] );

// DIMENSIONS responsive — call-to-action.php:486
$this->add_responsive_control( 'padding', [
    'type' => Controls_Manager::DIMENSIONS,
    'size_units' => [ 'px','%','em','rem','vw','custom' ],
    'selectors' => [ '{{WRAPPER}} .elementor-cta__content' =>
        'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}' ],
] );
```

### 3.5 Group controls (`add_group_control`)

Inyectan **un set completo de controles relacionados** con un solo `name` y un `selector` común. Se invocan con `Group_Control_X::get_type()`:

```php
// Tipografía con global por defecto — call-to-action.php:901
$this->add_group_control( Group_Control_Typography::get_type(), [
    'name' => 'title_typography',
    'global' => [ 'default' => Global_Typography::TYPOGRAPHY_PRIMARY ],
    'selector' => '{{WRAPPER}} .elementor-cta__title',
] );

// Background (classic+gradient) — flip-box.php:423
$this->add_group_control( Group_Control_Background::get_type(), [
    'name' => 'background_a', 'types' => [ 'classic', 'gradient' ],
    'selector' => '{{WRAPPER}} .elementor-flip-box__front',
] );

// Background con exclude + fields_options + global — price-table.php:1277
$this->add_group_control( Group_Control_Background::get_type(), [
    'name' => 'button_background', 'types' => ['classic','gradient'], 'exclude' => ['image'],
    'selector' => '{{WRAPPER}} .elementor-price-table__button',
    'fields_options' => [
        'background' => [ 'default' => 'classic' ],
        'color'      => [ 'global' => [ 'default' => Global_Colors::COLOR_ACCENT ] ],
    ],
] );
```

Otros group controls usados: `Group_Control_Border` (flip:562), `Group_Control_Box_Shadow` (cta:1314), `Group_Control_Image_Size` (cta:131, su `name` reusa el del control MEDIA), `Group_Control_Css_Filter` (cta:1607), `Group_Control_Text_Shadow` (cta:923), `Group_Control_Text_Stroke` (cta:915). `fields_options` permite sobreescribir args de un subcontrol concreto (p.ej. redirigir `font_size` a una CSS var, ver base-carousel-trait:934-947).

### 3.6 Condiciones (`condition` / `conditions`)

`condition` = forma simple (AND implícito sobre pares clave→valor). `conditions` = forma avanzada con `relation` (and/or), `terms`, `operator`.

```php
// Simple: mostrar solo si 'title' no está vacío — call-to-action.php:251
'condition' => [ 'title!' => '' ],
// Valor por array (NOT in) — call-to-action.php:571
'condition' => [ 'graphic_element!' => [ 'none', '' ] ],
// Subcampo (de un control MEDIA) — call-to-action.php:137
'condition' => [ 'bg_image[id]!' => '' ],
// Avanzada con relation/terms/operator — price-table.php:438
'conditions' => [ 'relation' => 'or', 'terms' => [
    [ 'name' => 'heading',     'operator' => '!==', 'value' => '' ],
    [ 'name' => 'sub_heading', 'operator' => '!==', 'value' => '' ],
] ],
```

### 3.7 Repeater

Un `Repeater` es un mini-conjunto de controles que se repite N veces. Patrón canónico (`pricing/widgets/price-table.php:242-304`):

```php
$repeater = new Repeater();
$repeater->add_control( 'item_text', [
    'type' => Controls_Manager::TEXT, 'dynamic' => ['active'=>true],
    'default' => esc_html__( 'List Item', 'elementor-pro' ),
] );
$repeater->add_control( 'item_icon_color', [
    'type' => Controls_Manager::COLOR,
    'selectors' => [
        '{{WRAPPER}} {{CURRENT_ITEM}} i'   => 'color: {{VALUE}}',   // {{CURRENT_ITEM}} = scope por fila
        '{{WRAPPER}} {{CURRENT_ITEM}} svg' => 'fill: {{VALUE}}',
    ],
] );

$this->add_control( 'features_list', [
    'type'        => Controls_Manager::REPEATER,
    'fields'      => $repeater->get_controls(),     // ← inyecta los controles de la fila
    'default'     => [ [ 'item_text' => esc_html__( 'List Item #1', 'elementor-pro' ) ], … ],
    'title_field' => '{{{ item_text }}}',           // título dinámico de cada fila en el panel
] );
```

Cada fila genera automáticamente la clase `elementor-repeater-item-{_id}`; los `selectors` con `{{CURRENT_ITEM}}` resuelven a `.elementor-repeater-item-{_id}` para estilizar por fila.

---

## 4. Cómo un control se conecta al render

### 4.1 Selectors CSS automáticos (`selectors` + `{{WRAPPER}}`)

La forma **declarativa** y preferida: el control no se toca en `render()`; basta declarar `selectors`. Elementor genera CSS por elemento.

- `{{WRAPPER}}` → se sustituye por `.elementor-element-{ID}` (el contenedor único de esa instancia del widget). Garantiza scope.
- Placeholders de valor según el tipo:
  - `{{VALUE}}` → valor crudo (COLOR, SELECT, CHOOSE…). cta:457
  - `{{SIZE}}{{UNIT}}` → SLIDER. cta:426
  - `{{TOP}}{{RIGHT}}{{BOTTOM}}{{LEFT}}{{UNIT}}` → DIMENSIONS. cta:849
- Patrón moderno: en vez de propiedades CSS directas, escribir **CSS custom properties** y consumirlas en el SCSS del widget. Ej. base-carousel-trait:226 `'{{WRAPPER}}' => '--<prefix>swiper-offset-size: {{SIZE}}px'`; price-table usa `--e-price-table-*`.

```php
'selectors' => [ '{{WRAPPER}} .elementor-cta__content' => 'text-align: {{VALUE}}' ],
```

`selectors_dictionary` mapea valores lógicos a CSS arbitrario (p.ej. orientación start/center/end → varias CSS vars), ver base-carousel-trait:334-338.

### 4.2 `prefix_class` (clases en el wrapper)

Añade una clase al elemento según el valor del control (sin tocar `render()`). El `%s` se sustituye por el sufijo de breakpoint en controles responsive.

```php
'prefix_class' => 'elementor-flip-box--effect-',         // flip-box.php:357 → valor 'fade' ⇒ clase ...effect-fade
'prefix_class' => 'elementor-cta-%s-layout-image-',      // call-to-action.php:110 (responsive)
// SWITCHER: return_value = clase completa, prefix_class vacío — flip-box.php:404
'return_value' => 'elementor-flip-box--3d', 'prefix_class' => '',
```

### 4.3 Render dinámico (`render()` PHP)

Para HTML/atributos se usa `render()`. Patrones:

```php
$settings = $this->get_settings_for_display();          // settings ya procesados (dynamic tags resueltos)

// construir atributos — call-to-action.php:1731
$this->add_render_attribute( 'background_image', [
    'style'      => 'background-image: url(' . esc_url( $bg_image ) . ');',
    'role'       => 'img',
    'aria-label' => Control_Media::get_image_alt( $settings['bg_image'] ),
] );

// imprimir el string de atributos escapado — call-to-action.php:1821
?><<?php Utils::print_validated_html_tag( $wrapper_tag ); ?> <?php $this->print_render_attribute_string( 'wrapper' ); ?>><?php

// obtener (no imprimir) el string — price-table.php:1706
$el = '<span ' . $this->get_render_attribute_string( 'period' ) . '>' . wp_kses_post( $settings['period'] ) . '</span>';
```

Helpers de seguridad: `print_unescaped_internal_string()` para HTML interno controlado (cta:1862), `Utils::print_validated_html_tag()` para tags configurables por el usuario, `Icons_Manager::render_icon()` para iconos (con fallback `__fa4_migrated`). Links: `$this->add_link_attributes( $key, $settings['link'] )`.

**Render de repeater** (price-table.php:1777-1813): `foreach ( $settings['features_list'] as $index => $item )`, claves por fila con `get_repeater_setting_key('item_text','features_list',$index)`, y `class="elementor-repeater-item-<?php echo esc_attr($item['_id']); ?>"` para enganchar los selectors `{{CURRENT_ITEM}}`.

### 4.4 `content_template()` (live-preview JS)

Espejo en JS (Underscore/Backbone) de `render()`, ejecutado en el editor para preview instantáneo sin round-trip al server. Presente en los tres ejemplos (flip-box:1717-1804, cta:1896-2045, price-table:1861-2031). Sintaxis:

- `<# … #>` lógica JS; `{{ }}` salida escapada; `{{{ }}}` salida sin escapar.
- `view.addRenderAttribute()`, `view.getRenderAttributeString()`, `view.addInlineEditingAttributes()`.
- Helpers: `elementor.helpers.validateHTMLTag()`, `elementor.helpers.renderIcon()`, `elementor.imagesManager.getImageUrl()`, `_.each()` para repeaters.

> Los controles con `selectors`/`prefix_class` **no** necesitan código en `content_template()`: el CSS/clases se aplican solos también en el editor. `content_template()` solo replica el HTML estructural y el contenido textual.

---

## 5. Sistema NUEVO: atomic-widgets (props + schema + prop-types)

Es la **dirección futura** de Elementor (el "Atomic Editor" mencionado en la cabecera del plugin). Reemplaza el array plano de settings + `add_control` por un **schema tipado de props** (prop-types) y un pipeline de **transformers** que resuelve cada prop a su valor de render. La UI de cada prop la provee un **atomic control** asociado al prop-type; los **atomic styles** se modelan como props de estilo serializadas a CSS.

### 5.1 Diferencias clave vs. clásico

| Aspecto | Clásico | Atomic |
|---|---|---|
| Definición | `register_controls()` imperativo, settings sin tipo | `define_*` declarativo, **schema de prop-types** tipados |
| Valor de un setting | escalar/array libre | objeto envuelto `{ "$$type": "<key>", "value": … }` |
| UI del control | `type => Controls_Manager::X` | atomic control ligado al prop-type |
| Render | string concatenado en `render()` | **transformers** resuelven props → valor final |
| Estilos | `selectors` con placeholders | atomic styles (props de estilo) → CSS generado/cacheado |
| Extensibilidad | hooks sueltos | filtros sobre el **schema** y **registry de transformers** |

### 5.2 El envoltorio `$$type` y el `Settings_Resolver`

El formato serializado de cada prop atomic es `{ "$$type": "<prop-key>", "value": <…> }` (puede anidarse). Pro incluye un resolver recursivo que **desenvuelve** ese formato a valores planos — `modules/atomic-widgets/settings-resolver.php:8-30`:

```php
class Settings_Resolver {
    public static function resolve( array $settings ): array { /* map resolve_value */ }
    private static function resolve_value( $value ) {
        if ( ! is_array( $value ) ) return $value;
        if ( ! empty( $value['$$type'] ) && array_key_exists( 'value', $value ) ) {
            return static::resolve_value( $value['value'] );   // desenvuelve recursivo
        }
        return array_map( [ static::class, 'resolve_value' ], $value );
    }
}
```

### 5.3 Cómo Pro extiende el núcleo atomic (`modules/atomic-widgets/module.php`)

El módulo Pro **no** implementa el motor; se engancha al del core (`Elementor\Modules\AtomicWidgets\Module`) solo si el experimento está activo (`modules/atomic-widgets/module.php:28`). Aporta 3 extensiones (`module.php:32-51`):

```php
// 1) Inyectar un prop-type nuevo en el schema global de props
add_filter( 'elementor/atomic-widgets/props-schema',
    fn( $schema ) => $this->inject_props_schema( $schema ), 10, 1 );

// 2) Registrar transformers (cómo se resuelve cada prop en render)
add_action( 'elementor/atomic-widgets/settings/transformers/register',
    fn ( $transformers ) => $this->register_settings_transformers( $transformers ) );

// 3) Filtrar estilos según licencia (custom CSS atomic)
add_filter( 'elementor/atomic_widgets/editor_data/element_styles',
    fn( $no_css, $styles ) => $this->get_license_based_custom_css_value( $no_css, $styles ), 10, 2 );
```

`inject_props_schema()` (`module.php:54-74`) registra el prop-type `display-conditions` en el schema (`$schema[Display_Conditions_Prop_Type::get_key()] = $display_conditions_prop_type;`), y si el experimento *Components* está activo le marca el meta `Overridable_Prop_Type::ignore()`.

`register_settings_transformers()` (`module.php:76-81`) registra en el `Transformers_Registry` (del core) un transformer por prop-key:

```php
$transformers->register( Display_Conditions_Prop_Type::get_key(), new Display_Conditions_Transformer() );
$transformers->register( Condition_Group_Prop_Type::get_key(),   new Condition_Group_Transformer() );
```

### 5.4 Prop-types (ejemplos reales de Pro)

Los prop-types definen **forma y validación** de una prop. Extienden clases base del core (`\Elementor\Modules\AtomicWidgets\PropTypes\…`):

- **Array_Prop_Type** — colección homogénea; se define el tipo de ítem con `define_item_type()`. `prop-types/display-conditions/display-conditions-prop-type.php:12-20`:

```php
class Display_Conditions_Prop_Type extends Array_Prop_Type {
    public static function get_key(): string { return 'display-conditions'; }
    protected function define_item_type(): Prop_Type { return Condition_Group_Prop_Type::make(); }
}
```

`Condition_Group_Prop_Type` (mismo dir, :13-21) es a su vez un `Array_Prop_Type` de `String_Prop_Type` → demuestra **composición/anidamiento** de prop-types.

- **Object_Prop_Type** — objeto con forma fija vía `define_shape()`; cada campo es otro prop-type con builder fluido (`->enum()`, `->default()`, `->required()`). `prop-types/display-conditions/page-title-condition-prop-type.php:12-32`:

```php
class Page_Title_Condition_Prop_Type extends Object_Prop_Type {
    public static function get_key(): string { return 'page-title-condition'; }
    protected function validate_value( $value ): bool { return true; }
    protected function define_shape(): array {
        return [
            'operator' => String_Prop_Type::make()->enum( [ '==', '!=' ] )->default( '==' )->required(),
            'value'    => String_Prop_Type::make()->required(),
        ];
    }
}
```

Primitivos del core reutilizados: `String_Prop_Type`, (y por contrato `Number_Prop_Type`, `Boolean_Prop_Type`, etc.). El contrato común es `Prop_Type` (`…\PropTypes\Contracts\Prop_Type`); el patrón de instanciación es `::make()` (factory estática) + builder fluido.

### 5.5 Transformers (prop → valor de render)

Un transformer convierte el valor (ya tipado/validado) en lo que el frontend necesita. Extienden `\Elementor\Modules\AtomicWidgets\PropsResolver\Transformer_Base` y reciben un `Props_Resolver_Context`.

`transformers/condition-group.php:13-23` (decodifica cada condición JSON):

```php
class Condition_Group extends Transformer_Base {
    public function transform( $conditions, Props_Resolver_Context $context ) {
        if ( ! is_array( $conditions ) || empty( $conditions ) ) return null;
        return array_map( fn( $c ) => json_decode( $c, true ), $conditions );
    }
}
```

`transformers/display-conditions.php:15-47` además expone `extract_from_settings()`, que usa el **`Render_Props_Resolver`** del core para resolver el prop a partir del schema y serializarlo a JSON para el frontend:

```php
$resolved = Render_Props_Resolver::for_settings()->resolve( $schema, $props );
return [ json_encode( $resolved[ $prop_key ] ) ];
```

> **Pipeline atomic (mental model):** `schema (prop-types)` → settings serializados `{$$type,value}` → `Render_Props_Resolver` recorre el schema y, por cada prop, busca su `Transformer` en el `Transformers_Registry` → produce el valor final para `render()` / CSS.

### 5.6 Atomic styles & template styles

- **Filtro de custom-CSS atómico por licencia**: `module.php:83-93` — si la licencia tiene la feature `atomic-custom-css` devuelve los estilos completos; si no, la versión sin custom-CSS.
- **`Template_Styles`** (`modules/atomic-widgets/template-styles.php`) — asegura que los estilos de **templates reutilizables** anidados se rendericen/encolen. Engancha `elementor/post/render` (`template-styles.php:20`), recorre el post con `Utils::traverse_post_elements()` buscando `settings.template_id` (`template-styles.php:70-82`), y dispara `do_action('elementor/post/render', $template_id)` por cada template referenciado (`template-styles.php:63`). Usa `Cache_Validity` del core para cachear la relación post→templates e invalidarla en `after_save`/`clear_cache` (`template-styles.php:22-29`, `85-97`).

### 5.7 Otros módulos atomic en Pro

`core/modules-manager.php:39-43,84-87` lista módulos del nuevo paradigma: `atomic-widgets`, `atomic-form`, `variables` (CSS/design variables), `editor-one`, `interactions`, y `display-conditions` (la versión clásica de las condiciones de visibilidad). El gating de UI lo hace `Editor_One_Trait` (ver §6).

---

## 6. Traits y clases base reutilizables

| Símbolo | Archivo | Qué aporta |
|---|---|---|
| `Base_Widget` | `base/base-widget.php:11` | Clase base abstracta de todo widget Pro; compone `Base_Widget_Trait` + `On_Import_Trait` sobre `\Elementor\Widget_Base`. |
| `Base_Widget_Trait` | `base/base-widget-trait.php:10` | `get_categories()`→`['pro-elements']` y `is_editable()` ligado a licencia. |
| `On_Import_Trait` | `base/on-import-trait.php` | Hooks de import/export del contenido del widget (migración de IDs/URLs al importar templates). |
| `Module_Base` | `base/module-base.php:10` | Base de todos los módulos Pro; hoy es un passthrough de `\Elementor\Core\Base\Module` (mantenida por compatibilidad futura). |
| `Base_Carousel_Trait` | `base/base-carousel-trait.php:16` | **Fábrica de controles** reutilizable para carruseles: `add_carousel_layout_controls()`, `add_carousel_settings_controls()` (autoplay, infinite, speed, direction, offset…), `add_carousel_navigation_controls()` (flechas + iconos + orientación/posición), `add_carousel_navigation_styling_controls()`, `add_carousel_pagination_controls()` / `_style_controls()`, y helpers de render (`render_carousel_footer`, `render_swiper_button`). Parametrizable vía `$params` (`css_prefix`, `*_custom_settings`). Excelente ejemplo de cómo encapsular bloques enteros de controles para no repetirlos entre widgets. |
| `Editor_One_Trait` | `base/editor-one-trait.php:11` | `is_editor_one_active()` — detecta si el módulo `editor-one` está cargado (`Plugin::elementor()->modules_manager->get_modules('editor-one')`), usado para feature-gating del nuevo editor. |

### Patrón "shared settings + merge"

`Base_Carousel_Trait` muestra el patrón idiomático de Pro para controles configurables-pero-reutilizables: define un array `$..._shared_settings` y lo combina con overrides por widget usando el operador `+` de arrays (los del widget tienen prioridad):

```php
// base-carousel-trait.php:64-67
$this->add_control( 'equal_height',
    $params['equal_height_custom_settings'] + $equal_height_shared_settings
);
```

Esto permite que un mismo bloque de controles (p.ej. ajustes de carrusel) se inyecte en varios widgets, cada uno ajustando solo lo que necesita.

---

## 7. Cheat-sheet de referencia rápida

```php
// — Definir widget —
class My_Widget extends \ElementorPro\Base\Base_Widget {
    public function get_name() { return 'my-widget'; }
    public function get_title() { return esc_html__( 'My Widget', 'elementor-pro' ); }
    public function get_icon() { return 'eicon-star'; }
    public function get_keywords() { return [ 'my', 'thing' ]; }
    // get_categories() ya devuelve ['pro-elements'] vía trait
    public function get_style_depends(): array { return [ 'my-widget' ]; }

    protected function register_controls() {
        // CONTENT (tab default)
        $this->start_controls_section( 'content', [ 'label' => esc_html__( 'Content', 'elementor-pro' ) ] );
        $this->add_control( 'title', [ 'type' => \Elementor\Controls_Manager::TEXT, 'default' => 'Hi', 'dynamic' => ['active'=>true] ] );
        $this->end_controls_section();

        // STYLE
        $this->start_controls_section( 'style', [ 'label' => esc_html__( 'Style', 'elementor-pro' ), 'tab' => \Elementor\Controls_Manager::TAB_STYLE ] );
        $this->add_group_control( \Elementor\Group_Control_Typography::get_type(), [ 'name' => 'title_typo', 'selector' => '{{WRAPPER}} .title' ] );
        $this->add_responsive_control( 'pad', [ 'type' => \Elementor\Controls_Manager::DIMENSIONS, 'size_units' => ['px','%'], 'selectors' => [ '{{WRAPPER}} .title' => 'padding:{{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}' ] ] );
        $this->start_controls_tabs( 't' );
          $this->start_controls_tab( 'n', [ 'label' => 'Normal' ] );
            $this->add_control( 'c', [ 'type' => \Elementor\Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .title' => 'color:{{VALUE}}' ] ] );
          $this->end_controls_tab();
          $this->start_controls_tab( 'h', [ 'label' => 'Hover' ] );
            $this->add_control( 'ch', [ 'type' => \Elementor\Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .title:hover' => 'color:{{VALUE}}' ] ] );
          $this->end_controls_tab();
        $this->end_controls_tabs();
        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        $this->add_render_attribute( 'wrap', 'class', 'title' );
        echo '<div ' . $this->get_render_attribute_string( 'wrap' ) . '>' . esc_html( $s['title'] ) . '</div>';
    }

    protected function content_template() { ?>
        <div class="title">{{{ settings.title }}}</div>
    <?php }
}
```

---

## 8. Resumen ejecutivo

- **Dos sistemas conviven.** El **clásico** (`register_controls()` + `Controls_Manager` + `selectors`/`{{WRAPPER}}`) es el de la mayoría de widgets Pro y vive sobre el core de Elementor. El **atomic** (schema de prop-types tipados + transformers + atomic styles) es la dirección futura; en Pro es una **capa de extensión** que se engancha al motor del core vía filtros.
- **Registro:** `plugins_loaded → plugin.php → elementor/init → Modules_Manager` (lista fija de módulos) → `Module::get_widgets()` → el core registra cada `Widget_Base`.
- **Controles configurables:** secciones (`start/end_controls_section` con `tab` = CONTENT/STYLE/ADVANCED), tabs internas Normal/Hover, ~15 tipos de control, responsive, group controls, `condition`/`conditions`, repeaters.
- **Conexión render:** preferentemente **declarativa** (`selectors` + placeholders `{{WRAPPER}}`/`{{VALUE}}`/`{{SIZE}}{{UNIT}}` y `prefix_class`); imperativa solo para HTML (`render()` PHP + `content_template()` JS para preview).
- **Atomic:** props envueltas en `{$$type,value}`, prop-types compuestos (`Array_/Object_/String_Prop_Type` con builder `make()->enum()->default()->required()`), `Transformers_Registry`, `Render_Props_Resolver`. Pro aporta `display-conditions`/`condition-group` como ejemplos canónicos.
- **Reutilización:** `Base_Carousel_Trait` es el mejor ejemplo de encapsular bloques enteros de controles parametrizables (patrón `shared_settings + overrides`).
```
