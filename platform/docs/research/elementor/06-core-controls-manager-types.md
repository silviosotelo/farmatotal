# Elementor Core (gratuito) — Controls Manager y catálogo COMPLETO de tipos de control

> Documentación del subsistema que hace que los componentes de Elementor sean "libremente
> configurables": los campos del panel **Content / Style / Advanced**. Basado en lectura directa
> del código en `C:\Users\sotelos\Downloads\Elementor\elementor`.
>
> Rutas relativas a la raíz del plugin. Refs en formato `archivo:línea`.

---

## 0. Mapa mental (cómo encaja todo)

```
Widget/Element (Controls_Stack)
   └─ register_controls()                         // el dev declara los campos
        ├─ start_controls_section('sec', [...])   // abre sección (tab CONTENT/STYLE/ADVANCED)
        │    add_control('campo', [ type, label, default, selectors, condition, ... ])
        │    add_responsive_control('campo', ...) // variante por dispositivo
        │    add_group_control(Group_Control_Typography::get_type(), [...])
        └─ end_controls_section()
                 │
                 ▼
   Controls_Manager  (includes/managers/controls.php)
        ├─ register_controls(): instancia 1 objeto por TIPO (Control_Text, Control_Slider...)
        ├─ stacks[ stack_id ][ 'controls' | 'style_controls' ][ control_id ] = $control_data
        └─ get_control('slider') → instancia que sabe get_default_value(), content_template(), get_style_value()
                 │
                 ▼
   Render:
     - Editor: print_template() imprime un <script type="text/html"> Underscore JS por tipo.
     - Frontend CSS: core/files/css/base.php::add_control_rules() convierte 'selectors' en CSS.
```

Dos universos de control (feature `ui`):
- **Data controls** (`Base_Data_Control`): guardan un valor en los settings del elemento (text, slider, color…).
- **UI controls** (`Base_UI_Control`): NO guardan dato; solo dibujan algo en el panel (heading, divider, raw_html, button, alert, notice, section, tab, tabs).

---

## 1. Controls_Manager — `includes/managers/controls.php`

Clase `Controls_Manager` (`controls.php:32`). Responsable de **registrar e inicializar** todos los
controles soportados (regulares + group controls) y de **acumular** los controles que cada elemento
declara, en una estructura llamada *stack*.

### 1.1 Constantes de TIPO (el "enum" de controles)

Cada tipo tiene una constante. Extracto (`controls.php` ~líneas 45–230):

```php
const TEXT = 'text';            const NUMBER = 'number';     const TEXTAREA = 'textarea';
const SELECT = 'select';        const SWITCHER = 'switcher'; const BUTTON = 'button';
const HIDDEN = 'hidden';        const HEADING = 'heading';   const RAW_HTML = 'raw_html';
const NOTICE = 'notice';        const DEPRECATED_NOTICE = 'deprecated_notice';
const ALERT = 'alert';          const POPOVER_TOGGLE = 'popover_toggle';
const SECTION = 'section';      const TAB = 'tab';           const TABS = 'tabs';
const DIVIDER = 'divider';      const COLOR = 'color';       const MEDIA = 'media';
const SLIDER = 'slider';        const DIMENSIONS = 'dimensions';
const CHOOSE = 'choose';        const VISUAL_CHOICE = 'visual_choice';
const WYSIWYG = 'wysiwyg';      const CODE = 'code';         const FONT = 'font';
const IMAGE_DIMENSIONS = 'image_dimensions';                 const WP_WIDGET = 'wp_widget';
const URL = 'url';              const REPEATER = 'repeater';  const ICON = 'icon';
const ICONS = 'icons';          const GALLERY = 'gallery';    const STRUCTURE = 'structure';
const SELECT2 = 'select2';      const DATE_TIME = 'date_time';
const BOX_SHADOW = 'box_shadow';const TEXT_SHADOW = 'text_shadow';
const ANIMATION = 'animation';  const HOVER_ANIMATION = 'hover_animation';
const EXIT_ANIMATION = 'exit_animation';
```

La lista canónica de controles a registrar está en `get_controls_names()` (`controls.php`, ver
sección "control type get_type"), y la lista de **group controls** en `get_groups_names()`:

```php
public static function get_groups_names() {       // nombre usa "-" no "_"
    return [ 'background','border','typography','image-size','box-shadow','css-filter',
             'text-shadow','flex-container','grid-container','flex-item','text-stroke' ];
}
```

### 1.2 Los TABS (pestañas del panel) — `controls.php`

Constantes y registro de tabs:

