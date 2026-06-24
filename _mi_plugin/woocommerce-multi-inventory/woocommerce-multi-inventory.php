<?php

/**
 * The plugin bootstrap file
 *
 *
 * @link              https://welaunch.io
 * @since             1.0.0
 * @package           WooCommerce_Multi_Inventory
 *
 * @wordpress-plugin
 * Plugin Name:       WooCommerce Multi Inventory & Warehouses
 * Plugin URI:        https://www.welaunch.io/en/product/woocommerce-multi-inventory/
 * Description:       Create multiple inventories & warehouses for WooCommerce with ease
 * Version:           1.5.7
 * Author:            weLaunch
 * Author URI:        https://welaunch.io
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       woocommerce-multi-inventory
 * Domain Path:       /languages
 * WC tested up to:   5.0.0
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-woocommerce-multi-inventory-activator.php
 */
function welaunch_woocommerce_multi_inventory_activate() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-woocommerce-multi-inventory-activator.php';
	WooCommerce_Multi_Inventory_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-woocommerce-multi-inventory-deactivator.php
 */
function welaunch_woocommerce_multi_inventory_deactivate() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-woocommerce-multi-inventory-deactivator.php';
	WooCommerce_Multi_Inventory_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'welaunch_woocommerce_multi_inventory_activate' );
register_deactivation_hook( __FILE__, 'welaunch_woocommerce_multi_inventory_deactivate' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-woocommerce-multi-inventory.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function welaunch_woocommerce_multi_inventory_run() {

	$plugin_data = get_plugin_data( __FILE__, true, false);
	$version = $plugin_data['Version'];

	$plugin = new WooCommerce_Multi_Inventory($version);
	$plugin->run();

	return $plugin;
}

include_once( ABSPATH . 'wp-admin/includes/plugin.php' );
if ( is_plugin_active( 'woocommerce/woocommerce.php') && (is_plugin_active('redux-dev-master/redux-framework.php') || is_plugin_active('redux-framework/redux-framework.php') || is_plugin_active('welaunch-framework/welaunch-framework.php') ) ){
	$WooCommerce_Multi_Inventory = welaunch_woocommerce_multi_inventory_run();
} else {
	add_action( 'admin_notices', 'welaunch_woocommerce_multi_inventory_installed_notice' );
}

function welaunch_woocommerce_multi_inventory_installed_notice()
{
	?>
    <div class="error">
      <p><?php esc_html_e( 'WooCommerce Multi Inventory requires the WooCommerce & weLaunch Framework plugin. Please install or activate them before: https://www.welaunch.io/updates/welaunch-framework.zip', 'woocommerce-multi-inventory'); ?></p>
    </div>
    <?php
}