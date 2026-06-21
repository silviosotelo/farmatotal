# Elementor Pro — Widgets interactivos, comercio y efectos configurables

> Documento 05 de la serie de research de Elementor Pro.
> Codebase analizado: `C:\Users\sotelos\Downloads\Elementor\elementor-pro\modules\`
> Todas las refs son `archivo:línea` relativas a `modules/` salvo que se indique lo contrario.
> Foco: **Forms**, **WooCommerce**, **Motion FX / Interactions / Transitions / Page Transitions**, **Popup**, y resto de widgets ricos (Sticky, Off-Canvas, Scroll-Snap, Hotspot, Countdown, Slides, Carousels).

---

## Índice

1. [Forms — form builder, campos, actions-after-submit, validación y submit AJAX](#1-forms)
2. [WooCommerce — widgets, query de productos, single/archive/cart/checkout](#2-woocommerce)
3. [Motion FX / Interactions / Transitions / Page Transitions](#3-efectos)
4. [Popup — triggers, conditions, advanced rules](#4-popup)
5. [Resto de widgets interactivos (Sticky, Off-Canvas, Scroll-Snap, Hotspot, Countdown, Slides, Carousels)](#5-resto)
6. [Apuntes para la plataforma propia](#6-apuntes)

---

<a name="1-forms"></a>
## 1. Forms

Ruta base: `modules/forms/`.

### 1.1 Bootstrap del módulo — `module.php`

`class Module extends Module_Base` (trait `Editor_One_Trait`).

- `get_name()` → `'forms'` (`module.php:49`). `get_widgets()` mapea `['form'=>'Form','login'=>'Login']` filtrado por licencia (`module.php:44-55`).
- Registra los dos controls custom (repeaters) en el hook `elementor/controls/register`: `Fields_Repeater` y `Fields_Map` (`module.php:112-115`, enganchado en `module.php:228`).
- Instancia componentes de seguridad en el constructor: `recaptcha`, `recaptcha_v3`, `honeypot` siempre; `akismet` si `class_exists('\Akismet')` + licencia (`module.php:231-238`).
- Registrars: `actions_registrar = new Form_Actions_Registrar()` y `fields_registrar = new Form_Fields_Registrar()` (`module.php:269-270`).
- Acciones "manuales" (no vía `submit_actions`): `activity_log` y `cf7db` se ejecutan aparte en el Ajax_Handler (`module.php:275-282`).
- Si `Ajax_Handler::is_form_submitted()`, añade el componente `ajax_handler` y dispara `do_action('elementor_pro/forms/form_submitted', $this)` (`module.php:285-299`).
- AJAX del panel del editor: `pro_forms_panel_action_data` → `forms_panel_action_data()` → delega en `$integration->handle_panel_request($data)` (`module.php:123-138`, `179-181`). Sirve las listas/campos de los CRM al editor.

### 1.2 El form builder — `widgets/form.php`

**Catálogo de tipos nativos del widget** (`form.php:111-128`):

```php
$field_types = [
    'text','email','textarea','url','tel','radio','select','checkbox',
    'acceptance','number','date','time','upload','password','html','hidden'
];
$field_types = apply_filters( 'elementor_pro/forms/field_types', $field_types ); // form.php:143
```

El filtro `elementor_pro/forms/field_types` es el punto por el que cada `Field_Base`, Honeypot y reCAPTCHA inyectan su tipo en el `<select>`.

**El repeater `form_fields`** se construye con `new Repeater()` (`form.php:109`) con dos tabs (`start_controls_tabs('form_fields_tabs')`, `form.php:145`):

Tab **Content** (`form_fields_content_tab`):

| Control | Tipo | Ref |
|---|---|---|
| `field_type` | SELECT (opciones `$field_types`, default `text`) | `form.php:151-159` |
| `field_label` | TEXT (dynamic) | `form.php:161-171` |
| `placeholder` | TEXT, cond. `field_type in [tel,text,email,textarea,number,url,password]` | `form.php:173-200` |
| `required` | SWITCHER `return_value='true'`, cond. excluye `[checkbox,recaptcha,recaptcha_v3,hidden,html,step]` | `form.php:202-226` |
| `field_options` | TEXTAREA (`label\|value` por líneas), cond. `select/checkbox/radio` | `form.php:228-249` |
| `allow_multiple` | SWITCHER (solo `select`) | `form.php:251-266` |
| `select_size` | NUMBER (select+allow_multiple) | `form.php:268-288` |
| `inline_list` | SWITCHER `return_value='elementor-subgroup-inline'` (checkbox/radio) | `form.php:290-310` |
| `field_html` | TEXTAREA (solo `html`) | `form.php:312-329` |
| `width` | SELECT responsive (100..20%), default `100` | `form.php:331-367` |
| `rows` | NUMBER default 4 (textarea) | `form.php:369-384` |
| `recaptcha_size/style/badge` | SELECT | `form.php:386-447` |
| `css_classes` | HIDDEN | `form.php:449-457` |

Tab **Advanced** (`form_fields_advanced_tab`, cond. `field_type!=html`, `form.php:461-469`):

| Control | Tipo | Ref |
|---|---|---|
| `field_value` | TEXT (valor por defecto, dynamic) | `form.php:471-505` |
| `custom_id` | TEXT, `required=true`, `render_type=none` → **ID interno del campo** | `form.php:507-526` |
| `shortcode` | RAW_HTML readonly `[field id="{{custom_id}}"]` | `form.php:528-537` |

El control principal se registra con el tipo del repeater custom:

```php
$this->add_control('form_fields', [
    'type'        => Fields_Repeater::CONTROL_TYPE,   // 'form-fields-repeater'
    'fields'      => $repeater->get_controls(),
    'default'     => [ name (text), email (email,required), message (textarea) ],
    'title_field' => '{{{ field_label }}}',
]); // form.php:564-598
```

Otros controls de `section_form_fields`: `form_name` (`form.php:552-562`), `input_size` (default `sm`), `show_labels` (default `true`), `mark_required`, `label_position` (HIDDEN) (`form.php:600-658`).

**Controls auxiliares** (`controls/`):
- `Fields_Repeater extends Control_Repeater`, `CONTROL_TYPE = 'form-fields-repeater'` (`fields-repeater.php:11-18`).
- `Fields_Map extends Control_Repeater`, `CONTROL_TYPE = 'fields_map'`; fuerza `render_type=none` y sub-fields `remote_id`(HIDDEN)+`local_id`(SELECT) (`fields-map.php:22-44`). Base del mapeo CRM.

### 1.3 Catálogo de field types y cómo se registran

**Clase abstracta `Field_Base`** (`fields/field-base.php`):
- Abstractos: `get_type()`, `get_name()`, `render($item,$item_index,$form)` (`field-base.php:22-39`).
- Opcionales: `validation()`, `process_field()`, `sanitize_field()`.
- El constructor engancha TODO automáticamente por tipo (`field-base.php:100-111`):

```php
add_action("elementor_pro/forms/render_field/{$type}", [$this,'field_render'],10,3);
add_action("elementor_pro/forms/validation/{$type}",   [$this,'validation'],10,3);
add_action("elementor_pro/forms/process/{$type}",      [$this,'process_field'],10,3);
add_filter('elementor_pro/forms/field_types',          [$this,'add_field_type']);
add_filter("elementor_pro/forms/sanitize/{$type}",     [$this,'sanitize_field'],10,2);
// si existe update_controls(): hook 'elementor/element/form/section_form_fields/before_section_end'
```

`inject_field_controls()` inserta controls del campo justo después del control `required` del repeater (`field-base.php:90-98`) — patrón usado por todos los campos avanzados.

Tipos custom (clases `Field_Base`, registrados por `Form_Fields_Registrar`):

| Tipo | Controls que inyecta | render | validation | sanitize |
|---|---|---|---|---|
| **Acceptance** | `acceptance_text`(TEXTAREA), `checked_by_default`(SWITCHER) (`acceptance.php:30-53`) | checkbox + label (`:59-81`) | — | — |
| **Date** | `min_date`,`max_date`,`use_native_date`; añade `date` a cond. de placeholder (`date.php:58-117`); deps `flatpickr` | input `pattern=[0-9]{4}-..`, clases `elementor-date-field`/`elementor-use-native` (`:29-47`) | — | — |
| **Number** | `field_min`,`field_max` (`number.php:50-73`) | input min/max (`:23-36`) | error fuera de rango (`:79-90`) | `intval()` (`:92-94`) |
| **Tel** | — | input `pattern=[0-9()#&+*-=.]+` (`tel.php:20-28`) | regex teléfono (`:30-37`) | — |
| **Time** | `use_native_time`; deps flatpickr (`time.php:30-70`) | input `elementor-time-field` (`:72-80`) | regex `HH:MM` (`:82-90`) | — |
| **Step** (multi-paso) | `previous_button`,`next_button`(TEXT), `selected_icon`(ICONS) (`step.php:62-128`) | `<div class=e-field-step data-*>` (`:23-48`) | — | — |
| **Upload** | `attachment_type`(link/attach/both), `file_sizes/file_types/allow_multiple_upload/max_files` (`upload.php:43-116`) | `<input type=file data-maxsize>` (`:127-149`) | tipos/tamaño/blacklist/cantidad (`:307-374`) | hereda |

Detalles de **Upload** (el más complejo): constantes `MODE_LINK/MODE_ATTACH/MODE_BOTH` (`upload.php:19-21`); blacklist de extensiones (php, exe, svg, js…) filtrable por `elementor_pro/forms/filetypes/blacklist` (`:235-298`); `process_field()` mueve el archivo a `wp-uploads/elementor/forms/` con nombre `uniqid().ext` y crea `index.php`+`.htaccess` con `Options -Indexes` y `Content-Disposition attachment` (`:436-518`). Filtros de ruta `elementor_pro/forms/upload_path|upload_url`.

**Registro vía `Form_Fields_Registrar`** (`registrars/form-fields-registrar.php`): en `init()` registra Time, Date, Tel, Number, Acceptance, Upload, Step (`:34-40`) y dispara `do_action('elementor_pro/forms/fields/register', $this)` para terceros (`:53`). Los tipos `text/email/textarea/url/radio/select/checkbox/password/html/hidden` NO son clases `Field_Base`: se renderizan inline en `Form::render()`.

### 1.4 Render del formulario — `Form::render()` y `Form_Base`

`render()` (`form.php:2311-2543`): emite `<form class="elementor-form" method="post">` con hidden `post_id`, `form_id`, `referer_title` y `queried_id` (`:2410-2420`). Itera `form_fields` y hace `switch($field_type)`: `html`→`do_shortcode`; `textarea/select/radio/checkbox`→ helpers de `Form_Base`; `text/email/url/password/hidden/search`→`<input>` inline; **default** → `do_action("elementor_pro/forms/render_field/{$field_type}", ...)` que despacha a los `Field_Base` (`:2471-2519`).

`Form_Base` (`classes/form-base.php`) aporta los helpers: `make_textarea_field`, `make_select_field` (parsea `label|value`), `make_radio_checkbox_field`, `form_fields_render_attributes()` (clases `elementor-field-group elementor-col-{width}` + responsive), y crucialmente:

```php
get_attribute_name() → form_fields[{custom_id}]   // form-base.php:261-267
get_attribute_id()   → form-field-{custom_id}
```

→ esto fija el contrato del POST: `form_fields[<custom_id>]`.

### 1.5 Widget Login — `widgets/login.php`

`extends Base_Widget`, `get_name()`→`'login'`, group `forms`. **NO usa Ajax_Handler ni Form_Record**: renderiza el formulario nativo de WP (`name="log"`, `name="pwd"`, `name="wp-submit"`, `login.php:854-883`); maneja `redirect_after_login/logout`; si `is_user_logged_in()` muestra mensaje + `wp_logout_url()` (`:910-920`).

### 1.6 Actions After Submit

**Interfaz base** — `classes/action-base.php`:

```php
abstract public function get_name();
abstract public function get_label();
abstract public function run( $record, $ajax_handler );      // ejecuta la acción
abstract public function register_settings_section( $form );  // añade controls (cond. submit_actions => get_name())
abstract public function on_export( $element );               // limpia datos sensibles al exportar
```

**Registro** — `registrars/form-actions-registrar.php` con mapa licenciable (`:19-32`):

```php
const FEATURE_NAME_CLASS_NAME_MAP = [
  'email'=>'Email','email2'=>'Email2','redirect'=>'Redirect','webhook'=>'Webhook',
  'mailchimp'=>'Mailchimp','drip'=>'Drip','activecampaign'=>'Activecampaign',
  'getresponse'=>'Getresponse','convertkit'=>'Convertkit','mailerlite'=>'Mailerlite',
  'slack'=>'Slack','discord'=>'Discord' ];
```

`init()` registra esas actions dentro del hook `elementor_pro/forms/actions/register`, dispara dicha acción para terceros, y registra **MailPoet** (`\WYSIJA`) y **MailPoet3** (`\MailPoet\API\API`) si existen (`:50-95`). En el widget, la sección "Actions After Submit" arma el SELECT2 `submit_actions` con todas las actions registradas, default `['email']` (filtrable por `elementor_pro/forms/default_submit_actions`, `form.php:867-908`), y luego llama `$action->register_settings_section($this)` por cada una (`:912-914`).

**Detalle de las actions principales:**

- **Email** (`actions/email.php`): controls `email_to/subject/content`(default `[all-fields]`)`/from/from_name/reply_to/to_cc/to_bcc/form_metadata`(date/time/page_url/user_agent/remote_ip/credit)`/content_type`(html|plain) (`:42-224`). `run()` (`:340-467`) resuelve `[field id]` shortcodes, reemplaza `[all-fields]`, arma headers, adjunta archivos (MODE_ATTACH/BOTH), `wp_mail()`, dispara `elementor_pro/forms/mail_sent`; en fallo lanza Exception + SERVER_ERROR.
- **Email2** (`actions/email2.php`): `extends Email`, `get_control_id()` añade sufijo `_2` → reutiliza todo Email con IDs distintos (segundo email).
- **Redirect** (`actions/redirect.php`): control `redirect_to` (TEXT dynamic). `run()` valida URL y hace `$ajax_handler->add_response_data('redirect_url', $url)` — el redirect lo ejecuta el JS frontend (`:68-78`).
- **Webhook** (`actions/webhook.php`): `webhooks`(URL) + `webhooks_advanced_data`(SWITCHER). `run()` (`:66-122`): body simple (`get_formatted_data(true)`+form_id/name) o avanzado (`form/fields/meta`); filtro `elementor_pro/forms/webhooks/request_args`; `wp_safe_remote_post`; exige HTTP 200.
- **Slack** (`actions/slack.php`): valida `https://hooks.slack.com/services/`, arma `attachments`, POST JSON, exige 200 (`:171-251`).
- **Discord** (`actions/discord.php`): valida `https://discordapp.com/api/webhooks/`, arma `embeds`, exige **HTTP 204** (`:154-221`).
- **Activity_Log** (`actions/activity-log.php`): manual; `aal_insert_log()`.
- **CF7DB** (`actions/cf7db.php`): manual; `do_action_ref_array('cfdb_submit', [$data])`.

**Integraciones CRM — patrón `Integration_Base`** (`classes/integration-base.php`):
- `handle_panel_request()` sirve listas/campos al panel del editor.
- `register_fields_map_control()` crea el control `{name}_fields_map` (tipo `fields_map`) para mapear `remote_id`→`local_id` (`:57-74`).
- Cada CRM action: `OPTION_NAME_API_KEY` global + `{name}_api_key_source`(default/custom) + custom key + SELECT de lista/audiencia + `register_fields_map_control()` + tags. `register_admin_fields()` añade sección en `Settings::TAB_INTEGRATIONS` con botón "Validate API Key". `run()` resuelve key → `map_fields()` → instancia el *Handler* → crea/actualiza suscriptor.

Especificidades: **Mailchimp** `create_or_update_subscriber` (PUT por hash MD5 del email + status_if_new), tags vía `lists/{}/members/{}/tags` (`mailchimp.php:171-368`). **ActiveCampaign** requiere key + URL. **Convertkit** mapea solo first_name/email. **Drip** subscriber con `ip_address`. **GetResponse** tolera 200/202/409. **MailerLite** group + custom fields. **MailPoet** usa `\WYSIJA` directo; **MailPoet3** usa `MailPoet\API\API::MP('v1')`.

**Handlers HTTP** (`classes/*-handler.php`) usan `Rest_Client` (`classes/rest-client.php`, wrapper de `wp_safe_remote_request`, `timeout=30`, `sslverify=false`, UA "Elementor Forms"). Cada handler valida la key en el constructor probando un GET y expone `get_*` (panel) + `create_subscriber`. Base URLs: Mailchimp `https://{dc}.api.mailchimp.com/3.0/` (Basic), ActiveCampaign `{base}/admin/api.php`, Drip `https://api.getdrip.com/v2/`, GetResponse `https://api.getresponse.com/v3/` (`X-Auth-Token`), ConvertKit `https://api.convertkit.com/v3/` (`?api_key=`), MailerLite `https://api.mailerlite.com/api/v2/` (`X-MailerLite-ApiKey`).

### 1.7 Flujo de submit AJAX — `classes/ajax-handler.php`

- **Hook AJAX**: `wp_ajax_elementor_pro_forms_send_form` y `wp_ajax_nopriv_...` → `ajax_send_form()` (`:306-309`).
- **Detección**: `is_form_submitted()` = `wp_doing_ajax()` + `$_POST['action']==='elementor_pro_forms_send_form'`. **No usa nonce** — cualquier visitante puede enviar (`:32-35`).

Secuencia de `ajax_send_form()` (`:61-212`):
1. Lee `post_id`, `queried_id`, `form_id`; `switch_to_post($queried_id)` para dynamic tags.
2. Localiza el form con `Module::find_element_recursive()` (resuelve `templateID` de plantillas globales).
3. Reconstruye settings reales instanciando el widget (`get_settings_for_display`).
4. `$record = new Form_Record($post_data['form_fields'], $form)`.
5. **Validación**: `$record->validate($this)` → error → `send()`.
6. **Procesado**: `$record->process_fields($this)`.
7. Obtiene actions del registrar; filtro `elementor_pro/forms/record/actions_before`.
8. **Itera actions**: salta las que no estén en `submit_actions`; `$action->run($record,$this)` en try/catch; dispara `elementor_pro/forms/actions/after_run`.
9. Ejecuta manualmente `activity_log` y `cf7db`.
10. `do_action('elementor_pro/forms/new_record', $record, $this)`.
11. `send()`.

`send()` (`:258-283`): éxito → `wp_send_json_success(['message'=>SUCCESS,'data'])`; error → `wp_send_json_error(['message','errors','data'])`. Si `current_user_can('edit_post')` añade bloque `elementor-forms-admin-errors`. Helpers fluidos: `add_success_message`, `add_response_data`, `add_error`, `set_success`.

**`Form_Record`** (`classes/form-record.php`): `set_fields()` crea estructura `id/type/title/value/raw_value/required` y sanea con `sanitize_field()` (text→`sanitize_text_field`, url→`esc_url_raw`, email→`sanitize_email`, default→filtro `elementor_pro/forms/sanitize/{type}`). `validate()` marca required y dispara `elementor_pro/forms/validation/{type}` + global (aquí enganchan reCAPTCHA/Akismet/Honeypot). `process_fields()` dispara `.../process/{type}`. `replace_setting_shortcodes()` resuelve `[field id="xxx"]`. `get_form_meta()` arma date/time/page_url/user_agent/remote_ip/credit.

**Validaciones de seguridad** (enganchadas a `elementor_pro/forms/validation`):
- **reCAPTCHA v2** (`recaptcha-handler.php`): POST a `siteverify`; OK → elimina el campo del record (`:119-193`).
- **reCAPTCHA v3** (`recaptcha-v3-handler.php`): `extends Recaptcha_Handler`; exige `score > threshold` (default 0.5) y action correcta (`:121-125`).
- **Honeypot** (`honeypot-handler.php`): input oculto; con valor → `invalid_form` (`:49-67`).
- **Akismet** (`akismet.php`): `\Akismet::http_post(..., 'comment-check')`; spam → error (`:145-209`).

**Hooks de extensión clave**: filtros `field_types`, `default_submit_actions`, `render/item[/{type}]`, `sanitize/{type}`, `wp_mail_headers/message`, `webhooks/request_args`, `filetypes/blacklist`, `upload_path/url`. Acciones `form_submitted`, `fields/register`, `actions/register`, `actions/after_run`, `new_record`, `validation[/{type}]`, `process[/{type}]`, `render_field/{type}`, `pre_render`, `mail_sent`.

### 1.8 Submissions (entradas guardadas en BD) — `modules/forms/submissions/`

Feature que persiste cada envío del formulario en tablas propias + visor en WP-admin. Gateada por licencia (registrada condicionalmente en `module.php:186-198`, `240-254`).

**Bootstrap** — `submissions/component.php` (`class Component extends Module_Base`, `NAME='form-submissions'`, `PAGE_ID='e-form-submissions'`, `:24-27`). En el constructor (`:162-225`):
- Registra dos data-controllers REST de Elementor: `Controller` y `Forms_Controller` (`:165-166`).
- Registra la action `Save_To_Database` en `elementor_pro/forms/actions/register` (`:174-175`) y la **añade a los `default_submit_actions`** (`:178`) → por defecto todo form guarda en BD.
- Programa el borrado de submissions caducadas en `wp_scheduled_delete` (`:182`, `scheduled_submissions_delete()` `:144`).
- Registra el submenú admin "Submissions" (capability vía `can_use_submissions()`, soporta layout nuevo `admin_menu_rearrangement` y legacy, `:186-220`). UI React (`enqueue_scripts()` `:93`).

**Action `Save_To_Database`** — `submissions/actions/save-to-database.php` (`extends Action_Base`, `get_name()`→`save_to_database`, `:17-26`). `run()` (`:82-135`) arma el registro: `post_id`, `referer` (page_url sin params de preview), `referer_title`, `element_id`, `form_name`, `user_id`, `user_ip`, `user_agent`, `actions_count`, `meta` (JSON), y llama `Query::get_instance()->add_submission($data, $record->get_field(null))`. Además crea/actualiza un **Form Snapshot** (`Form_Snapshot_Repository::create_or_update()`) para preservar el estado del form (labels/campos) por si el form cambia o se borra después. Aplica los mismos filtros `elementor_pro/forms/render/item[/{type}]` que el render para reconstruir labels. En el constructor engancha `elementor_pro/forms/actions/after_run` para registrar el **log de cada action** (éxito/excepción) vía `save_action_log()` → `$query->add_action_log()` (`:159-193`).

**Esquema de BD** — `submissions/database/query.php` define tres tablas (`{$wpdb->prefix}` + constante, `:25-27`, `:900-902`) creadas en `database/migrations/initial.php` (`create_tables()` `:10`):
- `e_submissions` — cabecera del envío (post_id, referer, form_name, user, ip, agent, actions_count...).
- `e_submissions_values` — pares campo→valor (relación 1:N con la cabecera).
- `e_submissions_actions_log` — log de ejecución de cada action-after-submit.

Migraciones versionadas en `database/migrations/` (`initial`, `fix-indexes`, `referer-extra`) sobre `base-migration.php`.

**API / export** — `submissions/data/controller.php` (`register_endpoints()` `:239-247`) expone endpoints REST internos: `Index` (listado), `Restore` (restaurar de papelera), `Export`, `Referer`, más `Forms_Controller`. **Export CSV** en `submissions/export/csv-export.php` (`CSV_Export`, arma headers desac. labels-dictionary + rows desde values-dictionary, `:86-152`). `submissions/personal-data.php` integra con el exportador/borrador de datos personales de WordPress (GDPR).

---

<a name="2-woocommerce"></a>
## 2. WooCommerce

Ruta base: `modules/woocommerce/`. Namespace `ElementorPro\Modules\Woocommerce`.

> **Conclusión clave para un clon:** el módulo es un envoltorio fino sobre WooCommerce. El grid de productos extiende `WC_Shortcode_Products` y el resto delega en `wc_get_template()`, funciones `woocommerce_*` y shortcodes (`[woocommerce_cart/checkout/my_account]`, `[product_categories]`, `[product_page]`). La única lógica propia significativa es la construcción de `query_args` en `classes/products-renderer.php` y el sistema de fragments AJAX del Menu Cart en `module.php`.

### 2.1 `module.php` — orquestador

`class Module extends Module_Base` (`module.php:33`). Registra (constructor `:1375-1512`):
- **Widgets** — `get_widgets()` (`:135`) devuelve `WIDGET_NAME_CLASS_NAME_MAP` (`:55-85`) filtrado por licencia. Lista canónica de ~30 widgets.
- **Dynamic Tags** — `register_tags()` (`:174-207`): grupo `woocommerce` + 13 tags (Product_Gallery, Product_Image, Product_Price, Product_Rating, Product_Sale, Product_Content, Product_Short_Description, Product_SKU, Product_Stock, Product_Terms, Product_Title, Category_Image, Woocommerce_Add_To_Cart).
- **Documents** — `product-post`, `product`, `product-archive` (`:225-241`).
- **Conditions** — cuelga la condición WooCommerce de `general` (`:216-220`).
- **Skins de Loop** — `Skin_Loop_Product` y `Skin_Loop_Product_Taxonomy` en cada loop widget (`:1486-1493`).

**AJAX / fragments (carrito):**
- `menu_cart_fragments()` (`:327-349`) en `wp_ajax(_nopriv)_elementor_menu_cart_fragments`.
- `e_cart_count_fragments()` (`:855-862`) sobre `woocommerce_add_to_cart_fragments` (contador + subtotal).
- `load_widget_before_wc_ajax()` (`:594-691`): en AJAX `update_order_review`/`update_shipping_method` re-instancia Cart/Checkout y llama `add_render_hooks()`.

**Loop query bridge** — filtro `elementor/query/query_args` → `loop_query()` (`:1499-1501`, `:1546-1583`): si el skin actual es `product`, reusa los args del shortcode Products:

```php
private function parse_loop_query_args( $widget, $query_args ) {
    $settings  = $this->adjust_setting_for_product_renderer( $widget );
    $shortcode = Products_Widget::get_shortcode_object( $settings );
    $parsed_query_args = $shortcode->parse_query_args();
    return wp_parse_args( $override_various_query_args, $parsed_query_args );
}   // module.php:1560-1583
```

### 2.2 Listado de widgets agrupados (`WIDGET_NAME_CLASS_NAME_MAP`, `module.php:55-85`)

**A) Archivo / grid de productos:**
| Widget | Clase / archivo | Qué hace |
|---|---|---|
| `woocommerce-products` | `Products` (`products.php:17`) | Grid configurable por Query (latest/sale/featured/manual/related/upsells/cross-sells/current_query). |
| `wc-archive-products` | `Archive_Products` (`archive-products.php:15`) | Subclase de Products; fuerza `query_post_type=current_query`, oculta sección Query (`:127-139`). |
| `woocommerce-archive-products` / `wc-products` | `*_Deprecated` | Versiones legacy. |
| *(abstracta)* | `Products_Base` (`products-base.php:15`) | Estilos del grid (columnas/gaps, imagen, título, rating, precio, botón, paginación, sale flash). |