```php
const TAB_CONTENT = 'content';  const TAB_STYLE = 'style';   const TAB_ADVANCED = 'advanced';
const TAB_RESPONSIVE = 'responsive'; const TAB_LAYOUT = 'layout'; const TAB_SETTINGS = 'settings';

private static function init_tabs() {
    self::$tabs = [
        self::TAB_CONTENT  => esc_html__( 'Content', 'elementor' ),
        self::TAB_STYLE    => esc_html__( 'Style', 'elementor' ),
        self::TAB_ADVANCED => esc_html__( 'Advanced', 'elementor' ),
        self::TAB_RESPONSIVE => esc_html__( 'Responsive', 'elementor' ),
        self::TAB_LAYOUT   => esc_html__( 'Layout', 'elementor' ),
        self::TAB_SETTINGS => esc_html__( 'Settings', 'elementor' ),
    ];
}
public static function get_tabs() { ... }                 // lazy init
public static function add_tab( $tab_name, $tab_label='' ) // permite registrar tabs nuevos
```

El tab al que pertenece un control NO se setea por control; se hereda de la **sección** abierta con
`start_controls_section(..., ['tab' => Controls_Manager::TAB_STYLE])`. Por eso los tres paneles
clásicos (Content/Style/Advanced) son simplemente secciones agrupadas por su `tab`.

### 1.3 `add_control_to_stack()` — el corazón del registro

Cuando un elemento llama `add_control()`, el Manager:
1. Resuelve el tipo de almacenamiento del stack: `'controls'` o **`'style_controls'`** si el flag de
   performance está activo y el control es "de estilo" (`is_style_control()`).
2. Aplica defaults de args: `type=TEXT`, `tab=TAB_CONTENT`.
3. Obtiene la instancia del tipo con `get_control($type)`; si no existe → `_doing_it_wrong`.
4. Si implementa `Has_Validation` → `validate()` (lo usa Repeater).
5. Si es `Base_Data_Control` → **mergea el default del control con el default declarado** (clave para
   que un control sin `default` reciba el del tipo).
6. Evita redeclarar mismo nombre; registra el tab usado; guarda en
   `stacks[$stack_id]['controls'][$control_id] = $control_data`.

Snippet (controls.php, método `add_control_to_stack`):

```php
$default_args = [ 'type' => self::TEXT, 'tab' => self::TAB_CONTENT ];
$control_data['name'] = $control_id;
$control_data = array_merge( $default_args, $control_data );
$control_type_instance = $this->get_control( $control_data['type'] );
...
if ( $control_type_instance instanceof Base_Data_Control ) {
    $control_default_value = $control_type_instance->get_default_value();
    if ( is_array( $control_default_value ) ) {
        $control_data['default'] = isset( $control_data['default'] )
            ? array_merge( $control_default_value, $control_data['default'] )
            : $control_default_value;
    } else {
        $control_data['default'] = $control_data['default'] ?? $control_default_value;
    }
}
$this->stacks[ $stack_id ][ $control_type ][ $control_id ] = $control_data;
```

### 1.4 `is_style_control()` — qué cuenta como "control de estilo"

Define si un control va al stack optimizado `style_controls` (`controls.php`, final del archivo):

```php
private function is_style_control( $control_data ): bool {
    if ( $control_data['frontend_available'] ?? false ) return false;
    if ( ($control_data['control_type'] ?? '') === 'content' ) return false;
    if ( ! empty( $control_data['prefix_class'] ) ) return false;
    $render_type = $control_data['render_type'] ?? '';
    if ( 'template' === $render_type ) return false;
    if ( 'ui' === $render_type ) return true;
    if ( ! empty( $control_data['selectors'] ) ) return true;   // ← tener `selectors` lo hace de estilo
    return false;
}
```

### 1.5 Render del stack
- `get_controls_data()` → `[name => control->get_settings()]` (lo que consume el editor JS).
- `render_controls()` → recorre y llama `print_template()` por control.

---

## 2. Anatomía de un control (el array `$args` de `add_control`)

Cada control es un array `key => value`. Defaults base de TODO control en
`Base_Control::$_base_settings` (`controls/base.php:29`):

```php
private $_base_settings = [
    'label' => '', 'description' => '', 'show_label' => true,
    'label_block' => false, 'separator' => 'default',
];
```

Catálogo de props del schema (las más usadas):

