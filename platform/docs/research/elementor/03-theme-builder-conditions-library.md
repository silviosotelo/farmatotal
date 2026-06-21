# Elementor Pro — Theme Builder, Display Conditions, Theme Elements, Library, Global Widget y Menús

> Relevamiento estructural del código real de Elementor Pro en
> `C:\Users\sotelos\Downloads\Elementor\elementor-pro\modules\`.
> Todas las referencias son `archivo:línea` sobre archivos reales. Objetivo: entender
> cómo se arman plantillas reutilizables y dónde/cuándo se muestran, para replicar la
> mecánica en la plataforma propia de Farmatotal.

## Índice

1. [Theme Builder](#1-theme-builder)
2. [Display Conditions](#2-display-conditions)
3. [Theme Elements (widgets dinámicos de tema)](#3-theme-elements-widgets-dinámicos-de-tema)
4. [Library (plantillas guardadas, kits, import/export)](#4-library-plantillas-guardadas-kits-importexport)
5. [Global Widget](#5-global-widget)
6. [Nav Menu y Mega Menu](#6-nav-menu-y-mega-menu)
7. [Conclusiones para la plataforma propia](#7-conclusiones-para-la-plataforma-propia)

---

## 1. Theme Builder

Ruta: `modules/theme-builder/`

El Theme Builder es el motor que permite diseñar **partes de la plantilla del tema** (header, footer,
single, archive, 404, search) con el editor de Elementor y decidir **dónde y cuándo** se muestran. Tres
piezas se combinan: **Document Types** (qué se puede diseñar), **Locations** (dónde se inyecta en la
página) y **Conditions** (cuándo / a qué URLs aplica).

### 1.1 Arranque del módulo y managers expuestos

`modules/theme-builder/module.php` — `class Module extends Module_Base`. El bootstrap registra 5
componentes (`module.php:449-453`):

```php
$this->add_component( 'theme_support',  new Classes\Theme_Support() );
$this->add_component( 'conditions',     new Classes\Conditions_Manager() );
$this->add_component( 'templates_types', new Classes\Templates_Types_Manager() );
$this->add_component( 'preview',        new Classes\Preview_Manager() );
$this->add_component( 'locations',      new Classes\Locations_Manager() );
```

Accesores tipados: `get_conditions_manager()` (`module.php:77-79`), `get_locations_manager()`
(`84-86`), `get_preview_manager()` (`91-93`), `get_types_manager()` (`98-100`).

`get_document($post_id)` (`module.php:107-122`) recupera el documento de Elementor y lo descarta si **no**
es un `Theme_Document` — es el filtro central usado por todo el módulo.

Hooks de editor:
- `elementor/document/config` → `document_config()` (`459`, `124-150`) inyecta en el config del editor la
  clave `theme_builder` con `types`, `conditions`, `template_conditions` y los settings del documento
  (`template_type`, `location`, `conditions`).
- `elementor/controls/register` → registra el control `Conditions_Repeater` y `Control_Media_Preview`
  (`152-155`).

### 1.2 Catálogo de Document/Template types

`modules/theme-builder/classes/templates-types-manager.php` engancha `elementor/documents/register` →
`register_documents()` (`:14-16`). En `register_documents()` (`:34-50`) define el mapa clave→clase y los
registra vía `Plugin::elementor()->documents->register_document_type()`:

```php
$docs_types = [
    'section', 'header', 'footer', 'single', 'single-post',
    'single-page', 'archive', 'search-results', 'error-404',
];
```

`get_types_config($args)` (`:18-32`) sólo incluye los documentos que son instancia de
`Documents\Theme_Document` (devuelve sus `::get_properties()`).

| Tipo (`get_type`) | Clase / herencia | Location | `condition_type` | Notas |
|---|---|---|---|---|
| `header` | `Header` → `Header_Footer_Base` → `Theme_Section_Document` | `header` (`header.php:13`) | `general` | wrapping tag `header`; `support_lazyload=false` |
| `footer` | `Footer` → `Header_Footer_Base` | `footer` (`footer.php:13`) | `general` | wrapping tag `footer` |
| `section` | `Section` → `Theme_Section_Document` | dinámico (meta `_elementor_location`) | `general` | location elegible entre las públicas; regenera cache al guardar (`section.php:100-112`) |
| `single` | `Single` → `Single_Base` → `Archive_Single_Base` → `Theme_Page_Document` | `single` (`single-base.php:18`) | `singular` (`single-base.php:19`) | tipo legacy multipropósito; oculto en "crear nuevo" (`module.php:169-171`) |
| `single-post` | `Single_Post` → `Single_Base` | `single` | `singular` | — |
| `single-page` | `Single_Page` → `Single_Base` | `single` | `singular` | `get_sub_type()='page'` → autocondición `include/singular/page` |
| `error-404` | `Error_404` → `Single_Base` | `single` | `singular` | `get_sub_type()='not_found404'` → autocondición |
| `archive` | `Archive` → `Archive_Single_Base` → `Theme_Page_Document` | `archive` (`archive.php:15`) | `archive` (`archive.php:16`) | preview default `archive/recent_posts` |
| `search-results` | `Search_Results` → `Archive` | `archive` (heredado) | `archive` | `get_sub_type()='search'` → autocondición `include/archive/search` |

**Autoasignación de sub-condición.** `Archive_Single_Base::save_template_type()` →
`save_sub_type_condition()` (`archive-single-base.php:37-59`): si la clase define `get_sub_type()` y la
condición existe, guarda `[ 'include', condition_type, sub_type ]`. Por eso `single-page`, `error-404` y
`search-results` nacen con su condición ya puesta.

**Bases intermedias relevantes:**
- `documents/theme-document.php` (abstracta, `:18`): `support_kit/support_site_editor/support_conditions
  = true` (`27-36`); `get_location()` (`703-710`) = propiedad `location` o meta `_elementor_location`;
  `print_content()` (`174-184`) imprime preview wrapper o `get_content()`; `get_container_attributes()`
  añade clase `elementor-location-{location}` (`194-204`); `import()` (`244-284`) resuelve conflictos de
  condiciones; `get_preview_as_query_args()` (`601-694`) construye el contexto "Preview Dynamic Content as".
- `documents/theme-page-document.php` (`:13`): añade control `page_template` (Default/Canvas/Full-Width),
  `support_wp_page_templates=true`, y `filter_body_classes()`.
- `documents/theme-section-document.php`: `condition_type='general'`, layout 'strip'.

### 1.3 Sistema de Locations (registro y render)

`modules/theme-builder/classes/locations-manager.php`. Una **location** es un punto de inyección con nombre
(p. ej. `header`, `footer`, `single`, `archive`) al que el tema da soporte vía un hook
`elementor/theme/{location}`.

**Locations core** (`set_core_locations()`, `:585-613`): `header` y `footer` (`public=false`,
`edit_in_content=false`), `archive` (`overwrite=true`, `edit_in_content=true`), `single`
(`edit_in_content=true`). Todas con `is_core=true`.

**Registro:**
- `register_location($location, $args)` (`:532-552`): `wp_parse_args` con defaults (`label`,
  `multiple=false`, `public=true`, `edit_in_content=true`, `hook='elementor/theme/{location}'`), guarda en
  `$this->locations`, y **engancha el hook del tema** con prioridad 5 que llama a `do_location()`; si
  `do_location` devuelve `true` y hay `remove_hooks`, los elimina (sustituye la salida nativa del tema).
- `register_core_location()` (`:554-563`) y `register_all_core_location()` (`:526-530`).
- `register_locations()` (`:139-155`) dispara una sola vez `do_action('elementor/theme/register_locations',
  $this)` — **hook público** para que temas/desarrolladores registren ubicaciones. Llamado en
  `template_redirect` y lazy desde `get_locations()`.

**Flujo de render `do_location($location)`** (`:374-459`):
1. Pide a `Conditions_Manager::get_documents_for_location($location)` los documentos que matchean.
2. Los encola con `add_doc_to_location()` en `$locations_queue`.
3. Si la cola está vacía → `return false`.
4. Dispara `do_action("elementor/theme/before_do_{$location}", $this)` (`:402`).
5. Por cada documento: salta si ya impreso o no publicado; setea `current_location`, llama
   `$document->print_content()` (`:438`), marca impreso.
6. Dispara `do_action("elementor/theme/after_do_{$location}", $this)` (`:456`); `return true`.

**`template_include()`** (`:221-328`, hook `template_include` prio 11): mapea el contexto WP a una
location (singular→`single`; archive/tax/home/search/shop→`archive`; 404→`single`). Si la location no
existe en el tema, o tiene `overwrite` (y no es header/footer), o el documento define `page_template`,
fuerza el template `TEMPLATE_HEADER_FOOTER` de PageTemplates con un print_callback que ejecuta
`do_location($location)` (`:313-315`). Filtro `elementor/theme/need_override_location` (`:303`).

`builder_wrapper()` (`:474-490`, hook `the_content` prio 9999999): para locations con
`edit_in_content=false` (header/footer) sustituye el contenido por el placeholder "Content area".

`Theme_Support::after_register_locations()` (`theme-support.php:36-69`) registra header/footer como core con
`overwrite=true` si el tema no los registró, y engancha `get_header`/`get_footer` para suprimir la salida
nativa (`remove_all_actions('wp_head'/'wp_footer')` + buffering, `:71-130`).

### 1.4 Sistema de Conditions (include/exclude + prioridad)

`modules/theme-builder/classes/conditions-manager.php` + `conditions/*.php`. Las condiciones definen a qué
URLs/contextos aplica una plantilla. Se modelan como un **árbol** (grupo → tipo → sub-condición → sub-id)
con **prioridad numérica** (menor = más específico = gana).

**Registro:**
- `register_conditions()` (`:286-298`): registra `general` y dispara
  `do_action('elementor/theme/register_conditions', $this)` (hook público). Enganchado en `wp_loaded`.
- `register_condition($id, $args)` (`:197-218`): instancia
  `\ElementorPro\Modules\ThemeBuilder\Conditions\{Ucfirst($id)}`, la registra y **recursivamente**
  registra sus `get_sub_conditions()`. Desde `general` se despliega todo el árbol.

**Árbol de condiciones** (grupo `get_type()` → condición [prioridad], `check()`):

`general` (`general.php`) — type `general`, `check()` siempre `true` (`:31-33`), label "Entire site".
Sub: `archive`, `singular`.

Rama **archive** (`archive.php`) — type `archive`, **prio 80**, `check()=is_archive()||is_home()||is_search()`
(excluye WooCommerce, `:54-63`). Sub estáticas: `author`, `date`, `search`; dinámicas: un
`Post_Type_Archive` por post type con archivo.
- `author` (`author.php`): prio 70, `check()=is_author($args['id'])`.
- `date` (`date.php`): prio 70, `check()=is_date()`.
- `search` (`search.php`): prio 70, `check()=is_search()`.
- `Post_Type_Archive` (`post-type-archive.php`): name `{pt}_archive`, prio 70,
  `check()=is_post_type_archive()||('post'&&is_home())`. Sub: un `Taxonomy` por taxonomía; si jerárquica,
  `Child_Of_Term` y `Any_Child_Of_Term`.
  - `Taxonomy` (`taxonomy.php`): name = taxonomía, prio 70, `check()` con `is_category`/`is_tag`/`is_tax`.
  - `Child_Of_Term` (`child-of-term.php`): name `child_of_{tax}`, término cuyo `parent === id`.
  - `Any_Child_Of_Term` (`any-child-of-term.php`): name `any_child_of_{tax}`, sube por la cadena de padres.

Rama **singular** (`singular.php`) — type `singular`, **prio 60**,
`check()=(is_singular()&&!is_embed())||is_404()`, label "All singular". Sub estática: `front_page`;
dinámicas: un `Post` por post type, luego `child_of`, `any_child_of`, `by_author`, y `not_found404`.
- `front_page` (`front-page.php`): **prio 30**, `check()=is_front_page()`.
- `Post` (`post.php`): name = post type, prio 40, `check()=is_singular(pt)` o post concreto si hay `id`.
  Sub: un `In_Taxonomy` por taxonomía pública; si jerárquica `In_Sub_Term`; y un `Post_Type_By_Author`.
  - `In_Taxonomy` (`in-taxonomy.php`): name `in_{tax}`, prio 40, `check()=is_singular()&&has_term(id,tax)`.
  - `In_Sub_Term` (`in-sub-term.php`): name `in_{tax}_children`, mira términos hijos.
  - `Post_Type_By_Author` (`post-type-by-author.php`): name `{pt}_by_author`, prio 40.
- `child_of` (`child-of.php`): prio 40, padre directo del post coincide.
- `any_child_of` (`any-child-of.php`): usa `get_post_ancestors()`.
- `by_author` (`by-author.php`): prio 40, `is_singular()&&post_author===id`.
- `not_found404` (`not-found404.php`): **prio 20**, `check()=is_404()`.

`conditions/condition-base.php` (abstracta): `get_priority()` default **100** (`:16-18`); `check()` default
`false`; sub-conditions vía `$sub_conditions` + `register_sub_condition()`; en `__construct` llama
`register_sub_conditions()`.

**Persistencia.** Una condición se guarda como string `type/name/sub_name/sub_id` (ej.
`include/singular/post`, `exclude/archive/category/12`). `save_conditions()`
(`conditions-manager.php:300-326`) serializa con `implode('/')` en la meta `_elementor_conditions` y luego
`cache->regenerate()`. `parse_condition()` (`:507-511`) hace el `explode('/')`.

**Include vs Exclude.** Control `Conditions_Repeater` (`conditions-repeater.php:24-31`): campo `type` con
opciones `include`/`exclude` (default include), más `name` (grupo), `sub_name` y `sub_id` (con opción
'All'=`''`). Los `exclude` que pasan su `check()` **eliminan** a esa plantilla del set de candidatos
(`conditions-manager.php:407-409`).

**Selección de la plantilla ganadora — `get_location_templates($location)`** (`:328-414`):
1. Lee de cache las condiciones por location.
2. Por cada plantilla y condición: parsea, ejecuta `condition_instance->check([])`; si pasa y hay
   `sub_name`, ejecuta `sub_condition->check(['id'=>sub_id])`.
3. Si pasa y la plantilla está publicada: `include` → guarda prioridad; `exclude` → a `$excludes`.
4. Quita excluidos y hace **`asort($conditions_priority)`** (ascendente: menor número = más específico = gana).

`get_condition_priority()` (`:468-487`):
```php
$priority = $condition_instance::get_priority();
if ( $sub_condition_instance ) {
    if ( $sub_condition_instance::get_priority() < $priority ) $priority = $sub_condition_instance::get_priority();
    $priority -= 10;                                   // sub-condición = más específica
    if ( $sub_id ) $priority -= 10;                    // sub-id concreto = aún más específica
    elseif ( 0 === count($sub_condition_instance->get_sub_conditions()) ) $priority -= 5; // hoja
}
```
Escala base: `404`=20, `front_page`=30, `singular` (post/by_author/child_of/in_taxonomy)=40, grupo
`singular`=60, archive sub=70, grupo `archive`=80, `general`=100. **Número más bajo = mayor prioridad.**

**Overrides** (`get_theme_templates_ids($location)`, `:416-458`):
- Param URL `?theme_template_id=N` fuerza esa plantilla si su location coincide.
- El template que se está editando (`get_the_ID()`) tiene preferencia.

`get_documents_for_location($location)` (`:518-546`): convierte ids→documentos en orden de prioridad; **si
la location NO es `multiple`, hace `break` tras el primero** (`:538-540`) → normalmente gana una sola
plantilla (la más específica). Resultado cacheado en `$location_cache`.

**Cache** (`conditions-cache.php`): opción `elementor_pro_theme_builder_conditions`, estructura
`[location][template_id] = [condiciones...]`. `regenerate()` (`:94-142`) hace un `WP_Query` de todos los
posts con meta `_elementor_conditions`. Cache en memoria por request: `Conditions_Manager::$location_cache`.

**Conflictos.** `get_conditions_conflicts_by_location()` (`:124-169`): si la location no es `multiple`,
detecta otras plantillas con la misma condición exacta y las reporta (AJAX
`pro_theme_builder_conditions_check_conflicts`).

**Flujo completo en frontend:** WP resuelve la request → `template_include` (locations-manager) decide la
location y, si corresponde, fuerza el template Header/Footer cuyo callback llama `do_location()` →
`do_location` pide a `Conditions_Manager::get_documents_for_location()` → éste evalúa `check()` de cada
condición cacheada contra el query actual, ordena por prioridad (más específica gana, `exclude` descarta)
→ imprime el `print_content()` del documento ganador.

---

## 2. Display Conditions

Ruta: `modules/display-conditions/`

A diferencia de las **Theme Builder Conditions** (que deciden *qué plantilla* se muestra en una location),
las **Display Conditions** deciden si un **elemento individual** (section/column/container/widget) se
renderiza o no, según reglas dinámicas (rol de usuario, fecha, taxonomías, custom fields, etc.). Es una
feature con licencia.

### 2.1 Arranque y dónde se aplica el control

`modules/display-conditions/module.php` — el constructor decide según licencia: si
`! can_use_display_conditions()` (`:278-284`, valida `API::is_license_active()` +
`is_licence_has_feature('display-conditions')`) sólo añade promo. Si es válida →
`maybe_add_actions_and_components()` (`:289-293`).

`add_components()` (`:83-86`): registra `'conditions' => new Classes\Conditions_Manager($this)` y
`'cache_notice'`.

**Dónde se inyecta el control (UI):**
1. **Widgets/Elementos clásicos** — `add_advanced_tab_actions()` (`:130-148`) engancha en la pestaña
   Advanced de Sections, Columns, Widgets (common) y Containers. `add_control_to_advanced_tab()`
   (`:155-179`) inyecta un `RAW_HTML` (`e_display_conditions_trigger`, abre el editor React) y un control
   `HIDDEN` `e_display_conditions` donde se persiste el JSON.
2. **Atomic Widgets (Elementor V4)** — `inject_display_conditions_control()` (`:43-70`) añade un
   `Display_Conditions_Control` si el schema lo declara.

### 2.2 Hook de render (`should_render`)

`add_render_actions()`:
```php
add_action( 'elementor/frontend/before_render', [ $this, 'before_element_render' ] ); // module.php:150-153
add_action( 'elementor/frontend/after_render',  [ $this, 'after_element_render' ] );
```

`before_element_render()` (`:216-235`) — punto de evaluación:
```php
$saved_conditions = $this->get_saved_conditions( $settings );
if ( Plugin::elementor()->editor->is_edit_mode() || empty( $saved_conditions ) ) {
    return $is_visible;                                  // en el editor SIEMPRE visible
}
$saved_conditions = new Or_Condition( $this->get_conditions_manager(), $saved_conditions );
$is_visible = $saved_conditions->check();               // <-- evaluación
if ( ! $is_visible ) {
    add_filter( 'elementor/element/get_child_type', '__return_false' );
    add_filter( 'elementor/frontend/' . $element->get_type() . '/should_render', '__return_false' );
}
```
`after_element_render()` (`:237-244`) quita esos filtros para no afectar a los demás elementos del mismo
tipo. `filter_element_caching_is_dynamic_content()` (`:267-273`) marca el elemento como contenido dinámico
para que el cache de Elementor no lo congele.

### 2.3 Composición lógica AND / OR

La relación es **OR de grupos, cada grupo es un AND de filas**.

`Or_Condition` (`classes/or-condition.php`):
```php
public function check() {
    if ( empty( $this->and_conditions ) ) return true;   // sin condiciones => visible
    foreach ( $this->and_conditions as $c ) if ( $c->check() ) return true; // basta un grupo TRUE
    return false;
}
```
`And_Condition` (`classes/and-condition.php`):
```php
public function check() {
    foreach ( $this->conditions as $opts )
        if ( ! $this->is_condition_passing_check( $opts ) ) return false; // todas deben pasar
    return true;
}
// condición desconocida => no bloquea (and-condition.php:37-39)
```

### 2.4 Comparadores / Operadores

`classes/comparator-provider.php` (`:42-55`) — catálogo: `is`, `is_not`, `is_one_of`, `is_none_of`,
`contains`, `not_contain`, `is_before`, `is_after`, `is_less_than_inclusive`, `is_greater_than_inclusive`,
`is_before_inclusive`, `is_after_inclusive`, `is_empty`, `is_not_empty`. `get_comparators(array)` (`:28-32`)
hace `array_intersect_key` — cada condición pide sólo el subconjunto que aplica.

`classes/comparators-checker.php` — 6 estrategias de evaluación:
1. `check_date_time()` (`:19-36`): `is`→`==`, `is_not`→`!=`, `is_after`/`is_before`/`*_inclusive` comparan
   fecha real vs límite configurado.
2. `check_array_contains()` (`:38-52`): `array_intersect`; `is`/`is_one_of` vs `is_not`/`is_none_of`.
3. `check_string_contains()` (`:54-74`): lowercased; `is`→`===`, `contains`→`str_contains`, etc.
4. `check_string_contains_and_empty()` (`:76-91`): (3) + `is_empty`/`is_not_empty` (usado por Dynamic Tags).
5. `check_equality()` (`:93-104`): `is`→`===`, `is_not`→`!==`.
6. `check_numeric_constraints()` (`:113-126`): `is`, `is_not`, `<=`, `>=`.

### 2.5 Conditions Manager y grupos

`classes/conditions-manager.php` — lista fija `CONDITIONS` (`:21-55`, 22 clases). `register_condition()`
(`:96-108`) **inyecta un `new Wordpress_Adapter()`** como último arg (abstrae llamadas WP para test) e
instancia la clase. Grupos (`init_groups()`, `:64-94`): `page`, `post`, `user`, `date` ("Date and Time"),
`archive`, `other`. Hook `elementor/display_conditions/register` para condiciones de terceros.

### 2.6 Catálogo completo de Display Conditions (22)

**Grupo USER** (`user`):
| Condición | name | check() runtime |
|---|---|---|
| `Login_Status_Condition` | `login_status` | `is_user_logged_in()` vs Logged In/Out |
| `User_Role_Condition` | `user_role` | `wp_get_current_user()->roles` vs roles seleccionados |
| `User_Registration_Date_Condition` | `user_registration_date` | `check_date($args, user_registered)` |

**Grupo DATE AND TIME** (`date`):
| `Current_Date_Condition` | `current_date` | `check_date($args, gmdate('m-d-Y'))` |
| `Day_Of_The_Week_Condition` | `day_of_the_week` | `[strtolower(gmdate('l'))]` vs días |
| `Time_Of_The_Day_Condition` | `time_of_the_day` | `gmdate('H:i')` vs hora |

**Grupo PAGE** (`page`):
| `Page_Title_Condition` | `page_title` | título actual vs seleccionados |
| `Page_Parent_Condition` | `page_parent` | `get_post()->post_parent` vs ids |
| `Page_Author_Condition` | `page_author` | `get_post()->post_author` vs autores |

**Grupo POST** (`post`):
| `Post_Title_Condition` | `post_title` | título actual vs seleccionados |
| `Post_Author_Condition` | `post_author` | (extiende Page_Author) |
| `In_Categories_Condition` | `in_categories` | `wp_get_post_categories()` vs seleccionadas |
| `In_Tags_Condition` | `in_tags` | `wp_get_post_tags()` vs seleccionadas |
| `Date_Of_Publish_Condition` | `date_of_publish` | `get_the_date('m-d-Y')` |
| `Date_Of_Modification_Condition` | `date_of_modification` | `get_the_modified_date('m-d-Y')` |
| `Post_Number_Of_Comments_Condition` | `number_of_comments` | `get_comments_number()` vs número (`>=`,`<=`) |
| `Featured_Image_Condition` | `featured_image` | `has_post_thumbnail()` vs Set/Not Set |

**Grupo ARCHIVE** (`archive`):
| `Archive_Of_Category_Condition` | `archive_of_categories` | `is_category(ids)` |
| `Archive_Of_Tag_Condition` | `archive_of_tags` | `is_tag(ids)` |
| `Archive_Of_Author_Condition` | `archive_of_authors` | `adapter->is_author(ids)` |

**Grupo OTHER** (`other`):
| `From_URL_Condition` | `from_url` | `wp_get_raw_referer()` vs string (is/contains/...) |
| `Dynamic_Tags_Condition` | `dynamic_tags` | valor de dynamic tag / custom field |

### 2.7 Dynamic Tags / Custom Fields como fuente

`Dynamic_Tags_Condition::get_options()` (`dynamic-tags-condition.php:57-94`) une dos proveedores:
- `Dynamic_Tags_Data_Provider` (`dynamic-tags-data-provider.php`): recorre
  `Plugin::elementor()->dynamic_tags->get_config()['tags']` e incluye sólo los que declaran la clave
  `display_conditions`; resuelve valor con `get_tag_data_content()`.
- `Custom_Fields_Data_Provider` (`custom-fields-data-provider.php`): query a `$wpdb->postmeta` por
  `meta_key` distintas excluyendo claves privadas (límite filtrable `CUSTOM_FIELDS_META_LIMIT=500`);
  además lee claves ACF (`post_type='acf-field'`). `get_value()` (`:65-71`) usa `get_post_meta()`.

`check()` (`:47-55`) prueba primero el dynamic tag y, si es falsy, el custom field, y compara con
`check_string_contains_and_empty()`.

**Reglas clave:** en editor nunca se ocultan elementos; sin condiciones = visible; una fila cuya
`condition` no resuelve a una instancia registrada no bloquea el render.

---

## 3. Theme Elements (widgets dinámicos de tema)

Hay **dos familias** de widgets dinámicos: los de `modules/theme-elements/` (SET A) y los del propio Theme
Builder en `modules/theme-builder/widgets/` (SET B, títulos/imagen/contenido).

### 3.1 SET A — `modules/theme-elements/`

`module.php`: `get_name()='theme-elements'` (`:21-23`); `get_widgets()` (`:25-40`) →
`Search_Form, Author_Box, Post_Comments, Post_Navigation, Post_Info, Sitemap`; **`Breadcrumbs` sólo si
Yoast SEO está activo** (`:35-37`). Constantes `SOURCE_TYPE_CURRENT_POST='current_post'` y
`SOURCE_TYPE_CUSTOM='custom'` (`:12-13`).

`widgets/base.php`: `abstract Base extends Base_Widget`, `get_categories()=['theme-elements']`,
`render_plain_content()` vacío (no exporta contenido dinámico como texto plano).

| Widget | `get_name()` | Fuente de datos en `render()` |
|---|---|---|
| Post Info | `post-info` | funciones del loop: `get_the_author_meta`, `get_the_time`, `get_comments_number`, `wp_get_post_terms(get_the_ID())` (`post-info.php:749-903`) |
| Author Box | `author-box` | `get_the_author_meta('ID'/'display_name'/'user_url'/'description')` del post actual (`author-box.php:1475-1480`) |
| Post Comments | `post-comments` | `comments_template()` nativo; con `source=custom` hace `db->switch_to_post()` / `restore_current_post()` (`:103,122`) |
| Post Navigation | `post-navigation` | `previous_post_link()` / `next_post_link()`, `get_queried_object_id()` (`:687-715`) |
| Breadcrumbs | `breadcrumbs` | `WPSEO_Breadcrumbs::breadcrumb()` (Yoast) (`:203-209`) |
| Search Form | `search-form` | `<form>` GET a `home_url()`, `get_search_query()` (`:762-790`) |
| Sitemap | `sitemap` | `wp_list_categories()` + `new WP_Query` (mapa global del sitio) (`:673-722`) |

### 3.2 SET B — `modules/theme-builder/widgets/`

`title-widget-base.php`: `abstract Title_Widget_Base extends Widget_Heading`. El patrón central: **inyecta un
dynamic tag como valor por defecto del control `title`** (`:33-43`):
```php
$this->update_control('title', [
    'dynamic' => [ 'default' => ProPlugin::elementor()->dynamic_tags->tag_data_to_tag_text( null, $this->get_dynamic_tag_name() ) ],
], [ 'recursive' => true ]);
```
El dato real lo resuelve el **dynamic tag**, no el widget. `should_show_page_title()` (`:19-26`) respeta el
ajuste `hide_title` del documento.

| Widget | `get_name()` | Dato dinámico (vía dynamic tag) |
|---|---|---|
| Site Logo | `theme-site-logo` | tag `site-logo` → `get_theme_mod('custom_logo')` (placeholder si falta) |
| Site Title | `theme-site-title` | tag `site-title` → `get_bloginfo()` |
| Page Title | `theme-page-title` | tag `page-title` → `Utils::get_page_title()` |
| Post Title | `theme-post-title` | tag `post-title` → `get_the_title()` |
| Archive Title | `theme-archive-title` | tag `archive-title` → `Utils::get_page_title()` / nombre del término |
| Post Excerpt | `theme-post-excerpt` | tag `post-excerpt` → `apply_filters('the_excerpt', get_the_excerpt())` |
| Post Content | `theme-post-content` | `render_post_content()` → `setup_postdata()` + `the_content` (`post-content.php:115`) |
| Featured Image | `theme-post-featured-image` | tag `post-featured-image` → `get_post_thumbnail_id()` |

> Todos los `get_name()` llevan el prefijo `theme-` para evitar colisión con el dynamic tag homónimo
> (comentario literal en p. ej. `post-title.php:13`).

### 3.3 Patrón común y fallbacks de preview

- **Lectura del loop:** los theme-elements (SET A) usan funciones globales de WP (`get_the_*`,
  `get_queried_object_id`, `get_post`), que dependen del `$post`/`$wp_query` global que las Locations del
  Theme Builder ya colocaron. Los títulos/imagen (SET B) lo hacen **vía dynamic tags** (sustituibles por
  ACF u otro origen sin tocar el widget).
- **Cambio explícito de contexto:** `db->switch_to_post($id)` + `restore_current_post()` (Post Comments
  con `source=custom`).
- **Fallbacks en editor:** Post Comments pinta un alert si los comentarios están cerrados; el tag
  `page-title` fuerza `query_posts()` en AJAX `render_tags`; Site Logo cae a placeholder; títulos respetan
  `hide_title`.

---

## 4. Library (plantillas guardadas, kits, import/export)

Ruta: `modules/library/`

### 4.1 Módulo

`module.php`: `get_name()='library'` (`:31-33`); `get_widgets()` → `Template` (`:16-20`); el constructor
instancia `new Shortcode()`. **No define un source propio**: reutiliza el `Source_Local` del core (CPT
`elementor_library`). `get_templates()` (`:137-139`):
```php
Plugin::elementor()->templates_manager->get_source( 'local' )->get_items();
```
`register_wp_widgets()` (`:35-37`) registra el WP widget legacy y lo añade a la black_list de widgets
Elementor (`:129-135`).

### 4.2 Incrustar una plantilla guardada

Dos vías, ambas delegan en `frontend->get_builder_content_for_display()`:

- **Shortcode** `[elementor-template]` (`classes/shortcode.php`): constante `SHORTCODE='elementor-template'`
  (`:13`). Atributos `id` (obligatorio) y `css` (opcional bool). Render (`:62`):
  ```php
  return Plugin::elementor()->frontend->get_builder_content_for_display( $attributes['id'], $include_css );
  ```
  En admin añade una columna "Shortcode" copiable al listado del CPT.
- **Widget `Template`** (`widgets/template.php`): `get_name()='template'` (`:15-17`). Control `template_id`
  tipo `QUERY_CONTROL_ID` con `object => QUERY_OBJECT_LIBRARY_TEMPLATE` y un `meta_query` que filtra por
  `_elementor_template_type` IN los tipos con `show_in_library=true` (`:50-84`). `render()` (`:86-105`)
  emite `<div class="elementor-template">` + `get_builder_content_for_display($template_id)`.
- **WP widget legacy** (`wp-widgets/elementor-library.php`): incrusta una plantilla en sidebars clásicas;
  `filter_content_data()` (`:65-77`) anula la sidebar interna para evitar recursión.

### 4.3 Almacenamiento en el core (referenciado)

CPT y meta — `elementor/includes/template-library/sources/local.php`:
- `const CPT = 'elementor_library'` (`:40`) — toda plantilla guardada es un post de este CPT.
- `const TYPE_META_KEY = '_elementor_template_type'` (`:57`) — el tipo de plantilla.
- Tipos = documentos registrados con `cpt=[elementor_library]`: **`page`**, **`section`**, **`container`**
  (core), **`widget`** (lo añade Pro, ver §5), `kit`.
- `save_item()` (`:482-557`): crea el documento, reemplaza IDs de elementos, llama `$document->save()`, y
  dispara `elementor/template-library/after_save_template` / `after_update_template` (hooks que Pro consume).

### 4.4 Estructura JSON de una plantilla

Cada nodo del árbol es:
```jsonc
{
  "id": "a1b2c3d",            // 7 chars aleatorios
  "elType": "section|column|container|widget",
  "widgetType": "heading",   // sólo si elType === 'widget'
  "settings": { /* control => valor */ },
  "elements": [ /* hijos, recursivo */ ]
}
```

**Export** — `Document::get_export_data()` (`elementor/core/base/document.php:1640-1661`):
```php
return [
  'content'  => /* árbol con IDs regenerados + on_export por control */,
  'settings' => $this->get_data('settings'),   // page settings
  'metadata' => $this->get_export_metadata(),
];
```
Cada control con `'export' => false` se elimina de `settings` en `process_element_import_export()`.

**Envoltorio del `.json` descargable** — `Source_Local::prepare_template_export()` (`local.php:1569-1597`):
```php
$export_data = [
  'content'       => $content,                 // árbol de elementos
  'page_settings' => $template_data['settings'],
  'version'       => DB::DB_VERSION,           // schema de datos
  'title'         => $post_title,
  'type'          => self::get_template_type(),// page|section|container|widget|...
];
```

**Import** — `Document::get_import_data()` (`:1681-1705`) recorre `content` ejecutando `on_import` por
control; `Document::import()` (`:1717-1736`) guarda, restaura el thumbnail como attachment y vuelca
`metadata` a post-meta.

### 4.5 Kits

Un **kit** (core `elementor/core/kits/`) es un documento especial (`_elementor_template_type='kit'`) que
almacena los **ajustes globales del sitio** (colores globales, tipografías globales, estilos por defecto,
layout, lightbox) — el "design system" de Elementor. `Kits\Manager::get_active_kit()`
(`manager.php:48-52`); `create_default_kit()` (`:188`). No es incrustable: alimenta los controles globales;
en export de sitio viaja como parte del paquete (`attach_global_styles_to_data`).

---

## 5. Global Widget

Ruta: `modules/global-widget/`

Un widget normal puede "guardarse como global": su contenido/estilo se almacena **una sola vez** (como
plantilla tipo `widget`) y todas las instancias del sitio lo referencian; editar el global actualiza todas.

### 5.1 Módulo y conversión a global

`module.php`: `get_name()='global-widget'`. Constantes (`:23-33`):
- `TEMPLATE_TYPE = 'widget'` — tipo de documento bajo el que se guarda.
- `WIDGET_TYPE_META_KEY = '_elementor_template_widget_type'` — qué widget original representa (ej. `heading`).
- `INCLUDED_POSTS_LIST_META_KEY = '_elementor_global_widget_included_posts'` — posts donde se usa (para
  invalidar CSS).

Boot (`:35-44`): registra componentes import/export, `add_hooks()` y
`data_manager->register_controller_instance( new Data\Controller() )`.

Hooks clave (`add_hooks()`, `:260-278`):
- `elementor/documents/register` → registra el tipo de documento `widget` (`:208-210`).
- `elementor/template-library/after_save_template` → `set_template_widget_type_meta()` (`:90-94`): cuando se
  guarda una plantilla tipo `widget`, escribe en `WIDGET_TYPE_META_KEY` el `content[0]['widgetType']`.
  **Aquí un widget "se vuelve global".**
- `elementor/template-library/after_update_template` → `on_template_update()` (`:96-102`): borra el
  `_elementor_css` de todos los posts que lo usan (regenera CSS).
- `elementor/document/save/data` → `get_document_data()` (`:243-257`): al guardar un documento que NO es el
  documento `Widget`, por cada elemento con `templateID` guarda `originalWidgetType = widgetType` y fija
  `widgetType = 'global'`. **Así las instancias se persisten como `widgetType:'global'` + `templateID`.**
- `elementor/editor/after_save` → `set_global_widget_included_posts_list()` (`:171-191`): añade el post
  actual al meta `INCLUDED_POSTS_LIST_META_KEY` de cada global usado.

### 5.2 El widget wrapper (`widgets/global-widget.php`)

`Global_Widget extends Base_Widget`. `get_name()='global'` (`:129-131`); `show_in_panel()=false`. El
constructor (`:34-81`), si hay `templateID`:
1. Carga la plantilla maestra (`templates_manager->get_template_data([...])`).
2. Resuelve el **tipo de widget original** desde `content[0]['widgetType']` (`get_template_widget_type()`,
   `:233-235`).
3. Si no es draft, sustituye `data['settings']` por los settings del maestro (`content[0]['settings']`) →
   todas las instancias heredan el contenido del maestro.

Render delega al original: `get_original_element_instance()` (`:161-167`) instancia la clase del widget
original con el contenido de la plantilla; `render_content()` (`:121-123`):
```php
$this->get_original_element_instance()->render_content();
```
`add_render_attributes()` (`:177-193`) añade clases `elementor-global-<templateID>` y
`elementor-widget-<tipoOriginal>`.

### 5.3 Documento, controlador y persistencia

- `documents/widget.php`: `Widget extends Library_Document`, `get_name()='widget'`. Propiedades
  (`:18-29`): `show_in_library=false`, `is_editable=false`, `show_in_finder=false` (sólo se edita dentro del
  editor). `import()` (`:53-57`) re-escribe `WIDGET_TYPE_META_KEY`. Cada global = un post del CPT
  `elementor_library` con `_elementor_template_type='widget'` + `_elementor_template_widget_type='<tipo>'`,
  cuyo `content[0]` es el widget original.
- `data/controller.php`: `get_name()='global-widget/templates'` → endpoint `/elementor/v1/global-widget/templates`.
  `get_items()` (`:16-42`) lee el parámetro `ids` (CSV) y devuelve `result[template_id] = content[0]` (el
  maestro) para hidratar instancias en el editor. `get_permission_callback()` → `current_user_can('edit_posts')`.
- `import-export-customization/export.php` e `import.php`: exportan globales como ficheros
  `templates/<id>` con `get_export_data()` y los re-crean en import (`documents->create('widget', ...)`).

---

## 6. Nav Menu y Mega Menu

### 6.1 Nav Menu — widget "WordPress Menu"

`modules/nav-menu/`. `module.php`: `get_name()='nav-menu'`, `get_widgets()=['Nav_Menu']`.

`widgets/nav-menu.php` — `Nav_Menu extends Base_Widget`. `get_name()='nav-menu'` (`:22-24`), título
"WordPress Menu". `get_script_depends()=['smartmenus']` (`:42-44`) — usa la librería **SmartMenus**.

**Fuente de datos = menús de WordPress.** `get_available_menus()` (`:68-78`) usa
**`wp_get_nav_menus()`** → `[slug => name]`. Control `menu` (`:101-134`) tipo `SELECT` por slug; si no hay
menús muestra un `ALERT` con enlace a `nav-menus.php`.

**Layouts** (control `layout`, `:136-149`): `horizontal` (default), `vertical`, `dropdown`.

**Submenú/dropdown:** `submenu_icon` (`:304-327`, default `fa-caret-down`); estilo en
`section_style_dropdown` (`:990+`).

**Mobile (hamburguesa):** `dropdown` (`:366-378`) = breakpoint de colapso (default `tablet`,
`prefix_class=elementor-nav-menu--dropdown-`); `toggle` (`:412-429`) None/Burger; iconos
`toggle_icon_normal`/`_active`.

**Render** (`render()`, `:1453-1540`): construye `$args` para **`wp_nav_menu()`** (`echo=false`,
`menu=>slug`, `menu_class=>elementor-nav-menu`, `fallback_cb=>__return_empty_string`). **No usa Walker
custom**; aplica filtros temporales (`nav_menu_link_attributes` → `handle_link_classes` añade
`elementor-item`/`elementor-item-active`; `nav_menu_submenu_css_class` →
`elementor-nav-menu--dropdown`). Llama `wp_nav_menu()` **dos veces** (principal + versión `dropdown` móvil) y
luego `render_menu_toggle()`. `on_export`/`on_import` traducen slug↔term_id para portar el menú.

### 6.2 Mega Menu — widget "Menu"

`modules/mega-menu/`. `module.php`: `get_name()='mega-menu'`, `EXPERIMENT_NAME='mega-menu'` (BETA, depende
de `container` y del experimento **NestedElements**, `:38-40`).

`widgets/mega-menu.php` — **`Mega_Menu extends Widget_Nested_Base`** (no `Base_Widget`) + traits
`Base_Widget_Trait`, `Url_Helper_Trait`. `get_name()='mega-menu'`, título **"Menu"**.

**Definición de ítems = repeater nested, NO menú de WP.** `menu_items` (`:281-301`) tipo
`Control_Nested_Repeater::CONTROL_TYPE`. Cada fila (`:198-279`):
- `item_title` (TEXT, dynamic), `item_link` (URL, dynamic).
- `item_dropdown_content` (SWITCHER, default `no`) — activa que el ítem tenga panel desplegable.
- `item_icon` / `item_icon_active`, `element_id`.

**Contenido del dropdown = un Container de Elementor por ítem (Nested Elements).** No usa una plantilla
guardada ni loop template: cada ítem con `item_dropdown_content=yes` tiene su **propio Container hijo**
editable (cualquier widget dentro). `get_default_children_elements()` (`:91-112`) crea 3 containers por
defecto; `get_initial_config()` (`:2525-2532`) interlaza cada fila del repeater con su Container
(`is_interlaced=true`). En render, `print_child($index)` (`:2259-2283`) imprime el Container hijo dentro de
`<div class="e-n-menu-content">`.

**Trigger** (`open_on`, `:490-505`): **`hover`** (default) o **`click`** (sólo en `item_layout=horizontal`).
Animación `open_animation` (`:520-528`) limitada a `fadeIn` (control custom
`controls/control-menu-dropdown-animation.php`, `Control_Hover_Animation` con sólo `['fadeIn'=>'Fade in']`).

**Responsive:** `breakpoint_selector` (`:753-764`, default `tablet`) — bajo ese breakpoint el layout cambia
a dropdown móvil. Toggle hamburguesa con `<button class="e-n-menu-toggle">` (A11y: aria-haspopup,
aria-expanded, aria-controls).

`traits/url-helper-trait.php`: `parse_url()` normaliza host/path/query; `get_permalink_for_current_page()`
resuelve el permalink actual para marcar el ítem activo (`e-current`) comparando URLs normalizadas.

### 6.3 Diferencias clave Nav Menu vs Mega Menu

| Aspecto | Nav Menu | Mega Menu |
|---|---|---|
| Clase base | `Base_Widget` | `Widget_Nested_Base` (Nested Elements) |
| Estado | estable | experimento BETA (dep. container + nested-elements) |
| Fuente de ítems | **menús de WordPress** (`wp_get_nav_menus()`) | **repeater nested propio** |
| Submenú | jerarquía del menú WP (`wp_nav_menu` ×2) | un **Container de Elementor editable** por ítem |
| Trigger | SmartMenus (hover/click implícito) | control `open_on` (hover/click) |
| Animación | pointer (underline/framed/...) | sólo `fadeIn` |
| Markup | `elementor-nav-menu*`, `e--pointer-*` | `e-n-menu*`, vars `--n-menu-*` |
| JS | librería `smartmenus` | `elementorPro.modules.megaMenu` |
| Activo | `current-menu-item` de WP | comparación de URL normalizada |

**Resumen:** el *Nav Menu* es un envoltorio de `wp_nav_menu()` que estiliza menús de WordPress; el *Mega
Menu* es un widget Nested Elements autónomo donde cada ítem y su panel se definen y editan dentro del propio
widget, sin tocar los menús de WP.

---

## 7. Conclusiones para la plataforma propia

Patrones a replicar en la plataforma de Farmatotal (front+admin+page builder propio):

1. **Separar plantilla / ubicación / condición.** El modelo Elementor (Document Type → Location → Condition)
   es limpio y reusable: una plantilla se diseña una vez, se asigna a una *location* (header, footer,
   single, archive, 404) y un set de *conditions* string `include|exclude/grupo/sub/id` decide a qué URLs
   aplica. La **prioridad numérica ascendente** (menor = más específico gana, con `break` si la location no
   es `multiple`) es un mecanismo de override simple de implementar (un `ORDER BY priority` + primer match).

2. **Conditions cacheadas.** Mantener una tabla/JSON `[location][template_id] = [conditions]` regenerada al
   guardar evita evaluar todas las plantillas en cada request; en runtime sólo se evalúan los `check()`
   contra el contexto actual.

3. **Display Conditions = OR de ANDs** con un catálogo de comparadores reutilizable
   (`is/is_not/contains/before/after/empty/...`) y un set de proveedores de datos (rol, fecha, taxonomía,
   custom field, dynamic tag). Se evalúa en un único hook `before_render` que decide `should_render`.

4. **Widgets dinámicos vía "dynamic tags".** En vez de cablear `get_the_title()` dentro de cada widget,
   Elementor inyecta un *dynamic tag* como default del control. Esto desacopla el widget del origen del dato
   y permite sustituirlo (ACF, ERP de Farmatotal, etc.) sin tocar el widget. Recomendado replicar este
   indireccionamiento (un registry de "data sources" por contexto: producto actual, sucursal, categoría).

5. **Plantillas guardadas = JSON recursivo** `{id, elType, widgetType, settings, elements}` + envoltorio
   `{content, page_settings, version, title, type}`. Versionar el schema (`version`) y aplicar
   transformaciones `on_export`/`on_import` por control (remapeo de IDs/attachments) es esencial para
   import/export portable.

6. **Global Widget = single source of truth.** Una entidad maestra + instancias que sólo guardan una
   referencia (`templateID`) y se hidratan en render delegando a la clase real. Editar el maestro invalida
   el cache de los posts que lo usan. Patrón directamente aplicable a componentes compartidos (header de
   promo, banner de sucursal) en la plataforma.

7. **Menús: dos modelos.** Nav Menu (datos externos = menú administrado) vs Mega Menu (contenido
   autocontenido = container editable por ítem). Para Farmatotal probablemente convenga el modelo Mega Menu
   (paneles ricos con categorías/destacados) combinado con una fuente de datos del catálogo.