**B) Producto individual** (extienden `Base_Widget`):
| Widget | Render |
|---|---|
| `woocommerce-product-title` | `extends Widget_Heading`; clases `product_title entry-title` (`product-title.php:67-70`). |
| `woocommerce-product-price` | `wc_get_template('/single-product/price.php')` (`product-price.php:198`). |
| `woocommerce-product-images` | `wc_get_template('loop/sale-flash.php')` + `single-product/product-image.php` (`:182-184`). |
| `woocommerce-product-add-to-cart` | `woocommerce_template_single_add_to_cart()` (`product-add-to-cart.php:68`). |
| `woocommerce-product-rating` | `wc_get_template('single-product/rating.php')` (`:203`). |
| `woocommerce-product-meta` | markup propio + `do_action('woocommerce_product_meta_start/end')` (`product-meta.php:444,467`). |
| `woocommerce-product-stock` | `echo wc_get_stock_html($product)` (`product-stock.php:84`). |
| `woocommerce-product-content` | `extends Post_Content` (Theme Builder). |
| `woocommerce-product-data-tabs` | `wc_get_template('single-product/tabs/tabs.php')` (`:286`). |
| `woocommerce-product-related` | `wc_get_related_products()` + `wc_get_template('single-product/related.php')` (`:253-260`). |
| `woocommerce-product-upsell` | `woocommerce_upsell_display()` (`:233`). |
| `woocommerce-product-additional-information` | `wc_get_template('single-product/tabs/additional-information.php')` (`:121`). |
| `woocommerce-product-short-description` | `wc_get_template('single-product/short-description.php')` (`:117`). |
| `woocommerce-breadcrumb` | `woocommerce_breadcrumb()` (`:121`). |
| `woocommerce-category-image` | `extends Widget_Image`; via dynamic tag `woocommerce-category-image-tag`. |
| `woocommerce-archive-description` | `do_action('woocommerce_archive_description')` (`:116`). |

