# Elementor Pro — Subsistema QUERY / LOOP / DYNAMIC TAGS

> Relevamiento de código real sobre `Downloads/Elementor/elementor-pro` (v4.1.1).
> Objetivo: replicar el "query builder + loop + campos dinámicos" en la plataforma propia (platform/).
> Todas las refs son `archivo:línea` relativas a `elementor-pro/`.

## Mapa mental rápido

```
Group_Control_Query  (define los CONTROLES del query, UI del panel)
        │  presets: full / include / exclude / advanced_exclude / date / pagination / order / query_id
        ▼
Elementor_Post_Query (traduce settings → args de WP_Query, construye \WP_Query)
        │  subclase: Elementor_Related_Query (related + fallback)
        ▼
Posts_Base  (widget que invoca el query, recorre el loop y pagina)
        ├─ skins Classic / Cards / Full Content (cómo se pinta cada item)
        └─ LoopBuilder\Widgets\Base → Loop_Grid / Loop_Carousel
                 └─ usa un TEMPLATE (Loop document) por item, en vez de markup fijo
Loop_Filter (Taxonomy_Filter) → hook 'elementor/query/query_args' inyecta tax_query desde la URL
Dynamic_Tags → cualquier control con 'dynamic'=>['active'=>true] acepta un tag que se resuelve en render
WooCommerce\Products_Renderer → variante del query para productos (price/popularity/rating, sale, featured…)
```

Dos motores de query coexisten:
- **WP_Query "genérico"** (`Elementor_Post_Query`) para Posts/Loop sobre cualquier CPT.
- **WC Products** (`Products_Renderer`) que reusa el mismo `Group_Control_Query` pero arma los args con la lógica de WooCommerce (`WC()->query`).

---

# 1. QUERY CONTROL

Módulo: `modules/query-control/`. Registra 4 group-controls + 2 controles base.
`module.php:889-901`:

```php
$controls_manager->add_group_control( Group_Control_Posts::get_type(), new Group_Control_Posts() );   // 'posts' (DEPRECADO)
$controls_manager->add_group_control( Group_Control_Query::get_type(), new Group_Control_Query() );   // 'query-group'
$controls_manager->add_group_control( Group_Control_Related::get_type(), new Group_Control_Related() );// 'related-query'
$controls_manager->add_group_control( Group_Control_Taxonomy::get_type(), new Group_Control_Taxonomy() );// 'taxonomy-query'
$controls_manager->register( new Query() );           // control 'query'  (Select2 + IDs)
$controls_manager->register( new Template_Query() );  // control 'template_query'
```

## 1.1 `Group_Control_Query` — lista EXHAUSTIVA de controles

Definidos en `controls/group-control-query.php:34-401` (método `get_fields_array`). Cada control real toma como prefijo el `name` del group (ej. `posts_post_type`, `post_query_orderby`, etc.).

| Control (key) | Tipo UI | Default | Condición (visibilidad) | Para qué sirve |
|---|---|---|---|---|
| `post_type` | SELECT | primer CPT público | siempre | **Source**. Opciones = CPTs públicos + `by_id` (Manual Selection) + `current_query` (Current Query). `:40-47` |
| `query_args` | TABS | — | — | Contenedor de los tabs Include / Exclude `:49-51` |
| `query_include` | TAB | — | `post_type != current_query, by_id` | Pestaña "Include" `:57-67` |
| `posts_ids` | QUERY (autocomplete `post`) | — | `post_type = by_id` | IDs seleccionados a mano (Search & Select) `:69-84` |
| `include` | SELECT2 multiple | — | `post_type != by_id, current_query` | **Include By**: `terms`, `authors` `:86-103` |
| `include_term_ids` | QUERY (autocomplete `cpt_tax`, display detailed) | — | `include = terms` | Términos a incluir `:105-126` |
| `include_authors` | QUERY (autocomplete `author`) | `[]` | `include = authors` | Autores a incluir `:128-148` |
| `query_exclude` | TAB | — | `post_type != by_id, current_query` | Pestaña "Exclude" `:150-160` |
| `exclude` | SELECT2 multiple | — | idem | **Exclude By**: `current_post`, `manual_selection`, `terms`, `authors` `:162-181` |
| `exclude_ids` | QUERY (autocomplete `post`) | — | `exclude = manual_selection` | Posts a excluir `:183-202` |
| `exclude_term_ids` | QUERY (autocomplete `cpt_tax`) | — | `exclude = terms` | Términos a excluir `:204-225` |
| `exclude_authors` | QUERY (autocomplete `author`) | — | `exclude = authors` | Autores a excluir `:227-247` |
| `avoid_duplicates` | SWITCHER | `''` | `post_type != by_id, current_query` | Evita repetir posts ya mostrados por OTRO widget de la misma página (solo frontend) `:249-262` |
| `offset` | NUMBER | `0` | idem | Saltar N posts `:264-277` |
| `select_date` | SELECT | `anytime` | idem | **Date**: `anytime / today / week / month / quarter / year / exact` `:279-301` |
| `date_before` | DATE_TIME | — | `select_date = exact` | Fecha "Before" inclusive `:303-318` |
| `date_after` | DATE_TIME | — | `select_date = exact` | Fecha "After" inclusive `:320-335` |
| `orderby` | SELECT | `post_date` | `post_type != current_query` | **Order By** (ver lista abajo) `:337-352` |
| `order` | SELECT | `desc` | `post_type != current_query` | `asc` / `desc` `:354-365` |
| `posts_per_page` | NUMBER | `3` | `post_type != current_query` | Cantidad por página `:367-374` |
| `ignore_sticky_posts` | SWITCHER | `yes` | `post_type = post` | Ignorar sticky posts `:376-384` |
| `query_id` | TEXT (dynamic activo) | `''` | siempre | ID custom para filtrar el query server-side vía hook `:386-398` |