| Prop | Para qué | Notas |
|---|---|---|
| `type` | tipo de control (constante de `Controls_Manager`) | default `text` |
| `label` | etiqueta visible del campo | |
| `description` | texto de ayuda bajo el campo | |
| `default` | valor inicial | se mergea con el default del tipo (§1.3) |
| `options` | opciones (select/choose/select2: `[valor => label]`) | obligatorio en select |
| `tab` | NO se pone aquí normalmente; viene de la sección | |
| `section` | id de sección contenedora (lo setea `start_controls_section`) | interno |
| `selectors` | **mapeo control → CSS** (`{{WRAPPER}} .x { prop: {{VALUE}}{{UNIT}}; }`) | §6 |
| `selectors_dictionary` | traduce valores a otra cosa antes de inyectar en CSS | |
| `condition` | mostrar el control sólo si otro control cumple (AND simple) | `['otro' => 'valor']`, sufijos `!`, `<=`, etc. |
| `conditions` | condiciones complejas anidadas (`relation` and/or, `terms`) | |
| `responsive` | lo setea `add_responsive_control` (no se pasa a mano) | guarda `min`/`max`/`devices` |
| `device_args` | overrides de args por dispositivo en responsive | |
| `dynamic` | habilita Dynamic Tags: `['active'=>true,'categories'=>[...]]` | |
| `prefix_class` | añade clase al wrapper según el valor (`my-class-{{VALUE}}`) | NO es "style control" |
| `render_type` | cómo re-renderiza el editor al cambiar: `ui` / `template` / `none` | afecta is_style_control |
| `separator` | línea separadora: `default` / `before` / `after` / `none` | |
| `show_label`, `label_block` | layout de la etiqueta | label_block = etiqueta arriba, campo full-width |
| `classes` | clases CSS extra del control en el panel | |
| `frontend_available` | expone el valor al handler JS del widget en frontend | |
| `global` | enlaza a Global Colors/Fonts del Kit | usado por color/typography |
| `groupType` / `groupPrefix` | metadata cuando el control viene de un group control | §4 |

`prefix_class` (ej.): un `select`/`choose` con `'prefix_class' => 'elementor-align-'` hace que al
elegir `center` el wrapper reciba la clase `elementor-align-center`. Por eso §1.4 lo excluye de
`style_controls`: su efecto es por clase, no por CSS inline-generado.

---

## 3. Clases base de controles — `includes/controls/base*.php`

### 3.1 `Base_Control` (abstracta) — `controls/base.php`
- `abstract get_type()` (`:62`), `abstract content_template()` (`:101`): todo control define su tipo
  y su plantilla Underscore JS.
- `__construct()` (`:72`): `set_settings( array_merge($_base_settings, $this->get_default_settings()) )`
  + setea feature `ui`.
- `print_template()` (`:113`, **final**): envuelve `content_template()` en
  `<script type="text/html" id="tmpl-elementor-control-{TYPE}-content">`.
- `get_default_settings()` (`:136`): vacío por defecto; cada control lo sobreescribe con su schema.
- `get_features()` → `[]` (los UI devuelven `['ui']`).

### 3.2 `Base_Data_Control` — `controls/base-data.php`
Controles que **guardan un valor**.
- `get_default_value()` → `''` (single value) (`:39`).
- `get_value($control, $settings)` (`:56`): devuelve `settings[name]` o el `default`.
- `parse_tags()` (`:84`): resuelve Dynamic Tags sobre el valor.
- `get_style_value($css_property, $control_value, $control_data)` (`:110`): valor a inyectar en CSS;
  si la prop es `'DEFAULT'` devuelve `control_data['default']`, si no el valor crudo.
- `get_control_uid()` (`:131`): id único del input en el editor (`elementor-control-{type}-{{{data._cid}}}`).
- En `__construct` setea `default_value` en los settings si no es vacío.

### 3.3 `Control_Base_Multiple` — `controls/base-multiple.php`
Controles que devuelven **varios valores** (`key => value`). Ej.: url, media, box_shadow, dimensions.
- `get_default_value()` → `[]` (`:31`).
- `get_value()` (`:48`): mergea recursivo `default_value` del tipo + `default` declarado + valor.
- `get_style_value($css_property, ...)` (`:86`): devuelve `control_value[ strtolower($css_property) ]`
  → por eso en `selectors` se usa `{{HORIZONTAL}}`, `{{LEFT}}`, etc. (la sub-clave del array).

### 3.4 `Control_Base_Units` — `controls/base-units.php`
Base de **slider** y **dimensions**. Valores con unidad.
- `get_default_value()` → `['unit' => 'px']` (`:29`).
- `get_default_settings()` (`:46`): `size_units => ['px']` + tabla `range` por unidad
  (`px,em,rem,%,deg,grad,rad,turn,vh,vw,s,ms` con min/max/step).