**C) Carrito / Checkout:**
| Widget | Qué hace |
|---|---|
| `woocommerce-cart` | `add_render_hooks()` + `do_shortcode('[woocommerce_cart]')` (`cart.php:2642-2656`). |
| `woocommerce-checkout-page` | `add_render_hooks()` + `do_shortcode('[woocommerce_checkout]')` (`checkout.php:4309-4331`). |
| `woocommerce-menu-cart` | Mini-carrito; encola `wc-cart-fragments` + `Module::render_menu_cart()` (`menu-cart.php:2267-2275`). |
| `woocommerce-purchase-summary` | Página order-received: `[woocommerce_checkout]` con filtros `woocommerce_thankyou_*` (`purchase-summary.php:1649-1693`). |
| `wc-add-to-cart` | Botón add-to-cart estilo Elementor: `woocommerce_template_single_add_to_cart()` (`add-to-cart.php:288-317`). |

**D) Cuenta / misc:**
| Widget | Qué hace |
|---|---|
| `woocommerce-my-account` | Hooks `woocommerce_account_*` + `[woocommerce_my_account]` (`my-account.php:1823-1858`). |
| `woocommerce-notices` | `woocommerce_output_all_notices()` (`notices.php:114-125`). |
| `wc-categories` | `[product_categories ...]` (`categories.php:382-417`). |
| `wc-elements` (WooCommerce Pages) | Inserta shortcodes de página completa (`elements.php:98-153`). |
| `wc-single-elements` (deprecado) | Ejecuta `woocommerce_template_single_*` dinámicamente (`single-elements.php:40-131`). |