### Lista COMPLETA de `orderby` (motor genérico, `:341-348`)
`post_date` (Date) · `post_title` (Title) · `menu_order` (Menu Order) · `modified` (Last Modified) · `comment_count` (Comment Count) · `rand` (Random).

> Nota: **price / popularity / rating NO existen en el motor genérico** — solo en WooCommerce (sección 6).

### Presets (subconjuntos de controles)
`:452-498`. Un widget elige qué bloques exponer vía `'presets' => [...]`:

- `full` → todos (ignora el resto).
- `include` → tab include + by id/terms/authors.
- `exclude` → tab exclude + by id/terms/authors.
- `advanced_exclude` → exclude + `avoid_duplicates` + `offset`.
- `date` → `select_date / date_before / date_after`.
- `pagination` → `posts_per_page / ignore_sticky_posts`.
- `order` → `orderby / order`.
- `query_id` → `query_id`.

`filter_by_presets()` (`:500-523`) arranca con TODOS los control-ids conocidos y va *quitando* los de cada preset pedido → lo que queda se hace `unset`. Es decir, pedir `['include','date']` deja visibles include+date y oculta el resto.

`prepare_fields()` (`:525-546`) inyecta dinámicamente las opciones de `post_type` con `Utils::get_public_post_types()` y setea `object_type` de `posts_ids`.

## 1.2 `Group_Control_Related` (`related-query`)
`controls/group-control-related.php`. Hereda de Query y agrega el source **`related`** (`:31`) + estos controles:

- `related_taxonomies` (SELECT2 multiple) — taxonomías por las que se relaciona, visible si `post_type=related & include=terms` (`:39-53`).
- `related_fallback` (SELECT) — `fallback_none / fallback_by_id (Manual) / fallback_recent (Recent Posts)` (`:55-69`).
- `fallback_ids` (QUERY autocomplete post) — visible si `related_fallback=fallback_by_id` (`:71-85`).

Preset extra `related` = `[related_fallback, fallback_ids]` (`:115-121`).

## 1.3 `Group_Control_Taxonomy` (`taxonomy-query`)
`controls/group-control-taxonomy.php`. Hereda de Query e inserta antes de `query_args` un control **`filter_by`** = `show_all` / `manual_selection` (`:20-30`). Se usa para loops de TÉRMINOS (taxonomy loop), no de posts.

## 1.4 Controles base
- `Query` (`controls/query.php`) — extiende `Control_Select2`. Es el `QUERY_CONTROL_ID = 'query'`. Soporta `autocomplete` (búsqueda AJAX) y mapeo de IDs al importar (`on_import_update_settings`).
- `Template_Query` (`controls/template-query.php`) — Select2 + botones New/Edit template. Usado por Loop Grid para elegir el template del item (`CONTROL_ID = 'template_query'`).

## 1.5 Autocomplete / búsqueda AJAX (Search & Select)
`module.php`. Objetos soportados (`:34-43`): `post`, `tax`, `author`, `user`, `library_template`, `attachment`, `cpt_tax` (resuelto en JS→tax), `js`.

Formato del control (`:158-203`):
```php
'autocomplete' => [
  'object'  => 'post|tax|user|library_template|attachment|js', // requerido
  'display' => 'minimal|detailed|<filtro_custom>',
  'by_field'=> 'term_taxonomy_id|term_id',  // solo tax
  'query'   => [ /* args pasados tal cual a WP_Query/get_terms/WP_User_Query */ ],
]
```
- AJAX actions registradas (`:1012-1020`): `pro_panel_posts_control_filter_autocomplete` → `ajax_posts_filter_autocomplete` (`:554`), `query_control_value_titles` → `ajax_posts_control_value_titles` (`:724`, para repintar labels de IDs ya guardados).
- Seguridad: `verify_user_access_for_editing()` (`:540`) + `Access_Control::user_can_edit()` por post.

## 1.6 `Elementor_Post_Query` — TRADUCCIÓN opción → `WP_Query` (el corazón)

`classes/elementor-post-query.php`. Wrapper de WP_Query. Constructor recibe `($widget, $group_query_name, $query_args)` y mergea settings del widget con defaults (`:28-37`).