- `print_units_template()` (`:122`): dibuja el switcher de unidades cuando hay >1.
- `get_style_value()` (`:150`): si la prop es `UNIT` y vale `custom` → devuelve `__EMPTY__`
  (placeholder que `add_control_rules` luego convierte en cadena vacía).

### 3.5 `Base_UI_Control` — `controls/base-ui.php`
- `get_features()` → `['ui']` (`:28`). NO guardan dato; sólo pintan. (heading, divider, button,
  raw_html, alert, notice, deprecated_notice, section, tab, tabs, popover_toggle).

### 3.6 `Base_Icon_Font` — `controls/base-icon-font.php`
Abstracta para registrar familias de iconos (eicons, fontawesome): `get_type`, `enqueue`,
`get_css_prefix`, `get_icons`.

---

## 4. Group controls — `includes/controls/groups/`

Un **group control** expande, con UNA llamada `add_group_control()`, **muchos controles
prefijados**. Ej.: typography genera `{name}_font_family`, `{name}_font_size`, `{name}_font_weight`…

### 4.1 `Group_Control_Base` (abstracta) — `controls/groups/base.php`
- `abstract init_fields()` (`:207`): devuelve el array de campos del grupo (sin prefijo).
- `get_controls_prefix()` (`:180`): `return $this->args['name'] . '_';` → todos los campos se
  registran como `{name}_{field_id}`.
- `add_controls(Controls_Stack $element, $user_args, $options)` (`:85`, **final**) — el motor:

```php
$filtered_fields = $this->filter_fields();
$filtered_fields = $this->prepare_fields( $filtered_fields );
if ( $this->get_options( 'popover' ) ) $this->start_popover( $element );
foreach ( $filtered_fields as $field_id => $field_args ) {
    $field_args = $this->add_group_args_to_field( $field_id, $field_args );
    $id = $this->get_controls_prefix() . $field_id;          // ← prefijo
    if ( ! empty( $field_args['responsive'] ) ) {
        unset( $field_args['responsive'] );
        $element->add_responsive_control( $id, $field_args, $options );
    } else {
        $element->add_control( $id, $field_args, $options );
    }
}
if ( $this->get_options( 'popover' ) ) $element->end_popover();
```

- **Popover**: muchos grupos abren un popover (icono de lápiz). Default `get_default_options()` con
  `'popover' => ['starter_name' => 'popover_toggle', ...]`. Se inyecta un control `popover_toggle`
  como starter y los campos quedan condicionados a él (`prepare_fields` añade
  `$field['condition'][ $popover_name . '!' ] = ''`).
- **Condiciones con prefijo**: como los campos se renombran con prefijo, las `condition`/`conditions`
  internas también se prefijan (`add_condition_prefix`, `add_conditions_prefix`).
- **Selectores con prefijo**: `prefix_selector`/preg_replace sobre `{{...}}` agrega el prefijo a las
  referencias de otros controles del mismo grupo.

### 4.2 `add_group_control()` desde el elemento — `controls-stack.php:774`

```php
final public function add_group_control( $group_name, array $args = [], array $options = [] ) {
    $group = Plugin::$instance->controls_manager->get_control_groups( $group_name );
    if ( ! $group ) wp_die(...);
    $group->add_controls( $this, $args, $options );
}
```

Uso típico:
```php
$this->add_group_control(
    Group_Control_Typography::get_type(),
    [ 'name' => 'title_typography', 'selector' => '{{WRAPPER}} .titulo' ]
);
```

### 4.3 Catálogo de group controls (carpeta `groups/`)

