<?php
/**
 * Custom Post Type for Inventorys and Taxonomies.
 */
class WooCommerce_Multi_Inventory_Taxonomy extends WooCommerce_Multi_Inventory
{
    protected $plugin_name;
    protected $version;
    protected $options;
    protected $prefix;
    /**
     * Constructor.
     *
     * @author Daniel Barenkamp
     *
     * @version 1.0.0
     *
     * @since   1.0.0
     * @link    https://welaunch.io/plugins
     *
     * @param string $plugin_name
     * @param string $version
     */
    public function __construct($plugin_name, $version)
    {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        $this->prefix = 'woocommerce_multi_inventory_';
    }

    /**
     * Init.
     *
     * @author Daniel Barenkamp
     *
     * @version 1.0.0
     *
     * @since   1.0.0
     * @link    https://welaunch.io/plugins
     *
     * @return bool
     */
    public function init()
    {
        global $woocommerce_multi_inventory_options;
        $this->options = $woocommerce_multi_inventory_options;

        $this->register_inventory_locator_taxonomy();
        $this->add_custom_meta_fields();
    }

    /**
     * Register Inventory Categories and Inventory Filter Taxonomies.
     *
     * @author Daniel Barenkamp
     *
     * @version 1.0.0
     *
     * @since   1.0.0
     * @link    https://welaunch.io/plugins
     *
     * @return bool
     */
    public function register_inventory_locator_taxonomy()
    {
    	// Inventory Category
        $singular = esc_html__('Inventory', 'woocommerce-multi-inventory');
        $plural = esc_html__('Inventories', 'woocommerce-multi-inventory');

        $labels = array(
            'name' => sprintf( '%s', $plural),
            'singular_name' => sprintf( '%s', $singular),
            'search_items' => sprintf( esc_html__('Search %s', 'woocommerce-multi-inventory'), $plural),
            'all_items' => sprintf( esc_html__('All %s', 'woocommerce-multi-inventory'), $plural),
            'parent_item' => sprintf( esc_html__('Parent %s', 'woocommerce-multi-inventory'), $singular),
            'parent_item_colon' => sprintf( esc_html__('Parent %s:', 'woocommerce-multi-inventory'), $singular),
            'edit_item' => sprintf( esc_html__('Edit %s', 'woocommerce-multi-inventory'), $singular),
            'update_item' => sprintf( esc_html__('Update %s', 'woocommerce-multi-inventory'), $singular),
            'add_new_item' => sprintf( esc_html__('Add New %s', 'woocommerce-multi-inventory'), $singular),
            'new_item_name' => sprintf( esc_html__('New %s Name', 'woocommerce-multi-inventory'), $singular),
            'menu_name' => sprintf( '%s', $plural),
        );

        $args = array(
                'labels' => $labels,
                'public' => true,
                'hierarchical' => true,
                'show_ui' => true,
                'show_admin_column' => true,
                'update_count_callback' => '_update_post_term_count',
                'query_var' => true,
                'rewrite' => array(
                    'slug' => 'inventory',
                    'with_front' => FALSE
                ),
        );

        register_taxonomy('inventories', 'product', $args);
    }

