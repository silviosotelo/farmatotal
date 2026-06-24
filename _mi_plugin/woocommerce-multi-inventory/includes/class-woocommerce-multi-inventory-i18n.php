<?php

/**
 * Define the internationalization functionality
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @link       https://welaunch.io/plugins
 * @since      1.0.0
 *
 * @package    WooCommerce_Multi_Inventory
 * @subpackage WooCommerce_Multi_Inventory/includes
 */

/**
 * Define the internationalization functionality.
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @since      1.0.0
 * @package    WooCommerce_Multi_Inventory
 * @subpackage WooCommerce_Multi_Inventory/includes
 * @author     Daniel Barenkamp <support@welaunch.io>
 */
class WooCommerce_Multi_Inventory_i18n {


	/**
	 * Load the plugin text domain for translation.
	 *
	 * @since    1.0.0
	 */
	public function load_plugin_textdomain() {

		$loaded = load_plugin_textdomain(
			'woocommerce-multi-inventory',
			false,
			dirname( dirname( plugin_basename( __FILE__ ) ) ) . '/languages/'
		);

	}



}