| Group | `get_type()` | Qué expande (campos clave) |
|---|---|---|
| `typography.php` `Group_Control_Typography` | `typography` | font_family (FONT), font_size (SLIDER), font_weight, text_transform, font_style, text_decoration, line_height (SLIDER), letter_spacing, word_spacing. Cada campo tiene `selector_value` ya formado (`font-family: "{{VALUE}}";`). Soporta Global Fonts. |
| `background.php` `Group_Control_Background` | `background` | tipo (classic/gradient/video/slideshow), color, image (MEDIA), position, repeat, size, attachment, video_link, gradient stops… (init_fields ~600 líneas). |
| `border.php` `Group_Control_Border` | `border` | border (style select), width (DIMENSIONS), color (COLOR). |
| `box-shadow.php` `Group_Control_Box_Shadow` | `box-shadow` | box_shadow_type (popover_toggle) + box_shadow (control BOX_SHADOW) + position. |
| `text-shadow.php` `Group_Control_Text_Shadow` | `text-shadow` | text_shadow_type + text_shadow (control TEXT_SHADOW). |
| `image-size.php` `Group_Control_Image_Size` | `image-size` | image_size (select de tamaños WP) + custom_dimension (IMAGE_DIMENSIONS). NO usa selectors; devuelve la URL del tamaño. |
| `css-filter.php` `Group_Control_Css_Filter` | `css-filter` | blur, brightness, contrast, saturate, hue (sliders) → `filter:`. |
| `flex-container.php` `Group_Control_Flex_Container` | `flex-container` | flex direction, justify, align, gap, wrap (layout flex del Container). |
| `flex-item.php` `Group_Control_Flex_Item` | `flex-item` | align-self, order, grow, shrink, basis. |
| `grid-container.php` `Group_Control_Grid_Container` | `grid-container` | columns, rows, gaps, auto-flow (CSS Grid del Container). |
| `text-stroke.php` `Group_Control_Text_Stroke` | `text-stroke` | text_stroke (width SLIDER) + stroke_color (COLOR) → `-webkit-text-stroke`. |

`init_fields()` de typography (extracto real, `groups/typography.php:105`):
```php
$fields['font_family'] = [
    'label' => esc_html_x( 'Family', 'Typography Control', 'elementor' ),
    'type'  => Controls_Manager::FONT,
    'default' => '',
    'selector_value' => 'font-family: "{{VALUE}}"' . $default_fonts . ';',
];
$fields['font_size'] = [
    'label' => esc_html_x( 'Size', 'Typography Control', 'elementor' ),
    'type'  => Controls_Manager::SLIDER,
    'size_units' => [ 'px','em','rem','vw','custom' ],
    'range' => [ 'px' => [ 'min' => 1, 'max' => 200 ], ... ],
    ...
];
```

---

## 5. Repeater — `includes/controls/repeater.php`

El patrón para **listas configurables** (slides, items de menú, columnas de footer, FAQs…).
`Control_Repeater extends Base_Data_Control implements Has_Validation` (`repeater.php:20`).

- `get_type()` → `'repeater'`; `get_default_value()` → `[]`.
- `get_default_settings()` (`:62`):
```php
return [
    'fields' => [], 'title_field' => '', 'prevent_empty' => true,
    'is_repeater' => true, 'max_items' => 0, 'min_items' => 0,
    'item_actions' => [ 'add'=>true, 'duplicate'=>true, 'remove'=>true, 'sort'=>true ],
];
```
- `get_value()` (`:92`): por cada ítem, resuelve el valor de cada sub-campo con el control real del
  campo (`get_control($field['type'])->get_value(...)`).
- `validate()` (`:186`): si hay `min_items` exige un `default` con al menos esa cantidad.
- `on_import()` (`:127`): re-mapea sub-controles al importar plantillas.

### Cómo se usa (patrón Repeater estándar)

```php
$repeater = new \Elementor\Repeater();             // includes/base/sub-controls-stack.php
$repeater->add_control( 'item_title', [
    'label' => 'Título', 'type' => Controls_Manager::TEXT, 'default' => 'Item',
] );
$repeater->add_control( 'item_link', [
    'label' => 'Enlace', 'type' => Controls_Manager::URL,
] );

$this->add_control( 'list', [
    'label'       => 'Items',
    'type'        => Controls_Manager::REPEATER,
    'fields'      => $repeater->get_controls(),     // ← define el sub-schema
    'default'     => [ [ 'item_title' => 'Item #1' ], [ 'item_title' => 'Item #2' ] ],
    'title_field' => '{{{ item_title }}}',           // texto del header de cada fila (Underscore)
] );
```

El dato guardado es un **array de arrays** (una entrada por fila, cada una con las sub-claves).
`Repeater` (sub-controls-stack) es a su vez un `Controls_Stack` reducido, por eso adentro se usan los
mismos `add_control`/`add_responsive_control`.

---

## 6. `selectors` — el mecanismo control → CSS (clave del tab Style)

Un control "de estilo" mapea su valor a reglas CSS mediante la prop `selectors`:

```php
$this->add_control( 'text_color', [
    'label' => 'Color', 'type' => Controls_Manager::COLOR,
    'selectors' => [ '{{WRAPPER}} .titulo' => 'color: {{VALUE}};' ],
] );

$this->add_responsive_control( 'padding', [
    'label' => 'Padding', 'type' => Controls_Manager::DIMENSIONS,
    'size_units' => [ 'px','em','%' ],
    'selectors' => [
        '{{WRAPPER}} .box' =>
          'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
    ],
] );
```

