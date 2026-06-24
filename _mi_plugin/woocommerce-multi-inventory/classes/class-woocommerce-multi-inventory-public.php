<?php

use TeamPickr\DistanceMatrix\DistanceMatrix;
use TeamPickr\DistanceMatrix\Response\DistanceMatrixResponse;
use TeamPickr\DistanceMatrix\Response\Element;
use TeamPickr\DistanceMatrix\TravelMode;
use TeamPickr\DistanceMatrix\Licenses\StandardLicense;

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://welaunch.io/plugins/woocommerce-multi-inventory/
 * @since      1.0.0
 *
 * @package    WooCommerce_delivery
 * @subpackage WooCommerce_delivery/public
 */
class WooCommerce_Multi_Inventory_Public extends WooCommerce_Multi_Inventory {

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
	protected $data;
	protected $selectedLocation;


	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) 
	{
		$this->plugin_name = $plugin_name;
		$this->version = $version;
		$this->data = array();

		$this->selectedLocation = 0;
	}

	/**
	 * Enqueu Styles
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https://welaunch.io
	 * @return  [type]                       [description]
	 */
	public function enqueue_scripts_styles() 
	{
		global $woocommerce_multi_inventory_options;
		$this->options = $woocommerce_multi_inventory_options;

		if (!$this->get_option('enable')) {
			return false;
		}

		wp_enqueue_style( $this->plugin_name . '-public', plugin_dir_url( dirname( __FILE__ ) ) . 'assets/css/woocommerce-multi-inventory-public.css', array(), $this->version, 'all' );

		// Just tiered pricing JS
		if($this->get_option('performanceOnlyWooPages') && !is_product() && !class_exists('WordPress_Store_Locator')) {
			return;
		}
			
		if($this->get_option('googleAPIKey') && $this->get_option('popupShowSearch')) {
	        $mapsJS = 'https://maps.googleapis.com/maps/api/js?libraries=places&callback=Function.prototype';
	        $googleApiKey = $this->get_option('googleAPIKey');
	        if (!empty($googleApiKey)) {
	            $mapsJS = $mapsJS . '&key=' . $googleApiKey;
	        }
	        wp_enqueue_script($this->plugin_name . '-gmaps', $mapsJS, array(), $this->version, true);
        }

		wp_enqueue_script( $this->plugin_name . '-public', plugin_dir_url( dirname( __FILE__ ) ). 'assets/js/woocommerce-multi-inventory-public.js', array('jquery'), $this->version, true);

		$forJS = array(
			'ajax_url' => admin_url('admin-ajax.php'),
			'textsLeftInStock' => $this->get_option('textsLeftInStock'),
			'popupEnable' => $this->get_option('popupEnable'),
			'productPageDisplay' => $this->get_option('productPageDisplay'),
			'popupMiles' => $this->get_option('popupMiles'),
			'popupShowAutomatically' => $this->get_option('popupShowAutomatically'),
			'googleAPIKey' => $this->get_option('googleAPIKey'),
			'popupShowSearchAutocomplete' => $this->get_option('popupShowSearchAutocomplete'),
			'defaultInventory' => $this->get_option('defaultInventory'),
			'popupDisableGeolocation' => $this->get_option('popupDisableGeolocation'),			
			'disableStateReplace' => $this->get_option('disableStateReplace'),
			'productPageStockDisplay' => $this->get_option('productPageStockDisplay'),
			'textsInStock' => $this->get_option('textsInStock'),
			'textsOutOfStock' => $this->get_option('textsOutOfStock'),
			'popupHideClose' => $this->get_option('popupHideClose'),			
			'productPageValidateStock' => $this->get_option('productPageValidateStock'),
		);
        wp_localize_script($this->plugin_name . '-public', 'woocommerce_multi_inventory_options', $forJS);

	}

	
	public function init()
	{
		global $woocommerce_multi_inventory_options;
		$this->options = $woocommerce_multi_inventory_options;

		if (!$this->get_option('enable')) {
			return false;
		}

		if(isset($_COOKIE['woocommerce_multi_inventory_inventory']) && !empty($_COOKIE['woocommerce_multi_inventory_inventory'])) {
			$this->selectedLocation = intval($_COOKIE['woocommerce_multi_inventory_inventory']);
		}

		if(isset($_GET['inventory']) && !empty($_GET['inventory']) && $_GET['inventory'] != $this->selectedLocation) {
			$this->selectedLocation = intval( $_GET['inventory'] );
			setcookie('woocommerce_multi_inventory_inventory',  intval( $_GET['inventory'] ), time() + (365 * 24 * 60 * 60), '/');
		}

		if(empty($this->selectedLocation) && !empty($this->get_option('defaultInventory'))) {
			$this->selectedLocation = $this->get_option('defaultInventory');
		}

		if($this->get_option('productPageEnable')) {

			add_action( $this->get_option('productPagePosition'), array($this, 'show_inventories'), $this->get_option('productPagePriority'));

			if(class_exists('WC_Bundles')) {
				add_filter('woocommerce_bundled_item_add_to_cart_validation', array($this, 'wc_bundle_cart_validation' ), 6, 20);
			}
		}

		add_filter( 'woocommerce_add_cart_item_data', array($this, 'save_my_custom_checkout_field'), 10, 3 );
		
		add_action( 'woocommerce_add_to_cart', array($this, 'maybe_restrict_cart_to_one_inventory'), 10, 6 );
		add_filter( 'woocommerce_add_to_cart_validation', array($this, 'validate_add_to_cart') , 10, 3 ); 

		if($this->get_option('showInventoryInCartAndCheckout')) {
			add_filter( 'woocommerce_get_item_data', array($this, 'render_meta_on_cart_and_checkout'), 10, 2 );
		}

		if($this->get_option('productCategory')) {
			add_action( $this->get_option('productCategoryHook'), array($this, 'show_inventories'), $this->get_option('productCategoryHookPriority'));
		}

		add_action( 'woocommerce_checkout_create_order_line_item', array($this, 'save_order_meta_data'), 40, 4 );
		add_action( 'woocommerce_after_checkout_validation', array($this, 'validate_checkout_inventories'), 10, 2);
		add_action( 'woocommerce_checkout_order_created', array($this, 'maybe_change_shipping_data'), 10, 1);
		

		add_action( 'wp_footer', array( $this, 'popup'), 10 );

		add_shortcode( 'woocommerce_multi_inventory_change_inventory', array($this, 'change_inventory_shortcode'));
		add_shortcode( 'woocommerce_multi_inventory_show_inventories', array($this, 'show_inventories_popup'));

		add_filter( 'woocommerce_email_recipient_new_order', array($this, 'add_inventory_email_to_email'), 40, 2 );
		add_filter( 'woocommerce_order_item_get_formatted_meta_data', array($this, 'change_item_meta_display'), 20, 2 );

		add_filter( 'woocommerce_available_payment_gateways', array($this, 'maybe_disable_payment_gateways'), 20, 2 );
		add_filter( 'woocommerce_package_rates', array($this, 'maybe_disable_shipping_methods'), 20, 2 );



		add_action('woocommerce_after_cart_item_quantity_update', array($this, 'restrict_quantity_to_inventory'), 90, 4 );

		// Change prices in cart 
		if($this->get_option('inventoryPrices')) {
			add_action( 'woocommerce_before_calculate_totals', array($this, 'cart_maybe_set_inventory_prices'), 22, 1);
			add_filter( 'woocommerce_cart_item_price', array($this, 'mini_cart_maybe_set_inventory_prices'), 23, 3 );
		}

		add_action('template_redirect', array($this, 'maybe_show_mixed_cart_text'));

		add_action( 'woocommerce_product_query_tax_query', array($this, 'modify_product_query'), 40, 2);
		add_filter( 'woocommerce_product_get_price', array($this, 'modify_price'), 30, 2);
		add_filter( 'woocommerce_product_variation_get_price', array($this, 'modify_price'), 30, 2);

		add_filter( 'woocommerce_variable_price_html', array($this, 'modify_variable_price_html'), 30, 2);
		add_filter( 'woocommerce_variable_sale_price_html', array($this, 'modify_variable_price_html'), 30, 2);
		
		

		add_filter( 'woocommerce_product_get_stock_quantity', array($this, 'modify_stock_quantity'), 30, 2);
		add_filter( 'woocommerce_get_availability', array($this, 'modify_stock_availability'), 30, 2);
		add_filter( 'woocommerce_product_get_stock_status', array($this, 'modify_stock_status'), 30, 2);

		// modify products shortcode
		add_filter( 'shortcode_atts_products', array($this, 'products_shortcode_add_inventory_parameter'), 4, 99990);
		add_filter( 'shortcode_atts_sale_products', array($this, 'products_shortcode_add_inventory_parameter'), 4, 99990);
		add_filter( 'shortcode_atts_best_selling_products', array($this, 'products_shortcode_add_inventory_parameter'), 4, 99990);
		add_filter( 'shortcode_atts_top_rated_products', array($this, 'products_shortcode_add_inventory_parameter'), 4, 99990);

		add_filter( 'woocommerce_shortcode_products_query', array($this, 'products_shortcode_modify_query'), 2, 90);
		add_filter( 'woocommerce_shortcode_products_query_results', array($this, 'products_shortcode_modify_results'), 2, 90);
		add_filter( 'woocommerce_quantity_input_max', array($this, 'change_product_max_quantity'), 2, 90);

		if($this->get_option('cartShowSwitchInventory')) {

			add_action( $this->get_option('cartShowSwitchInventoryHook'), array($this, 'show_cart_switch_inventories'), $this->get_option('cartShowSwitchInventoryPriority'));
			add_shortcode( 'woocommerce_multi_inventory_switch_inventory', array($this, 'show_cart_switch_inventories_shortcode') );
			add_action('wp_loaded', array($this, 'maybe_switch_cart_inventories'), 50);
			// add_action('woocommerce_before_cart', array($this, 'maybe_switch_cart_inventories'));
			// add_action('woocommerce_before_checkout_form', array($this, 'maybe_switch_cart_inventories'));
		}

	}

	public function maybe_change_shipping_data($order)
	{
		if(!$order) {
			return false;
		}

		if(!$this->get_option('clickCollectEnable')) {
			return false;
		}

		if(!$this->get_option('clickCollectOerrideDeliveryAddress')) {
			return false;
		}		

		$deliveryInventory = $this->get_option('deliveryInventory');
		if(!$deliveryInventory) {
			return false;
		}

		$deliveryInventoryIncluded = false;
		foreach ( $order->get_items() as $item_id => $item ) {

			$product_id = $item->get_product_id();
			if(empty($product_id)) {
				continue;
			}

		    $inventory_id = (int) wc_get_order_item_meta( $item_id, 'woocommerce_multi_inventory_inventory_' . $product_id, true ); 
			if(empty($inventory_id)) {
				continue;
			}

			if($inventory_id == $deliveryInventory) {
				$deliveryInventoryIncluded = true;
			}
	    }

	    if($deliveryInventoryIncluded) {
	    	return;
	    }

	    $inventoryMeta = get_term_meta($inventory_id);
	    if(empty($inventoryMeta)) {
	    	return;
	    }

	    // var_dump($inventoryMeta);

		if( isset($inventoryMeta['woocommerce_multi_inventory_address']) ){
			$order->set_shipping_address_1( reset($inventoryMeta['woocommerce_multi_inventory_address']) );
			$order->set_shipping_address_2('');

		}

		if( isset($inventoryMeta['woocommerce_multi_inventory_zip']) ){
			$order->set_shipping_postcode( reset($inventoryMeta['woocommerce_multi_inventory_zip']) );
		}

		if( isset($inventoryMeta['woocommerce_multi_inventory_city']) ){
			$order->set_shipping_city( reset($inventoryMeta['woocommerce_multi_inventory_city']) );
		}

		if( isset($inventoryMeta['woocommerce_multi_inventory_state']) ){
			$order->set_shipping_state( reset($inventoryMeta['woocommerce_multi_inventory_state']) );
		}

		if( isset($inventoryMeta['woocommerce_multi_inventory_country']) ){
			$order->set_shipping_country( reset($inventoryMeta['woocommerce_multi_inventory_country']) );
		}

		$order->save();
		// var_dump($order);
		// die();
	}

	public function maybe_switch_cart_inventories() 
	{
		if(!isset($_GET['inventory']) || empty($_GET['inventory'])) {
			return;
		}

		$new_inventory = intval($_GET['inventory']);

		$cart = WC()->cart;
		if(!$cart) {
			return;
		}

		$cartContents = $cart->cart_contents;

		foreach( $cartContents as $cart_item_key => $cart_item ) {

            if(!isset($cart_item['woocommerce_multi_inventory_inventory']) || empty($cart_item['woocommerce_multi_inventory_inventory'])) {
                continue;
            }

            if(!isset($cart_item['woocommerce_multi_inventory_inventory']['value']) || empty($cart_item['woocommerce_multi_inventory_inventory']['value'])) {
                continue;
            }
			
			$product = $cart_item['data'];
	        if(!$product) {
	            continue;
	        }
	        $quantity = $cart_item['quantity'];

	        $productInventory = (array) $product->get_meta('woocommerce_multi_inventory_inventories_stock');
            $productInventory = array_filter($productInventory, function ($element) {
                return trim($element) !== "";
            });

	        if(!$this->get_option('inventoryAllowEmptyProducts') && ( empty($productInventory) || !isset($productInventory[$new_inventory]) ) ) {
	            WC()->cart->remove_cart_item($cart_item_key);
	        }

	        $productInventoryStock = $productInventory[$new_inventory];
	        if(!$this->get_option('inventoryAllowEmptyProducts') && ( $quantity >= $productInventoryStock) ) {
				wc_add_notice( sprintf( $this->get_option('cartShowSwitchInventoryRemovedProductText'), $product->get_name()), 'error');
				WC()->cart->remove_cart_item($cart_item_key);
        	} else {
				$cart_item['woocommerce_multi_inventory_inventory']['value'] = $new_inventory;
				$cart_item['woocommerce_multi_inventory_inventory_' . $product->get_id()] = $new_inventory;
				WC()->cart->cart_contents[$cart_item_key] = $cart_item;
        	}

		}
		WC()->cart->set_session();
	}

	public function show_cart_switch_inventories_shortcode()
	{
		return $this->show_cart_switch_inventories(true);
	}

	public function show_cart_switch_inventories($return = false)
	{

		

		$text = '<a href="#" class="btn btn-primary primary is-link button woocommerce-multi-inventory-cart-switch-inventory-button">' . $this->get_option('cartShowSwitchInventoryButtonText') . '</a>';

		if($this->get_option('clickCollectEnable') && !empty($deliveryInventoryId)) {

			ob_start();
			$deliveryInventoryId = $this->get_option('deliveryInventory');

			$productPageDisplay = $this->get_option('productPageDisplay');


    		$deliveryInventory = get_term($deliveryInventoryId, 'inventories');
    		$deliveryInventoryName = $deliveryInventory->name;

    		$pickupLocationName = "";
    		if($this->selectedLocation != $deliveryInventory) {
	    		$pickupLocation = get_term($this->selectedLocation, 'inventories');
	    		$pickupLocationName = $pickupLocation->name;
    		}

    		$pickupLocationName = apply_filters('woocommerce_multi_inventory_pickup_location_name', $pickupLocationName, $pickupLocation);

			$deliveryInventoryTime = get_term_meta($deliveryInventoryId, 'woocommerce_multi_inventory_delivery_time', true);
			if(!empty($deliveryInventoryTime)) {
				$deliveryInventoryTime = $this->get_option('textsDeliveryTime') . $deliveryInventoryTime;
			}

	    	$checkedDelivery = "";
	    	$checkedClickCollect = "";
			if($deliveryInventoryId == $this->selectedLocation || empty($this->selectedLocation)) {
				$checkedDelivery = 'checked="checked" selected="selected"';
				$selectedFound = true;
			} else {
				$checkedClickCollect = 'checked="checked" selected="selected"';
				$selectedFound = true;
			}
			?>

			<div class="woocommerce-multi-inventory-inventories-container woocommerce-multi-inventory-inventories-layout-labelPopup">
				<div class="woocommerce-multi-inventory-inventories-delivery-container">

					<label class="woocommerce-multi-inventory-inventories-row">
						<div class="woocommerce-multi-inventory-inventories-click-collect-title"><?php echo $this->get_option('textsDelivery') ?></div>
						<div class="woocommerce-multi-inventory-clear"></div>
					</label>

					<label class="woocommerce-multi-inventory-inventories-row woocommerce-multi-inventory-inventories-row-inventory-<?php echo $deliveryInventoryId ?>">
						<div class="woocommerce-multi-inventory-inventories-radio">
							<input type="radio" name="woocommerce_multi_inventory_inventory" value="<?php echo $deliveryInventoryId ?>" <?php echo $checkedDelivery ?>>
							<span></span>
						</div>
						<div class="woocommerce-multi-inventory-inventories-name">
							<?php echo $deliveryInventoryName ?>
							<?php if(!empty($deliveryInventoryTime)) {
								echo '<span class="woocommerce-multi-inventory-delivery-time">' . $deliveryInventoryTime . '</span>';
							} ?>
						</div>
						<div class="woocommerce-multi-inventory-inventories-stock <?php echo $inventoriesStock[$deliveryInventoryId] > 0 ? 'woocommerce-multi-inventory-inventories-stock-on-stock' : 'woocommerce-multi-inventory-inventories-stock-out-of-stock' ?>">
						
							<?php
							if(isset($inventoryPrices[$deliveryInventoryId]) && !empty($inventoryPrices[$deliveryInventoryId])) {
								echo wc_price($inventoryPrices[$deliveryInventoryId]) . ' – ';
							} 
							?>

							<?php echo $deliveryInventoryStockQuantityDisplay ?>
						</div>
						<div class="woocommerce-multi-inventory-clear"></div>
					</label>
				</div>
				<div class="woocommerce-multi-inventory-inventories-click-collect-container">
					
					<?php if($productPageDisplay == "labelPopup" || $productPageDisplay == "label") { ?>
						<div class="woocommerce-multi-inventory-inventories-radio">
							<input type="radio" name="woocommerce_multi_inventory_fake" value="1" <?php echo $checkedClickCollect ?>>
							<span></span>
						</div>
					<?php } ?>

					<label class="woocommerce-multi-inventory-inventories-row">
						<div class="woocommerce-multi-inventory-inventories-click-collect-title"><?php echo $this->get_option('textsLocalPickup') ?></div>
						<div class="woocommerce-multi-inventory-clear"></div>
					</label>

					<?php if(!empty($pickupLocationName)) { ?>
					<div class="woocommerce-multi-inventory-label-container">
						<span class="woocommerce-multi-inventory-label-text">Abholung: <?php echo $pickupLocationName ?></span>
						<a class="woocommerce-multi-inventory-open-poup" href="#"><?php echo $this->get_option('productPageDisplayLabelChange') ?></a>
					</div>
					<?php } ?>
				</div>
			</div>
			
			<?php
		   	$text = ob_get_contents();
	   		ob_end_clean();

		}

		if(!$return) {
			echo $text;
		}

		return $text;
	}

	public function wc_bundle_cart_validation($is_configuration_valid, $product, $bundled_item, $quantity, $bundled_variation_id, $configuration)
	{
		if(!$this->get_option('inventoryRequired')) {
			return $is_configuration_valid;
		}

		$product_id = $product->get_id();

		$variation_id = 0;
		if(isset($bundled_variation_id) && !empty($bundled_variation_id)) {
			$variation_id = intval($bundled_variation_id);
		}

		if($variation_id > 0) {
			$product_id = $variation_id;
		}	

		$product = wc_get_product($product_id);

		$productInventoriesStock = (array) get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
		$productInventoriesStock = array_filter($productInventoriesStock, function ($element) {
		    return trim($element) !== "";
		});

		$inventory_id = $this->selectedLocation;
		if(isset($_POST['woocommerce_multi_inventory_inventory']) && !empty($_POST['woocommerce_multi_inventory_inventory'])) {
			$inventory_id = $_POST['woocommerce_multi_inventory_inventory'];
		}

		if($this->get_option('productPageDisplay') == "hidden") {
			return $is_configuration_valid;
		}

		if($this->get_option('inventoryRequired') && empty($inventory_id)) {
			$noInventorySelected = $this->get_option('textsNoInventorySelected');
			throw new Exception( $noInventorySelected );
			return false;
		}

		$inventory = get_term($inventory_id, 'inventories');
		if($this->get_option('inventoryRequired') && empty($inventory)) {
			$noInventorySelected = $this->get_option('textsNoInventorySelected');
			throw new Exception( $noInventorySelected );
			return false;
		}

		if(!$this->get_option('inventoryAllowEmptyProducts') && ( !isset($productInventoriesStock[$inventory_id]) || empty($productInventoriesStock[$inventory_id]))) {

			$textsNotInStock = $this->get_option('textsNotInStock');
			throw new Exception( esc_html(
				sprintf( $textsNotInStock, $product->get_name(), $productInventoriesStock[$inventory_id], $inventory->name )
			) );
			$is_configuration_valid = false;
		}

		if(!$this->get_option('inventoryAllowEmptyProducts') && ($quantity > $productInventoriesStock[$inventory_id])) {
			$inventory = get_term($inventory_id);
			$notEnough = $this->get_option('textsNotEnoughStock');
			throw new Exception( esc_html(
				sprintf( $notEnough, $productInventoriesStock[$inventory_id], $inventory->name, $product->get_name() )
			) );
			$is_configuration_valid = false;
		}

		// remove existing products otherwise wrong quantity can be added
		// if($is_configuration_valid) {
		//     foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
		//     	if($variation_id > 0) {
		// 	        if ($cart_item['variation_id'] == $variation_id) {
		// 	            WC()->cart->remove_cart_item($cart_item_key);
		// 	        }
	 //    		} else {
		// 	        if ($cart_item['product_id'] == $product_id) {
		// 	            WC()->cart->remove_cart_item($cart_item_key);
		// 	        }
	 //    		}
		//     }
		// }

		return $is_configuration_valid;
	}

	public function products_shortcode_add_inventory_parameter($out, $pairs, $atts, $shortcode)
	{
		if(isset($atts['inventory'])) {
			$out['inventory'] = (int) $atts['inventory'];
		}

		return $out;
	}

	public function products_shortcode_modify_query($query_args, $attributes)
	{
		global $shortcode_has_inventory;

		if(!isset($attributes['inventory']) || empty($attributes['inventory'])) {
			return $query_args;
		}

		$shortcode_has_inventory = $attributes['inventory'];

		// may exists because of modify product_query hook
		if(isset($query_args['tax_query'])) {

			$exists = false;
			foreach($query_args['tax_query'] as &$tax_query) {
				if($tax_query['taxonomy'] == "inventories") {
					$exists = true; 
					$tax_query['terms'] = $attributes['inventory'];
				}
			}

			if(!$exists) {
				$query_args['tax_query'][] = array(
					'taxonomy' => 'inventories',
					'terms' => $attributes['inventory'],
					'fields' => 'id',
				);
			}
			$query_args['tax_query']['relation'] = 'AND';
		} else {
			$query_args['tax_query'] = array(
				array(
					'taxonomy' => 'inventories',
					'terms' => $attributes['inventory'],
					'fields' => 'id',
				)
			);
		}

		return $query_args;
	}

	public function products_shortcode_modify_results($results, $shortcode)
	{
		global $shortcode_has_inventory;

		if(!$shortcode_has_inventory) {
			return $results;
		}

		$query_args = $shortcode->get_query_args();

		if(isset($query_args['post__in']) && !empty($query_args['post__in'])) {
			if(isset($results->ids) && !empty($results->ids)) {
				$tmp = array();
				foreach($results->ids as $post_id) {
					if(!has_term($shortcode_has_inventory, 'inventories', $post_id)) {
						continue;
					}
					$tmp[] = $post_id;
				}
				$results->ids = $tmp;
			}
		}

		return $results;
	}


	public function maybe_restrict_cart_to_one_inventory( $cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data ) 
	{
	
	    // This is necessary for WC 3.0+
	    if ( is_admin() && ! defined( 'DOING_AJAX' ) )
	        return false;

	  	if(!$this->get_option('restrictInventoryCart')) {
	  		return false;
	  	}

		$inventory_id = $this->selectedLocation;
		if(isset($_POST['woocommerce_multi_inventory_inventory']) && !empty($_POST['woocommerce_multi_inventory_inventory'])) {
			$inventory_id = $_POST['woocommerce_multi_inventory_inventory'];
		}

		if(empty($inventory_id)) {
			return false;
		}

	  	$removed = false;
	  	$cart = WC()->cart;

	  	if(!$cart) {
	  		return false;
	  	}

	    // Loop through cart items
	    foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {

		    if(!isset($cart_item['woocommerce_multi_inventory_inventory']) || empty($cart_item['woocommerce_multi_inventory_inventory'])) {
				continue;
			}

		    if(!isset($cart_item['woocommerce_multi_inventory_inventory']['value']) || empty($cart_item['woocommerce_multi_inventory_inventory']['value'])) {
				continue;
			}

			$cartInventoryId = $cart_item['woocommerce_multi_inventory_inventory']['value'];		
			if($inventory_id != $cartInventoryId) {
				$cart->remove_cart_item($cart_item_key);
				$removed = true;
			}
	    }

	    if($removed) {
	    	wc_add_notice( esc_html( $this->get_option('restrictInventoryCartText') ), 'error');
	    }
	}

	public function maybe_show_mixed_cart_text()
	{
		if(!$this->get_option('mixedCartInfo')) {
			return;
		}

		if(!is_cart() && !is_checkout()) {
			return;
		}

		$mixedCartInfoText = esc_html($this->get_option('mixedCartInfoText'));
		if(empty($mixedCartInfoText)) {
			return;
		}

	  	$firstInventoryId = 0;
	  	$cart = WC()->cart;
	  	if(!$cart) {
	  		return;
	  	}

	  	$mixed = false;

	    // Loop through cart items
	    foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {

		    if(!isset($cart_item['woocommerce_multi_inventory_inventory']) || empty($cart_item['woocommerce_multi_inventory_inventory'])) {
				continue;
			}

		    if(!isset($cart_item['woocommerce_multi_inventory_inventory']['value']) || empty($cart_item['woocommerce_multi_inventory_inventory']['value'])) {
				continue;
			}

			$cartInventoryId = $cart_item['woocommerce_multi_inventory_inventory']['value'];		

			if($firstInventoryId == 0) {
				$firstInventoryId = $cartInventoryId;
			}

			if($firstInventoryId != $cartInventoryId) {
				$mixed = true;
				break;
			}
	    }

		if($mixed) {
			wc_add_notice($mixedCartInfoText, 'notice');
		}
		
	}

	public function modify_product_query($tax_query, $query) 
	{
	    if(!$this->get_option('hideProductsInCategories')) {
	    	return $tax_query;
	    }

		if($this->selectedLocation < 1) {
			return $tax_query;
		}

	    $tax_query[] = array(
	        'taxonomy' => 'inventories',
	        'field' => 'id',
	        'terms' => $this->selectedLocation,
	    );

    	return $tax_query;
    }

    public function modify_stock_quantity($stock_quantity, $product)
    {

    	if(is_admin() || (isset($_POST['payment_method'])) ) {
    		return $stock_quantity;
    	}

	    if(!$this->get_option('modifyStockQuantity')) {
	    	return $stock_quantity;
	    }

	    if(empty($this->selectedLocation)) {
	    	return $stock_quantity;
	    }

		$productInventories = (array) $product->get_meta('woocommerce_multi_inventory_inventories_stock');
		$productInventories = array_filter($productInventories, function ($element) {
		    return trim($element) !== "";
		});

		if(empty($productInventories) || !isset($productInventories[$this->selectedLocation])) {
			return $stock_quantity;
		}

		return $productInventories[$this->selectedLocation];
    }

    public function modify_stock_availability($args, $product)
    {

	    if(!$this->get_option('modifyStockQuantity')) {
	    	return $args;
	    }

	    if($product->backorders_allowed() || $product->is_on_backorder() ) {
	    	return $args;
	    }

		$productInventories = (array) $product->get_meta('woocommerce_multi_inventory_inventories_stock');
		$productInventories = array_filter($productInventories, function ($element) {
		    return trim($element) !== "";
		});

		if(empty($productInventories) || !isset($productInventories[$this->selectedLocation])) {
			return $args;
		}

		if($productInventories[$this->selectedLocation] > 0) {

			// $args['availability'] = sprintf( esc_html__( $this->get_option('textsStock') ), $productInventories[$this->selectedLocation]);

			switch ( get_option( 'woocommerce_stock_format' ) ) {
				case 'low_amount':
					if ( $productInventories[$this->selectedLocation] <= wc_get_low_stock_amount( $product ) ) {
						/* translators: %s: stock amount */
						$args['availability'] = sprintf( __( 'Only %s left in stock', 'woocommerce' ), wc_format_stock_quantity_for_display( $productInventories[$this->selectedLocation], $product ) );
					}
					break;
				case '':
					/* translators: %s: stock amount */
					// $args['availability'] = sprintf( __( '%s in stock', 'woocommerce' ), wc_format_stock_quantity_for_display( $productInventories[$this->selectedLocation], $product ) );
					$args['availability'] = sprintf( esc_html__( $this->get_option('textsStock') ), $productInventories[$this->selectedLocation]);
					break;
			}

			if ( $product->backorders_allowed() && $product->backorders_require_notification() ) {
				$args['availability'] .= ' ' . __( '(can be backordered)', 'woocommerce' );
			}


			$args['class'] = 'in-stock';
		} else {
			$args['availability'] = esc_html__( $this->get_option('textsOutOfStock') );
			$args['class'] = 'out-of-stock';
		}
        
		return $args;
    }


    public function modify_stock_status($stock_status, $product)
    {
	    if(!$this->get_option('modifyStockQuantity')) {
	    	return $stock_status;
	    }

		if($stock_status == "onbackorder") {
	    	return $stock_status;
	    }

		$productInventories = (array) $product->get_meta('woocommerce_multi_inventory_inventories_stock');
		$productInventories = array_filter($productInventories, function ($element) {
		    return trim($element) !== "";
		});

		if(empty($productInventories) || !isset($productInventories[$this->selectedLocation])) {
			return $stock_status;
		}

		if($productInventories[$this->selectedLocation] > 0) {
			return $stock_status;
		} else {

			if($product->backorders_allowed()) {
				return 'onbackorder';
			}

			return 'outofstock';
		}		
    }

    public function modify_price($price, $product)
    {
	    if(!$this->get_option('inventoryPrices')) {
	    	return $price;
	    }
		
		if(!$this->get_option('inventoryPricesModifyWhenSelected')) {
			return $price;
		}

		if($this->selectedLocation < 1) {
			return $price;
		}

		if(!$product) {
			return $price;
		}

		$inventoryPrices = $product->get_meta('woocommerce_multi_inventory_prices');
		if(empty($inventoryPrices) || !isset($inventoryPrices[$this->selectedLocation]) || empty($inventoryPrices[$this->selectedLocation])) {
			return $price;
		}

		// products with no inventory can not have an inventory price
		$productInventories = (array)  $product->get_meta('woocommerce_multi_inventory_inventories_stock');
		$productInventories = array_filter($productInventories, function ($element) {
		    return trim($element) !== "";
		});

		if(empty($productInventories) || !isset($productInventories[$this->selectedLocation])) {
			return $price;
		}		

		if($productInventories[$this->selectedLocation] == "") {
			return $price;
		}

		return $inventoryPrices[$this->selectedLocation];

    }

    public function modify_variable_price_html($price, $product)
    {
    	if(!$product || !is_object($product)) {
    		return $price;
    	}

    	if(!$product->is_type('variable')) {
    		return $price;
    	}

    	$variation_prices = $product->get_variation_prices();
    	if(!isset($variation_prices['price']) || empty($variation_prices['price'])) {
    		return $price;
    	}

    	$minVariation = wc_get_product( array_key_first( $variation_prices['price'] ) );
    	$minPrice = false;
    	if($minVariation) {

			$inventoryPrices = $minVariation->get_meta('woocommerce_multi_inventory_prices');
			if(empty($inventoryPrices) || !isset($inventoryPrices[$this->selectedLocation]) || empty($inventoryPrices[$this->selectedLocation])) {
				
			} else {

				// products with no inventory can not have an inventory price
				$productInventories = (array) $minVariation->get_meta('woocommerce_multi_inventory_inventories_stock');
				$productInventories = array_filter($productInventories, function ($element) {
				    return trim($element) !== "";
				});

				if(!empty($productInventories) && isset($productInventories[$this->selectedLocation]) && $productInventories[$this->selectedLocation] != "") {
					$minPrice = (float) $inventoryPrices[$this->selectedLocation];
				}		

			}
		}

    	$maxVariation = wc_get_product( array_key_last( $variation_prices['price'] ) );
    	$maxPrice = false;
    	if($maxVariation) {

			$inventoryPrices = $maxVariation->get_meta('woocommerce_multi_inventory_prices');
			if(empty($inventoryPrices) || !isset($inventoryPrices[$this->selectedLocation]) || empty($inventoryPrices[$this->selectedLocation])) {
				
			} else {

				// products with no inventory can not have an inventory price
				$productInventories = (array) $maxVariation->get_meta('woocommerce_multi_inventory_inventories_stock');
				$productInventories = array_filter($productInventories, function ($element) {
				    return trim($element) !== "";
				});

				if(!empty($productInventories) && isset($productInventories[$this->selectedLocation]) && $productInventories[$this->selectedLocation] != "") {
					$maxPrice = (float) $inventoryPrices[$this->selectedLocation];
				}		

			}
		}

		if($minPrice && $maxPrice) {
			$price = wc_format_price_range($minPrice, $maxPrice);
		}

		return $price;

    }

	public function cart_maybe_set_inventory_prices( $cart ) 
	{
		
	    // This is necessary for WC 3.0+
	    if ( is_admin() && ! defined( 'DOING_AJAX' ) )
	        return;

	    // Avoiding hook repetition (when using price calculations for example | optional)
	    if ( did_action( 'woocommerce_before_calculate_totals' ) >= 2 )
	        return;

	    // Loop through cart items
	    foreach ( $cart->get_cart() as $cart_item ) {

		    if(!isset($cart_item['woocommerce_multi_inventory_inventory']) || empty($cart_item['woocommerce_multi_inventory_inventory'])) {
				return;
			}

		    if(!isset($cart_item['woocommerce_multi_inventory_inventory']['value']) || empty($cart_item['woocommerce_multi_inventory_inventory']['value'])) {
				return;
			}

			$cartProduct = $cart_item['data'];
			$inventory_id = $cart_item['woocommerce_multi_inventory_inventory']['value'];		
			$inventoryPrices = $cartProduct->get_meta('woocommerce_multi_inventory_prices');

			if(empty($inventoryPrices) || !isset($inventoryPrices[$inventory_id])) {
				return;
			}

			if($inventoryPrices[$inventory_id] == "") {
				return;
			}

	        $cartProduct->set_price( $inventoryPrices[$inventory_id] );
	    }
	}

	public function mini_cart_maybe_set_inventory_prices( $price_html, $cart_item, $cart_item_key )
	{

	    if(!isset($cart_item['woocommerce_multi_inventory_inventory']) || empty($cart_item['woocommerce_multi_inventory_inventory'])) {
			return $price_html;
		}

	    if(!isset($cart_item['woocommerce_multi_inventory_inventory']['value']) || empty($cart_item['woocommerce_multi_inventory_inventory']['value'])) {
			return $price_html;
		}

		$cartProduct = $cart_item['data'];
		$inventory_id = $cart_item['woocommerce_multi_inventory_inventory']['value'];		
		$inventoryPrices = $cartProduct->get_meta('woocommerce_multi_inventory_prices');

		if(empty($inventoryPrices) || !isset($inventoryPrices[$inventory_id])) {
			return $price_html;
		}

		if($inventoryPrices[$inventory_id] == "") {
			return $price_html; 
		}

		return wc_price($inventoryPrices[$inventory_id]);
	}

	public function change_product_max_quantity( $max_quantity, $product )
	{
	    if(!$product) {
	    	return $max_quantity;
	    }

	    if(!$this->get_option('modifyStockQuantity')) {
	    	return $max_quantity;
    	}

	    if($product->backorders_allowed() || $product->is_on_backorder()) {
	    	return $max_quantity;
	    }

		$inventory_id = $this->selectedLocation;
		$productInventory = $product->get_meta('woocommerce_multi_inventory_inventories_stock');
		if(is_array($productInventory)) {
			$productInventory = array_filter($productInventory, function ($element) {
			    return trim($element) !== "";
			});
		}


		if(empty($productInventory) || !isset($productInventory[$inventory_id])) {
			return $max_quantity;
		}

		$productInventoryStock = $productInventory[$inventory_id];
		return $productInventoryStock;
	}
	

	public function restrict_quantity_to_inventory( $cart_item_key, $quantity, $old_quantity, $cart )
	{
	    $cart_data = $cart->get_cart();
	    $cart_item = $cart_data[$cart_item_key];
	    $product = $cart_item['data'];

	    if(!$product) {
	    	return;
	    }

	    if(!isset($cart_item['woocommerce_multi_inventory_inventory']) || empty($cart_item['woocommerce_multi_inventory_inventory'])) {
			return;
		}

	    if(!isset($cart_item['woocommerce_multi_inventory_inventory']['value']) || empty($cart_item['woocommerce_multi_inventory_inventory']['value'])) {
			return;
		}

	    if($product->backorders_allowed() || $product->is_on_backorder()) {
	    	return;
	    }

		$inventory_id = $cart_item['woocommerce_multi_inventory_inventory']['value'];		
		$productInventory = $product->get_meta('woocommerce_multi_inventory_inventories_stock');
		if(is_array($productInventory)) {
			$productInventory = array_filter($productInventory, function ($element) {
			    return trim($element) !== "";
			});
		}


		if(empty($productInventory) || !isset($productInventory[$inventory_id])) {
			return;
		}

		$productInventoryStock = $productInventory[$inventory_id];
		if($quantity >= $productInventoryStock) {
	        $cart->cart_contents[ $cart_item_key ]['quantity'] = $productInventoryStock;
		}
	}

	public function change_item_meta_display( $formatted_meta )
	{
		foreach($formatted_meta as $formatted_meta_key => $formatted_meta_value) {

			if(strpos($formatted_meta_value->key, 'woocommerce_multi_inventory_inventory') !== false){

				if($this->get_option('showInventoryInEmails') ) {

					$inventory = get_term($formatted_meta_value->value);
					if(!empty($inventory)) {
						$formatted_meta_value->display_key = $this->get_option('textsInventoryLabel');
						$formatted_meta_value->display_value = $inventory->name;
						if($this->get_option('showInventoryDescriptionInEmails') && !empty($inventory->description)) {
							$formatted_meta_value->display_value .= '<br>' . $inventory->description;
						}
					}

					$formatted_meta[$formatted_meta_key] = $formatted_meta_value;
				} else {
					unset($formatted_meta[$formatted_meta_key]);
				}
			}

		}

		return $formatted_meta;
	}

	public function change_inventory_shortcode($atts)
	{
		global $product;

		$args = shortcode_atts( array(
			'select_store_text' => esc_html__('Select Store', 'woocommerce-multi-inventory'),
	        'your_store_text' => esc_html__('Your Store: ', 'woocommerce-multi-inventory'),
	       	'product_id' => 0
	    ), $atts );

		$location = false;
		$locationName = esc_html__('None', 'woocommerce-multi-inventory');
		if(isset($_COOKIE['woocommerce_multi_inventory_inventory']) && !empty($_COOKIE['woocommerce_multi_inventory_inventory'])) {
			$locationId = intval($_COOKIE['woocommerce_multi_inventory_inventory']);
			$location = get_term($locationId);
			if($location) {
				$locationName = $location->name;
			}
		}

		$product_id = intval( $args['product_id'] );
		if(empty($product_id)) {
			$prod = $product;
		} else {
			$prod = wc_get_product($product_id);
		}

		if(is_object($prod)) {
			$product_id = $prod->get_id();
		} else {
			$product_id = 0;
		}

		$html = '<div class="woocommerce-multi-inventory-selected-location-container">
					<a class="woocommerce-multi-inventory-open-poup" data-product-id="' . $product_id . '" href="#">
						<i class="fa fa-store"></i>
						<span class="woocommerce-multi-inventory-selected-location-text">' . esc_html__( $args['your_store_text'] ) . '</span> <span class="woocommerce-multi-inventory-selected-location">' . esc_html__( $args['select_store_text'] ) . '</span>
					</a>
				</div>';

		return $html;
	}

	public function ajax_get_stock()
	{
		$response = array(
			'status' => false,
			'msg' => '',
			'inventory_id' => '',
		);

		if(!isset($_POST['product_id']) || empty($_POST['product_id'])) {
			echo json_encode($response);
			die();
		}

		$productId = intval( $_POST['product_id'] );
		$variationId = intval( $_POST['variation_id'] );

		if(!empty($variationId)) {
			$productId = $variationId;
		}

		$product = wc_get_product($productId);
		if(!$product) {
			echo json_encode($response);
			die();
		}

		$inventoriesStock = (array) get_post_meta($productId, 'woocommerce_multi_inventory_inventories_stock', true);
		if(empty($inventoriesStock)) {
			echo json_encode($response);
			die();
		}

		$inventoriesStock = array_filter($inventoriesStock, function ($element) {
		    return trim($element) !== "";
		});

		if(empty($inventoriesStock)) {
			echo json_encode($response);
			die();
		}

		$quantity = 1;

		if(!$this->get_option('orderFlowAlwaysUse') && isset($_POST['inventory_id']) && !empty($_POST['inventory_id'])) {
			$inventory_id = intval($_POST['inventory_id']);
		} else {
			$inventory_id = $this->get_inventory_by_product(1, $inventoriesStock, $product, true);
		}

		$response['inventory_id'] = $inventory_id;

		if(!$product->backorders_allowed() && !$this->get_option('inventoryAllowEmptyProducts') && (!isset($inventoriesStock[$inventory_id]) || $inventoriesStock[$inventory_id] < $quantity) ){

			if(!$product->is_type('bundle')) {
				$textsNotInStock = $this->get_option('textsNotInStock');
				$response['msg'] = esc_html(
					sprintf( $textsNotInStock, $product->get_name(), $inventoriesStock[$inventory_id], $inventory->name )
				);
				echo json_encode($response);
				die();
			}
		}

		$response['status'] = true;
		switch ($this->get_option('productPageStockDisplay')) {
			case 'count':
				$response['msg'] = sprintf( $this->get_option('textsStock'), $inventoriesStock[$inventory_id] );
				break;
			case 'inout':
				if($inventoriesStock[$inventory_id] > 0) {
					$response['msg'] = $this->get_option('textsInStock');
				} else {
					$response['msg'] 	= $this->get_option('textsOutOfStock');
				}
				
				break;
			case 'hidden':
				$response['msg'] = '';
				break;
			
			default:
				$response['msg'] = $inventoriesStock[$inventory_id];
				break;
		}

		echo json_encode($response);
		die();
	}
	

	public function validate_add_to_cart($passed, $product_id, $quantity)
	{

		$variation_id = 0;
		if(isset($_POST['variation_id']) && !empty($_POST['variation_id'])) {
			$variation_id = intval($_POST['variation_id']);
		}

		if($variation_id > 0) {
			$product_id = $variation_id;
		}	

		$product = wc_get_product($product_id);

		if(!$this->get_option('productPageEnable')) {
			return $passed;
		}

		if($product->backorders_allowed() || $product->is_on_backorder()) {
			return $passed;
		}

		$productInventoriesStock = get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
		if(is_array($productInventoriesStock)) {
			$productInventoriesStock = array_filter($productInventoriesStock, function ($element) {
			    return trim($element) !== "";
			});
		}

		if($this->get_option('inventoryAllowEmptyProducts') && empty($productInventoriesStock)) {

			if(isset($_POST['woocommerce_multi_inventory_inventory']) && !empty($_POST['woocommerce_multi_inventory_inventory'])) {
				$inventory_id = $_POST['woocommerce_multi_inventory_inventory'];
				setcookie('woocommerce_multi_inventory_inventory', $inventory_id, time() + (365 * 24 * 60 * 60), '/');
				$this->selectedLocation = $inventory_id;
			}
			
			return $passed;
		}

		$inventory_id = 0;

		if(!$this->get_option('orderFlowAlwaysUse')) {
			$inventory_id = $this->selectedLocation;

			if($this->get_option('productPageEnable')) {
				if(isset($_POST['woocommerce_multi_inventory_inventory']) && !empty($_POST['woocommerce_multi_inventory_inventory'])) {
					$inventory_id = $_POST['woocommerce_multi_inventory_inventory'];
				}
			}
		}

		if(!empty($productInventoriesStock) && (empty($inventory_id) || !isset($productInventoriesStock[$inventory_id]) || empty($productInventoriesStock[$inventory_id]))) {
			$inventory_id = $this->get_inventory_by_product($quantity, $productInventoriesStock, $product);
		}

		$inventory = get_term($inventory_id, 'inventories');
		if($this->get_option('inventoryRequired') && empty($inventory_id)) {
			$noInventorySelected = $this->get_option('textsNoInventorySelected');
			wc_add_notice( esc_html(
				$noInventorySelected
			), 'error' );
			return false;
		}


		if(!$product->backorders_allowed() && !$this->get_option('inventoryAllowEmptyProducts') && (!isset($productInventoriesStock[$inventory_id]) || empty($productInventoriesStock[$inventory_id])) ){

			if(!$product->is_type('bundle')) {
				$textsNotInStock = $this->get_option('textsNotInStock');
				wc_add_notice( esc_html(
					sprintf( $textsNotInStock, $product->get_name(), $productInventoriesStock[$inventory_id], $inventory->name )
				), 'error' );
				return false;
			}
		}

		if(!$product->backorders_allowed() && !$this->get_option('inventoryAllowEmptyProducts') && ($quantity > $productInventoriesStock[$inventory_id]) ){
			$notEnough = $this->get_option('textsNotEnoughStock');
			wc_add_notice( esc_html(
				sprintf( $notEnough, $productInventoriesStock[$inventory_id], $inventory->name)
			), 'error' );
			return false;
		}

		if(!empty($inventory_id)) {
			$this->selectedLocation = $inventory_id;
			setcookie('woocommerce_multi_inventory_inventory', $inventory_id, time() + (365 * 24 * 60 * 60), '/');
		}

		// if($this->get_option('productPageDisplay') != "text" && $this->get_option('productPageDisplay') != "textOnlySelected" && (!isset($_POST['woocommerce_multi_inventory_inventory']) || empty($_POST['woocommerce_multi_inventory_inventory']) ) ) {
		// 	$noInventorySelected = $this->get_option('textsNoInventorySelected');
		// 	wc_add_notice( esc_html(
		// 		$noInventorySelected
		// 	), 'error' );
		// 	return false;
		// }

		// if( $this->get_option('productPageDisplay') == "textOnlySelected" || ( isset($_POST['woocommerce_multi_inventory_inventory']) && !empty($_POST['woocommerce_multi_inventory_inventory']))) {

		// 	if($this->get_option('productPageDisplay') == "textOnlySelected") {
		// 		$inventory_id = $this->selectedLocation;
		// 	} else {
		// 		$inventory_id = intval($_POST['woocommerce_multi_inventory_inventory']);		
		//  	}

		// 	if(!isset($productInventoriesStock[$inventory_id])) {
		// 		wc_add_notice( esc_html($this->get_option('textsNotInStock')), 'error' );
		// 		$passed = false;
		// 	}

		// 	if($quantity > $productInventoriesStock[$inventory_id]) {
		// 		$inventory = get_term($inventory_id);
		// 		$notEnough = $this->get_option('textsNotEnoughStock');
		// 		wc_add_notice( esc_html(
		// 			sprintf( $notEnough, $productInventoriesStock[$inventory_id], $inventory->name)
		// 		), 'error' );
		// 		$passed = false;
		// 	}
		// }

		// remove existing products otherwise wrong quantity can be added
		// if($passed) {
		//     foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
		//     	if($variation_id > 0) {
		// 	        if ($cart_item['variation_id'] == $variation_id) {
		// 	            WC()->cart->remove_cart_item($cart_item_key);
		// 	        }
	 //    		} else {
		// 	        if ($cart_item['product_id'] == $product_id) {
		// 	            WC()->cart->remove_cart_item($cart_item_key);
		// 	        }
	 //    		}
		//     }
		// }

		return $passed;
	}

	public function show_inventories_popup()
	{
 		ob_start();
 		$this->show_inventories();
        $output_string = ob_get_contents();
        ob_end_clean();	 

        return $output_string;   	
	}

	public function show_inventories()
	{
		global $product;
		if(!is_object($product)) {
			return;
		}

		$inventoryProduct = $product;

	  	$inventories = get_terms( array(
			'taxonomy' => 'inventories',
			'hide_empty' => false,
			'meta_query' => array(
				array(
					'key'     => 'woocommerce_multi_inventory_frontend',
					'value'   => "on",
					'compare' => '='
				)
			)
	  	));

 		if(empty($inventories)) {
 			return false;
		}

		if($inventoryProduct->is_type('variation')) {
			if($inventoryProduct->get_manage_stock() === "parent") {
				$inventoryProduct = wc_get_product( $inventoryProduct->get_parent_id() );
			}
		}

		$inventoriesStock = get_post_meta($inventoryProduct->get_id(), 'woocommerce_multi_inventory_inventories_stock', true);

		if(is_array($inventoriesStock)) {
			$inventoriesStock = array_filter($inventoriesStock, function ($element) {
			    return trim($element) !== "";
			});
		}

		if(!$this->get_option('inventoryAllowEmptyProducts') && empty($inventoriesStock) && !$inventoryProduct->is_type('variable')) {
			return false;
		}

		$temp = array();
		$found = false;
		$selectedFound = false;
		foreach($inventories as $inventory) {

			$inventory_id = $inventory->term_id;
			if(!$inventoryProduct->is_type('variable') && !isset($inventoriesStock[$inventory_id])) {
			// if(!$this->get_option('inventoryAllowEmptyProducts') && !$inventoryProduct->is_type('variable') && !isset($inventoriesStock[$inventory_id])) {
				continue;
			}

			if(!isset($inventoriesStock[$inventory_id])) {
				$inventoriesStock[$inventory_id] = 0;
			}

			$temp[$inventory_id] = array(
				'id' => $inventory->term_id,
				'name' => $inventory->name,
				'selected' => false,
				'order' => get_term_meta($inventory->term_id, 'woocommerce_multi_inventory_order', true),
				'disabled' => false,
				'stock' => $inventoriesStock[$inventory_id],
				'distance' => 0,
			);


			if( (!$inventoryProduct->backorders_allowed() || !$inventoryProduct->is_on_backorder()) && $inventoriesStock[$inventory_id] == 0) {
				$temp[$inventory_id]['disabled'] = true;
			}

			if(empty($inventoriesStock[$inventory_id])) {
				$inventoriesStock[$inventory_id] = 0;
			}

			if($this->selectedLocation > 0 && $inventory_id == $this->selectedLocation && ($inventoryProduct->is_on_backorder() || $inventoriesStock[$this->selectedLocation] > 0) ) {
				$selectedFound = true;
			}

		}

		$inventories = $temp;

		$order = $this->get_option('productPageOrder');
		if($order == "most_stock") {
			$stock = array_column($inventories, 'stock');
			array_multisort($stock, SORT_DESC, $inventories);
		} elseif($order == "lowest_stock") {
			$stock = array_column($inventories, 'stock');
			array_multisort($stock, SORT_ASC, $inventories);
		} elseif($order == "name") {
			$name = array_column($inventories, 'name');
			array_multisort($name, SORT_ASC, $inventories);
		} elseif($order == "order") {
			$order = array_column($inventories, 'order');
			array_multisort($order, SORT_DESC, $inventories);
		}

    	if($this->get_option('inventoryPrices')) {
    		$inventoryPrices = get_post_meta($inventoryProduct->get_id(), 'woocommerce_multi_inventory_prices', true);
    	}

    	if($this->get_option('clickCollectEnable')) {

    		if($this->get_option('productPageDisplay') != "labelPopup") {
    			$this->options['productPageDisplay'] = 'radio';
    		}

	    	$deliveryInventoryId = $this->get_option('deliveryInventory');
	    	if(!empty($deliveryInventoryId)) {

	    		$deliveryInventory = get_term($deliveryInventoryId, 'inventories');
	    		$deliveryInventoryName = $deliveryInventory->name;
				$deliveryInventoryTime = get_term_meta($deliveryInventoryId, 'woocommerce_multi_inventory_delivery_time', true);
				if(!empty($deliveryInventoryTime)) {
					$deliveryInventoryTime = $this->get_option('textsDeliveryTime') . $deliveryInventoryTime;
				}

				switch ($this->get_option('productPageStockDisplay')) {
					case 'count':
						$deliveryInventoryStockQuantityDisplay = sprintf( $this->get_option('textsStock'), $inventoriesStock[$deliveryInventoryId] );
						break;
					case 'inout':
						if($inventoriesStock[$deliveryInventoryId] > 0) {
							$deliveryInventoryStockQuantityDisplay = $this->get_option('textsInStock');
						} else {
							$deliveryInventoryStockQuantityDisplay 	= $this->get_option('textsOutOfStock');
						}
						
						break;
					case 'hidden':
						$deliveryInventoryStockQuantityDisplay = '';
						break;
					
					default:
						$deliveryInventoryStockQuantityDisplay = $inventoriesStock[$deliveryInventoryId];
						break;
				}

		    	$checkedDelivery = "";
		    	$checkedClickCollect = "";
				if($deliveryInventoryId == $this->selectedLocation || empty($this->selectedLocation)) {
					$checkedDelivery = 'checked="checked" selected="selected"';
					$selectedFound = true;
				} else {
					$checkedClickCollect = 'checked="checked" selected="selected"';
					$selectedFound = true;
				}
			}
    	}

		$productPageDisplay = apply_filters('woocommerce_multi_inventory_page_dispay', $this->get_option('productPageDisplay'), $inventoryProduct->get_id());
		$productPageHideEmptyInventories = $this->get_option('productPageHideEmptyInventories');

		?>

		<div class="woocommerce-multi-inventory-inventories-container woocommerce-multi-inventory-inventories-layout-<?php echo $productPageDisplay ?> <?php echo $inventoryProduct->is_type('variable') ? 'woocommerce-multi-inventory-inventories-variable' :  '' ?>">

			<?php do_action('woocommerce_multi_inventory_before_inventories_container') ?>

			<?php
			if($productPageDisplay == "hidden") {

				if($this->selectedLocation > 0) {
					if($inventoriesStock[$this->selectedLocation] > 0) {
						echo '<input type="hidden" name="woocommerce_multi_inventory_inventory" value="' . $this->selectedLocation . '">';
					} else {
						echo '<span class="woocommerce-multi-inventory-hidden-out-of-stock-text"><a class="woocommerce-multi-inventory-open-poup" data-product-id="' . $inventoryProduct->get_id() . '" href="#">' . esc_html( $this->get_option('productPageDisplayHiddenOutOfStock') ) . '</a></span>';
					}
					
				} else {
					echo '<span class="woocommerce-multi-inventory-hidden-no-inventory-text"><a class="woocommerce-multi-inventory-open-poup" href="#">' . esc_html( $this->get_option('productPageDisplayHiddenNoInventory') ) . '</a></span>';
				}
				echo '</div>';
				return;
			} 

			if($this->get_option('clickCollectEnable')) { ?>
				
				<?php if(!empty($deliveryInventoryId)) { ?>
				<div class="woocommerce-multi-inventory-inventories-delivery-container">

					<label class="woocommerce-multi-inventory-inventories-row">
						<div class="woocommerce-multi-inventory-inventories-click-collect-title"><?php echo $this->get_option('textsDelivery') ?></div>
						<div class="woocommerce-multi-inventory-clear"></div>
					</label>

					<label class="woocommerce-multi-inventory-inventories-row woocommerce-multi-inventory-inventories-row-inventory-<?php echo $deliveryInventoryId ?>">
						<div class="woocommerce-multi-inventory-inventories-radio">
							<input type="radio" name="woocommerce_multi_inventory_inventory" value="<?php echo $deliveryInventoryId ?>" <?php echo $checkedDelivery ?>>
							<span></span>
						</div>
						<div class="woocommerce-multi-inventory-inventories-name">
							<?php echo $deliveryInventoryName ?>
							<?php if(!empty($deliveryInventoryTime)) {
								echo '<span class="woocommerce-multi-inventory-delivery-time">' . $deliveryInventoryTime . '</span>';
							} ?>
						</div>
						<div class="woocommerce-multi-inventory-inventories-stock <?php echo $inventoriesStock[$deliveryInventoryId] > 0 ? 'woocommerce-multi-inventory-inventories-stock-on-stock' : 'woocommerce-multi-inventory-inventories-stock-out-of-stock' ?>">
						
							<?php
							if(isset($inventoryPrices[$deliveryInventoryId]) && !empty($inventoryPrices[$deliveryInventoryId])) {
								echo wc_price($inventoryPrices[$deliveryInventoryId]) . ' – ';
							} 
							?>

							<?php echo $deliveryInventoryStockQuantityDisplay ?>
						</div>
						<div class="woocommerce-multi-inventory-clear"></div>
					</label>
				</div>
				<?php } ?>

				<div class="woocommerce-multi-inventory-inventories-click-collect-container">
					
					<?php if($productPageDisplay == "labelPopup" || $productPageDisplay == "label") { ?>
						<div class="woocommerce-multi-inventory-inventories-radio">
							<input type="radio" name="woocommerce_multi_inventory_fake" value="1" <?php echo $checkedClickCollect ?>>
							<span></span>
						</div>
					<?php } ?>

					<label class="woocommerce-multi-inventory-inventories-row">
						<div class="woocommerce-multi-inventory-inventories-click-collect-title"><?php echo $this->get_option('textsLocalPickup') ?></div>
						<div class="woocommerce-multi-inventory-clear"></div>
					</label>

			<?php } ?>

					<?php
					if($productPageDisplay == "select") {
						echo '<select name="woocommerce_multi_inventory_inventory" id="woocommerce-multi-inventory-select">';
							echo '<option value="">' . $this->get_option('productPageDisplaySelectPlaceholder') . '</option>';
					} elseif($productPageDisplay == "label" || $productPageDisplay == "labelPopup") {
						echo '<div class="woocommerce-multi-inventory-label-container">';
					} elseif($productPageDisplay == "text") {
						if($this->get_option('productPageDisplayTextTextBefore')) {
							echo '<span class="woocommerce-multi-inventory-label-text-before">' . $this->get_option('productPageDisplayTextTextBefore') . '</span>';
						}
					} elseif($productPageDisplay == "textOnlySelected") {
						if($this->get_option('productPageDisplayTextOnlySelectedTextBefore')) {
							echo '<span class="woocommerce-multi-inventory-label-text-before">' . $this->get_option('productPageDisplayTextOnlySelectedTextBefore') . '</span>';
						}
					} 

					// $found = false;
					$first = true;

					if($productPageDisplay == "text") {
						echo '<div class="woocommerce-multi-inventory-text">';
					}

					foreach($inventories as $inventory) {

						$inventory_id = intval( $inventory['id'] );

						if($this->get_option('clickCollectEnable') && !empty($deliveryInventoryId) && $deliveryInventoryId == $inventory_id) { 
							continue;
						}

						$inventory_name = $inventory['name'];
						$inventory_delivery_time = get_term_meta($inventory_id, 'woocommerce_multi_inventory_delivery_time', true);
						if(!empty($inventory_delivery_time)) {
							$inventory_delivery_time = $this->get_option('textsDeliveryTime') . $inventory_delivery_time;
						}

						if(!$inventoryProduct->is_type('variable') && $productPageHideEmptyInventories && (!isset($inventoriesStock[$inventory_id]) || empty($inventoriesStock[$inventory_id])) ) {
							continue;
						}
						
						$checked = "";
						if($selectedFound) {
							if($inventory_id == $this->selectedLocation) {
								$checked = 'checked="checked" selected="selected"';
							}
						} else {
							if(isset($inventoriesStock[$inventory_id]) && !empty($inventoriesStock[$inventory_id]) && !$found) {
								$found = true;
								$checked = 'checked="checked" selected="selected"';
							}
						}

						

						switch ($this->get_option('productPageStockDisplay')) {
							case 'count':
								$inventoryStockQuantityDisplay = sprintf( $this->get_option('textsStock'), $inventoriesStock[$inventory_id] );
								break;
							case 'inout':
								if($inventoriesStock[$inventory_id] > 0) {
									$inventoryStockQuantityDisplay = $this->get_option('textsInStock');
								} else {
									$inventoryStockQuantityDisplay 	= $this->get_option('textsOutOfStock');
								}
								
								break;
							case 'hidden':
								$inventoryStockQuantityDisplay = '';
								break;
							
							default:
								$inventoryStockQuantityDisplay = $inventoriesStock[$inventory_id];
								break;
						}

						if($inventoryProduct->backorders_allowed() && $inventoriesStock[$inventory_id] == 0) {

							if($inventoryProduct->backorders_require_notification()) {
								$inventoryStockQuantityDisplay = __( 'can be backordered', 'woocommerce-multi-inventory' );
							} else {
								$inventoryStockQuantityDisplay = $this->get_option('textsInStock');
							}
						}

						if( !empty($inventoryStockQuantityDisplay) ) {

							if($productPageDisplay == "text" || $productPageDisplay == "textOnlySelected") {
								$inventoryStockQuantityDisplay = '(' . $inventoryStockQuantityDisplay . ') ';
							}

							$inventoryStockQuantityDisplay = '<span class="woocommerce-multi-inventory-stock-status">' . $inventoryStockQuantityDisplay . '</span>';
						}

						$priceInfo = "";
						if(isset($inventoryPrices[$inventory_id]) && !empty($inventoryPrices[$inventory_id])) {
							$priceInfo = wc_price($inventoryPrices[$inventory_id]);
							if(!empty($inventoryStockQuantityDisplay)) {
								$priceInfo .= ' – ';
							}
						} 


						$disabled = "";
						if($inventory['disabled']) {
							$disabled = 'disabled="disabled"';
						}

						if($productPageDisplay == "select") {

							echo '<option value="' . $inventory_id . '" ' . $checked . ' ' . $disabled . ' data-name="' . $inventory_name . '">' . $inventory_name;

							if(!empty($priceInfo) || !empty($inventoryStockQuantityDisplay) || !empty($inventory_delivery_time)) {
								echo ' (' . $priceInfo . $inventoryStockQuantityDisplay . $inventory_delivery_time . ')';
							}

							echo '</option>';

						} elseif($productPageDisplay == "label" || $productPageDisplay == "labelPopup") {

							$labelText = str_replace('%d', '%s', $this->get_option('productPageDisplayLabelText') );
							$labelChange = $this->get_option('productPageDisplayLabelChange');

							if($first) {

								// need to find a solution for single variations ... they are loaded via JS
								if($this->selectedLocation > 0 && isset($inventoriesStock[$this->selectedLocation])) {
									echo '<span class="woocommerce-multi-inventory-label-text">' . 
										str_replace(
											array('{{stock}}', '{{inventory}}', '{{delivery_time}}', '%s'),
											array('<span class="woocommerce-multi-inventory-label-current-stock">' . $inventoriesStock[$this->selectedLocation] . '</span> ', $temp[$this->selectedLocation]['name'], $inventory_delivery_time, $temp[$this->selectedLocation]['name']),
											$labelText
										) 
									. '</span>';
								} else {

									// echo 
									// '<span class="woocommerce-multi-inventory-label-text">' . 
									// 	str_replace(
									// 		array('{{stock}}', '{{inventory}}', '{{delivery_time}}', '%s'),
									// 		array('<span class="woocommerce-multi-inventory-label-current-stock">' . $inventoriesStock[$inventory_id] . '</span> ', $inventory_name, $inventory_delivery_time, $inventory_name),
									// 		$labelText
									// 	)
									// . '</span>';
									echo $noInventorySelected = $this->get_option('textsNoInventorySelected');
								}

								if($productPageDisplay == "labelPopup") {

									echo '<a class="woocommerce-multi-inventory-open-poup" data-product-id="' . $inventoryProduct->get_id() . '" href="#">' . $labelChange . '</a>';
								} else {
									echo '<a class="woocommerce-multi-inventory-label-change" href="#">' . $labelChange . '</a>';
								}
							}
							
							if($productPageDisplay == "label") {
							?>

								<label class="woocommerce-multi-inventory-inventories-row woocommerce-multi-inventory-inventories-row-inventory-<?php echo $inventory_id ?>">
									<div class="woocommerce-multi-inventory-inventories-radio">
										<input type="radio" name="woocommerce_multi_inventory_inventory" value="<?php echo $inventory_id ?>" <?php echo $checked ?> <?php echo $disabled ?>>
									</div>
									<div class="woocommerce-multi-inventory-inventories-name">
										<?php echo $inventory_name ?>
										<?php if(!empty($inventory_delivery_time)) {
											echo '<span class="woocommerce-multi-inventory-delivery-time">' . $inventory_delivery_time . '</span>';
										} ?>
									</div>
									<div class="woocommerce-multi-inventory-inventories-stock <?php echo $inventoriesStock[$inventory_id] > 0 ? 'woocommerce-multi-inventory-inventories-stock-on-stock' : 'woocommerce-multi-inventory-inventories-stock-out-of-stock' ?>">
									
										<?php
										if(isset($inventoryPrices[$inventory_id]) && !empty($inventoryPrices[$inventory_id])) {
											echo wc_price($inventoryPrices[$inventory_id]) . ' – ';
										} 
										?>

										<?php echo $inventoryStockQuantityDisplay ?>
									</div>
									<div class="woocommerce-multi-inventory-clear"></div>
								</label>
							<?php
							}

						} elseif($productPageDisplay == "text") {

							echo '<span class="woocommerce-multi-inventory-text-single">' . $inventory_name . ' ' . $inventoryStockQuantityDisplay . $priceInfo . $inventory_delivery_time . '</span>';

						} 
						elseif($productPageDisplay == "textOnlySelected") {

							if($this->selectedLocation != $inventory_id) {
								continue;
							}

							echo '<span class="woocommerce-multi-inventory-text">' . $inventory_name . ' ' . $inventoryStockQuantityDisplay . $priceInfo . $inventory_delivery_time . '</span>';

						} 

						else {
						?>

							<label class="woocommerce-multi-inventory-inventories-row woocommerce-multi-inventory-inventories-row-inventory-<?php echo $inventory_id ?>">
								<div class="woocommerce-multi-inventory-inventories-radio">
									<input type="radio" name="woocommerce_multi_inventory_inventory" value="<?php echo $inventory_id ?>" <?php echo $checked ?> <?php echo $disabled ?>>
								</div>
								<div class="woocommerce-multi-inventory-inventories-name">
									<?php echo $inventory_name ?>
									<?php if(!empty($inventory_delivery_time)) {
										echo '<span class="woocommerce-multi-inventory-delivery-time">' . $inventory_delivery_time . '</span>';
									} ?>
								</div>
								<div class="woocommerce-multi-inventory-inventories-stock <?php echo $inventoriesStock[$inventory_id] > 0 ? 'woocommerce-multi-inventory-inventories-stock-on-stock' : 'woocommerce-multi-inventory-inventories-stock-out-of-stock' ?>">
									
										<?php echo $priceInfo ?>

										<?php echo $inventoryStockQuantityDisplay ?>
								</div>
								<div class="woocommerce-multi-inventory-clear"></div>
							</label>
						<?php

						}

						$first = false;
					}

					if($productPageDisplay == "text") {
						echo '</div>';
					}

					if($productPageDisplay == "select") {
						echo '</select>';
					} elseif($productPageDisplay == "label" || $productPageDisplay == "labelPopup") {
						echo '</div>';
					}
				?>

				<?php if($this->get_option('clickCollectEnable')) { ?>
				</div>
				<?php } ?>

			<div class="woocommerce-multi-inventory-manager-table-spinner"></div>

			<?php do_action('woocommerce_multi_inventory_after_inventories_container') ?>

		</div>
		<?php
	}

	public function save_my_custom_checkout_field( $cart_item_data, $product_id, $variation_id ) 
	{
		$product_id = $product_id;
		if($variation_id) {
			$product = wc_get_product($variation_id);
			$product_id = $variation_id;
		} else {
			$product = wc_get_product($product_id);	
		}

		$inventory_id = $this->selectedLocation;
		if(isset($_POST['woocommerce_multi_inventory_inventory']) && !empty($_POST['woocommerce_multi_inventory_inventory'])) {
			$inventory_id = intval( $_POST['woocommerce_multi_inventory_inventory'] );
		}

		if( empty( $inventory_id ) ) {
			return $cart_item_data;
		}

		$inventory = get_term($inventory_id, 'inventories');
		if(!$inventory) {
			return $cart_item_data;
		}

        $cart_item_data['woocommerce_multi_inventory_inventory']['label'] = $this->get_option('textsInventoryLabel');
        $cart_item_data['woocommerce_multi_inventory_inventory']['value'] = $inventory_id;
        $cart_item_data['woocommerce_multi_inventory_inventory']['ukey'] = 'woocommerce_multi_inventory_inventory';

        $cart_item_data['woocommerce_multi_inventory_inventory_' . $product_id] = $inventory_id;

	    return $cart_item_data;
	}

	public function render_meta_on_cart_and_checkout( $cart_data, $cart_item )
	{

	    $custom_items = array();
	    /* Woo 2.4.2 updates */
	    if( !empty( $cart_data ) ) {
	        $custom_items = $cart_data;
	    }

    	if(isset($cart_item['woocommerce_multi_inventory_inventory'])) {

    		$inventory_id = (int) $cart_item['woocommerce_multi_inventory_inventory']['value'];
    		$inventory = get_term($inventory_id);
    		if(!$inventory) {
    			return $custom_items;
    		}

	        $custom_items[] = array(
	            'name' => $cart_item['woocommerce_multi_inventory_inventory']['label'],
	            'value' => $inventory->name,
	        );	
    	}

	    return $custom_items;
	}

	public function validate_checkout_inventories($data, $errors) 
	{

		foreach ( WC()->cart->get_cart() as $cart_item_key => &$cart_item ) {

			$item = $cart_item['data'];
			$product_id = $cart_item['product_id'];
			$variation_id = $cart_item['variation_id'];
			$quantity = $cart_item['quantity'];
			if($variation_id > 0) {
				$variation = wc_get_product($variation_id);
				if($variation && $variation->get_manage_stock() !== "parent") {
					$product_id = $variation_id;
				}
			}

			if($this->get_option('wpmlSupport') && function_exists('icl_object_id')) {
				global $sitepress;
				$default_lang = $sitepress->get_default_language();
				$wpml_product_id = icl_object_id($product_id, 'product', false, $default_lang);
				if($wpml_product_id > 0) {
					$product_id = $wpml_product_id;
				}
			}

			$productInventoriesStock = get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
			if(is_array($productInventoriesStock)) {
				$productInventoriesStock = array_filter($productInventoriesStock, function ($element) {
				    return trim($element) !== "";
				});
			}

			if($this->get_option('inventoryAllowEmptyProducts') && empty($productInventoriesStock)) {
				continue;
			}


			$product = wc_get_product($product_id);

			if( !$this->get_option('orderFlowAlwaysUse') && (
				isset($cart_item['woocommerce_multi_inventory_inventory']) 
				&& isset($cart_item['woocommerce_multi_inventory_inventory']['value']) 
				&& $cart_item['woocommerce_multi_inventory_inventory']['value'] > 0 ) 
				)
			{ 
	 			$inventory_id = intval($cart_item['woocommerce_multi_inventory_inventory']['value']);

	    	// auto set 
	    	} else {
	    		$inventory_id = $this->get_inventory_by_product($quantity, $productInventoriesStock, $product);
	    	}    	

			$inventory = get_term($inventory_id, 'inventories');

			if(empty($inventory_id) || !isset($productInventoriesStock[$inventory_id]) || $productInventoriesStock[$inventory_id] < 1) {
				
				if(!$product->is_type('bundle') && !$product->backorders_allowed() && !$product->is_on_backorder() ) {
					$errors->add('inventory-empty', sprintf( $this->get_option('textsNotInStock'), $item->get_name(), $productInventoriesStock[$inventory_id], $inventory->name) );
				}
			}

			if($productInventoriesStock[$inventory_id] < $quantity && !$product->backorders_allowed() && !$product->is_on_backorder() ) {

				$textsNotInStock = $this->get_option('textsNotInStock');
				$errors->add('inventory-empty', sprintf( $textsNotInStock, $product->get_name(), $productInventoriesStock[$inventory_id], $inventory->name ) );
			}

	        $cart_item['woocommerce_multi_inventory_inventory'] = array(
	        	'label' => $this->get_option('textsInventoryLabel'),
	        	'value' => $inventory_id,
	        	'ukey' => 'woocommerce_multi_inventory_inventory',
        	);

			$cart_item['woocommerce_multi_inventory_inventory_' . $product_id] = $inventory_id;
		 	WC()->cart->cart_contents[$cart_item_key] = $cart_item;
		}    	

		WC()->cart->set_session();
		// var_dump($inventory_id);
		// var_dump($cart_item);
		// die('!!');

	}

	public function get_inventory_by_product($quantity, $productInventoriesStock, $product, $simulate = false) 
	{
		$tmp = array();

		$orderFlowOption = $this->get_option('orderFlowOption');

		foreach($productInventoriesStock as $inventory_id => $stock) {

			if(!$simulate) {
				if(!$product->backorders_allowed() && ($stock < 1 || $stock < $quantity)) {
					continue;
				}
			}

			$inventory = get_term($inventory_id);
			if(!$inventory) {
				continue;
			}

			$tmp[$inventory_id] = array(
				'id' => $inventory_id,
				'name' => $inventory->name,
				'order' => get_term_meta($inventory_id, 'woocommerce_multi_inventory_order', true),
				'stock' => $productInventoriesStock[$inventory_id],
				'distance' => 99999,
			);

			if ($orderFlowOption == "distance") {

    			try {
					$distance = $this->get_distance($inventory_id);
    			} catch (Exception $e) {
					if($this->get_option('googleAPIDebug')) {
						echo $e->getMessage();
						die();
					}
    			}
    			
    			if(!$distance) {
    				unset($tmp[$inventory_id]);
    				continue;
    			}

    			$tmp[$inventory_id]['distance'] = $distance;
    			
			} elseif ($orderFlowOption == "country") {

				$tmp[$inventory_id]['countries'] = array();
				$inventoryCountries = get_term_meta($inventory_id, 'woocommerce_multi_inventory_countries', true);
				if(!empty($inventoryCountries) && is_array($inventoryCountries)) {
					$tmp[$inventory_id]['countries'] = $inventoryCountries;
				}

			}
		}

		$inventories = $tmp;
		if(empty($inventories)) {
			return;
		}

		$keys = array_keys($inventories);
		if($orderFlowOption == "distance") {

			array_multisort(array_map(function($element) {
			      return $element['distance'];
			  }, $inventories), SORT_ASC, $inventories);

		} elseif($orderFlowOption == "lowest_stock") {
			array_multisort(array_map(function($element) {
			      return $element['stock'];
			  }, $inventories), SORT_ASC, $inventories);
		} elseif($orderFlowOption == "name") {

			array_multisort(array_map(function($element) {
			      return $element['name'];
			  }, $inventories), SORT_ASC, $inventories);

		} elseif($orderFlowOption == "order") {
			array_multisort(array_map(function($element) {
			      return $element['order'];
			  }, $inventories), SORT_DESC, $inventories);
		}  elseif($orderFlowOption == "country") {

			$usersCountry = "";
			if(isset($_POST['ship_to_different_address']) && $_POST['ship_to_different_address'] == "1" && isset($_POST['shipping_country']) && !empty($_POST['shipping_country'])) {
				$usersCountry = $_POST['shipping_country'];
			} elseif (isset($_POST['billing_country']) && !empty($_POST['billing_country'])) {
				$usersCountry = $_POST['billing_country'];
			} else {
				$wcSession = WC()->session;
				if($wcSession) {
					$customer = $wcSession->get( 'customer' );
					if(isset($customer['shipping_country']) && !empty($customer['shipping_country'])) {
						$usersCountry = $customer['shipping_country'];
					} elseif(isset($customer['country']) && !empty($customer['country'])) {
						$usersCountry = $customer['country'];
					}
				}
			}

			if(empty($usersCountry) && $this->get_option('useGeojs')) {
                $ip = $_SERVER['REMOTE_ADDR'];
                $url = "https://get.geojs.io/v1/ip/geo/" . $ip .".json";

                $geolocate = json_decode(file_get_contents($url));

                if(isset($geolocate->country_code)) {
                    $usersCountry = $geolocate->country_code;
                }
            }

            if(empty($usersCountry) && isset($_SERVER["HTTP_ACCEPT_LANGUAGE"])) {

		        $languages = explode(",", $_SERVER["HTTP_ACCEPT_LANGUAGE"]);
		        foreach($languages as $language)
		        {
		            $lang = explode(';', $language);
		            $lang = $lang[0];

		            if(strlen($lang) == 5) {
		                // WHY THE F*CK does the browser output a locale with a hyphen
		                $usersCountry = substr($lang, -2);
		                break;
		            } else {
		            	$usersCountry = $lang;
		            }
		        }
            }

            $usersCountry = strtoupper($usersCountry);

			if(empty($usersCountry)) {
				$usersCountry = wc_get_base_location()['country'];
			}

		} else {
			array_multisort(array_map(function($element) {
			      return $element['stock'];
			  }, $inventories), SORT_DESC, $inventories);
		}

		if($orderFlowOption == "country") {

			$inventory_id = false;
			if(!empty($usersCountry)) {
				foreach($inventories as $inventory) {

					if(empty($inventory['countries'])) {
						continue;
					}

					if(in_array($usersCountry, $inventory['countries'])) {
						$inventory_id = $inventory['id'];

						if($productInventoriesStock[$inventory_id] > 0) {
							break;
						}
					}
				}
			} 
			
			// Maybe use custom inventory
			if(empty($inventory_id)) {
				$inventory_id = $this->get_option('orderFlowFallback');	
			}
		} else {
			
			$orderFlowCustomInventory = $this->get_option('orderFlowCustomInventory');
			if ($orderFlowOption == "custom" && !empty($orderFlowCustomInventory) && isset($productInventoriesStock[$orderFlowCustomInventory])) {
				$inventory_id = $orderFlowCustomInventory;
			} else {
				$inventory_id = reset($inventories)['id'];
			}
		}

		return $inventory_id;
	}

	public function save_order_meta_data( $item, $cart_item_key, $values, $order ) 
	{
		$product_id = $item->get_product_id();
		$variation_id = $item->get_variation_id();
		if($variation_id > 0) {

			$variation = wc_get_product($variation_id);
			if($variation && $variation->get_manage_stock() !== "parent") {
				$product_id = $variation_id;
			}
		}

		if($this->get_option('wpmlSupport') && function_exists('icl_object_id')) {
			global $sitepress;
			$default_lang = $sitepress->get_default_language();
			$wpml_product_id = icl_object_id($product_id, 'product', false, $default_lang);
			if($wpml_product_id > 0) {
				$product_id = $wpml_product_id;
			}
		}
	

		$productInventoriesStock = get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
		if(is_array($productInventoriesStock)) {
			$productInventoriesStock = array_filter($productInventoriesStock, function ($element) {
			    return trim($element) !== "";
			});
		}

		// User has selected on product page
    	if( isset($values['woocommerce_multi_inventory_inventory_' . $product_id]) && !empty($values['woocommerce_multi_inventory_inventory_' . $product_id]) ) { 
 			$inventory_id = intval($values['woocommerce_multi_inventory_inventory_' . $product_id]);
    		// $productInventoriesStock[$inventory_id] = $productInventoriesStock[$inventory_id] - $item->get_quantity();
    		// update_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);
        	$item->update_meta_data( 'woocommerce_multi_inventory_inventory_' . $product_id, $inventory_id);
        	$item->update_meta_data( '_woocommerce_multi_inventory_inventory', $inventory_id);
    	}
//     	var_dump($inventory_id);
// die('?');
    	$order->update_meta_data('woocommerce_multi_inventory_inventory', $inventory_id);

	}

	public function get_distance($inventory_id)
	{
		// selected inventory meta
		$lat = get_term_meta($inventory_id, 'woocommerce_multi_inventory_lat', true);
		$lng = get_term_meta($inventory_id, 'woocommerce_multi_inventory_lng', true);
		if(empty($lat) || empty($lng)) {

	   		if($this->get_option('googleAPIDebug')) {
	   			echo 'missing lat / lng data for inventory ' . $inventory_id;
	   			die();
			}

			return false;
		}
		$origin = $lat . ', ' . $lng;

		// $customer = WC()->session->get( 'customer' );
		// if(!empty($customer)) {
		// 	if(isset($_POST['ship_to_different_address']) && $_POST['ship_to_different_address'] == "1" ) {
		// 		$destination = $customer['shipping_address_1'] . ' ' . $customer['shipping_address_2'] . ',' . $customer['shipping_postcode'] . ' ' . $customer['shipping_city'] . ',' . $customer['shipping_country'];
		// 	} else {
		// 		$destination = $customer['address_1'] . ' ' . $customer['address_2'] . ',' . $customer['postcode'] . ' ' . $customer['city'] . ',' . $customer['country'];	
		// 	}
		// } elseif(isset($_POST['billing_address_1'])) {
		// 	if(isset($_POST['ship_to_different_address']) && $_POST['ship_to_different_address'] == "1" ) {
		// 		$destination = $_POST['shipping_address_1'] . ' ' . $_POST['shipping_address_2'] . ',' . $_POST['shipping_postcode'] . ' ' . $_POST['shipping_city'] . ',' . $_POST['shipping_country'];
		// 	} else {
		// 		$destination = $_POST['billing_address_1'] . ' ' . $_POST['billing_address_2'] . ',' . $_POST['billing_postcode'] . ' ' . $_POST['billing_city'] . ',' . $_POST['billing_country'];	
		// 	}
		// }
		
		$destination = "";
		if(isset($_POST['ship_to_different_address']) && $_POST['ship_to_different_address'] == "1" && isset($_POST['shipping_address_1']) && !empty($_POST['shipping_address_1']) ) {
			$destination = $_POST['shipping_address_1'] . ' ' . $_POST['shipping_address_2'] . ' ' . $_POST['shipping_postcode'] . ' ' . $_POST['shipping_city'] . ' ' . $_POST['shipping_country'];
		} elseif(isset($_POST['billing_address_1']) && !empty($_POST['billing_address_1']) ) {
			$destination = $_POST['billing_address_1'] . ' ' . $_POST['billing_addres_2'] . ' ' . $_POST['billing_postcode'] . ' ' . $_POST['billing_city'] . ' ' . $_POST['billing_country'];	
		} elseif(isset($_POST['s_address']) && !empty($_POST['s_address']) ) {
			$destination = $_POST['s_address'] . ' ' . $_POST['s_addres_2'] . ' ' . $_POST['s_postcode'] . ' ' . $_POST['s_city'] . ' ' . $_POST['s_country'];	
		}
		
		$destination = sanitize_text_field( $destination );
		if(empty($destination)) {

			if(isset($_COOKIE['woocommerce_multi_inventory_lat']) && !empty($_COOKIE['woocommerce_multi_inventory_lat']) && isset($_COOKIE['woocommerce_multi_inventory_lng']) && !empty($_COOKIE['woocommerce_multi_inventory_lng'])) {
				$destination = $_COOKIE['woocommerce_multi_inventory_lat'] . ', ' . $_COOKIE['woocommerce_multi_inventory_lat'];
			}

			if(empty($destination)) {
				return false;
			}
		}	
		

		if($this->get_option('googleAPIUseGeocoding')) {
			
			$userLatLng = $this->geocode($destination);
			if(!$userLatLng) {

		   		if($this->get_option('googleAPIDebug')) {
					var_dump('API Key error or could not get position.');
					die();
				}
				return false;
			}

			$distance = $this->vincentyGreatCircleDistance($lat, $lng, $userLatLng['lat'], $userLatLng['lng']);
	   		if($this->get_option('googleAPIDebug')) {
	   			var_dump('inventory lat / lng: ' . $lat . ' - ' . $lng);
	   			var_dump('user lat / lng: ' . $userLatLng['lat'] . ' - ' . $userLatLng['lng'] );
	   			var_dump($distance);
	   			die();
			}

		} else {

			$license = new StandardLicense($this->get_option('googleAPIKey'));
			// Premim License needs client ID + Encryption -> $license = new PremiumLicense($clientId, $encryptionKey);
			$request = new DistanceMatrix($license);

			$response = DistanceMatrix::license($license)
			    ->addOrigin($origin)
			    ->addDestination($destination)
			    ->request();

		   	if(!$response || !isset($response->json)) {
	   			return false;
		   	}
	   		if($this->get_option('googleAPIDebug')) {
	   			var_dump('inventory: ' . $origin );
	   			var_dump('user: ' . $destination );
	   			var_dump($response);
	   			die();
			}

			$rows = $response->json["rows"];
			return (float) $rows[0]['elements'][0]['distance']['value'] / 1000;
		}

		return $distance;
	}

	public function geocode($address)
	{
	    // url encode the address
	    $address = urlencode($address);
	      
	    // google map geocode api url
	    $url = "https://maps.googleapis.com/maps/api/geocode/json?address={$address}&key=" . $this->get_option('googleAPIKey');
	  
	    // get the json response
	    $resp_json = file_get_contents($url);
	      
	    // decode the json
	    $resp = json_decode($resp_json, true);
	  
	    // response status will be 'OK', if able to geocode given address 
	    if($resp['status']=='OK'){
	  
	        // get the important data
	        $lat = isset($resp['results'][0]['geometry']['location']['lat']) ? $resp['results'][0]['geometry']['location']['lat'] : "";
	        $lng = isset($resp['results'][0]['geometry']['location']['lng']) ? $resp['results'][0]['geometry']['location']['lng'] : "";
	        $formatted_address = isset($resp['results'][0]['formatted_address']) ? $resp['results'][0]['formatted_address'] : "";
	          
	        // verify if data is complete
	        if($lat && $lng) {
	          
	            // put the data in the array
	            $data = array(
	            	'lat' => floatval( $lat ),
	            	'lng' => floatval( $lng ),
            	);
	              
	            return $data;
	              
	        } else{
				if($this->get_option('googleAPIDebug')) {
					var_dump($resp);
					die();
				}
	            return false;
	        }

	    } else {
			if($this->get_option('googleAPIDebug')) {
				var_dump($resp);
				die();
			}
	        return false;
	    }
	}


	public function vincentyGreatCircleDistance(
	  $latitudeFrom, $longitudeFrom, $latitudeTo, $longitudeTo, $earthRadius = 6371)
	{

		if($this->get_option('radiusShippingUseMiles')) {
			$earthRadius = 3959;
		}
		
		// convert from degrees to radians
		$latFrom = deg2rad($latitudeFrom);
		$lonFrom = deg2rad($longitudeFrom);
		$latTo = deg2rad($latitudeTo);
		$lonTo = deg2rad($longitudeTo);

		$lonDelta = $lonTo - $lonFrom;
		$a = pow(cos($latTo) * sin($lonDelta), 2) +
		pow(cos($latFrom) * sin($latTo) - sin($latFrom) * cos($latTo) * cos($lonDelta), 2);
		$b = sin($latFrom) * sin($latTo) + cos($latFrom) * cos($latTo) * cos($lonDelta);

		$angle = atan2(sqrt($a), $b);
		return $angle * $earthRadius;
	}

	public function ajax_get_variation_stock()
	{
		$response = array(
			'status' => false,
			'inventories_stock' => array(),
			'text' => '',
		);

		if(!isset($_POST['variation_id']) || empty($_POST['variation_id'])) {
			echo json_encode($response);
			die();
		}

		$variationId = intval( $_POST['variation_id'] );
		$product = wc_get_product($variationId);
		if($product->is_type('variation') && $product->get_manage_stock() === "parent") {
			$variationId = $product->get_parent_id();
		}

		$inventoriesStock = (array) get_post_meta($variationId, 'woocommerce_multi_inventory_inventories_stock', true);
		if(empty($inventoriesStock)) {
			echo json_encode($response);
			die();
		}

		$inventoriesStock = array_filter($inventoriesStock, function ($element) {
		    return trim($element) !== "";
		});

		if(empty($inventoriesStock)) {
			echo json_encode($response);
			die();
		}

		$response['status'] = true;
		$response['inventories_stock'] = $inventoriesStock;

		if($this->get_option('productPageDisplay') == "text" || $this->get_option('productPageDisplay') == "textOnlySelected") {


			$inventoryStockQuantityDisplayResponse = "";

			if($this->get_option('productPageDisplay') == "text") {

				foreach($inventoriesStock as $inventoryId => $inventoryStock) {

					$inventoryStockQuantityDisplay = "";

					$inventory = get_term($inventoryId, 'inventories');

					switch ($this->get_option('productPageStockDisplay')) {

						case 'count':
							$inventoryStockQuantityDisplay = sprintf( $this->get_option('textsStock'), $response['inventories_stock'][$inventoryId] );
							break;
						case 'inout':
							if($response['inventories_stock'][$inventoryId] > 0) {
								$inventoryStockQuantityDisplay = $this->get_option('textsInStock');
							} else {
								$inventoryStockQuantityDisplay = $this->get_option('textsOutOfStock');
							}
							
							break;
						case 'hidden':
							$inventoryStockQuantityDisplay = '';
							break;
						
						default:
							$inventoryStockQuantityDisplay = $response['inventories_stock'][$inventoryId];
							break;
					}

					$inventoryStockQuantityDisplay = '(' . $inventoryStockQuantityDisplay . ')';
					$inventoryStockQuantityDisplayResponse .= '<span class="woocommerce-multi-inventory-text-single">' . $inventory->name . ' ' . '<span class="woocommerce-multi-inventory-stock-status">' . $inventoryStockQuantityDisplay . '</span></span>';
				}

				$response['text'] =  $inventoryStockQuantityDisplayResponse;


			} else {

				$inventory = get_term($this->selectedLocation, 'inventories');

				switch ($this->get_option('productPageStockDisplay')) {
					case 'count':
						$inventoryStockQuantityDisplay = sprintf( $this->get_option('textsStock'), $response['inventories_stock'][$this->selectedLocation] );
						break;
					case 'inout':
						if($response['inventories_stock'][$this->selectedLocation] > 0) {
							$inventoryStockQuantityDisplay = $this->get_option('textsInStock');
						} else {
							$inventoryStockQuantityDisplay 	= $this->get_option('textsOutOfStock');
						}
						
						break;
					case 'hidden':
						$inventoryStockQuantityDisplay = '';
						break;
					
					default:
						$inventoryStockQuantityDisplay = $response['inventories_stock'][$this->selectedLocation];
						break;
				}

				$inventoryStockQuantityDisplay = '(' . $inventoryStockQuantityDisplay . ')';
				$inventoryStockQuantityDisplay = '<span class="woocommerce-multi-inventory-stock-status">' . $inventoryStockQuantityDisplay . '</span>';

				$response['text'] = $inventory->name . ' ' . $inventoryStockQuantityDisplay;
			}

			
		}

		echo json_encode($response);
		die();
	}

	public function ajax_get_inventories()
	{
		$response = array(
			'status' => false,
			'inventories_html' => '',
			'first_inventory' => false,
		);

		$lat = floatval($_POST['lat']);
		$lng = floatval($_POST['lng']);
		$product_id = intval($_POST['product_id']);
		$product = false;

		if($product_id > 0) {
			$product = wc_get_product($product_id);
		}

		if($product && $product->is_type('variation')) {
			if($product->get_manage_stock() === "parent") {
				$product = wc_get_product( $product->get_parent_id() );
			}
		}

		if($product) {
			
			// $inventories = wp_get_object_terms($product_id, 'inventories', array(
			// 	'hide_empty' => false,
			// 	'meta_query' => array(
			// 		array(
			// 			'key'     => 'woocommerce_multi_inventory_frontend',
			// 			'value'   => "on",
			// 			'compare' => '='
			// 		)
			// 	)
			// ));

 			$productInventoriesStock = (array) $product->get_meta('woocommerce_multi_inventory_inventories_stock');
            $productInventoriesStock = array_filter($productInventoriesStock, function ($element) {
                return trim($element) !== "";
            });

	        $tmp = array();
			foreach($productInventoriesStock as $inventory_id => $stock) {

				if($stock < 1 && $this->get_option('productPageHideEmptyInventories') ) {
					continue;
				}

				$inventory = get_term($inventory_id);
				if(!$inventory) {
					continue;
				}

				$frontend = get_term_meta($inventory_id, 'woocommerce_multi_inventory_frontend', true);
				if($frontend != "on") {
					continue;
				}

				if($this->get_option('popupShowStock')) {
					$inventory->stock = $stock;
				}

				$tmp[$inventory_id] = $inventory;
			}
			$inventories = $tmp;


		} else {
		  	$inventories = get_terms( array(
				'taxonomy' => 'inventories',
				'hide_empty' => false,
				'meta_query' => array(
					array(
						'key'     => 'woocommerce_multi_inventory_frontend',
						'value'   => "on",
						'compare' => '='
					)
				)
		  	));
		}

	  	if(empty($inventories)) {
			echo json_encode($response);
			die();
	  	}

	  	$deliveryInventory = 0;
	  	if( $this->get_option('clickCollectEnable') ) {
	  		$deliveryInventory = $this->get_option('deliveryInventory');
  		}

	  	$mappedInventories = array();
		if(!empty($lat) && !empty($lng)) {

			foreach($inventories as $inventory) {

				if($inventory->term_id == $deliveryInventory) {
					continue;
				}

				$inventory_meta = get_term_meta($inventory->term_id);
				$inventoryLat = isset($inventory_meta['woocommerce_multi_inventory_lat']) && !empty($inventory_meta['woocommerce_multi_inventory_lat']) ? $inventory_meta['woocommerce_multi_inventory_lat'][0] : '';
				$inventoryLng = isset($inventory_meta['woocommerce_multi_inventory_lng']) && !empty($inventory_meta['woocommerce_multi_inventory_lng']) ? $inventory_meta['woocommerce_multi_inventory_lng'][0] : '';

				if(empty($inventoryLat) || empty($inventoryLng)) {
					continue;
				}

				$a = $lat - $inventoryLat;
				$b = $lng - $inventoryLng;
				$distance = (string) sqrt(($a**2) + ($b**2));
				if(isset($mappedInventories[$distance])) {
					$distance .= rand(0,999);
				}
				$mappedInventories[$distance] = $inventory;
			}

			ksort($mappedInventories);
			$inventories = $mappedInventories;
		}

		$firstInventoryId = reset($inventories)->term_id;
		if($firstInventoryId != $deliveryInventory) {
			$response['first_inventory'] = $firstInventoryId;
		} else {
			$response['first_inventory'] = next($inventories)->term_id;
		}

		if($deliveryInventory > 0) {
			$deliveryLocation = get_term($deliveryInventory, 'inventories');
			if(isset($deliveryLocation->term_id)) {
				array_unshift($mappedInventories , $deliveryLocation);
			}
		}
		

		$maxResults = !empty($this->get_option('popupMaxResults')) ? $this->get_option('popupMaxResults') : 100;
		$inventories = array_slice($inventories, 0, $maxResults);

		$inventoriesHTML = "";
		if(!empty($inventories)) {
			foreach($inventories as $distance => $inventory) {

				if($inventory->term_id == $deliveryInventory) {
					continue;
				}
				
				$inventoriesHTML .= $this->popup_get_single_inventory_html($distance, $inventory);
			}
		}

        $response['status'] = true;
        $response['inventories_html'] = $inventoriesHTML;

		echo json_encode($response);
		die();
	}

	public function popup_get_single_inventory_html($distance, $inventory)
	{

	  	$distanceUnit = ' km';
	  	if($this->get_option('popupMiles')) {
	  		$distanceUnit = ' mi';
	  	}

		ob_start();

		$inventory_name = esc_attr($inventory->name);
		$distance_text = '<span class="woocommerce-multi-inventory-popup-locations-location-distance-value">' . round($distance * 100, 0) . '</span>' . $distanceUnit;
		if($this->get_option('deliveryInventory') == $inventory->term_id) {

			if(!empty($this->get_option('clickCollectShowDeliveryInPopupCustomTitle') ) ) {
				$inventory_name = esc_html( $this->get_option('clickCollectShowDeliveryInPopupCustomTitle') );
			}

			if(!empty($this->get_option('clickCollectShowDeliveryInPopupCustomDistance'))) {
				$distance_text = esc_html( $this->get_option('clickCollectShowDeliveryInPopupCustomDistance') );
			}
		}

		$inventory_meta = get_term_meta($inventory->term_id);
		$lat = isset($inventory_meta['woocommerce_multi_inventory_lat']) && !empty($inventory_meta['woocommerce_multi_inventory_lat']) ? $inventory_meta['woocommerce_multi_inventory_lat'][0] : '';
		$lng = isset($inventory_meta['woocommerce_multi_inventory_lng']) && !empty($inventory_meta['woocommerce_multi_inventory_lng']) ? $inventory_meta['woocommerce_multi_inventory_lng'][0] : '';
		$address = isset($inventory_meta['woocommerce_multi_inventory_address']) && !empty($inventory_meta['woocommerce_multi_inventory_address']) ? $inventory_meta['woocommerce_multi_inventory_address'][0] : '';
		$image = isset($inventory_meta['woocommerce_multi_inventory_image']) && !empty($inventory_meta['woocommerce_multi_inventory_image']) ? unserialize($inventory_meta['woocommerce_multi_inventory_image'][0]) : '';
		?>

		<a href="#" data-id="<?php echo $inventory->term_id ?>" data-name="<?php echo htmlentities($inventory->name) ?>" data-lat="<?php echo esc_attr($lat) ?>" data-lng="<?php echo esc_attr($lng) ?>" class="woocommerce-multi-inventory-popup-locations-location woocommerce-multi-inventory-popup-all-locations-location woocommerce-multi-inventory-popup-all-locations-location-<?php echo $inventory->term_id ?> woocommerce-multi-inventory-choose-location">
			
			<div class="woocommerce-multi-inventory-popup-locations-location-image">

				<?php if(isset($image['url']) && !empty($image['url'])) { ?>
					<img src="<?php echo $image['url'] ?>" alt="<?php echo $inventory_name ?>">
				<?php } else { ?>
					<i class="fa fa-store fa-lg"></i>
				<?php } ?>
				
			</div>

			<div class="woocommerce-multi-inventory-popup-locations-location-data">
				<div class="woocommerce-multi-inventory-popup-locations-location-title">
					<span class="woocommerce-multi-inventory-popup-locations-location-name"><?php echo $inventory_name ?></span>
					<span class="woocommerce-multi-inventory-popup-locations-location-distance"><?php echo $distance_text ?></span>
					<div class="woocommerce-multi-inventory-clear"></div>
				</div>

				<?php if(!empty($address)) { ?>
				<div class="woocommerce-multi-inventory-popup-locations-location-address">
					<?php echo esc_attr($address) ?>
				</div>
				<?php } ?>

				<?php if(!empty($inventory->description)) { ?>
				<div class="woocommerce-multi-inventory-popup-locations-location-description">
					<?php echo esc_attr($inventory->description) ?>
				</div>
				<?php } ?>

				<?php if(isset($inventory->stock) && !empty($inventory->stock)) { ?>
				<div class="woocommerce-multi-inventory-popup-locations-location-stock">
					<?php echo sprintf( esc_html__( $this->get_option('textsStock') ), $inventory->stock ) ; ?>
				</div>
				<?php } ?>

				<div class="woocommerce-multi-inventory-popup-locations-location-select">
					<?php echo esc_html( $this->get_option('textsSelectStore') ) ?>
				</div>
				<div class="woocommerce-multi-inventory-clear"></div>
				

			</div>
			<div class="woocommerce-multi-inventory-clear"></div>
		</a>

		<?php

        $inventory_popup_html = ob_get_contents();
        ob_end_clean();	 

        $inventory_popup_html = apply_filters('woocommerce_multi_inventory_popup_single_inventory_html', $inventory_popup_html, $inventory, $distance, $this->options);

        return $inventory_popup_html;
	}

	public function sortByNearestLatLong($geoData, $lat, $long, $returnNearestOnly=true){
        // CREATE AN ARRAY FOR USE INSIDE THE FUNCTION
        $arrCloseMatchLat   = array();
        $arrCloseMatchLong  = array();
        $matchedGeoSet      = array();

        // LOOP THROUGH ALL THE $geoData ARRAY AND SUBTRACT THE GIVEN LAT & LONG VALUES
        // FROM THOSE CONTAINED IN THE ORIGINAL ARRAY: $geoData
        // WE KNOW THAT THE SMALLER THE RESULT OF THE SUBTRACTION; THE CLOSER WE ARE
        // WE DO THIS FOR BOTH THE LONGITUDE & LATITUDE... HENCE OUR ARRAY:
        // $arrCloseMatchLat AND $arrCloseMatchLong RESPECTIVELY
        foreach($geoData as $iKey=>$arrGeoStrip){
            $arrCloseMatchLat[$iKey]    =  abs(floatval( ($arrGeoStrip['lat'])  - $lat  ));
            $arrCloseMatchLong[$iKey]   =  abs(floatval( ($arrGeoStrip['lng']) - $long ));
        }


    // WE SORT BOTH ARRAYS NUMERICALLY KEEPING THE KEYS WHICH WE NEED FOR OUR FINAL RESULT
        asort($arrCloseMatchLat, SORT_NUMERIC);
        asort($arrCloseMatchLong, SORT_NUMERIC);

        // WE CAN RETURN ONLY THE RESULT OF THE FIRST, CLOSEST MATCH
        if($returnNearestOnly){
            foreach($arrCloseMatchLat as $index=>$difference){
                $matchedGeoSet['lats'][]  = $geoData[$index];
                break;
            }
            foreach($arrCloseMatchLong as $index=>$difference){
                $matchedGeoSet['lngs'][] = $geoData[$index];
                break;
            }
            // OR WE CAN RETURN THE ENTIRE $geoData ARRAY ONLY SORTED IN A "CLOSEST FIRST" FASHION...
            // WE DO THIS FOR BOTH THE lng & lat RESPECTIVELY SO WE END UP HAVING 2
            // ARRAYS: ONE THAT SORTS THE CLOSEST IN TERMS OF LONG VALUES
            // AN ONE THAT SORTS THE CLOSEST IN TERMS OF LAT VALUES...
        }else{
            foreach($arrCloseMatchLat as $index=>$difference){
                $matchedGeoSet['lats'][]  = $geoData[$index];
            }
            foreach($arrCloseMatchLong as $index=>$difference){
                $matchedGeoSet['lngs'][] = $geoData[$index];
            }
        }
        return $matchedGeoSet;
    }

	public function popup()
	{

	  	$inventories = get_terms( array(
			'taxonomy' => 'inventories',
			'hide_empty' => false,
			'meta_query' => array(
				array(
					'key'     => 'woocommerce_multi_inventory_frontend',
					'value'   => "on",
					'compare' => '='
				)
			)
	  	));

	  	$popupTextColor = $this->get_option('popupTextColor');
	  	$popupBackgroundColor = $this->get_option('popupBackgroundColor');
	  	$popupLayout = $this->get_option('popupLayout');

	  	$distanceUnit = ' km';
	  	if($this->get_option('popupMiles')) {
	  		$distanceUnit = ' mi';
	  	}
	  	

		?>
		<style type="text/css">
			.woocommerce-multi-inventory-popup-locations-location-image svg,
			.woocommerce-multi-inventory-popup-locations-location,
			.woocommerce-multi-inventory-popup-locations-location:hover {
				color:  <?php echo $popupTextColor; ?>;
				stroke: <?php echo $popupTextColor; ?>;
				fill:  <?php echo $popupTextColor; ?>;
			}

			.woocommerce-multi-inventory-popup-locations-location-distance,
			.woocommerce-multi-inventory-popup-locations-location-select {
				background-color: <?php echo $popupTextColor; ?>;
				color: <?php echo $popupBackgroundColor; ?>;
			}

		</style>
		<div id="woocommerce-multi-inventory-overlay" class="woocommerce-multi-inventory-overlay" style="display: none;"></div>
		<div id="woocommerce-multi-inventory-popup-container" class="woocommerce-multi-inventory-popup-container woocommerce-multi-inventory-popup-layout-<?php echo $popupLayout ?>" style="display: none;">
			<?php if(!$this->get_option('popupHideClose')) { ?>
			<a href="#" class="woocommerce-multi-inventory-popup-close-container">
				<div class="woocommerce-multi-inventory-popup-close-icon">X</div>
			</a>
			<?php } ?>

			<div class="woocommerce-multi-inventory-popup" style="background-color: <?php echo $popupBackgroundColor; ?>; color: <?php echo $popupTextColor; ?>;">

				<div class="woocommerce-multi-inventory-popup-intro-text">
					<?php echo do_shortcode( $this->get_option('popupText') ) ?>
				</div>

				<?php if($this->get_option('googleAPIKey') && $this->get_option('popupShowSearch')) { ?>


					<div class="woocommerce-multi-inventory-popup-search-container">
						<input type="text" placeholder="<?php echo $this->get_option('textsPopupSearchAddress') ?>" name="woocommerce_multi_inventory_popup_address" class="woocommerce-multi-inventory-popup-address">
						<input type="button" value="<?php echo $this->get_option('textsPopupSearch') ?>" name="woocommerce_multi_inventory_popup_address_button" class="btn btn-primary  button woocommerce-multi-inventory-popup-address-button" style="background-color: <?php echo $this->get_option('popupButtonBackgroundColor') ?>; color: <?php echo $this->get_option('popupButtonTextColor') ?>;">
					</div>


				<?php } ?>

				<div class="woocommerce-multi-inventory-popup-top-container">

					<div class="woocommerce-multi-inventory-popup-locations-nearest-location-container">
						<div class="woocommerce-multi-inventory-popup-locations-nearest-location-loader"></div>
						<div class="woocommerce-multi-inventory-popup-locations-nearest-location-error"><?php esc_html_e('Could not get your position', 'woocommerce-multi-inventory') ?></div>
						<div class="woocommerce-multi-inventory-popup-locations-nearest-location"></div>
					</div>

					<?php if($this->get_option('clickCollectEnable') && !empty($this->get_option('deliveryInventory'))) {

						$deliveryInventory = get_term($this->get_option('deliveryInventory'), 'inventories');
						?>

						<?php if($this->get_option('clickCollectShowDeliveryInPopup')) { ?>
						<div class="woocommerce-multi-inventory-popup-locations-delivery-location-container" style="display: none;">
							<?php echo $this->popup_get_single_inventory_html( $this->get_option('clickCollectShowDeliveryInPopupCustomDistance'), $deliveryInventory ); ?>
						</div>
						<?php
						}
					}
					?>	
				</div>



				<div class="woocommerce-multi-inventory-popup-locations-container" style="display: none;">

					<hr class="woocommerce-multi-inventory-popup-divider">

					<div class="woocommerce-multi-inventory-popup-locations-intro-text">
						<?php echo do_shortcode( $this->get_option('popupAllLocationsText') ) ?>
					</div>

					<div class="woocommerce-multi-inventory-popup-locations">
						
					</div>

					<div class="woocommerce-multi-inventory-clear"></div>
				</div>
			</div>
		</div>	

		<?php
	}

	public function add_inventory_email_to_email($recipient, $order )
	{
		if(!$order) {
			return $recipient;
		}

		// use order not cart, because of admin orders have no cart ??? 
		// $cart = WC()->cart;
		// if(!$cart) {
		// 	return $recipient;
		// }

		$recipientsToAdd = array();
		$inventoryIds = array();
		// foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
			
		// 	if(isset($cart_item['woocommerce_multi_inventory_inventory'])) {
		// 		$inventoryId = intval( $cart_item['woocommerce_multi_inventory_inventory']['value'] );
		// 		$email = get_term_meta($inventoryId, 'woocommerce_multi_inventory_email', true);
		// 		if(!empty($email) && !in_array($email, $recipientsToAdd)) {
		// 			$recipientsToAdd[] = $email;
		// 		}


		// 		if($this->get_option('inventoryUsersEmail')) {
		// 			$inventoryUsers = get_term_meta($inventoryId, 'woocommerce_multi_inventory_users', true);
		// 			if(!empty($inventoryUsers)) {

		// 				foreach($inventoryUsers as $inventoryUserId) {
		// 					$inventoryUser = get_userdata($inventoryUserId);
		// 					if(!empty($inventoryUser) && !empty($inventoryUser->data->user_email) && !in_array($inventoryUser->data->user_email, $recipientsToAdd)) {
		// 						$recipientsToAdd[] = $inventoryUser->data->user_email;	
		// 					}
		// 				}
		// 			}
		// 		}

		// 		$inventoryIds[] = $inventoryId;
		// 	}
		// }

		foreach ( $order->get_items() as $item_id => $item ) {

			$product_id = $item->get_product_id();
			if(empty($product_id)) {
				continue;
			}

			$variation_id = $item->get_variation_id();
			if($variation_id > 0) {
				$variation = wc_get_product($variation_id);
				if($variation && $variation->get_manage_stock() !== "parent") {
					$product_id = $variation_id;
				}
			}

		    $inventory_id = (int) wc_get_order_item_meta( $item_id, 'woocommerce_multi_inventory_inventory_' . $product_id, true ); 
			if(empty($inventory_id)) {
				continue;
			}

			$email = get_term_meta($inventory_id, 'woocommerce_multi_inventory_email', true);
			if(!empty($email) && !in_array($email, $recipientsToAdd)) {
				$recipientsToAdd[] = $email;
			}

			if($this->get_option('inventoryUsersEmail')) {
				$inventoryUsers = get_term_meta($inventory_id, 'woocommerce_multi_inventory_users', true);
				if(!empty($inventoryUsers)) {

					foreach($inventoryUsers as $inventoryUserId) {
						$inventoryUser = get_userdata($inventoryUserId);
						if(!empty($inventoryUser) && !empty($inventoryUser->data->user_email) && !in_array($inventoryUser->data->user_email, $recipientsToAdd)) {
							$recipientsToAdd[] = $inventoryUser->data->user_email;	
						}
					}
				}
			}

			$inventoryIds[] = $inventory_id;
	    }

		wp_set_post_terms($order->get_id(), $inventoryIds, 'inventories');

		if(!empty($recipientsToAdd) && $this->get_option('emailInventory') ) {
			$recipient .= ',';
			$recipient .= implode(',', $recipientsToAdd);
		}

	    return $recipient;
	}

	public function maybe_disable_payment_gateways($available_gateways) 
	{
		$unset = false;

		if(!is_checkout()) {
			return $available_gateways;
		}


		$deliveryInventory = $this->get_option('deliveryInventory');
		$deliveryInventoryIncluded = false;
		foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
			
			if(isset($cart_item['woocommerce_multi_inventory_inventory'])) {
				$inventory_id = intval( $cart_item['woocommerce_multi_inventory_inventory']['value'] );
				if(!empty($inventory_id)) {
					$disabledPaymentGateways = get_term_meta($inventory_id, 'woocommerce_multi_inventory_disabled_payment_gateways', true);
					if(!empty($disabledPaymentGateways)) {
						foreach($disabledPaymentGateways as $disabledPaymentGateway) {
							unset($available_gateways[$disabledPaymentGateway]);
						}
					}
				}

				if($inventory_id == $deliveryInventory) {
					$deliveryInventoryIncluded = true;
				}
			}
		}

		if($this->get_option('clickCollectEnable') ) {

			$clickCollectDeliveryPaymentGateways = $this->get_option('clickCollectDeliveryPaymentGateways');
			$clickCollectPickupPaymentGateways = $this->get_option('clickCollectPickupPaymentGateways');
			
			foreach($available_gateways as $available_gateway_key => $available_gateway) {
			// 	$rateInventoryId = $rateValue->get_instance_id();

				if(!empty($clickCollectDeliveryPaymentGateways)) {
					if($deliveryInventoryIncluded && !in_array($available_gateway_key, $clickCollectDeliveryPaymentGateways)) {
						unset($available_gateways[$available_gateway_key]);
					} elseif(!$deliveryInventoryIncluded && in_array($available_gateway_key, $clickCollectDeliveryPaymentGateways)) {
						unset($available_gateways[$available_gateway_key]);
					}
				}

				if(!empty($clickCollectPickupPaymentGateways)) {
					if(!$deliveryInventoryIncluded && !in_array($available_gateway_key, $clickCollectPickupPaymentGateways)) {
						unset($available_gateways[$available_gateway_key]);
					} elseif($deliveryInventoryIncluded && in_array($available_gateway_key, $clickCollectPickupPaymentGateways)) {
						unset($available_gateways[$available_gateway_key]);
					}
				}
			}
		}

	    return $available_gateways;
	}

	public function maybe_disable_shipping_methods( $rates, $package )
	{

		$deliveryInventory = $this->get_option('deliveryInventory');
		$deliveryInventoryIncluded = false;
		foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
			
			if(isset($cart_item['woocommerce_multi_inventory_inventory'])) {
				$inventory_id = intval( $cart_item['woocommerce_multi_inventory_inventory']['value'] );

				if(!empty($inventory_id)) {
					$disabledShippingMethods = get_term_meta($inventory_id, 'woocommerce_multi_inventory_disabled_shipping_methods', true);
					if(!empty($disabledShippingMethods)) {
						foreach($disabledShippingMethods as $disabledShippingMethod) {
							foreach($rates as $rateKey => $rateValue) {
								$rateInventoryId = $rateValue->get_instance_id();
								if($rateInventoryId == $disabledShippingMethod) {
									unset($rates[$rateKey]);
								}
							}
						}
					}
				}

				if($inventory_id == $deliveryInventory) {
					$deliveryInventoryIncluded = true;
				}
			}
		}

		if($this->get_option('clickCollectEnable') ) {

			$clickCollectDeliveryShippingMethods = $this->get_option('clickCollectDeliveryShippingMethods');
			$clickCollectPickupShippingMethods = $this->get_option('clickCollectPickupShippingMethods');
			
			foreach($rates as $rateKey => $rateValue) {
				$rateInventoryId = $rateValue->get_instance_id();

				if(!empty($clickCollectDeliveryShippingMethods)) {
					if($deliveryInventoryIncluded && !in_array($rateInventoryId, $clickCollectDeliveryShippingMethods)) {
						unset($rates[$rateKey]);
					} elseif(!$deliveryInventoryIncluded && in_array($rateInventoryId, $clickCollectDeliveryShippingMethods)) {
						unset($rates[$rateKey]);
					}
				}

				if(!empty($clickCollectPickupShippingMethods)) {
					if(!$deliveryInventoryIncluded && !in_array($rateInventoryId, $clickCollectPickupShippingMethods)) {
						unset($rates[$rateKey]);
					} elseif($deliveryInventoryIncluded && in_array($rateInventoryId, $clickCollectPickupShippingMethods)) {
						unset($rates[$rateKey]);
					}
				}
			}
		}

	    return $rates;
	}
}