### 2.3 Cómo consultan productos los widgets de grid/archivo

**SÍ usan el módulo `query-control`** + `WC_Shortcode_Products`. NO usan `WP_Query` directo.

El trait `Products_Trait` (`traits/products-trait.php`) añade el Group Control de QueryControl:

```php
use ElementorPro\Modules\QueryControl\Controls\Group_Control_Query;       // products-trait.php:5
$this->add_group_control( Group_Control_Query::get_type(), $this->product_query_control_args ); // :158-201
```

Opciones de `post_type` (`get_query_fields_options()`, `:51-91`): `current_query, product/Latest, sale, featured, by_id/Manual, related_products, upsells, cross_sells`. El widget invoca `add_query_controls(Products_Renderer::QUERY_CONTROL_NAME)` con `QUERY_CONTROL_NAME='query'` → prefijo `query_*`.

**Selección del motor** — `Products::get_shortcode_object()`:

```php
public static function get_shortcode_object( $settings ) {
    if ( 'current_query' === $settings[ Products_Renderer::QUERY_CONTROL_NAME . '_post_type' ] ) {
        return new Current_Query_Renderer( $settings, 'current_query' );
    }
    return new Products_Renderer( $settings, 'products' );
}   // products.php:344-349
```

Jerarquía (`classes/`): `Base_Products_Renderer extends \WC_Shortcode_Products` → `Products_Renderer` (arma `query_args`) y `Current_Query_Renderer` (reusa `$GLOBALS['wp_query']->query_vars` para archivos).