Flujo `get_query()` (`:48-90`):
1. `get_query_args()` arma el array.
2. Si hay `query_id` → engancha `pre_get_posts` para disparar `do_action("elementor/query/{$query_id}")` (`:386-410`).
3. Si NO es manual y `offset>0` → engancha `fix_query_offset` + `fix_query_found_posts` (workaround del bug WP de offset+paginación, `:415-439`).
4. `new \WP_Query($args)`.
5. Registra los IDs mostrados en `Module::add_to_avoid_list()` (para avoid_duplicates global).
6. `do_action('elementor/query/query_results', $query, $widget)`.

`get_query_args()` (`:105-159`):
- Si `post_type=current_query` → devuelve `$GLOBALS['wp_query']->query_vars` (con soporte de `paged` custom para ajax), filtrable por `elementor/query/get_query_args/current_query`.
- Si no, llama en orden: `set_common_args / set_order_args / set_pagination_args / set_post_include_args`, y si NO es manual: `set_post_exclude_args / set_avoid_duplicates / set_terms_args / set_author_args / set_date_args`.
- Antes de devolver: `apply_filters('elementor/query/query_args', $args, $widget)` ← **aquí engancha el Loop Filter** (sección 5).

### Mapeo concreto opción → arg WP_Query

| Setting Elementor | Arg WP_Query resultante | Ref |
|---|---|---|
| (siempre) | `post_status = 'publish'` | `:168` |
| `post_type = by_id` | `post_type = [todos los CPT públicos]` + `post__in = posts_ids` (si vacío → `[0]`) + `ignore_sticky_posts=true` | `:170-191` |
| `post_type = <cpt>` | `post_type = <cpt>` | `:174` |
| `posts_per_page` | `posts_per_page` | `:162` |
| `ignore_sticky_posts` (switch) | `ignore_sticky_posts` (bool) | `:163-164` |
| `orderby` + `order` | `orderby`, `order` | `:310-316` |
| `exclude=current_post` | `post__not_in[] = get_queried_object_id()` (si singular) | `:207-211` |
| `exclude=manual_selection` | `post__not_in += exclude_ids` | `:213-216` |
| `avoid_duplicates=yes` | `post__not_in += Module::$displayed_ids` | `:221-227` |
| `include=terms` + `include_term_ids` | `tax_query[] = {taxonomy, field:term_taxonomy_id, terms}` | `:238-263` |
| `exclude=terms` + `exclude_term_ids` | `tax_query[] = {..., operator:'NOT IN'}` | `:242-263` |
| `include=authors` + `include_authors` | `author__in` | `:294-299` |
| `exclude=authors` + `exclude_authors` | `author__not_in` (solo si no hay author__in) | `:301-307` |
| `select_date=today/week/month/quarter/year` | `date_query['after'] = '-1 day' / '-1 week' / '-1 month' / '-3 month' / '-1 year'` | `:323-338` |
| `select_date=exact` | `date_query = {after, before, inclusive:true}` | `:339-349` |
| `offset>0` | se aplica vía `fix_query_offset` (paged: `offset + (paged-1)*per_page`) | `:415-423` |

> Detalle importante de términos: los `term_ids` guardados son **`term_taxonomy_id`**; en include re-busca con `get_term_by('term_taxonomy_id', $id)` para agrupar por taxonomía (`:256-262`). El tax_query múltiple usa `relation = 'AND'` entre bloques (`:286-291`).

### `Elementor_Related_Query` (`classes/elementor-related-query.php`)
- `set_common_args()` fuerza `post_type = get_post_type(post_actual)` y guarda `related_post_id` (`:84-89`).
- `build_terms_query_include()` arma el tax_query con los términos del POST ACTUAL en `related_taxonomies` (`wp_get_post_terms(...,'tt_ids')`) (`:101-124`).
- `set_author_args()` usa el autor del post actual (`:126-132`).
- Si el query no devuelve nada y hay fallback válido → corre un segundo WP_Query con `fallback_args` (recent posts o ids manuales con `orderby=rand`), filtrable por `elementor/query/fallback_query_args` (`:34-61`, `:156-168`).

### Hooks de extensión del query (clave para replicar)
- `elementor/query/query_args` — modificar args antes del WP_Query (lo usa Loop Filter).
- `elementor/query/get_query_args/current_query` — modificar vars del current query.
- `elementor/query/{$query_id}` — filtrar un query puntual por su Query ID (vía `pre_get_posts`).
- `elementor/query/query_results` — post-proceso de resultados.
- `elementor/query/fallback_query_args` — args del fallback (related).

---

# 2. WIDGET POSTS / ARCHIVE

Módulo `modules/posts/`. `Posts_Base` (abstracta) → `Posts` (widget `posts`) y `Portfolio`.

## 2.1 Estructura
- `Posts` (`widgets/posts.php`) registra: layout (vacío, lo llenan skins) + `section_query` (`Group_Control_Related` preset `full`, excluyendo `posts_per_page` que va en el skin) + pagination (`:61-133`).
- `query_posts()` (`:81-91`) crea el query:
```php
$query_args = [
  'posts_per_page' => $this->get_posts_per_page_value(),   // viene del skin
  'paged'          => $this->get_current_page(),
  'has_custom_pagination' => $this->is_allow_to_use_custom_page_option(),
];
$this->query = Module_Query::instance()->get_query( $this, $this->get_query_name(), $query_args, [] );
```
- `Module::get_query()` (`module.php:998-1007`) decide: si `post_type=related` → `Elementor_Related_Query`, si no → `Elementor_Post_Query`.