Placeholders disponibles:
- `{{WRAPPER}}` → se reemplaza por el selector único del elemento (`.elementor-element-XXXX`).
- `{{VALUE}}` → valor del control (single value). Para multiple usa la sub-clave en MAYÚSCULAS:
  `{{UNIT}}`, `{{SIZE}}`, `{{TOP}}/{{RIGHT}}/{{BOTTOM}}/{{LEFT}}`, `{{HORIZONTAL}}/{{VERTICAL}}/{{BLUR}}/{{SPREAD}}/{{COLOR}}` (box_shadow), `{{URL}}` (url/media), etc.
- `{{otro_control.VALUE}}` → referencia el valor de OTRO control del mismo stack.
- `{{ a || b }}` → fallback: usa `a`, y si vacío usa `b` (literal o referencia).

### Generación real del CSS — `core/files/css/base.php:319` `add_control_rules()`

```php
public function add_control_rules( array $control, array $controls_stack, callable $value_callback,
        array $placeholders, array $replacements, array $values = [] ) {
    if ( empty( $control['selectors'] ) ) return;          // sin selectors → no genera CSS
    ...
    foreach ( $control['selectors'] as $selector => $css_property ) {
        ...
        // Resuelve {{...}} (incluye {{externo.VALUE}} y fallback || )
        $output_css_property = preg_replace_callback(
            '/{{(?:([^.}]+)\.)?([^}| ]*)(?: *\|\| *(?:([^.}]+)\.)?([^}| ]*) *)*}}/',
            function( $matches ) use (...) {
                ... $parsed_value = $this->parse_property_placeholder(
                        $control, $value, $controls_stack, $value_callback, $matches[2], $matches[1] );
                if ( '__EMPTY__' === $parsed_value ) $parsed_value = '';   // unidad custom
                return $parsed_value;
            }, $css_property );
        ...
        // {{WRAPPER}} y demás placeholders del SELECTOR (no del valor):
        $parsed_selector = str_replace( $placeholders, $replacements, $selector );
        // Si el selector trae prefijo de device (tablet)(mobile) o el control es responsive →
        //   se envuelve en @media (min/max).
    }
}
```

- `parse_property_placeholder()` (`:~500`) termina llamando
  `$control_obj->get_style_value( $placeholder, $value, $control )` → así cada tipo decide cómo
  formatea su valor (ver §3.2/§3.3/§3.4).
- **Responsive**: si el control tiene `responsive[min|max]` (puesto por `add_responsive_control`) o
  el selector lleva prefijo `(tablet)`/`(mobile)`, la regla se emite dentro de un `@media`.
- `selectors_dictionary` / `unit_selectors_dictionary`: permiten sustituir el valor por una cadena
  CSS distinta (p.ej. mapear `yes` → `display:flex`).

---

## 7. `add_responsive_control` — variantes por dispositivo — `controls-stack.php:868`

Genera el control en versión por breakpoint. Hay 3 modos de duplicación
(`get_responsive_control_duplication_mode`): `off` (1 solo control, JS duplica en el editor),
`on` (un control por device), `dynamic` (duplica sólo si el control es `dynamic.active`).

```php
final public function add_responsive_control( $id, array $args, $options = [] ) {
    $args['responsive'] = [];
    $devices = Plugin::$instance->breakpoints->get_active_devices_list([ 'reverse'=>true, 'desktop_first'=>true ]);
    ...
    // Modo "off" + experimento de breakpoints → 1 control con is_responsive=true
    if ( $additional_breakpoints_active && ('off' === $mode || ('dynamic'===$mode && !$is_dynamic)) ... ) {
        $args['is_responsive'] = true;
        $this->add_control( $id, $args, $options );  // o update_control si overwrite
        return;
    }
    // Si no: genera 1 control por device, renombrando: id, id_tablet, id_mobile...
    foreach ( $devices as $device_name ) {
        ...
        $control_args['responsive'][ $direction ] = $device_name;   // 'min' o 'max'
        if ( isset($control_args[$device_name.'_default']) )
            $control_args['default'] = $control_args[$device_name.'_default'];
        ...
    }
}
```

Defaults por device se pasan como `desktop_default`, `tablet_default`, `mobile_default`. El sufijo
del id por device lo consume luego `add_control_rules` para envolver en `@media`.

---

## 8. Secciones y tabs en `register_controls` — `controls-stack.php`