`Products_Renderer::parse_query_args()` (`products-renderer.php:49-120`):

```php
$query_args = [
    'post_type' => 'product', 'post_status' => 'publish',
    'ignore_sticky_posts' => true,
    'orderby' => $settings[$prefix.'orderby'], 'order' => strtoupper($settings[$prefix.'order']),
];
$query_args['meta_query'] = WC()->query->get_meta_query();  // visibilidad/precio WC
$query_args['fields'] = 'ids';                              // siempre solo IDs
```

Filtros por fuente: **featured**→tax `product_visibility` term `featured`; **sale**→delega a WC; **by_id**→`post__in`; **related/upsells/cross_sells**→`wc_get_related_products()` / `$product->get_upsell_ids()` / `WC()->cart->get_cross_sells()`; **terms**→`tax_query` con `field=term_taxonomy_id`. Orden por `price/rating/popularity` añade `meta_key` (`_price`/`_wc_average_rating`/`total_sales`). Hook final `woocommerce_shortcode_products_query`. `Archive_Products` usa `Current_Query_Renderer` (respeta la query principal del archivo).

### 2.4 Single product / cart / checkout / my-account

**Single**: patrón uniforme — `global $product = $this->get_product()` (`Product_Id_Trait`, `traits/product-id-trait.php:10-28`) y luego `wc_get_template()` / funciones `woocommerce_*` / hooks. El documento Single Product (`documents/product.php`) dispara `woocommerce_before/after_single_product` y añade clases body `product`/`woocommerce`.

**Cart/Checkout/My-Account**: patrón `add_render_hooks()` → shortcode WC → `remove_render_hooks()`, lo que permite re-ejecutar el widget durante los AJAX de WC.

```php
// cart.php:2642-2656
public function render() {
    $this->add_render_hooks();
    if ( $this->has_empty_cart_template() && WC()->cart->get_cart_contents_count() === 0 ) {
        echo do_shortcode( '[elementor-template id="'.$template_id.'"]' );
    } else {
        echo do_shortcode( '[woocommerce_cart]' );
    }
    $this->remove_render_hooks();
}
```

**Menu Cart — AJAX fragments** (lo único con AJAX fuerte): `render_menu_cart()` pinta `.widget_shopping_cart_content` (poblado por el JS de WC); fragments servidos por `elementor_menu_cart_fragments`; contador/subtotal vía `e_cart_count_fragments()` sobre `woocommerce_add_to_cart_fragments`. Plantilla mini-cart propia opcional en `wc-templates/cart/mini-cart.php`.

### 2.5 Skins y Loop Builder

- **`Skin_Classic`** (`skin-classic.php`): skin legacy de `wc-products`; consulta él mismo (`parent->query_posts()`) y renderiza con loop nativo de WC (`woocommerce_product_loop_start()` + `wc_get_template_part('content','product')`, `:53-88`).
- **`Skin_Loop_Product`** (`skin-loop-product.php`, extiende `Skin_Loop_Base`): **el puente con el Loop Builder**. `get_id()`→`'product'`; registra los controles de Query con el trait; el query real lo arma `Module::loop_query()` reusando `Products_Renderer::parse_query_args()`. El Loop Builder define la plantilla de la tarjeta; este skin hace que cada ítem sea un producto WC.
- **`Skin_Loop_Product_Taxonomy`**: loop sobre términos de categoría de producto.

El grid `Products` y los skins de loop **comparten el motor de query** (`Products_Renderer`); la diferencia es que el grid usa plantillas de loop de WC y los skins usan el template builder (Loop Item).

---

<a name="3-efectos"></a>
## 3. Motion FX / Interactions / Transitions / Page Transitions

JS bundleado en `assets/js/` (conserva rutas-fuente en comentarios webpack).

### 3.1 Motion FX (`motion-fx/`)

**Conexión a elementos** — `module.php` registra un Group Control (`motion_fx`) inyectado en section/container/column/common vía hooks Core:

```php
add_action( 'elementor/controls/register', [ $this, 'register_controls_group' ] );
add_action( 'elementor/element/section/section_effects/after_section_start', [ $this, 'add_controls_group_to_element' ] );
// ...container, column, common  // module.php:207-221
$element->add_group_control( Controls_Group::get_type(), [ 'name' => 'motion_fx', 'selector' => $selector, 'exclude' => $exclude ] );
```

Prefijos de settings: `motion_fx` (elemento) y `background_motion_fx` (fondo). Selector según tipo: section `{{WRAPPER}}`, column `{{WRAPPER}} > .elementor-widget-wrap`, widget `{{WRAPPER}} > .elementor-widget-container` (`:43-68`). CSS `e-motion-fx` cargado bajo demanda.

**Definición de controles** — `controls-group.php` (`get_type()`→`'motion_fx'`). Master switches `motion_fx_scrolling` y `motion_fx_mouse` (ambos `frontend_available=true`).

Efectos de **scroll** (`get_scrolling_effects()`, `:195-466`):

| Efecto | clave | Campos |
|---|---|---|
| Vertical Scroll | `translateY` | direction Up/Down, speed def 4 [0–10] step 0.1, affectedRange %[0–100] |
| Horizontal Scroll | `translateX` | direction Left/Right, speed def 4, range %[0–100] |
| Transparency | `opacity` | direction (In/Out/Out In/In Out, def out-in), level def 10 [1–10], range %[20–80] |
| Blur | `blur` | direction (igual), level def 7 [1–15], range %[20–80] |
| Rotate | `rotateZ` | direction Left/Right, speed def 1, range %[0–100] |
| Scale | `scale` | direction (Up/Down/Down Up/Up Down, def out-in), speed def 4 [-10–10], range %[20–80] |

Efectos de **mouse** (`get_mouse_effects()`, `:468-525`): **Mouse Track** (`mouseTrack`, direction Opposite/Direct, speed def 1) y **3D Tilt** (`tilt`, direction Direct/Opposite, speed def 4).

Globales: `transform_origin_x/y` (emiten CSS var `--e-transform-origin-x`), `devices` ("Apply Effects On", SELECT2), `range` ("Effects Relative To": Default/viewport/page). Mecánica `prepare_effects()` (`:527-576`): cada efecto es un `POPOVER_TOGGLE` `{effect}_effect` con subcampos `{effect}_{field}`, todos `frontend_available=true` + `render_type=none`.

**Frontend** — `assets/js/frontend.js` (handler `motionFX`, `:349-578`): NO usa data-attrs, lee settings por `getElementSettings()`. Respeta `prefers-reduced-motion` (`:541-543`). `prepareOptions()` parsea con regex `^{name}_(.+?)_effect`. Matemática en `actions.js`: `scale = 1 + speed*movePoint/1000`, `blur(px)`, `tilt` rotateX/Y con `speed/10`; aplica CSS custom props + reconstruye `transform`/`filter`. Usa `IntersectionObserver`; observa `$body` si `range='page'`. Clases `elementor-motion-effects-element/parent/container/layer/perspective`.

### 3.2 Interactions (`interactions/`) — builder triggers + actions (v4)

Capa Pro sobre el módulo Interactions de Core (Atomic Widgets v4):

```php
const EXPERIMENT_NAME = 'e_pro_interactions';   // module.php:19
// "Enhanced interactions with replay support... requires Atomic Widgets + Interactions experiments"
```

Requisitos (`:62-68`): Elementor >= 4.0, clase Core `Interactions\Module`, experimentos `e_pro_interactions` + Atomic Widgets + `e_interactions`, + licencia feature `pro-interactions`.

`hooks.php`: registra paquete editor v2 `editor-interactions-extended`; scripts `elementor-interactions-pro` dependientes de **`motion-js` (motion.dev)**; en `wp_footer` prio 2 **reemplaza** el handler de Core por el Pro y localiza config bajo `ElementorInteractionsConfig`. Es el nuevo builder de disparadores+acciones con soporte de "replay". JS en `assets/js/interactions-pro.js`.

### 3.3 Transitions (`transitions/module.php`)

Módulo mínimo, **sin controles UI propios**. Solo amplía la lista de propiedades CSS animables de los Atomic Widgets de Core:

```php
add_filter( 'elementor/atomic-widgets/styles/transitions/allowed-properties', [ $this, 'extend_allowed_properties' ] ); // module.php:21-30
```

`extend_allowed_properties()` (`:32-79`) añade margin/padding/flex/width/height/top/left/color/font-size/line-height/letter-spacing/background-color/box-shadow/border/opacity/transform/filter, etc. Amplía qué propiedades pueden transicionarse en hover/estados.

### 3.4 Page Transitions (`page-transitions/module.php`)

Controles en el **Kit/Site Settings** (prefijo por tab id).

**Sección Page Transitions** (`:141-258`):
- `..._background` (Group Background, selector `e-page-transition`, color def `#FFBC7D`).
- `..._entrance_animation` (SELECT responsive): None, Fade In (+Down/Right/Up/Left), Zoom In, Slide In... → CSS var `--e-page-transition-entrance-animation`.
- `..._exit_animation` → `--e-page-transition-exit-animation`.
- `..._animation_duration` (SLIDER, def 1500ms, max 5s) → `--e-page-transition-animation-duration`.

**Sección Preloader** (`:263-666`): `..._preloader_type` (None/animation/icon/image); `..._preloader_animation_type` con **13 loaders** (Circle, Circle Dashed, Bouncing/Pulsing Dots, Pulse, Overlap, Spinners, Nested Spinners..., Progress Bar, Two Way Progress Bar, Repeating Bar, consts `:29-41`); animación icon/image (Spinning/Bounce/Flash/Pulse/Rubber Band/Shake/Swing/Tada/Wobble/Jello → `--e-preloader-animation`); color/size/rotate/delay como CSS vars.

**Render** (`:669-876`): `<e-page-transition>` tras `wp_body_open`, con atributos kebab (`preloader-type`, `preloader-icon`, `preloader-image-url`, `preloader-animation-type`) + clase `e-page-transition--entering`. `should_render()` solo en singular/archive no paginado.

**Frontend** — `assets/js/page-transitions.js`: custom element `<e-page-transition>`; intercepta clicks de links (`filters.js` excluye `target=_blank`, distinto origin, `#`, popups, casos WooCommerce add-to-cart); en `pageshow`→`animateState('entering')`, en click válido→`preventDefault`+`animateState('exiting')`+`location.href`; prerender en `mouseenter` con `<link rel="prerender">`. Lee CSS vars `--e-page-transition-*`/`--e-preloader-*`. Carga `instant-page` para prefetch.

**Resumen de mecanismos:**
| Módulo | Aplicación frontend |
|---|---|
| Motion FX | Settings `frontend_available` leídos por JS → CSS custom props + transform/filter/opacity. IntersectionObserver. Reduced-motion. |
| Interactions | Reemplaza scripts Core por Pro; config vía `ElementorInteractionsConfig`; motor Motion JS. Builder triggers+actions v4. |
| Transitions | Solo filtro PHP que amplía propiedades CSS transicionables. Sin JS ni controles. |
| Page Transitions | Controles en Kit → CSS vars + atributos kebab en `<e-page-transition>`; web component intercepta links y anima entering/exiting. |

---

<a name="4-popup"></a>
## 4. Popup (`popup/`)