    /**
     * Add Custom Meta Fields to Store Categories and Filters.
     *
     * @author Daniel Barenkamp
     *
     * @version 1.0.0
     *
     * @since   1.0.0
     * @link    https://welaunch.io/plugins
     *
     * @return bool
     */
    public function add_custom_meta_fields()
    {
        if(!is_admin()) {
            return;
        }

        $current_term_id = isset($_GET['tag_ID']) ? $_GET['tag_ID'] : 0;

        $custom_taxonomy_meta_config = array(
            'id' => 'stores_meta_box',
            'title' => esc_html__('Inventory', 'woocommerce-multi-inventory'),
            'pages' => array('inventories'),
            'context' => 'side',
            'fields' => array(),
            'local_images' => false,
            'use_with_theme' => false,
        );

        $custom_taxonomy_meta_fields = new Tax_Meta_Class($custom_taxonomy_meta_config);
        $custom_taxonomy_meta_fields->addText($this->prefix . 'email', array(
            'name' => esc_html__('Email', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addImage($this->prefix . 'image', array(
            'name' => esc_html__('Image ', 'woocommerce-multi-inventory'),
            'width' => '200px',
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'address', array(
            'name' => esc_html__('Address', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'zip', array(
            'name' => esc_html__('ZIP', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'city', array(
            'name' => esc_html__('City', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'state', array(
            'name' => esc_html__('State', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'country', array(
            'name' => esc_html__('Country CODE', 'woocommerce-multi-inventory'),
            'desc' => esc_html__('The 2 Digit code, e.g.: US, DE or AU', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'delivery_time', array(
            'name' => esc_html__('Delivery Time', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'lat', array(
            'name' => esc_html__('Latitude', 'woocommerce-multi-inventory'),
            'std' => '52.520008',
        ));
        $custom_taxonomy_meta_fields->addText($this->prefix . 'lng', array(
            'name' => esc_html__('Longitude', 'woocommerce-multi-inventory'),
            'std' => '13.404954',
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'costs', array(
            'name' => esc_html__('Delivery Costs', 'woocommerce-multi-inventory'),
            'desc' => esc_html__('Extra fees, that gets added when that inventory is in users cart.', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'company', array(
            'name' => esc_html__('Company', 'woocommerce-multi-inventory')
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'iban', array(
            'name' => esc_html__('IBAN', 'woocommerce-multi-inventory')
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'bic', array(
            'name' => esc_html__('BIC', 'woocommerce-multi-inventory')
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'bank', array(
            'name' => esc_html__('Bank', 'woocommerce-multi-inventory')
        ));

        $custom_taxonomy_meta_fields->addText($this->prefix . 'tax_id', array(
            'name' => esc_html__('Tax ID', 'woocommerce-multi-inventory')
        ));

        $custom_taxonomy_meta_fields->addCheckbox($this->prefix . 'frontend' , array(
            'name' => esc_html__('Frontend Inventory ', 'woocommerce-multi-inventory'),
            'desc' => esc_html__('Can be selected on Product Pages', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addCheckbox($this->prefix . 'backend', array(
            'name' => esc_html__('Backend Inventory ', 'woocommerce-multi-inventory'),
            'desc' => esc_html__('Can be used for backend admin orders', 'woocommerce-multi-inventory'),
        ));

        $custom_taxonomy_meta_fields->addCheckbox($this->prefix . 'purchasing_warehouse', array(
            'name' => esc_html__('Purchasing warehouse ', 'woocommerce-multi-inventory'),
            'desc' => esc_html__('When enabled and you order from this warehouse, the stock gets INCREASED and not DECREASED.', 'woocommerce-multi-inventory'),
        ));

        
        if($this->get_option('inventoryUsers')) {

            $shopManagers = get_users( array('include' => get_term_meta($current_term_id, 'woocommerce_multi_inventory_users', true) ) );
            if(!empty($shopManagers)) {
                $tmp = array(
                    '' => __('Select a Shop Manager', 'woocommerce-multi-inventory'),
                );
                foreach($shopManagers as $shopManager) {
                    $tmp[$shopManager->data->ID] = $shopManager->data->user_nicename;
                }

                $custom_taxonomy_meta_fields->addSelect($this->prefix . 'users', $tmp, array(
                    'name' => esc_html__('Responsible Shop Manager ', 'woocommerce-multi-inventory'),
                    'multiple' => true,
                    'desc' => esc_html__('To edit these users, pleaes edit the user itself!', 'woocommerce-multi-inventory'),
                ));
            }
        }

        $custom_taxonomy_meta_fields->addText($this->prefix . 'order', array(
            'name' => esc_html__('Order', 'woocommerce-multi-inventory'),
            'std' => '0',
        ));

        $countries = WC()->countries->get_countries();
        if(!empty($countries)) {

            $custom_taxonomy_meta_fields->addSelect($this->prefix . 'countries', $countries, array(
                'name' => esc_html__('Countries to Ship To ', 'woocommerce-multi-inventory'),
                'multiple' => true,
            ));
        }

        $gateways = WC()->payment_gateways->get_available_payment_gateways();
        if(!empty($gateways)) {
            $tmp = array();
            foreach($gateways as $gatewayKey => $datewayData) {
                $tmp[$gatewayKey] = $datewayData->title;
            }

            $custom_taxonomy_meta_fields->addSelect($this->prefix . 'disabled_payment_gateways', $tmp, array(
                'name' => esc_html__('Disable Payment Gateway ', 'woocommerce-multi-inventory'),
                'multiple' => true,
            ));
        }

        global $wpdb;
        $shippingMethods = $wpdb->get_results("SELECT * FROM `{$wpdb->prefix}woocommerce_shipping_zone_methods`", ARRAY_A);
        if(!empty($shippingMethods)) {

            $tmp = array();
            foreach ($shippingMethods as $shippingMethod) {
                $tmp[$shippingMethod['instance_id']] = 'Zone: ' . $shippingMethod['zone_id'] . ' - ' . $shippingMethod['method_id'] . ' (ID: ' . $shippingMethod['instance_id'] . ')';
            }

            $custom_taxonomy_meta_fields->addSelect($this->prefix . 'disabled_shipping_methods', $tmp, array(
                'name' => esc_html__('Disable Shipping Methods ', 'woocommerce-multi-inventory'),
                'multiple' => true,
            ));
        }

        $custom_taxonomy_meta_fields->Finish();
    }
}