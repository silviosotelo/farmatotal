<?php

use TeamPickr\DistanceMatrix\DistanceMatrix;
use TeamPickr\DistanceMatrix\Response\DistanceMatrixResponse;
use TeamPickr\DistanceMatrix\Response\Element;
use TeamPickr\DistanceMatrix\TravelMode;
use TeamPickr\DistanceMatrix\Licenses\StandardLicense;

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://welaunch.io/plugins
 * @since      1.0.0
 * @usage 	   https://github.com/teampickr/php-google-maps-distance-matrix
 * @package    WooCommerce_Multi_Inventory
 * @subpackage WooCommerce_Multi_Inventory/public
 */
class WooCommerce_Multi_Inventory_Radius_Shipping extends WooCommerce_Multi_Inventory {

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
	protected $public;
	protected $distance;
	protected $response;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct($plugin_name, $version, $public ) 
	{
		$this->plugin_name = $plugin_name;
		$this->version = $version;

		$this->distance = false;
		$this->response = false;

		$this->public = $public;
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

		if (!$this->get_option('enable') || !$this->get_option('radiusShipping')) {
			return false;
		}

		$apiKey = trim( $this->get_option('googleAPIKey') );
		if(empty($apiKey)) {
			return false;
		}

		if(!$this->get_option('radiusShippingFeesEnable') && !$this->get_option('radiusShippingDistanceEnable')) {
			return false;
		}

		if(is_admin()) {
			return false;
		}

		// Check Shipping Method (e.g. only apply on free shipping, not on pickup)
		$radiusShippingMethods = $this->get_option('radiusShippingMethods');
		if(!empty($radiusShippingMethods)) {

			$wcSession = WC()->session;
			if($wcSession) {
				
				if(isset($_POST['shipping_method']) && !empty($_POST['shipping_method'][0])) {
					$chosenShipping = explode(':', $_POST['shipping_method'][0]);
				} else {
					$chosenMethods = $wcSession->get( 'chosen_shipping_methods' );
					$chosenShipping = explode(':', $chosenMethods[0]);	
				}

				if(empty($chosenShipping)) {
					add_action('woocommerce_after_checkout_validation', array($this, 'noShippingMethodError'), 10, 2);
				}

				
				if(substr( $chosenShipping[0], 0, 17 ) === "flexible_shipping" ) {
					$chosenShipping = explode('_', $chosenShipping[0])[2];
				} else {
					$chosenShipping = $chosenShipping[1];	
				}

				if(!in_array($chosenShipping, $radiusShippingMethods)) {

					if($this->get_option('radiusShippingFees')) {

						$radiusShippingFeesLabel = $this->get_option('radiusShippingFeesLabel');
						
					    $fees = WC()->cart->get_fees();
					    foreach ($fees as $key => $fee) {
					        if($fees[$key]->name === $radiusShippingFeesLabel ) {
					            unset($fees[$key]);
					        }
					    }
					    WC()->cart->fees_api()->set_fees($fees);
				    }
		
					return false;
				}

			}
		}

		$wcSession = WC()->session;
		if(!$wcSession) {
			return;
		}

		$customer = $wcSession->get( 'customer' );
		if(!$customer) {
			return;	
		}

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
			return;
		}

		// // Mapped because 2 fields are missing
		// if(isset($_POST['post_data'])) {
			
		// 	$post_data = explode('&', $_POST['post_data']);

		// 	$tmp = array();
		// 	// Shipping on first position and always active
		// 	foreach($post_data as $post_data) {

		// 		$tmp2 = explode('=', $post_data);
		// 		if(!isset($tmp2[0]) || empty($tmp2[0])) {
		// 			continue;
		// 		}
		// 		$tmp[$tmp2[0]] = $tmp2[1];
		// 	}

		// 	$post_data = $tmp;

		// 	if(isset($post_data['ship_to_different_address']) && !empty($post_data['ship_to_different_address'])) {
		// 		$_POST['ship_to_different_address'] = $post_data['ship_to_different_address'];
		// 	}				
		// }

		foreach ( WC()->cart->get_cart() as $cart_item_key => &$cart_item ) {

			$item = $cart_item['data'];
			$product_id = $cart_item['product_id'];
			$variation_id = $cart_item['variation_id'];
			if($variation_id > 0) {
				$product_id = $variation_id;
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

    		if(!empty($productInventoriesStock)) {

				$inventory_id = $cart_item['woocommerce_multi_inventory_inventory']['value'];
				if(empty($inventory_id)) {
					$inventory_id = $this->public->get_inventory_by_product($cart_item['quantity'], $productInventoriesStock);
				}

				$this->distance = $this->public->get_distance($inventory_id);

			}
		}
		//

		if($this->get_option('radiusShippingFeesEnable')) {
			add_action('woocommerce_cart_calculate_fees', array($this, 'add_fee'), 10, 1);
		}

		if($this->get_option('radiusShippingDistanceEnable')) {
			$radius = $this->get_option('radiusShippingDistanceRadius');
			if($this->distance > $radius) {
				add_action('woocommerce_after_checkout_validation', array($this, 'radiusReachedError'), 10, 2);
			}
		}
    }