> Hallazgos clave: (1) los triggers/reglas NO son controles del documento sino un `Controls_Stack` separado, persistido en el meta `_elementor_popup_display_settings`; (2) las condiciones de página se delegan 100% al Theme Builder; (3) los triggers solo se activan en frontend si el popup está asignado por condición del Theme Builder; (4) `open_selector`, form-action y dynamic tag son las tres vías de apertura manual.

### 4.1 Documento Popup

`const DOCUMENT_TYPE = 'popup'` (`module.php:31`). Registrado en `register_documents()` (`:199-201`); se registra una location del Theme Builder `popup` (`multiple=true, public=false`, `:203-213`); en `wp_footer` → `print_popups()` → `elementor_theme_do_location('popup')` (`:215-217`).

`class Document extends Theme_Section_Document` (`document.php:20`): `location='popup'`, `support_kit=true`. Wrapper CSS `#elementor-popup-modal-{id}` (`:107-109`).

**Controles de Layout** (`section popup_layout`): `width` (SLIDER def 640), `height_type` (auto/fit_to_screen/custom), `height`, `content_position` (top/center/bottom), `horizontal_position` (left/center/right), `vertical_position` (top/center/bottom) (`:180-354`).

```php
$this->add_control( 'overlay', [ 'type' => SWITCHER, 'default' => 'yes',
    'selectors' => [ '{{WRAPPER}}' => 'pointer-events: all' ] ] );   // document.php:356-369
$this->add_responsive_control( 'entrance_animation', [ 'type' => ANIMATION, 'frontend_available' => true ] );
$this->add_responsive_control( 'exit_animation',     [ 'type' => EXIT_ANIMATION, 'frontend_available' => true ] ); // :386-403
```

`close_button` (SWITCHER def yes), `entrance_animation_duration` (def 1.2s). Style: Popup background/border/radius/box-shadow, Overlay (`rgba(0,0,0,.8)`), Close Button (Inside/Outside).

**Sección Advanced** (`:714-852`): `close_button_delay` (Show Close Button After sec), `close_automatically` (Auto Close After sec), `prevent_close_on_background_click`, `prevent_close_on_esc_key`, `prevent_scroll` (Disable Page Scrolling), `avoid_multiple_popups`, `a11y_navigation` (def yes), `open_selector` (Open By Selector, TEXT `#id, .class`), `margin`/`padding`/`classes`.

### 4.2 Triggers — `display-settings/triggers.php`

`Triggers` (nombre `popup_triggers`) y `Timing` (`popup_timing`) extienden `Base` (`Controls_Stack`). Se guardan en el meta `_elementor_popup_display_settings` vía AJAX `pro_popup_save_display_settings` (`document.php:22`, `module.php:226`).

Patrón de grupo (`base.php:16-61`): HEADING + SWITCHER maestro; controles internos prefijados `{grupo}_{id}`, todos `frontend_available=true`, con condición automática `{grupo}='yes'`.

```php
protected function end_settings_group() {
    $this->add_control( $this->current_group, [
        'type' => Controls_Manager::SWITCHER,
        'classes' => 'elementor-popup__display-settings__group-toggle',
        'frontend_available' => true,
    ] );
}   // base.php:32-38
```

Triggers (`triggers.php:28-142`):
- **On Page Load** (`page_load`): `page_load_delay` (NUMBER "Within (sec)", def 0).
- **On Scroll** (`scrolling`): `scrolling_direction` (Down/Up, def down), `scrolling_offset` (NUMBER "Within %", def 50, cond. direction=down).
- **On Scroll To Element** (`scrolling_to`): `scrolling_to_selector` (TEXT `.my-class`).
- **On Click** (`click`): `click_times` (NUMBER "Clicks", def 1).
- **After Inactivity** (`inactivity`): `inactivity_time` (NUMBER "Within sec", def 30).
- **On Page Exit Intent** (`exit_intent`): solo el switcher.
- **AdBlock Detection** (`adblock_detection`): `adblock_detection_delay` (NUMBER, def 0).

Los triggers solo se envían al frontend si el popup está asignado a la location por condición (`document.php:119-135`): si llega por dynamic tag/selector, los triggers se desactivan para evitar auto-apertura.

### 4.3 Conditions

No hay archivo propio: las condiciones de página son **las del Theme Builder**. El popup es una location del Theme Builder y la asignación se resuelve con `ThemeBuilderModule::instance()->get_conditions_manager()->get_documents_for_location('popup')` (`document.php:126`). UI estándar "Conditions" (Entire Site / Singular / Archive / etc.). Asignación programática: `Module::add_popup_to_location($popup_id)` (`module.php:192-197`), invocada cuando se abre por dynamic tag (`tag.php:124`) o form action (`form-action.php:131`).

### 4.4 Advanced Rules — `display-settings/timing.php`

- **Show after X page views** (`page_views`): `page_views_views` (def 3).
- **Show after X sessions** (`sessions`): `sessions_sessions` (def 2).
- **Show up to X times** (`times`): `times_times` (def 3), `times_period` (Persisting/Session/Day/Week/Month), `times_count` (On Open / On Close — cuándo se cuenta la impresión).
- **When arriving from specific URL** (`url`): `url_action` (Show/Hide/Regex), `url_url` (TEXT).
- **Show when arriving from** (`sources`): SELECT2 múltiple `search`/`external`/`internal` (def todos).
- **Hide for logged in users** (`logged_in`): `logged_in_users` (All/Custom), `logged_in_roles` (SELECT2 roles WP).
- **Show on devices** (`devices`): SELECT2 múltiple (desktop + breakpoints activos).
- **Show on browsers** (`browsers`): All/Custom + `browsers_browsers_options` (ie/chrome/edge/firefox/safari).
- **Schedule date and time** (`schedule`): `schedule_timezone` (Site/Visitor), `schedule_start_date`/`schedule_end_date` (DATE_TIME), `schedule_server_datetime` (HIDDEN, hora servidor para comparar).

### 4.5 Form action y dynamic tag

`Form_Action extends Action_Base`, nombre `popup` (`form-action.php`): controls `popup_action` (Open/Close), `popup_action_popup_id` (QUERY_CONTROL de templates popup), `popup_action_do_not_show_again`. `run()` añade `$ajax_handler->add_response_data('popup', $action_settings)` para que el JS abra/cierre tras el submit (`:95-119`). `tag.php` genera enlaces de acción `popup:open|close|toggle` para botones/menús (`create_action_hash`).

---

<a name="5-resto"></a>
## 5. Resto de widgets interactivos

### 5.1 Sticky (`sticky/module.php`)
Fija section/container/widget al hacer scroll. Controles inyectados tras "Effects" (`:46`, `:263-265`); todo JS-driven (`render_type=none` + `frontend_available`, script `e-sticky`). Controles: `sticky` (SELECT None/Top/Bottom, `:47-62`), `sticky_on` (SELECT2 dispositivos, `:83-98`), `sticky_offset` (NUMBER 0–500, `:100-115`), `sticky_effects_offset` (0–1000), `sticky_anchor_link_offset` (0–500), `sticky_parent` ("Stay In Column", SWITCHER, solo Section/Widget/Container, `:191-200`).