```php
public function start_controls_section( $section_id, array $args = [] ) {   // :1551
    do_action( 'elementor/element/before_section_start', $this, $section_id, $args );
    $args['type'] = Controls_Manager::SECTION;     // la sección ES un control UI tipo 'section'
    $this->add_control( $section_id, $args );       // tab/label viajan en $args
    $this->current_section = $this->get_section_args( $section_id );
    do_action( 'elementor/element/after_section_start', ... );
}
public function end_controls_section() { ... }      // :1642  cierra la sección actual
public function start_controls_tabs( $tabs_id, $args ) { ... }  // :1758 contenedor de tabs internos
public function start_controls_tab( $tab_id, $args ) { ... }    // :1813 un tab interno (controls tipo 'tab')
```

Patrón completo de un widget:
```php
protected function register_controls() {
    $this->start_controls_section( 'section_content', [
        'label' => 'Contenido', 'tab' => Controls_Manager::TAB_CONTENT,
    ] );
    $this->add_control( 'title', [ 'type'=>Controls_Manager::TEXT, 'label'=>'Título' ] );
    $this->end_controls_section();

    $this->start_controls_section( 'section_style', [
        'label' => 'Estilo', 'tab' => Controls_Manager::TAB_STYLE,
    ] );
    $this->add_control( 'title_color', [
        'type'=>Controls_Manager::COLOR, 'label'=>'Color',
        'selectors'=>[ '{{WRAPPER}} h2'=>'color: {{VALUE}};' ],
    ] );
    $this->add_group_control( Group_Control_Typography::get_type(), [
        'name'=>'title_typo', 'selector'=>'{{WRAPPER}} h2',
    ] );
    $this->end_controls_section();
}
```

---

## 9. Catálogo COMPLETO de tipos de control

Carpeta `includes/controls/`. Columnas: nombre (constante) · clase · base · dato guardado ·
dynamic? · para qué. Todos son responsive si se registran con `add_responsive_control` salvo los UI.

### 9.1 Data controls (guardan valor)

| Tipo | Clase (`controls/…`) | Base | Dato guardado | Dynamic | Uso |
|---|---|---|---|---|---|
| `text` | `Control_Text` text.php:17 | Data | string | sí (TEXT_CATEGORY) | input de texto; `input_type`, `placeholder` |
| `textarea` | `Control_Textarea` | Data | string | sí | texto multilínea (`rows`=5) |
| `number` | `Control_Number` number.php:17 | Data | string/number | sí (NUMBER) | numérico; `min/max/step` |
| `select` | `Control_Select` select.php:17 | Data | string (clave) | no | desplegable; `options=[clave=>label]` |
| `select2` | `Control_Select2` | Data | string o array | no | select con búsqueda; `multiple`, `select2options` |
| `switcher` | `Control_Switcher` | Data | string (`return_value` o '') | no | on/off; `label_on/off`, `return_value='yes'` |
| `choose` | `Control_Choose` choose.php:16 | Data | string | no | grupo de botones-icono; `options=[v=>['title','icon']]`, `toggle` |
| `visual_choice` | `Control_Visual_Choice` | Data | string | no | choose con imágenes/previews |
| `color` | `Control_Color` color.php:20 | Data | string (rgba/hex) | sí (COLOR, active) + `global` | color picker; `alpha`, Global Colors |
| `slider` | `Control_Slider` slider.php:20 | Units | `{unit,size,sizes}` | sí (NUMBER, prop=size) | rango con unidades; `size_units`, `range`, `handles` |
| `dimensions` | `Control_Dimensions` dimensions.php:16 | Units | `{unit,top,right,bottom,left,isLinked}` | no | 4 lados (padding/margin/border-radius); `allowed_dimensions` |
| `media` | `Control_Media` media.php:19 | Multiple | `{id,url,...}` | sí (IMAGE, object) | imagen/video/svg; `media_types`, `has_sizes` |
| `gallery` | `Control_Gallery` gallery.php:19 | Data | array de `{id,url}` | sí (GALLERY, object) | galería de imágenes |
| `icons` | `Control_Icons` icons.php:20 | Multiple | `{value,library}` | sí (IMAGE, object) | icon picker moderno (FA5+SVG); `skin`, `recommended` |
| `icon` | `Control_Icon` icon.php | Data | string (clase) | — | icon picker legacy (FA4) |
| `url` | `Control_URL` url.php:18 | Multiple | `{url,is_external,nofollow,custom_attributes}` | sí (URL, prop=url) | enlace + opciones |
| `wysiwyg` | `Control_Wysiwyg` | Data | string (HTML) | sí (TEXT, active) | editor TinyMCE |
| `code` | `Control_Code` code.php:18 | Data | string | sí (TEXT) | editor CodeMirror; `language`, `rows` |
| `date_time` | `Control_Date_Time` | Data | string fecha | sí (DATETIME) | flatpickr; `picker_options` |
| `repeater` | `Control_Repeater` repeater.php:20 | Data | array de filas | — | listas configurables (§5); `fields`, `title_field` |
| `box_shadow` | `Control_Box_Shadow` box-shadow.php:17 | Multiple | `{horizontal,vertical,blur,spread,color}` | no | sombra de caja |
| `text_shadow` | `Control_Text_Shadow` | Multiple | `{horizontal,vertical,blur,color}` | no | sombra de texto |
| `font` | `Control_Font` font.php | Data | string (familia) | — | selector de fuente (usado por typography group) |
| `image_dimensions` | `Control_Image_Dimensions` | Multiple | `{width,height}` | — | dimensiones custom de imagen (image-size group) |
| `hidden` | `Control_Hidden` hidden.php:16 | Data | string | — | guarda valor sin UI visible |
| `structure` | `Control_Structure` structure.php | Data/UI | string | — | elige nº de columnas/layout de sección |
| `animation` | `Control_Animation` animation.php:16 | Data | string | — | animación de entrada |
| `hover_animation` | `Control_Hover_Animation` | Data | string | — | animación al hover |
| `exit_animation` | `Control_Exit_Animation` | Data | string | — | animación de salida (Pro-ish, base en core) |
| `popover_toggle` | `Control_Popover_Toggle` popover-toggle.php | Data | string | — | toggle que abre/cierra un popover de campos |
| `wp_widget` | `Control_WP_Widget` wp-widget.php | Data | — | — | embebe un widget clásico de WP |