## 2.2 Skins
Registradas en `posts.php:55-59`: **Classic**, **Cards**, **Full Content**.
- `Skin_Base` (`skins/skin-base.php`) define TODOS los controles compartidos: columnas (1-6, responsive `:187-208`), `posts_per_page` (`:210-219`), thumbnail (posición top/left/right/none, masonry, image size, ratio, width `:63-185`), título (+tag h1..p), excerpt (+length +apply_to_custom_excerpt), read more (+text +alineación auto), meta_data (SELECT2: author/date/time/comments/modified `:373-391`), link new tab, y todo el tab Style.
- `render()` (`:907-938`): llama `query_posts()`, si no hay posts → `handle_no_posts_found()`; si el query ya está "in_the_loop" (theme) pinta directo; si no, `while(have_posts){the_post(); render_post();}` + `wp_reset_postdata()`.
- `render_post()` (`:1405-1415`): header `<article role="listitem">` + thumbnail + título + meta + excerpt + read more.
- `Skin_Classic` (`skin-classic.php`) agrega tab Style "Box" (borde, radius, padding, sombra, bg hover).
- `Skin_Cards` extiende Classic con card UI (badge avatar). `Skin_Full_Content` extiende Classic + `Skin_Content_Base` y usa `the_content()` en vez de excerpt (`skin-full-content.php` es un wrapper de 14 líneas).

## 2.3 Paginación + Load More
`pagination_type` opciones (`posts-base.php:875-884`): `'' (None) / numbers / prev_next / numbers_and_prev_next / load_more_on_click (Load on Click) / load_more_infinite_scroll (Infinite Scroll)`.

- `pagination_page_limit` (default 5), `pagination_numbers_shorten`, `pagination_prev_label`/`next_label` (dynamic), `pagination_align`, `pagination_individual_handle` (paginar varios widgets por separado vía `e-page-{id}` en la URL), `load_more_spinner` (icono).
- Render footer (`skin-base.php:1128-1242`): si es ajax pagination renderiza ancla `.e-load-more-anchor` con `data-page / data-max-page / data-next-page` + botón "Load More" + mensaje "no more posts". Si es numbers usa `paginate_links()`. Prev/Next via `get_posts_nav_link()`.
- `get_current_page()` (`:666-677`): `max(1, paged, page, $_GET['e-page-{id}'])`.
- Construcción de URLs paginadas: `get_wp_link_page()` (`:687-740`) — maneja singular, REST request, custom page option, preview, y arrastre de filtros `e-filter-*`.
- `Pagination_Trait` (`traits/pagination-trait.php`): `get_base_url()` resuelve la URL base según contexto (page/single/year/month/category/author/search/archive/CPT/posts_page) (`:95-130`); `is_valid_pagination()` valida que un widget paginado exista en el contenido para esa página.

---

# 3. LOOP BUILDER / LOOP GRID

Módulo `modules/loop-builder/`. Idea: en vez de markup fijo por item (como Posts skins), se diseña un **template "Loop Item"** y se repite por cada resultado del query.

## 3.1 El documento "Loop Item"
`documents/loop.php` — CPT `elementor_library` con `DOCUMENT_TYPE='loop-item'`, extiende `Theme_Document`.
- `source` (post meta `_elementor_source`): por defecto `post`; el LoopBuilder module agrega `post_taxonomy` (Post Taxonomy) y WooCommerce agrega `product` (`module.php:316-343`, `:107-110`).
- Sección Query del documento (`:346-394`): control `source` (Posts / Post Taxonomy / Product…) + botón Apply. Esto define qué widgets recomendados se muestran al editar el item (`RECOMMENDED_POSTS_WIDGET_NAMES`, `:29-35`).
- `get_container_attributes()` (`:100-111`): cada item se envuelve con clases `e-loop-item e-loop-item-{id}` + `get_post_class()`.
- Preview: `preview_type` / `preview_id` permiten ver el template con un post/term concreto en el editor (`:439-542`).

## 3.2 Widgets Loop
`widgets/base.php` (`Base extends Posts`) → `Loop_Grid` y `Loop_Carousel`.
- `get_query_name()` (`base.php:32-35`): `"{skin}_query"` (ej. `post_query`) — el query usa el skin como prefijo.
- `query_posts()` (`:47-59`): delega al skin (`$skin->query_posts()`); si el skin no devuelve query, cae al `parent::query_posts()`.
- `register_controls()` (`:79-101`): layout + query (secciones vacías que llenan los skins) + carousel + pagination + additional + design. Renombra `_skin` a "Choose template type" (el skin = fuente de contenido del loop).
- Pagination del Loop agrega sobre el de Posts (`:174-343`): `load_more_button_align`, `pagination_load_type` (`page_reload` / `ajax`), `auto_scroll` + `auto_scroll_offset`. Labels Prev/Next limpios.