### 5.2 Scroll-Snap (`scroll-snap/module.php`)
CSS Scroll Snap nativo a **nivel de documento** (solo en `Theme_Page_Document` y `section_custom_css_pro`, `:28-30`). Aplica CSS server-side vía `selectors`. Controles: `scroll_snap` (SWITCHER; `html`→`overflow:hidden`, `body`→`scroll-snap-type: y mandatory` — **fijo a `mandatory` en Y, no expone proximity**, `:42-56`), `scroll_snap_position` (Top/center/Bottom → `scroll-snap-align`), `scroll_snap_padding` (`scroll-padding`), `force_stop` (Normal/Always → `scroll-snap-stop`).

### 5.3 Off-Canvas (`off-canvas/widgets/off-canvas.php`)
Panel deslizante sobre `Widget_Nested_Base` (`:14`), requiere experimento `nested-elements`. **No se abre solo**: el contenido es un container anidado; se dispara con un link/botón + dynamic tag "Off-Canvas". Posición por CSS vars (no left/right). Controles: `horizontal_position`/`vertical_position` (CHOOSE → `--e-off-canvas-justify-content/align-items`), `width`/`height`/`custom_height`, `entrance_animation`/`exit_animation` (frontend), `offcanvas_animation_duration`, `is_not_close_on_overlay`, `is_not_close_on_esc_overlay`, `prevent_scroll`, `has_overlay` (def yes, `rgba(0,0,0,.8)`). Render `<tag>.e-off-canvas > .e-off-canvas__overlay + .e-off-canvas__main > .e-off-canvas__content` con a11y `role=dialog`/`aria-modal`/`inert`. **No hay push-vs-slide ni botón de cierre dedicado**; cierre por overlay/ESC.

### 5.4 Hotspot (`hotspot/widgets/hotspot.php`)
`extends Widget_Image`; imagen con marcadores + tooltips. Repeater `hotspot` (tabs Content/Position): `hotspot_label`, `hotspot_link`, `hotspot_icon`, `hotspot_tooltip_content` (WYSIWYG); posición por orientación + offset %: `hotspot_horizontal` (left/right) + `hotspot_offset_x` (def 50%), `hotspot_vertical` + `hotspot_offset_y`. Animación marcador `hotspot_animation` (soft-beat/expand/overlay/None) + `hotspot_sequenced_animation`. Sección Tooltip: `tooltip_position`, `tooltip_trigger` (Hover/Click/none, **default Click**), `tooltip_animation`, `tooltip_animation_duration`. Estilos por CSS vars; hotspot sin label/icono → círculo.

### 5.5 Countdown (`countdown/widgets/countdown.php`)
Cuenta regresiva. `countdown_type` (Due Date / Evergreen Timer, def due_date); `due_date` (DATE_TIME def +1 mes); **Evergreen solo `evergreen_counter_hours` (def 47) + `evergreen_counter_minutes` (def 59)** — sin días/segundos en evergreen. Toggles `show_days/hours/minutes/seconds` (def yes); etiquetas custom; `expire_actions` (**SELECT2 múltiple, no repeater**: Redirect/Hide/Show Message), `message_after_expire`, `expire_redirect_url`. Render: siempre `data-date`; evergreen añade `data-evergreen-interval`; acciones en `data-expire-actions` (`wp_json_encode` saneado anti-`javascript:`).

### 5.6 Slides (`slides/widgets/slides.php`)
Slideshow Swiper (`get_script_depends ['imagesloaded','swiper']`). Repeater `slides` (Background/Content/Style): `background_color/image/size`, **`background_ken_burns`** (SWITCHER) + `zoom_direction` (in/out), `background_overlay` + blend_mode; `heading/description/button_text/link/link_click` (slide o button). Slider Options (todos `frontend_available`): `navigation` (Arrows and Dots/arrows/dots/none, def both), `autoplay` (def yes), `pause_on_hover/interaction`, `autoplay_speed` (5000), `infinite` (def yes), `transition` (slide/fade), `transition_speed` (500), `content_animation` (control custom `Control_Slides_Animation`: fadeInDown/Up/Right/Left/zoomIn). Config Swiper viaja al JS por `frontend_available`.

### 5.7 Carousel (`carousel/`)
`module.php:21-27` registra **Media Carousel**, **Testimonial Carousel**, **Reviews** (todos extienden `Base`). Config Swiper compartida (`base.php`, casi todo `frontend_available`): `effect` (slide/fade/cube), `slides_per_view` (responsive), `slides_to_scroll`, `height/width`, **`show_arrows`** (SWITCHER) y **`pagination`** (None/Dots/Fraction/Progress) como controles separados (no un único "navigation"), `speed` (500), `autoplay`+`autoplay_speed` (5000), `loop` (def yes), `pause_on_hover/interaction`, `lazyload`, `space_between` (def 10). **No hay `get_swiper_settings()` server-side** — config al JS por `frontend_available`.
- **Media Carousel** (`media-carousel.php`): repeater image/video (YouTube/Vimeo); `skin` (carousel/slideshow/coverflow); lightbox; thumbs (segundo swiper) en skin slideshow.
- **Testimonial Carousel**: repeater content/image/name/title; `skin` (default/bubble), `layout` (image_inline/stacked/above/left/right).
- **Reviews**: repeater image/name/title/rating(0–5)/social_icon/link/content; estrellas con medias estrellas (`render_stars()`).

### 5.8 Nested Carousel (`nested-carousel/widgets/nested-carousel.php`)
`extends Widget_Nested_Base` (requiere `nested-elements`). **Cada slide es un container anidable real** (3 containers default). Controles: repeater `slide_title`, `carousel_name`, `carousel_items` (`Control_Nested_Repeater`). Layout/navegación delegados al `Base_Carousel_Trait` (prefijo `e-n-carousel-`): `slides_to_show`/`slides_to_scroll`/`equal_height` (responsive), autoplay, infinite/loop, offset_sides, flechas, dots, `image_spacing`. Motor Swiper (`get_script_depends ['swiper']`). Render wrapper `['e-n-carousel','swiper']`, cada slide `<div class="swiper-slide" data-slide>` con `print_child($index)`.

---

<a name="6-apuntes"></a>
## 6. Apuntes para la plataforma propia

- **Forms**: el contrato del POST es `form_fields[<custom_id>]` + hidden `post_id/form_id/queried_id`; el handler AJAX `elementor_pro_forms_send_form` **no usa nonce**. El catálogo de actions-after-submit (email, redirect, webhook, Slack/Discord, +6 CRM) es un patrón limpio de registrar (`get_name/register_settings_section/run/on_export`) reimplementable. El mapeo CRM (`fields_map`: remote_id↔local_id) es el patrón a copiar para integraciones.
- **WooCommerce**: para un clon NO replicar widget por widget — el grid es `WC_Shortcode_Products` + el query-control; el resto son `wc_get_template()`/shortcodes. La lógica propia que sí importa: `products-renderer.php` (construcción de `query_args` por fuente) y los fragments AJAX del Menu Cart.
- **Efectos**: Motion FX y Popup/Slides/Carousel pasan toda su config al frontend por settings `frontend_available` (no JSON inline). Page Transitions e Interactions usan web components / Motion.dev. Patrón general: PHP define controles → emite CSS vars o settings → JS aplica.
- **Popup**: el modelo de "display settings" separado del documento (triggers + timing como `Controls_Stack` en meta propio) + delegación de conditions al Theme Builder es directamente trasladable a una plataforma con page-builder propio.
