<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://welaunch.io/plugins
 * @since      1.0.0
 * @usage 	   https://github.com/teampickr/php-google-maps-distance-matrix
 * @package    WooCommerce_Multi_Inventory
 * @subpackage WooCommerce_Multi_Inventory/public
 */
class WooCommerce_Multi_Inventory_Delivery_Costs extends WooCommerce_Multi_Inventory {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $plugin_name    The ID of this plugin.
	 */
	protected $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $version    The current version of this plugin.
	 */
	protected $version;

	/**
	 * options of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      array    $options
	 */
	protected $options;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct($plugin_name, $version ) 
	{
		$this->plugin_name = $plugin_name;
		$this->version = $version;
	}
	
    /**
     * Inits the WooCommerce Multi_Inventory
     * @author Daniel Barenkamp
     * @version 1.0.0
     * @since   1.0.0
     * @link    https://welaunch.io
     * @return  [type]                       [description]
     */
    public function init()
    {
		global $woocommerce_multi_inventory_options;
		$this->options = $woocommerce_multi_inventory_options;

		if (!$this->get_option('enable') || !$this->get_option('deliveryCosts')) {
			return false;
		}

		add_action('woocommerce_cart_calculate_fees', array($this, 'add_fee'), 10, 1);
    }

    public function add_fee()
    {

    	global $woocommerce;

    	$deliveryCostsText = $this->get_option('deliveryCostsText');

    		// } else {
			//     $fees = $woocommerce->cart->get_fees();
			//     foreach ($fees as $key => $fee) {
			//         if($fees[$key]->name === $radiusShippingFeesLabel ) {
			//             unset($fees[$key]);
			//         }
			//     }
			//     $woocommerce->cart->fees_api()->set_fees($fees);
			// }

		foreach ( WC()->cart->get_cart() as $cart_item_key => &$cart_item ) {
			
			if(!isset($cart_item['woocommerce_multi_inventory_inventory'])) {
				continue;
			}

			if(!isset($cart_item['woocommerce_multi_inventory_inventory']['value']) || $cart_item['woocommerce_multi_inventory_inventory']['value'] < 1 ) {
				continue;
			}

			$inventory_id = intval($cart_item['woocommerce_multi_inventory_inventory']['value']);

			$inventory = get_term($inventory_id, 'inventories');
			if(!$inventory) {
				continue;
			}

			$costs = (float) get_term_meta($inventory_id, 'woocommerce_multi_inventory_costs', true);
			if(empty($costs)) {
				continue;
			}
			
			$text = sprintf($deliveryCostsText, $inventory->name);

			$woocommerce->cart->add_fee( $text, $costs, true );	
	
		}
    }
}