### `Loop_Grid` (`widgets/loop-grid.php`)
- Layout: `template_id` (Template_Query — elige el Loop Item, con autocomplete sobre `library_template` filtrado por `meta_query` type=loop-item, `:158-190`), `columns` (NUMBER 1-12, var CSS `--grid-columns`), `posts_per_page` (Items Per Page, default 6), `masonry`, `equal_height`.
- **Alternate templates** (`:133-328`): repeater `alternate_templates` con `template_id` + `repeat_template` (cada cuántos items), `show_once`, `column_span` (1-12, `grid-column: span`), `static_position`. Permite mezclar varios templates en la grilla.
- Additional Options (`:345-437`): "Nothing Found Message" (switch + texto dynamic + alineación + tag).

### Skin del Loop
`skins/skin-loop-base.php` (`Skin_Loop_Base extends Posts\Skin_Base`):
- `register_query_controls()` (`:51-68`): inyecta `Group_Control_Related` preset `full` en la sección Query (mismo query control que Posts) bajo el name `Module::QUERY_ID='query'`.
- `query_posts()` (`:82-84`) → `query_posts_for_alternate_templates()` (trait) que respeta los templates alternos.
- `render()` (`:115-142`): si hay `template_id`, encola el CSS meta del Loop Item, y por cada post llama `render_post()`.
- `render_post()` (`:201-221`): en vez de markup de Posts, hace `$document = documents->get($template_id); $document->print_content();` — **ESTO es "repetir el template por cada item"**. El `the_post()` del while (heredado de Posts skin-base `render()`) setea el post global, y `print_content()` renderiza el Loop Item con los dynamic tags resolviéndose contra ese post.
- `skin-loop-post.php` (skin `post`), `skin-loop-post-taxonomy.php` (skin `post_taxonomy`, itera TÉRMINOS via `Taxonomy_Loop_Provider`).

## 3.3 Loop Carousel
`widgets/loop-carousel.php` — mismo motor de query/template pero render en Swiper.

---

# 4. COLLECTION LOOP (v4 / Atomic — experimental)

Módulo `modules/collection-loop/`. **Experimento oculto** (`e_pro_collection_loop`, requiere `Atomic Widgets`), `release_status=dev` (`module.php:25-34`). Es la reescritura del loop para el editor v4 (atomic widgets, render por Twig).

- `Collection_Loop` (`elements/collection-loop/collection-loop.php`) — `Atomic_Element_Base`, type `e-collection-loop`.
  - Props schema (`:62-72`): `source` (`post` / `page`), `posts_per_page` (1-100, default 3).
  - `define_render_context()` (`:108-127`): crea un `\WP_Query(['post_type'=>source,'posts_per_page'=>N,'post_status'=>'publish'])` y lo expone como contexto `query` + `has_items`.
  - Hijos por defecto: `Collection_Loop_Layout` → `Collection_Loop_Item` → `Atomic_Heading`.
- Iteración: `traits/has-loop-iteration.php` — `render_children_for_loop()` (`:27-57`): toma el primer hijo como template, `while(have_posts){the_post(); ob + print_element()}`, `wp_reset_postdata()`. (MVP: solo el primer hijo se repite; alternancia es ticket futuro.)

> Diferencia con Loop Builder: Collection Loop arma el WP_Query **inline en el elemento** (sin Group_Control_Query, sin include/exclude/order todavía) y repite un **hijo atómico** vía Twig, no un documento template. Es estado embrionario; el motor "completo" sigue siendo Loop Builder.

---

# 5. LOOP FILTER (Taxonomy Filter)

Módulo `modules/loop-filter/`. Widget `Taxonomy_Filter` que filtra un Loop Grid por términos, vía query-string + hook.

## 5.1 Widget
`widgets/taxonomy-filter.php`:
- `selected_element` (SELECT) — qué Loop Grid se filtra (`:73-84`).
- `taxonomy` (SELECT) — taxonomía a filtrar (poblada por AJAX según el CPT del loop, `module.php:62-76`).
- `multiple_selection` (switch) + `logical_combination` (`AND` / `OR`) (`:295-323`).
- `show_empty_items`, `show_child_taxonomy` + `child_taxonomy_depth` (1-6), `show_first_item` + `first_item_title` ("All"), `number_of_taxonomies`, `horizontal_scroll` (`:333-434`).
- Render (`:749-815`): pinta `<search>` con `<button class="e-filter-item" data-filter="{slug}" aria-pressed=...>`. El botón "All" usa `data-filter="__all"`. Cada botón excluido según los include/exclude del propio Loop Grid (`is_term_excluded_by_query_control`, `:740-747`).

