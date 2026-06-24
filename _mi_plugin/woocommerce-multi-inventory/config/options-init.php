<?php

    /**
     * For full documentation, please visit: http://docs.reduxframework.com/
     * For a more extensive sample-config file, you may look at:
     * https://github.com/reduxframework/redux-framework/blob/master/sample/sample-config.php
     */

    if ( ! class_exists( 'weLaunch' ) && ! class_exists( 'Redux' ) ) {
        return;
    }

    if( class_exists( 'weLaunch' ) ) {
        $framework = new weLaunch();
    } else {
        $framework = new Redux();
    }

    // This is your option name where all the Redux data is stored.
    $opt_name = "woocommerce_multi_inventory_options";

    $args = array(
        'opt_name' => 'woocommerce_multi_inventory_options',
        'use_cdn' => TRUE,
        'dev_mode' => FALSE,
        'display_name' => __('WooCommerce Multi Inventory', 'woocommerce-multi-inventory'),
        'display_version' => '1.5.7',
        'page_title' => __('WooCommerce Multi Inventory', 'woocommerce-multi-inventory'),
        'update_notice' => TRUE,
        'intro_text' => '',
        'footer_text' => '&copy; ' . date('Y') . ' weLaunch',
        'admin_bar' => false,
        'menu_type' => 'submenu',
        'menu_title' => esc_html__( 'Multi Inventory', 'woocommerce-multi-inventory' ),
        'allow_sub_menu' => TRUE,
        'page_parent' => 'woocommerce',
        'customizer' => FALSE,
        'default_mark' => '*',
        'hints' => array(
            'icon_position' => 'right',
            'icon_color' => 'lightgray',
            'icon_size' => 'normal',
            'tip_style' => array(
                'color' => 'light',
            ),
            'tip_position' => array(
                'my' => 'top left',
                'at' => 'bottom right',
            ),
            'tip_effect' => array(
                'show' => array(
                    'duration' => '500',
                    'event' => 'mouseover',
                ),
                'hide' => array(
                    'duration' => '500',
                    'event' => 'mouseleave unfocus',
                ),
            ),
        ),
        'output' => TRUE,
        'output_tag' => TRUE,
        'settings_api' => TRUE,
        'cdn_check_time' => '1440',
        'compiler' => TRUE,
        'page_permissions' => 'manage_options',
        'save_defaults' => TRUE,
        'show_import_export' => TRUE,
        'database' => 'options',
        'transient_time' => '3600',
        'network_sites' => TRUE,
    );

    $inventoriesSelect = array();
    $shippingMethods = array();
    $paymentGateways = array();
    if(isset($_GET['page']) && $_GET['page'] == 'woocommerce_multi_inventory_options_options') {

        $inventoriesSelect = array();

        global $wpdb;
        $inventories = $wpdb->get_results(
            "SELECT
                $wpdb->terms.term_id, $wpdb->terms.name
            FROM
                $wpdb->terms
            LEFT JOIN
                $wpdb->term_taxonomy ON
                    $wpdb->terms.term_id = $wpdb->term_taxonomy.term_id
            WHERE
                $wpdb->term_taxonomy.taxonomy = 'inventories'"
        );
        if(!empty($inventories)) {
            foreach($inventories as $inventory) {
                $inventoriesSelect[$inventory->term_id] = $inventory->name;
            }
        }

        $shippingMethods = $wpdb->get_results("SELECT * FROM `{$wpdb->prefix}woocommerce_shipping_zone_methods`", ARRAY_A);

        if(!empty($shippingMethods)) {

            $tmp = array();
            foreach ($shippingMethods as $shippingMethod) {
                $tmp[$shippingMethod['instance_id']] = 'Zone: ' . $shippingMethod['zone_id'] . ' - ' . $shippingMethod['method_id'] . ' (ID: ' . $shippingMethod['instance_id'] . ')';
            }
            $shippingMethods = $tmp;
        }

        $paymentGateways = WC()->payment_gateways->get_available_payment_gateways();
        $tmp = array();
        $gatwayTrans = array(
            'bacs' => __('Direct bank transfer', 'woocommerce'),
            'cheque' => __('Check payments', 'woocommerce'),
            'cod' => __('Cash on delivery', 'woocommerce'),

        );
        foreach($paymentGateways as $paymentGatewayKey => $paymentGateway)  {
            
            $gatwayTransTitle = $paymentGatewayKey;
            if(isset($gatwayTrans[$paymentGatewayKey])) {
                $gatwayTransTitle = $gatwayTrans[$paymentGatewayKey];
            }

            $tmp[$paymentGatewayKey] = $gatwayTransTitle;
        }
        $paymentGateways = $tmp;
    }

    global $weLaunchLicenses;
    if( (isset($weLaunchLicenses['woocommerce-multi-inventory']) && !empty($weLaunchLicenses['woocommerce-multi-inventory'])) || (isset($weLaunchLicenses['woocommerce-plugin-bundle']) && !empty($weLaunchLicenses['woocommerce-plugin-bundle'])) ) {
        $args['display_name'] = '<span class="dashicons dashicons-yes-alt" style="color: #9CCC65 !important;"></span> ' . $args['display_name'];
    } else {
        $args['display_name'] = '<span class="dashicons dashicons-dismiss" style="color: #EF5350 !important;"></span> ' . $args['display_name'];
    }
    
    $framework::setArgs( $opt_name, $args );

    $framework::setSection( $opt_name, array(
        'title'  => esc_html__( 'Multi Inventory', 'woocommerce-multi-inventory' ),
        'id'     => 'general',
        'desc'   => esc_html__( 'Need support? Please use the comment function on codecanyon.', 'woocommerce-multi-inventory' ),
        'icon'   => 'el el-home',
    ) );


    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'General', 'woocommerce-multi-inventory' ),
        'desc'       => sprintf('%s<a href="' . admin_url('tools.php?page=welaunch-framework') . '">%s</a>', esc_html__( 'To get auto updates please ', 'woocommerce-multi-inventory' ), esc_html__( 'register your License here.', 'woocommerce-multi-inventory' )),
        'id'         => 'general-settings',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'enable',
                'type'     => 'switch',
                'title'    => esc_html__( 'Enable', 'woocommerce-multi-inventory' ),
                'default'  => 1,
            ),
            array(
                'id'       => 'inventoryPrices',
                'type'     => 'switch',
                'title'    => esc_html__( 'Set custom prices per inventory', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'When you edit a product in backend or ex / import you can set custom prices per choosen inventory.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('enable','equals','1'),
            ),
                array(
                    'id'       => 'inventoryPricesModifyWhenSelected',
                    'type'     => 'checkbox',
                    'title'    => esc_html__( 'Modify Price', 'woocommerce-multi-inventory' ),
                    'subtitle'    => esc_html__( 'When a user has selected an inventory it will show selected inventory price in loop & single product pages.', 'woocommerce-multi-inventory' ),
                    'default'  => 1,
                    'required' => array('inventoryPrices','equals','1'),
                ),   
            array(
                'id'       => 'defaultInventory',
                'type'     => 'select',
                'title'    => esc_html__('Default Inventory', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('Set a default inventory when a customer has not selected one. Leave empty to force customers to select one', 'woocommerce-multi-inventory'),
                'default'  => false,
                'options'  => $inventoriesSelect,
            ),
            array(
                'id'       => 'showInventoryInEmails',
                'type'     => 'switch',
                'title'    => esc_html__( 'Show Inventory in Emails', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Shows the selected inventory in Emails.', 'woocommerce-multi-inventory' ),
                'default'  => 1,
                'required' => array('enable','equals','1'),
            ),
                array(
                    'id'       => 'showInventoryDescriptionInEmails',
                    'type'     => 'checkbox',
                    'title'    => esc_html__( 'Show Inventory Description in Emails', 'woocommerce-multi-inventory' ),
                    'default'  => 0,
                    'required' => array('showInventoryInEmails','equals','1'),
                ),
           array(
                'id'       => 'hideProductsInCategories',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Hide unavailable Products', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'When a user has selected an inventory, hide other items in your shop categories, that are not available.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('enable','equals','1'),
            ),
            array(
                'id'       => 'emailInventory',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Email Inventory Notification', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Send new order mails to each inventory. The inventory must have a mail address set.', 'woocommerce-multi-inventory' ),
                'default'  => 1,
                'required' => array('enable','equals','1'),
            ),
            array(
                'id'       => 'inventoryRequired',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Inventory Required', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'When enabled, an inventory is always required when a product has at least one inventory (can have 0 stock too).', 'woocommerce-multi-inventory' ),
                'default'  => '1',
            ),
            array(
                'id'       => 'inventoryAllowEmptyProducts',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Allow Empty Inventory Products', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'Products without inventories can be added to cart. This does not affect 0 inventory products. Only empty strings.', 'woocommerce-multi-inventory' ),
                'default'  => '1',
            ),

            array(
                'id'       => 'googleAPIKey',
                'type'     => 'text',
                'title'    => esc_html__('Google API Key', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('This API key needs to be authorized and the distance matrix service needs to be enabled. You only need this when using radius shipping OR order flow by distance.'),
                'default'  => "",
            ),
            array(
                'id'       => 'googleAPIUseGeocoding',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Use Google Geocoding Instead of Distance Matrix', 'woocommerce-multi-inventory'),
                'subtitle' => __( 'Distance matrix is more precis as it calculates the distance by routes & streets, but costs more because it has to calculate route from user to EACH store. You can use geocoding only to calculate the distance by radius only once and save money. But it is not that precise. <br><b>When enabled:</b> Make sure each inventory as LAT / LNG data..', 'woocommerce-multi-inventory'),
                'default'  => 1,
            ),

            array(
                'id'       => 'excel2007',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Use Excel 2007', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'If you can not work with xlsx (Excel 2007 and higher) files, check this. You then can work with normal .xls files.', 'woocommerce-multi-inventory' ),
                'default'  => '0',
                'required' => array('enable','equals','1'),
            ),
            array(
                'id'   => 'importer',
                'type' => 'info',
                'desc' => 
                    '<div style="text-align:center;">
                        <p>' . esc_html__('To import products use the Excel file you get when clicking on Export Inventories button below.', 'woocommerce-multi-inventory') . '</p>
                        <a href="' . get_admin_url() . 'edit.php?post_type=stores&page=woocommerce_multi_inventory_options_options&woocommerce-multi-inventory-export" class="button button-success">' . esc_html__('Export Inventories', 'woocommerce-multi-inventory') . '</a>
                        <a href="' . get_admin_url() . 'admin.php?page=woocommerce-multi-inventory-importer" class="button button-primary">' . esc_html__('Import Inventories', 'woocommerce-multi-inventory') . '</a>  
                    </div>',
            ),
       )
    ) );

    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Cart', 'woocommerce-multi-inventory' ),
        'id'         => 'cart-settings',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'showInventoryInCartAndCheckout',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Show Inventory in Cart & Checkout', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Shows the selected inventory in cart and checkout pages.', 'woocommerce-multi-inventory' ),
                'default'  => 1,

            ),
            array(
                'id'       => 'restrictInventoryCart',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Restrict Cart to One Inventory', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'When enabled user can only purchae products within the same inventory. Other products will be removed from the cart if the selected inventory differs from existing cart inventories.', 'woocommerce-multi-inventory' ),
                'default'  => 0,

            ),
                array(
                    'id'       => 'restrictInventoryCartText',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Restrict Cart Info Text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Removed cart items, that were not the same inventory.', 'woocommerce-multi-inventory' ),
                    'required' => array('restrictInventoryCart', 'equals', '1' ),
                ),  


            array(
                'id'       => 'mixedCartInfo',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Mixed Cart info', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Show info text when cart has mixed inventories.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('enable','equals','1'),
            ),
                array(
                    'id'       => 'mixedCartInfoText',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Mixed Cart info text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Please note, that you have multiple inventories in your cart.', 'woocommerce-multi-inventory' ),
                    'required' => array('mixedCartInfo', 'equals', '1' ),
                ), 

            array(
                'id'       => 'cartShowSwitchInventory',
                'type'     => 'switch',
                'title'    => esc_html__( 'Show Switch Inventory Button', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Let users change the inventory of all items in cart.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
            ),

                array(
                    'id'       => 'cartShowSwitchInventoryButtonText',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Switch Inventory Button Text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Switch Inventory', 'woocommerce-multi-inventory' ),
                    'required' => array('cartShowSwitchInventory', 'equals', '1' ),
                ), 
                array(
                    'id'       => 'cartShowSwitchInventoryRemovedProductText',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Removed Product Text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( '%s has been removed as it is not available in new selected inventory.', 'woocommerce-multi-inventory' ),
                    'required' => array('cartShowSwitchInventory', 'equals', '1' ),
                ), 
                array(
                    'id'       => 'cartShowSwitchInventoryHook',
                    'type'     => 'select', 
                    'title'    => esc_html__('Hook', 'woocommerce-reward-points'),
                    'options'  => array(
                        'woocommerce_before_cart' => 'woocommerce_before_cart',
                        'woocommerce_before_cart_table' => 'woocommerce_before_cart_table',
                        'woocommerce_before_cart_contents' => 'woocommerce_before_cart_contents',
                        'woocommerce_after_cart_item_name' => 'woocommerce_after_cart_item_name',
                        'woocommerce_cart_contents' => 'woocommerce_cart_contents',
                        'woocommerce_cart_coupon' => 'woocommerce_cart_coupon',
                        'woocommerce_cart_actions' => 'woocommerce_cart_actions',
                        'woocommerce_after_cart_contents' => 'woocommerce_after_cart_contents',
                        'woocommerce_after_cart_table' => 'woocommerce_after_cart_table',
                        'woocommerce_before_cart_collaterals' => 'woocommerce_before_cart_collaterals',
                        'woocommerce_cart_collaterals' => 'woocommerce_cart_collaterals',
                        'woocommerce_after_cart' => 'woocommerce_after_cart',
                    ),
                    'default'  => 'woocommerce_cart_actions',
                    'required' => array('cartShowSwitchInventory','equals', '1' ),
                ),
                array(
                    'id'       => 'cartShowSwitchInventoryPriority',
                    'type'     => 'spinner',
                    'title'    => esc_html__('Hook Priority', 'woocommerce-reward-points'),
                    'default'  => '11',
                    'min'      => '0',
                    'step'     => '1',
                    'max'      => '99999999',
                    'required' => array('cartShowSwitchInventory','equals', '1' ),
                ),
        )
    ) ) ;

    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Stock Quantity', 'woocommerce-multi-inventory' ),
        'id'         => 'stock-settings',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'modifyStockQuantity',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Modify Stock Quantity', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'When a user has selected an inventory, our plugin returns current stock quantity for only selectec inventory.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('enable','equals','1'),
            ),
            array(
                'id'       => 'reduceManualOrdersStock',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Reduce Manual Orders Stock', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'When creating an order in backend, it will reduce stock too.', 'woocommerce-multi-inventory' ),
                'default'  => 1,
                'required' => array('enable','equals','1'),
            ),
            array(
                'id'       => 'restockUnpaidOrdersStock',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Restock Unpaid Orders', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Restock orders, that are changed from unpaid to cancelled automatically (not paid paypal for example).', 'woocommerce-multi-inventory' ),
                'default'  => 1,
                'required' => array('enable','equals','1'),
            ),
            array(
                'id'       => 'reduceStockOnPendingPayments',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Reduce Stock on Pending Payments', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'This is NOT a normal WooCommerce behaviour. Use with caution!', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('enable','equals','1'),
            ),
            array(
                'id'       => 'backendEditDisable',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Disable Backend Editing', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Disables updating inventory stocks when you edit a product. Use inventory Manger or im / exports instead. Good for performance!', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('enable','equals','1'),
            ),
            array(
                'id'       => 'showInventoriesInProductsBackend',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Show Inventories in Products Backend', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'In the products overview page in backend, this will show all inventories + stocks.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('enable','equals','1'),
            ),

        )
    ) );

    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Click & Collect', 'woocommerce-multi-inventory' ),
        'desc'       => esc_html__( 'Set products to deliver and to click and collect.', 'woocommerce-multi-inventory' ),
        'id'         => 'clickCollect',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'clickCollectEnable',
                'type'     => 'switch',
                'title'    => esc_html__( 'Enable Click & Collect', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'This allows you to set one inventory for delivery and all other inventories will be set to local pick up stores.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
            ),
            array(
                'id'       => 'deliveryInventory',
                'type'     => 'select',
                'title'    => esc_html__('Delivery Inventory', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('Set the delivery inventory.', 'woocommerce-multi-inventory'),
                'default'  => false,
                'options'  => $inventoriesSelect,
                'required' => array('clickCollectEnable','equals','1'),
            ),
            array(
                'id'       => 'clickCollectShowDeliveryInPopup',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Show Delivery Location in Popup', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'Will show delivery in the inventory popup. It will be shown next to the nearest physical location.', 'woocommerce-multi-inventory' ),
                'default'  => '1',
                'required' => array('clickCollectEnable','equals','1'),
            ),
                array(
                    'id'       => 'clickCollectShowDeliveryInPopupCustomTitle',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Delivery Location in Popup Custom Distance Text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( '', 'woocommerce-multi-inventory' ),
                    'required' => array('clickCollectShowDeliveryInPopup', 'equals', '1' ),
                ),
                array(
                    'id'       => 'clickCollectShowDeliveryInPopupCustomDistance',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Delivery Location in Popup Custom Distance Text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( '1 - 3 Days', 'woocommerce-multi-inventory' ),
                    'required' => array('clickCollectShowDeliveryInPopup', 'equals', '1' ),
                ),


            array(
                'id'       => 'clickCollectOerrideDeliveryAddress',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Override the delivery address', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'When order is a click & collect one, set the orders shipping / delivery address to the inventory address.', 'woocommerce-multi-inventory' ),
                'default'  => '1',
                'required' => array('clickCollectEnable','equals','1'),
            ),

            array(
                'id'       => 'clickCollectDeliveryShippingMethods',
                'type'     => 'select',
                'title'    => esc_html__( 'Delivery Shipping Methods', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__( 'You may select delivery shipping method here only. This will only show delivery shipping method AND disable delivery for pickup stores.', 'woocommerce-multi-inventory'),
                'options'  => $shippingMethods,
                'multi'    => true,
                'required' => array('clickCollectEnable','equals','1'),
            ),

            array(
                'id'       => 'clickCollectPickupShippingMethods',
                'type'     => 'select',
                'title'    => esc_html__( 'Click & Collect Shipping Methods', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__( 'You may select click & collect shipping method here only. This will only show click & collect shipping method AND disable delivery for pickup stores.', 'woocommerce-multi-inventory'),
                'options'  => $shippingMethods,
                'multi'    => true,
                'required' => array('clickCollectEnable','equals','1'),
            ),

            array(
                'id'       => 'clickCollectDeliveryPaymentGateways',
                'type'     => 'select',
                'title'    => esc_html__( 'Delivery Payment Gateways', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__( 'You may select delivery shipping method here only. This will only show delivery shipping method AND disable delivery for pickup stores.', 'woocommerce-multi-inventory'),
                'options'  => $paymentGateways,
                'multi'    => true,
                'required' => array('clickCollectEnable','equals','1'),
            ),

            array(
                'id'       => 'clickCollectPickupPaymentGateways',
                'type'     => 'select',
                'title'    => esc_html__( 'Click & Collect Payment Gateways', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__( 'You may select click & collect shipping method here only. This will only show click & collect shipping method AND disable delivery for pickup stores.', 'woocommerce-multi-inventory'),
                'options'  => $paymentGateways,
                'multi'    => true,
                'required' => array('clickCollectEnable','equals','1'),
            ),

            
        ) 
    ) ) ;

    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Product Page', 'woocommerce-multi-inventory' ),
        'desc'       => esc_html__( 'Configure inventories frontend output on product pages.', 'woocommerce-multi-inventory' ),
        'id'         => 'productPage',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'productPageEnable',
                'type'     => 'switch',
                'title'    => esc_html__( 'Enable productPage', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Show all available inventories in product frontend.', 'woocommerce-multi-inventory' ),
                'default'  => 1,
            ),

            array(
                'id'       => 'productPageValidateStock',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Validate Stock on Product Page', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'Shows correct selected stock on product page when inventory was selected. Otherwise it simulates an order and shows this as inventory.', 'woocommerce-multi-inventory' ),
                'default'  => '0',
            ),
            array(
                'id'       => 'productPageHideEmptyInventories',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Hide Empty Inventories', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'Do not show inventories with 0 stock.', 'woocommerce-multi-inventory' ),
                'default'  => '0',
                'required' => array('productPageEnable','equals','1'),
            ),
            array(
                'id'       => 'productPageDisplay',
                'type'     => 'select',
                'title'    => esc_html__('Display Type', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('Radio, Select or Label mode.', 'woocommerce-multi-inventory'),
                'default'  => 'label',
                'options'  => array( 
                    'radio' => esc_html__('Radio', 'woocommerce-multi-inventory'),
                    'select' => esc_html__('Select', 'woocommerce-multi-inventory'),
                    'label' => esc_html__('Label', 'woocommerce-multi-inventory'),
                    'labelPopup' => esc_html__('Label & Popup', 'woocommerce-multi-inventory'),
                    'hidden' => esc_html__('Hidden (user can not change inventory on product page)', 'woocommerce-multi-inventory'),
                    'text' => esc_html__('Text (only show stocks - no select, uses order flow on purchase)', 'woocommerce-multi-inventory'),
                    'textOnlySelected' => esc_html__('Text - only selected inventory / order flow on purchase)', 'woocommerce-multi-inventory'),
                ),
                'required' => array('productPageEnable', 'equals', '1' ),
            ),
                // Hidden
                array(
                    'id'       => 'productPageDisplayHiddenNoInventory',
                    'type'     => 'text',
                    'title'    => esc_html__( 'No Inventory selected text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Please select an inventory first.', 'woocommerce-multi-inventory' ),
                    'required' => array('productPageDisplay', 'equals', 'hidden' ),
                ),
                array(
                    'id'       => 'productPageDisplayHiddenOutOfStock',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Out of Stock text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Out of stock. Please select another inventory.', 'woocommerce-multi-inventory' ),
                    'required' => array('productPageDisplay', 'equals', 'hidden' ),
                ),                
                

                // Select
                array(
                    'id'       => 'productPageDisplaySelectPlaceholder',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Select Placeholder Text', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Please select an inventory', 'woocommerce-multi-inventory' ),
                    'required' => array('productPageDisplay', 'equals', 'select' ),
                ),

                // Text
                array(
                    'id'       => 'productPageDisplayTextTextBefore',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Text before', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Stock Info: ', 'woocommerce-multi-inventory' ),
                    'required' => array('productPageDisplay', 'equals', 'text' ),
                ),

                // Text only selected
                array(
                    'id'       => 'productPageDisplayTextOnlySelectedTextBefore',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Text before', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Selected inventory stock: ', 'woocommerce-multi-inventory' ),
                    'required' => array('productPageDisplay', 'equals', 'textOnlySelected' ),
                ),

                // Label
                array(
                    'id'       => 'productPageDisplayLabelText',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Label - Text', 'woocommerce-multi-inventory' ),
                    'subtitle'    => esc_html__( 'Use variables: {{stock}} {{inventory}} and {{delivery_time}}', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'There are {{stock}} items available in your selected inventory {{inventory}}.', 'woocommerce-multi-inventory' ),
                    // 'required' => array('productPageDisplay', 'equals', 'label' ),
                ),
                array(
                    'id'       => 'productPageDisplayLabelChange',
                    'type'     => 'text',
                    'title'    => esc_html__( 'Label - Change Inventory', 'woocommerce-multi-inventory' ),
                    'default'  => esc_html__( 'Change Inventory', 'woocommerce-multi-inventory' ),
                    // 'required' => array('productPageDisplay', 'equals', 'label' ),
                ),
            array(
                'id'       => 'productPageStockDisplay',
                'type'     => 'select',
                'title'    => esc_html__('Inventory Stock Display', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('How the stock quantity should be shown.', 'woocommerce-multi-inventory'),
                'default'  => 'count',
                'options'  => array( 
                    'count' => esc_html__('Count (2 in Stock)', 'woocommerce-multi-inventory'),
                    'inout' => esc_html__('In / Out of Stock', 'woocommerce-multi-inventory'),
                    'hidden' => esc_html__('Hidden', 'woocommerce-multi-inventory'),
                ),
                'required' => array('productPageEnable', 'equals', '1' ),
            ),

            array(
                'id'       => 'productPageOrder',
                'type'     => 'select',
                'title'    => esc_html__('Inventories Order', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('Specify the order of the inventories on the product page. When using "order" you need to maintain the order on inventory level by editing it.', 'woocommerce-multi-inventory'),
                'default'  => 'most_stock',
                'options'  => array( 
                    'order' => esc_html__('By Order', 'woocommerce-multi-inventory'),
                    'name' => esc_html__('By Name', 'woocommerce-multi-inventory'),
                    'most_stock' => esc_html__('Most Stock', 'woocommerce-multi-inventory'),
                    'lowest_stock' => esc_html__('Lowest Stock', 'woocommerce-multi-inventory'),
                ),
                'required' => array('productPageEnable', 'equals', '1' ),
            ),
            array(
                'id'       => 'productPagePosition',
                'type'     => 'select',
                'title'    => esc_html__('Hook Position', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('Specify the positon of the inventories on product page.', 'woocommerce-multi-inventory'),
                'default'  => 'woocommerce_before_add_to_cart_button',
                'options'  => array( 
                    'woocommerce_before_add_to_cart_button' => 'woocommerce_before_add_to_cart_button',
                    'woocommerce_before_add_to_cart_quantity' => 'woocommerce_before_add_to_cart_quantity',
                    'woocommerce_after_add_to_cart_quantity' => 'woocommerce_after_add_to_cart_quantity',
                    'woocommerce_after_add_to_cart_button' => 'woocommerce_after_add_to_cart_button',
                    'none' => esc_html__('None (Shortcode)', 'woocommerce-multi-inventory'),

                    // not tested with form submit
                    'woocommerce_before_single_product' => __('Before Single Product', 'woocommerce-multi-inventory'),
                    'woocommerce_before_single_product_summary' => __('Before Single Product Summary', 'woocommerce-multi-inventory'),
                    'woocommerce_single_product_summary' => __('In Single Product Summary', 'woocommerce-multi-inventory'),
                    'woocommerce_before_add_to_cart_form' => __('Before Add To Cart Form', 'woocommerce-multi-inventory'),
                    'woocommerce_after_add_to_cart_form' => __('After Add To Cart Form', 'woocommerce-multi-inventory'),
                    'woocommerce_product_meta_start' => __('Before Meta Information', 'woocommerce-multi-inventory'),
                    'woocommerce_product_meta_end' => __('After Meta Information', 'woocommerce-multi-inventory'),
                    'woocommerce_after_single_product_summary' => __('After Single Product Summary', 'woocommerce-multi-inventory'),
                    'woocommerce_after_single_product' => __('After Single Product', 'woocommerce-multi-inventory'),
                    'woocommerce_after_main_content' => __('After Main Product', 'woocommerce-multi-inventory'),
                ),
                'required' => array('productPageEnable', 'equals', '1' ),
            ),
            array(
                'id'       => 'productPagePriority',
                'type'     => 'spinner',
                'title'    => esc_html__( 'Hook Priority', 'woocommerce-multi-inventory' ),
                'min'      => '1',
                'step'     => '1',
                'max'      => '999',
                'default'  => '5',
                'required' => array('productPageEnable', 'equals', '1' ),
            ),
       )
    ) );

    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Product Category', 'woocommerce-multi-inventory' ),
        'desc'      => '',
        'id'         => 'product-category',
        'subsection' => true,
        'fields'     => array(

            array(
                'id'       => 'productCategory',
                'type'     => 'switch',
                'title'    => esc_html__( 'Enable Product Category', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'Show Inventory information in product category pages', 'woocommerce-multi-inventory' ),
                'default'  => 0
            ),
           
            array(
                'id'       => 'productCategoryHook',
                'type'     => 'select', 
                'title'    => esc_html__('Product Hook', 'woocommerce-multi-inventory'),
                'options'  => array(
                    'woocommerce_before_shop_loop_item' => 'woocommerce_before_shop_loop_item',
                    'woocommerce_before_shop_loop_item_title' => 'woocommerce_before_shop_loop_item_title',
                    'woocommerce_shop_loop_item_title' => 'woocommerce_shop_loop_item_title',
                    'woocommerce_after_shop_loop_item_title' => 'woocommerce_after_shop_loop_item_title',
                    'woocommerce_after_shop_loop_item' => 'woocommerce_after_shop_loop_item',
                ),
                'default'  => 'woocommerce_after_shop_loop_item_title',
                'required' => array('productCategory','equals', '1' ),
            ),
            array(
                'id'       => 'productCategoryHookPriority',
                'type'     => 'spinner',
                'title'    => esc_html__('Product  Hook Priority', 'woocommerce-multi-inventory'),
                'default'  => '15',
                'min'      => '0',
                'step'     => '1',
                'max'      => '99999999',
                'required' => array('productCategory','equals', '1' ),
            ),
        )
    ));

   $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Popup', 'woocommerce-multi-inventory' ),
        'desc'       => esc_html__( 'Configure the select inventory popup', 'woocommerce-multi-inventory' ),
        'id'         => 'popup',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'popupEnable',
                'type'     => 'switch',
                'title'    => esc_html__( 'Enable Inventory Popup', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'Shows a popup for users to select an inventory. Use this shortcode to let people change the inventory: [woocommerce_multi_inventory_change_inventory]', 'woocommerce-multi-inventory' ),
                'default'  => '1',
            ),
            array(
                'id'       => 'popupLayout',
                'type'     => 'select', 
                'title'    => esc_html__('Layout', 'woocommerce-multi-inventory'),
                'options'  => array(
                    '1' => esc_html__('Layout 1 (2 Columns)', 'woocommerce-multi-inventory'),
                    '2' => esc_html__('Layout 2 (1 Column)', 'woocommerce-multi-inventory'),
                    '3' => esc_html__('Layout 3 (List view / 1 Column)', 'woocommerce-multi-inventory'),
                ),
                'default'  => '2',
                'required' => array('popupEnable','equals', '1' ),
            ),
            array(
                'id'       => 'popupShowAutomatically',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Show popup automatically', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'When a user has no location inventory checked before, the popup will show automatically.', 'woocommerce-multi-inventory' ),
                'default'  => 1,
                'required' => array('popupEnable','equals','1'),
            ),
            array(
                'id'       => 'popupHideClose',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Hide popup close', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Thos forces a user to select an inventory. He can not close the popup.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('popupEnable','equals','1'),
            ),
            array(
                'id'       => 'popupShowStock',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Show Product Stock', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Works when you pass product_id to the shortcode or a global product page is used.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('popupEnable','equals','1'),
            ),
            array(
                'id'       => 'popupDisableGeolocation',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Disable Auto Geolocation', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Enable this to not get the current users position when popup opens.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('popupEnable','equals','1'),
            ),
            array(
                'id'       => 'popupShowSearch',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Show search / address field', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'You need to enter a valid google api key in general settings to use the search.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('popupEnable','equals','1'),
            ),
                array(
                    'id'       => 'popupShowSearchAutocomplete',
                    'type'     => 'checkbox',
                    'title'    => esc_html__( 'Search Autocomplete', 'woocommerce-multi-inventory' ),
                    'subtitle'    => esc_html__( 'Uses google places autocomplete to show suggested adresses when typing.', 'woocommerce-multi-inventory' ),
                    'default'  => 0,
                    'required' => array('popupShowSearch','equals','1'),
                ),
            array(
                'id'       => 'popupMiles',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Use Miles (not KM)', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Use miles instead of kilometers.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
                'required' => array('popupEnable','equals','1'),
            ),
            array(
                'id'       => 'popupText',
                'type'  => 'editor',
                'args'   => array(
                    'teeny'            => false,
                ),
                'title'    => esc_html__( 'Popup text', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Welcome to our Online Shop. Please select your nearest Store.', 'woocommerce-multi-inventory' ),
                'required' => array('popupEnable', 'equals', '1' ),
            ),
            array(
                'id'       => 'popupAllLocationsText',
                'type'  => 'editor',
                'args'   => array(
                    'teeny'            => false,
                ),
                'title'    => esc_html__( 'All Locations Intro text', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Not the store you searched for? We have more ...', 'woocommerce-multi-inventory' ),
                'required' => array('popupEnable', 'equals', '1' ),
            ),
            array(
                'id'        => 'popupBackgroundColor',
                'type'      => 'color',
                'title'    => esc_html__('Background Color', 'woocommerce-multi-inventory'), 
                'default'   => '#fff',  
                'required' => array('popupEnable', 'equals', '1'),          
            ),
            array(
                'id'        => 'popupTextColor',
                'type'      => 'color',
                'title'    => esc_html__('Text Color', 'woocommerce-multi-inventory'), 
                'default'   => '#000',  
                'required' => array('popupEnable', 'equals', '1'),          
            ),

            array(
                'id'        => 'popupButtonBackgroundColor',
                'type'      => 'color',
                'title'    => esc_html__('Background Color', 'woocommerce-multi-inventory'), 
                'default'   => '#000',  
                'required' => array('popupEnable', 'equals', '1'),          
            ),
            array(
                'id'        => 'popupButtonTextColor',
                'type'      => 'color',
                'title'    => esc_html__('Text Color', 'woocommerce-multi-inventory'), 
                'default'   => '#fff',  
                'required' => array('popupEnable', 'equals', '1'),          
            ),

            array(
                'id'       => 'popupMaxResults',
                'type'     => 'spinner',
                'title'    => esc_html__('Max Results', 'woocommerce-multi-inventory'),
                'default'  => '100',
                'min'      => '1',
                'step'     => '1',
                'max'      => '99999999',
                'required' => array('popupEnable', 'equals', '1'),  
            ),
       )
    ) );


   $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Order Flow', 'woocommerce-multi-inventory' ),
        'desc'       => esc_html__( 'Manage what inventory is used for new orders.', 'woocommerce-multi-inventory' ),
        'id'         => 'orderFlow',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'orderFlowOption',
                'type'     => 'select',
                'title'    => esc_html__('Order flow', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('Specify how orders should be assigned to an inventory / store. Note: User selected inventory is always prio first! When nothing is selected or you disable the product page inventory selection the below order flow will happen.', 'woocommerce-multi-inventory'),
                'default'  => 'most_stock',
                'options'  => array( 
                    'custom' => esc_html__('Custom Inventory', 'woocommerce-multi-inventory'), 
                    'country' => esc_html__('By Country', 'woocommerce-multi-inventory'), 
                    'order' => esc_html__('By Order', 'woocommerce-multi-inventory'),
                    'name' => esc_html__('By Name', 'woocommerce-multi-inventory'),
                    'distance' => esc_html__('Nearest Location based on Customer address', 'woocommerce-multi-inventory'),
                    'most_stock' => esc_html__('Most Stock', 'woocommerce-multi-inventory'),
                    'lowest_stock' => esc_html__('lowest Stock', 'woocommerce-multi-inventory'),
                ),
            ),
                array(
                    'id'       => 'orderFlowAlwaysUse',
                    'type'     => 'checkbox',
                    'title'    => esc_html__('Always Use Order Flow', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('Regardless if the user has choosen an inventory always use the order flow set above.', 'woocommerce-multi-inventory'), 
                    'default'  => 0,
                ),
                array(
                    'id'       => 'orderFlowSplitOrders',
                    'type'     => 'checkbox',
                    'title'    => esc_html__('Split Orders', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('When an order contains multiple different inventories, split the order for each inventory.', 'woocommerce-multi-inventory'), 
                    'default'  => 0,
                ),
                array(
                    'id'       => 'orderFlowCustomInventory',
                    'type'     => 'select',
                    'title'    => esc_html__('Custom Inventory', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('Fallback, if the inventory has no stock, is the name order.', 'woocommerce-multi-inventory'),
                    'default'  => '',
                    'options'  => $inventoriesSelect,
                    'required' => array('orderFlowOption','equals','custom'),
                ),
                array(
                    'id'       => 'orderFlowFallback',
                    'type'     => 'select',
                    'title'    => esc_html__('Country Inventory Fallback', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('Fallback Inventory when no matching country inventory found.', 'woocommerce-multi-inventory'),
                    'default'  => '',
                    'options'  => $inventoriesSelect,
                    'required' => array('orderFlowOption','equals','country'),
                ),
                array(
                    'id'       => 'useGeojs',
                    'type'     => 'checkbox',
                    'title'    => esc_html__('Use GEO IP ', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('When a country was not found, use geojs service to get country by IP. Otherwise a user may not be able to add a product to cart. Note GPDR / privacy laws!', 'woocommerce-multi-inventory'),
                    'default'  => false,
                    'required' => array('orderFlowOption','equals','country'),
                ),
                
       )
    ) );

    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Texts', 'woocommerce-multi-inventory' ),
        'desc'       => esc_html__( 'Set texts.', 'woocommerce-multi-inventory' ),
        'id'         => 'texts',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'textsInventoryLabel',
                'type'     => 'text',
                'title'    => esc_html__( 'Inventory / Warehouse Label', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Inventory', 'woocommerce-multi-inventory' ),
            ),
            array(
                'id'       => 'textsStock',
                'type'     => 'text',
                'title'    => esc_html__( '%d on Stock', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( '%d on Stock', 'woocommerce-multi-inventory' ),
            ),
            array(
                'id'       => 'textsLeftInStock',
                'type'     => 'text',
                'title'    => esc_html__( 'Left in Stock', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( '%s in stock', 'woocommerce-multi-inventory' ),
            ),
            array(
                'id'       => 'textsInStock',
                'type'     => 'text',
                'title'    => esc_html__( 'On Stock', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'On Stock', 'woocommerce-multi-inventory' ),
            ), 
            array(
                'id'       => 'textsOutOfStock',
                'type'     => 'text',
                'title'    => esc_html__( 'Out of Stock', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Out of Stock', 'woocommerce-multi-inventory' ),
            ),
            array(
                'id'       => 'textsNotInStock',
                'type'     => 'text',
                'title'    => esc_html__( 'Not in Stock', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( '%s not in stock (only %s in stock at inventory %s)', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Not in Stock', 'woocommerce-multi-inventory' ),
            ), 
            array(
                'id'       => 'textsNotEnoughStock',
                'type'     => 'text',
                'title'    => esc_html__( 'Not enough Stock', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Sorry. You can not purchase more than %d items from %s inventory.', 'woocommerce' ),
            ), 
            array(
                'id'       => 'textsNoInventorySelected',
                'type'     => 'text',
                'title'    => esc_html__( 'No Inventory Selected', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Please select an inventory before adding this product to cart.', 'woocommerce' ),
            ), 
            array(
                'id'       => 'textsDeliveryTime',
                'type'     => 'text',
                'title'    => esc_html__( 'Delivery Time', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Delivery Time: ', 'woocommerce-multi-inventory' ),
            ),
            array(
                'id'       => 'textsSelectStore',
                'type'     => 'text',
                'title'    => esc_html__( 'Select store', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Select store', 'woocommerce-multi-inventory' ),
            ), 
            array(
                'id'       => 'textsLocalPickup',
                'type'     => 'text',
                'title'    => esc_html__( 'Local Pickup', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Local Pickup', 'woocommerce-multi-inventory' ),
            ), 
            array(
                'id'       => 'textsDelivery',
                'type'     => 'text',
                'title'    => esc_html__( 'Delivery', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Delivery', 'woocommerce-multi-inventory' ),
            ), 
            array(
                'id'       => 'textsPopupSearchAddress',
                'type'     => 'text',
                'title'    => esc_html__( 'Enter your address', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Enter your address', 'woocommerce-multi-inventory' ),
            ),
            array(
                'id'       => 'textsPopupSearch',
                'type'     => 'text',
                'title'    => esc_html__( 'Search', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( 'Search', 'woocommerce-multi-inventory' ),
            ),
            
       )
    ) );

    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Delivery Costs', 'woocommerce-multi-inventory'),
        'desc'       => esc_html__('Set custom delivery costs per inventory.', 'woocommerce-multi-inventory'),
        'id'         => 'delivery-costs',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'deliveryCosts',
                'type'     => 'switch', 
                'title'    => esc_html__('Enable Delivery Costs', 'woocommerce-multi-inventory'),
                'subtitle'    => esc_html__('You can put delivery costs per inventory in the backend when you edit an invetory.', 'woocommerce-multi-inventory'),
                'default'  => false,
            ),
            array(
                'id'       => 'deliveryCostsText',
                'type'     => 'text',
                'title'    => esc_html__( 'Delivery Costs Label', 'woocommerce-multi-inventory' ),
                'default'  => esc_html__( '%s Delivery Costs', 'woocommerce-multi-inventory' ),
                'required' => array('deliveryCosts','equals','1'),
            ), 
       )
    ) );


    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Radius Shipping', 'woocommerce-multi-inventory'),
        'desc'       => esc_html__('This currently only works when using nearst location order flow!', 'woocommerce-multi-inventory'),
        'id'         => 'delivery-radius-shipping',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'radiusShipping',
                'type'     => 'switch', 
                'title'    => esc_html__('Enable Radius Shipping', 'woocommerce-multi-inventory'),
                'subtitle'    => esc_html__('This currently only works when using nearst location order flow!', 'woocommerce-multi-inventory'),
                'default'  => false,
            ),
            array(
                'id'       => 'radiusShippingUseMiles',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Use Miles instead of KM', 'woocommerce-multi-inventory'),
                'default'  => 0,
                'required' => array('radiusShipping','equals','1'),
            ),
            array(
                'id'       => 'radiusShippingMethods',
                'type'     => 'select',
                'title'    => esc_html__( 'Shipping Methods', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__( 'Apply radius check on these shipping methods.', 'woocommerce-multi-inventory'),
                'options'  => $shippingMethods,
                'multi'    => true,
                'required' => array('radiusShipping','equals','1'),
            ),
                array(
                    'id'       => 'radiusShippingMethodsEmpty',
                    'type'     => 'text',
                    'title'    => esc_html__('Error Message', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('Example: Empty Delivery method', 'woocommerce-multi-inventory'),
                    'default'  => "Empty Delivery method",
                    'required' => array('radiusShippingDistanceEnable','equals','1'),
                ),

            // Fees
            array(
                'id'       => 'radiusShippingFeesEnable',
                'type'     => 'switch', 
                'title'    => esc_html__('Enable Radius Shipping Fees', 'woocommerce-multi-inventory'),
                'default'  => false,
                'required' => array('radiusShipping','equals','1'),
            ),
                array(
                    'id'       => 'radiusShippingFeesLabel',
                    'type'     => 'text',
                    'title'    => esc_html__('Label', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('Name of the fee. For example: Delivery Fee.', 'woocommerce-multi-inventory'),
                    'default'  => esc_html__('Delivery Fee', 'woocommerce-multi-inventory'),
                    'required' => array('radiusShippingFeesEnable','equals','1'),
                ),

                array(
                    'id'       => 'radiusShippingFees',
                    'type'     => 'multi_text',
                    'title'    => esc_html__('Delivery Distance Fees', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('Only one fee per row! Enter distance first, then the fee amount divided by |. Example: 1|5 => within 1 to 20 miles, $5 fee will be added. Continue with 20|8 for example. Always start with 1.', 'woocommerce-multi-inventory'),
                    'default'  => array(),
                    'required' => array('radiusShippingFeesEnable','equals','1'),
                ),
                array(
                    'id'       => 'radiusShippingFeesTaxable',
                    'type'     => 'checkbox',
                    'title'    => esc_html__( 'Fees taxable', 'woocommerce-multi-inventory'),
                    'default'  => 1,
                    'required' => array('radiusShippingFeesEnable','equals','1'),
                ),

            array(
                'id'       => 'radiusShippingDistanceEnable',
                'type'     => 'switch', 
                'title'    => esc_html__('Enable Radius Shipping Distance', 'woocommerce-multi-inventory'),
                'default'  => false,
                'required' => array('radiusShipping','equals','1'),
            ),
                array(
                    'id'       => 'radiusShippingDistanceRadius',
                    'type'     => 'spinner', 
                    'title'    => esc_html__('Radius (km or miles)', 'woocommerce-multi-inventory'),
                    'default'  => '30',
                    'min'      => '1',
                    'step'     => '1',
                    'max'      => '999',
                    'required' => array('radiusShippingDistanceEnable','equals','1'),
                ),
                array(
                    'id'       => 'radiusShippingDistanceMessage',
                    'type'     => 'text',
                    'title'    => esc_html__('Error Message', 'woocommerce-multi-inventory'),
                    'subtitle' => esc_html__('Example: Sorry we only ship within X km / miles.', 'woocommerce-multi-inventory'),
                    'default'  => "Sorry we only ship within 30 km.",
                    'required' => array('radiusShippingDistanceEnable','equals','1'),
                ),

        )
    ));

    $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Inventory Users', 'woocommerce-multi-inventory' ),
        'id'         => 'inventory-users',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'inventoryUsers',
                'type'     => 'switch',
                'title'    => esc_html__( 'Enable Inventory Users', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'When enabled you can edit users and grant them access to inventories. When they have access to inventory X for example, they will only see orders with this inventory and get email notifications.', 'woocommerce-multi-inventory' ),
                'default'  => 0,
            ),
            array(
                'id'       => 'inventoryUsersOrdersBackend',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Limit Orders Backend', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Only show orders in backend where users have access to the inventory.', 'woocommerce-multi-inventory' ),
                'default'  => 1,
                'required' => array('inventoryUsers','equals','1'),
            ),
            array(
                'id'       => 'inventoryUsersEmail',
                'type'     => 'checkbox',
                'title'    => esc_html__( 'Email Orders', 'woocommerce-multi-inventory' ),
                'subtitle'    => esc_html__( 'Email new orders to Inventory users.', 'woocommerce-multi-inventory' ),
                'default'  => 1,
                'required' => array('inventoryUsers','equals','1'),
            ),

        )
    ) );

   $framework::setSection( $opt_name, array(
        'title'      => esc_html__( 'Advanced', 'woocommerce-multi-inventory' ),
        'desc'       => esc_html__( 'Advanced Settings', 'woocommerce-multi-inventory' ),
        'id'         => 'advanced',
        'subsection' => true,
        'fields'     => array(
            array(
                'id'       => 'googleAPIDebug',
                'type'     => 'switch',
                'title'    => esc_html__('Google Debug Mode', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('Enable when distance calculation OR radius shipping is not working or for testing', 'woocommerce-multi-inventory'), 
                'default'  => 0,
            ),
            array(
                'id'       => 'disableStateReplace',
                'type'     => 'switch',
                'title'    => esc_html__('Disable State Replace', 'woocommerce-multi-inventory'),
                'subtitle' => esc_html__('Disables adding inventory URL parameter to all links of your site. Note: enabling this can cause issues with caching.', 'woocommerce-multi-inventory'), 
                'default'  => 0,
            ),
            array(
                'id'       => 'productVariationsAddTerms',
                'type'     => 'switch',
                'title'    => esc_html__( 'Variations Add terms', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'Assign the inventory taxonomy also to variations. This allows you to filter variations for example when using our single variations plugin.', 'woocommerce-multi-inventory' ),
                'default'  => '0',
            ),
            array(
                'id'       => 'wpmlSupport',
                'type'     => 'switch',
                'title'    => esc_html__( 'WPML Support', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'This will update / reduce the stock on default language and sync it to other languages.', 'woocommerce-multi-inventory' ),
                'default'  => '1',
            ),
            array(
                'id'       => 'loggingEnabled',
                'type'     => 'switch',
                'title'    => esc_html__( 'Enable Logging', 'woocommerce-multi-inventory' ),
                'subtitle' => esc_html__( 'This will log all product stock updates in a file.', 'woocommerce-multi-inventory' ),
                'default'  => '0',
            ),

        ) 
    ) );