	public function custom_user_fields($user) 
	{
		$woocommerce_multi_inventory_lat = isset($user->woocommerce_multi_inventory_lat) ? $user->woocommerce_multi_inventory_lat : '';
		$woocommerce_multi_inventory_lng = isset($user->woocommerce_multi_inventory_lng) ? $user->woocommerce_multi_inventory_lng : '';
		?>
		<h2><?php esc_html_e('WooCommerce Multi_Inventory Data', 'woocommerce-delivery') ?></h2>
			<table class="form-table" id="fieldset-billing">
				<tbody>
					<tr>
						<th>
							<label for="woocommerce_multi_inventory_lat"><?php esc_html_e('Location Latitude', 'woocommerce-delivery') ?></label>
						</th>
						<td>
							<input placeholder="52.69064" type="text" name="woocommerce_multi_inventory_lat" id="woocommerce_multi_inventory_lat" value="<?php echo $woocommerce_multi_inventory_lat ?>" class="regular-text">
							<p class="description"><?php esc_html_e('Latitude Data for WooCommerce Multi_Inventory plugin. Used for radius shipping when using Geocoding.', 'woocommerce-delivery') ?></p>
						</td>
					</tr>
					<tr>
						<th>
							<label for="woocommerce_multi_inventory_lng"><?php esc_html_e('Location Longitude', 'woocommerce-delivery') ?></label>
						</th>
						<td>
							<input placeholder="7.29097" type="text" name="woocommerce_multi_inventory_lng" id="woocommerce_multi_inventory_lng" value="<?php echo $woocommerce_multi_inventory_lng ?>" class="regular-text">
							<p class="description"><?php esc_html_e('Longitude Data for WooCommerce Multi_Inventory plugin. Used for radius shipping when using Geocoding.', 'woocommerce-delivery') ?></p>
						</td>
					</tr>
				</tbody>
			</table>
		<?php 
	}

	public function save_user_fields($user_id) 
	{
		if(isset($_POST['woocommerce_multi_inventory_lat']) && !empty($_POST['woocommerce_multi_inventory_lat'])) {
	  		update_user_meta($user_id, 'woocommerce_multi_inventory_lat', $_POST['woocommerce_multi_inventory_lat']);
	  	}

		if(isset($_POST['woocommerce_multi_inventory_lng']) && !empty($_POST['woocommerce_multi_inventory_lng'])) {
	  		update_user_meta($user_id, 'woocommerce_multi_inventory_lng', $_POST['woocommerce_multi_inventory_lng']);
	  	}
	}

    public function add_fee()
    {
    	global $woocommerce;

		$radiusShippingFees = $this->get_option('radiusShippingFees');
		if(empty($radiusShippingFees)) {
			return;
		}

		$radiusShippingFeeAmount = 0;
		foreach ($radiusShippingFees as $radiusShippingFee) {
			$radiusShippingFee = explode('|', $radiusShippingFee);
			if(!isset($radiusShippingFee[0]) || empty($radiusShippingFee[0]) || !isset($radiusShippingFee[1]) || empty($radiusShippingFee[1]) ){
				continue;
			}

			$radiusShippingFeeDistance = (float) $radiusShippingFee[0];
			if($radiusShippingFeeDistance >= $this->distance) {
				continue;
			}

			$radiusShippingFeeAmount = (float) $radiusShippingFee[1];					
		}

		$radiusShippingFeesLabel = $this->get_option('radiusShippingFeesLabel');
		if($radiusShippingFeeAmount > 0) {
			$woocommerce->cart->add_fee( $radiusShippingFeesLabel, (float) $radiusShippingFeeAmount, $this->get_option('radiusShippingFeesTaxable') );	
		} else {
		    $fees = $woocommerce->cart->get_fees();
		    foreach ($fees as $key => $fee) {
		        if($fees[$key]->name === $radiusShippingFeesLabel ) {
		            unset($fees[$key]);
		        }
		    }
		    $woocommerce->cart->fees_api()->set_fees($fees);
		}
    }

	public function radiusReachedError($fields, $errors )
	{			
		$message = $this->get_option('radiusShippingDistanceMessage');

		// Notice texts missing
		if(!$message) {
			return false;
		}

        $errors->add( 'validation', $message );
	}

	public function noDistanceError($fields, $errors )
	{
   		if($this->get_option('radiusShippingDebug')) {
   			ob_start();
			var_dump($this->response->json);
			$message = ob_get_clean();
   			$errors->add( 'validation', $message );
   			return false;
		}
		
		$message = $this->get_option('radiusShippingAllowNoDistanceMessage');

		// Notice texts missing
		if(!$message) {
			return false;
		}

        $errors->add( 'validation', $message );
	}

	public function noShippingMethodError($fields, $errors )
	{
		$message = $this->get_option('radiusShippingMethodsEmpty');

		// Notice texts missing
		if(!$message) {
			return false;
		}

        $errors->add( 'validation', $message );
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
				if($this->get_option('radiusShippingDebug')) {
					var_dump($resp);
					die();
				}
	            return false;
	        }

	    } else {
			if($this->get_option('radiusShippingDebug')) {
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

}