## 5.2 Cómo se conecta al query (server-side)
`module.php`:
- En el constructor (`:393-412`) registra `add_filter('elementor/query/query_args', [$this,'filter_loop_query'], 10, 2)`. Ese es el MISMO hook que `Elementor_Post_Query` aplica antes de crear el WP_Query.
- `maybe_populate_filters_from_query_string()` (`:199-233`): parsea params de la URL con regex `^e-filter-[a-z0-9]{7}-[taxonomy]$` (`:171-197`). Ej: `?e-filter-389c132-product_cat=ofertas~promos`. El `389c132` es el ID del widget (7 chars), el sufijo la taxonomía.
- Separadores lógicos (`query/data/query-constants.php`): **AND** = `+` (browser lo manda como espacio), **OR** = `~`, **NOT** = `!`. Cada uno mapea a `operator` (AND/IN/NOT IN) + `relation` (AND/OR).
- `filter_loop_query()` (`:94-130`): por cada filtro del widget arma el `tax_query` via `Taxonomy_Query_Builder` y lo mergea en `$query_args['tax_query']`.
- `Taxonomy_Query_Builder` (`query/taxonomy-query-builder.php`): resuelve jerarquía de términos (hijos) y compone single vs multiple (`Single_Terms_Query` / `Hierarchy_And_Query` / `Hierarchy_Or_Query`).
- AJAX: `data/endpoints/refresh-loop.php` re-renderiza la grilla sin recargar (load_type=ajax). REST nonce `wp_rest` en `add_localize_data` (`:146-155`).

> Para replicar: el filtro de catálogo es **estado en la URL** (`?e-filter-...=a~b`) → backend lo traduce a un `tax_query`. Modelo limpio para una API REST de catálogo.

---

# 6. WOOCOMMERCE — query de PRODUCTOS

Módulo `modules/woocommerce/`. Reusa `Group_Control_Query` pero arma los args con WooCommerce.

## 6.1 Controles específicos de producto
`traits/products-trait.php` — `get_query_fields_options()` (`:51-91`) sobreescribe opciones del Group_Control_Query:

**Source (`post_type`) para productos** (`:53-65`):
`current_query` (Current Query) · `product` (Latest Products) · `sale` (Sale) · `featured` (Featured) · `by_id` (Manual Selection) · `related_products` (Related) · `upsells` (Upsells) · `cross_sells` (Cross-Sells).

**Order By para productos** (`:66-77`):
`date` · `title` · `price` · `popularity` · `rating` · `rand` · `menu_order`.

Presets usados: `['include','exclude','order']` (`:106`). Oculta authors/offset/avoid_duplicates/date/etc. (`:19-34`, `:108-118`). Include/Exclude solo `terms` (no authors).

## 6.2 Traducción producto → args (`classes/products-renderer.php`)
`parse_query_args()` (`:49-120`). Diferencias clave vs motor genérico:

| Setting | Arg | Ref |
|---|---|---|
| base | `post_type='product'`, `post_status='publish'`, `ignore_sticky_posts=true`, `meta_query = WC()->query->get_meta_query()` | `:52-62` |
| `orderby` price/popularity/rating | `meta_key` + `orderby='meta_value_num'` | `:77-84`, `:122-137` |
| `orderby=price` | `meta_key = '_price'` | `:128-129` |
| `orderby=rating` | `meta_key = '_wc_average_rating'` | `:130-131` |
| `orderby=popularity` | `meta_key = 'total_sales'` | `:132-133` |
| `post_type=featured` | `tax_query[] = product_visibility / featured` | `:202-214` |
| `post_type=sale` | ids on-sale (WC) en `post__in` | `:216-222` |
| `post_type=related/upsells/cross_sells` | `post__in` calculado via `wc_get_related_products` / `get_upsell_ids` / cart cross-sells; `post_type=[product, product_variation]` | `:224-266` |
| `post_type=by_id` | `post__in = posts_ids` | `:139-160` |
| `include=terms` | `tax_query[]` por `term_taxonomy_id` | `:162-190` |
| `exclude` current/manual/terms | `post__not_in` / tax NOT IN | `:268-315` |
| paginación | `paged` desde `paged`/`page`/`$_GET['product-page']` | `:317-342` |
| siempre | `fields='ids'` + filtro `woocommerce_shortcode_products_query` | `:114-119` |

> Para Farmatotal: el query de productos es esencialmente WP_Query con `meta_key`/`meta_value_num` para precio/ventas/rating + `tax_query` por `product_cat`/`product_visibility`. Replicable 1:1 en SQL/ORM.

---

# 7. DYNAMIC TAGS

Módulo `modules/dynamic-tags/`. Permite que el VALOR de un control sea dinámico (campo del post/usuario/sitio/ACF…) que se resuelve en render.

> IMPORTANTE: la **clase base** (`Elementor\Core\DynamicTags\Tag` / `Data_Tag`) y el **Module base** (`Elementor\Modules\DynamicTags\Module` — con las constantes de categorías `TEXT_CATEGORY`, `URL_CATEGORY`, etc., y el mecanismo de serialización `[elementor-tag ...]` → resolución en render) viven en **Elementor FREE core**, que NO está en este repo (solo está `elementor-pro`). Acá se documenta el lado Pro; la resolución a nivel core se marca explícitamente.