### 9.2 UI controls (NO guardan valor — feature `ui`)

| Tipo | Clase | Uso |
|---|---|---|
| `heading` | `Control_Heading` heading.php | título separador dentro de una sección |
| `raw_html` | `Control_Raw_Html` raw-html.php | HTML libre en el panel |
| `divider` | `Control_Divider` divider.php | línea divisoria |
| `button` | `Control_Button` button.php:16 | botón de acción en el panel |
| `alert` | `Control_Alert` alert.php:15 | caja de aviso con estilo |
| `notice` | `Control_Notice` notice.php | aviso (info/warning/success/danger) |
| `deprecated_notice` | `Control_Deprecated_Notice` | aviso de control obsoleto |
| `section` | `Control_Section` section.php | contenedor (lo abre `start_controls_section`) |
| `tab` | `Control_Tab` tab.php | un tab interno (`start_controls_tab`) |
| `tabs` | `Control_Tabs` tabs.php | contenedor de tabs internos (`start_controls_tabs`) |

> Nota: `select`, `choose`, `switcher` y `slider`/`dimensions` con `selectors` o `prefix_class` son
> los que mayormente alimentan el tab **Style**. `text`, `textarea`, `wysiwyg`, `media`, `url`,
> `repeater`, `select` suelen alimentar **Content**. La distinción real la hace `is_style_control()`
> (§1.4), no el tipo en sí.

---

## 10. Resumen de archivos clave

| Tema | Archivo | Refs |
|---|---|---|
| Manager, tabs, registro, stacks | `includes/managers/controls.php` | constantes ~45-230; `init_tabs` ; `get_controls_names`/`get_groups_names`; `add_control_to_stack`; `is_style_control` |
| add_control / responsive / group / section | `includes/base/controls-stack.php` | `add_control:409`, `add_group_control:774`, `add_responsive_control:868`, `start_controls_section:1551`, `end_controls_section:1642`, `start_controls_tabs:1758`, `register_controls:2243` |
| Base de control | `includes/controls/base.php` | `:29,:62,:101,:113,:136` |
| Data / Multiple / Units / UI | `base-data.php`, `base-multiple.php`, `base-units.php`, `base-ui.php` | `get_default_value`, `get_value`, `get_style_value`, `print_units_template` |
| Repeater | `includes/controls/repeater.php` | `:20,:47,:62,:92,:186` |
| Group controls | `includes/controls/groups/base.php` | `add_controls:85`, `get_controls_prefix:180`, `init_fields:207` |
| Typography group | `includes/controls/groups/typography.php` | `init_fields:88` |
| selectors → CSS | `core/files/css/base.php` | `add_control_rules:319`, `parse_property_placeholder ~:500` |
</content>
</invoke>