## 7.1 Clases base (lado Pro)
`tags/base/`:
- `Tag` (`tag.php`) = `extends \Elementor\Core\DynamicTags\Tag` + `Tag_Trait` + `On_Import_Trait`. Para tags que hacen `echo` en `render()` (texto).
- `Data_Tag` (`data-tag.php`) = `extends \Elementor\Core\DynamicTags\Data_Tag` + `Tag_Trait`. Para tags que devuelven un VALOR estructurado vía `get_value(array $options)` (imágenes, URLs, colores) — no imprimen, devuelven data que el control consume.
- `Pro_Tag` / `Pro_Data_Tag` = base + `License_Meta_Trait` (chequea licencia, `:13-15`).
- `Tag_Trait` (`tag-trait.php`): `is_editable()` (licencia activa), helpers para taxonomy loop (`render_taxonomy_content_by_key`, lee `$wp_query->loop_term`).

## 7.2 Anatomía de un Tag (ejemplos reales)
**Tag de texto** — `tags/post-title.php`:
```php
class Post_Title extends Pro_Tag {
  public function get_name()  { return 'post-title'; }
  public function get_title() { return esc_html__('Post Title','elementor-pro'); }
  public function get_group() { return Module::POST_GROUP; }        // agrupación en el dropdown
  public function get_categories() { return [ Module::TEXT_CATEGORY ]; } // a qué controles aplica
  public function render() { echo wp_kses_post( get_the_title() ); }     // se resuelve EN RENDER
}
```
**Data tag** — `tags/post-featured-image.php` (`Pro_Data_Tag`):
```php
public function get_categories() { return [ Module::IMAGE_CATEGORY, Module::MEDIA_CATEGORY ]; }
public function get_value( array $options = [] ) {
  $id = get_post_thumbnail_id();
  return $id ? ['id'=>$id,'url'=>wp_get_attachment_image_src($id,'full')[0]]
             : $this->get_settings('fallback');   // control 'fallback' tipo MEDIA
}
protected function register_controls() { $this->add_control('fallback',['type'=>Controls_Manager::MEDIA]); }
```
**Tag con controles + opciones** — `tags/post-custom-field.php` (meta/ACF, `:50-122`): control `key` (SELECT con `get_post_custom_keys()`) + `custom_key` (TEXT), `is_settings_required()=true`, `render()` hace `get_post_meta(get_the_ID(), $key, true)`.

## 7.3 Registro de tags
`module.php`:
- `get_tag_classes_names()` (`:94-142`): array de nombres de clase que el core instancia. Gated por licencia (`API::is_licence_has_feature`).
- `get_groups()` (`:144-171`): grupos del dropdown — `post / archive / site / media / action / author / comments / woocommerce` (constantes `:17-31`).
- Componentes externos condicionales (`:41-54`): `acf` (si existe ACF), `toolset`, `pods` — cada uno aporta sus propios tags.

### Lista COMPLETA de tags que trae Pro (`:98-138` + carpeta `tags/`)
**Post**: Post Title, Post Excerpt, Post Content (via theme), Post Date, Post Time, Post ID, Post URL, Post Terms, Post Featured Image, Post Gallery, Post Custom Field (requiere feature ACF), Featured Image Data.
**Archive**: Archive Title, Archive Description, Archive Meta, Archive URL.
**Author**: Author Name, Author URL, Author Info, Author Meta, Author Profile Picture.
**Comments**: Comments Number, Comments URL.
**Site**: Site Title, Site Tagline, Site Logo, Site URL, Page Title.
**Media/Action/otros**: Internal URL, Current Date Time, Request Parameter, Shortcode, Lightbox, Contact URL, Reload Page, User Info, User Profile Picture.
**Integraciones**: ACF (Text, Image, URL, Gallery, File, Number, Color, Date Time), Pods (Text, Numeric, Image, Gallery, URL, Date, Date Time), Toolset (Text, Image, URL, Gallery, Date).

## 7.4 Cómo un control acepta valor dinámico
Cualquier control con:
```php
'dynamic' => [ 'active' => true ],
```
muestra el icono de "tag dinámico". Ejemplos en el repo: `query_id` (`group-control-query.php:395-397`), `read_more_text` (`skin-base.php:317-319`), `pagination_prev_label`, `nothing_found_message_text`, `first_item_title`, etc.

**Categorías** (`get_categories()` del tag) = el filtro de compatibilidad: un control de texto solo ofrece tags con `TEXT_CATEGORY`; un control MEDIA solo tags `MEDIA_CATEGORY`/`IMAGE_CATEGORY`; un control URL solo `URL_CATEGORY`; etc. Las constantes están en el core free.

## 7.5 Serialización y resolución (a nivel core free)
- En el settings del widget, un valor dinámico se guarda como un **shortcode interno**: `[elementor-tag id="..." name="post-title" settings="..."]` dentro de `__dynamic__`. (Mecanismo en `Elementor\Modules\DynamicTags\Module` — **core free, no en este repo**.)
- En render, el core parsea ese shortcode, instancia la clase del tag y llama `render()` (tags texto) o `get_value()` (data tags). Por eso `render()`/`get_value()` usan funciones WP del loop actual (`get_the_title()`, `get_post_meta(get_the_ID())`) — se resuelven contra el post global vigente (de ahí que en un Loop, cada item resuelve sus propios tags).

## 7.6 ACF (integración meta — relevante para campos custom)
`acf/module.php` + `acf/tags/`:
- `get_control_options($types)` (`:114-193`): recorre `acf_get_field_groups()` y arma el SELECT `key` agrupado por grupo ACF; el value es `"{field_key}:{field_name}"` (u `"options:{name}"` para options pages) (`:160-189`).
- `get_tag_value_field($tag)` (`:220-231`): resuelve el valor vía `Dynamic_Value_Provider->get_value($key)`.
- Tags ACF (`:206-217`): por TIPO de campo (Text, Image, URL, Gallery, File, Number, Color, Date Time) — cada uno declara `get_supported_fields()` para filtrar qué campos ACF aparecen.

---

# 8. MAPEO "Elementor → API REST" (para la plataforma propia)

Modelo sugerido: el "query builder" se serializa como JSON y un endpoint lo traduce a SQL/ORM. Equivalencias directas:

| Concepto Elementor | Param API REST sugerido | Notas |
|---|---|---|
| `post_type` (source) | `source` / `type` | `posts` \| `manual` (by_id) \| `current` \| `related` \| (WC) `latest/sale/featured/related/upsells` |
| `posts_ids` (manual) | `ids[]` | → `WHERE id IN (...)` |
| `posts_per_page` | `per_page` / `limit` | |
| `offset` | `offset` | |
| `paged` | `page` | offset = (page-1)*per_page |
| `orderby` + `order` | `sort=field:dir` | `date,title,menu_order,modified,comment_count,rand` (+WC `price,popularity,rating`) |
| WC price/popularity/rating | `sort=price:asc` etc. | mapear a columnas: price→`_price`, popularity→`total_sales`, rating→`_wc_average_rating` |
| `include=terms` + `include_term_ids` | `filters[taxonomy][]=termId` (`op=IN`) | → join con tabla término |
| `exclude=terms` + `exclude_term_ids` | `filters[taxonomy][]=-termId` (`op=NOT IN`) | |
| `include=authors` | `author[]=id` | |
| `exclude=current_post` | flag `exclude_current` | excluye el id del contexto |
| `avoid_duplicates` | flag `dedupe` | requiere estado de "ya mostrados" por request |
| `select_date` / date_before/after | `date_from` / `date_to` o `date_range=week\|month...` | |
| `ignore_sticky_posts` | `ignore_sticky` | |
| `query_id` | `query_id` | hook para override server-side (multi-tenant / reglas) |
| Loop template (`template_id`) | `template` | el render del item se hace con un template/componente por fila |
| Loop Filter (`?e-filter-{wid}-{tax}=a~b`) | `?filter[tax]=a,b&logic=or` | estado de catálogo en la URL → `tax_query`; separadores AND=`+`/`,`, OR=`~`, NOT=`!` |
| Dynamic tag en un campo | `{{field.path}}` / token | el valor de un campo se resuelve contra el item del loop en render |
| Categorías de tag (text/url/media) | `tagType` | restringe qué tokens aplican a cada tipo de campo |
| Data tag (`get_value` → {id,url}) | resolver que devuelve objeto, no string | para imágenes/links: el campo recibe estructura, no texto |

**Patrón de arquitectura a copiar**:
1. Separar **definición del query** (JSON de controles) de la **ejecución** (constructor que arma la consulta) — exactamente `Group_Control_Query` (UI) vs `Elementor_Post_Query` (motor).
2. Un único hook/middleware sobre los args finales (`elementor/query/query_args`) donde se enchufan filtros (catálogo, multi-tenant, permisos) — clave para que el Loop Filter funcione sin tocar el widget.
3. Render del item = template reusable + tokens dinámicos resueltos contra el row actual del loop.
4. Filtros de catálogo = estado en la URL → traducción a `tax_query`/WHERE (stateless, cacheable, compartible).

---

## Apéndice — archivos fuente leídos
```
query-control/controls/group-control-query.php   (controles + presets)
query-control/controls/group-control-posts.php    (deprecado, build_query_args legacy)
query-control/controls/group-control-related.php
query-control/controls/group-control-taxonomy.php
query-control/controls/query.php  /  template-query.php
query-control/classes/elementor-post-query.php     (motor WP_Query)
query-control/classes/elementor-related-query.php
query-control/module.php                            (autocomplete AJAX, get_query)
posts/widgets/posts-base.php  /  posts.php
posts/skins/skin-base.php / skin-classic.php / skin-full-content.php
posts/traits/pagination-trait.php
loop-builder/module.php / documents/loop.php
loop-builder/widgets/base.php / loop-grid.php
loop-builder/skins/skin-loop-base.php
collection-loop/module.php / elements/collection-loop/collection-loop.php
collection-loop/traits/has-loop-iteration.php
loop-filter/module.php / widgets/taxonomy-filter.php
loop-filter/query/taxonomy-query-builder.php / data/query-constants.php
dynamic-tags/module.php / tags/base/*.php
dynamic-tags/tags/post-title.php / post-featured-image.php / post-custom-field.php
dynamic-tags/acf/module.php / tags/base-acf-tag.php
woocommerce/traits/products-trait.php
woocommerce/classes/products-renderer.php
```
