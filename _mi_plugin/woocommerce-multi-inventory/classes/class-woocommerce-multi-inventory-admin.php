<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://welaunch.io/plugins
 * @since      1.0.0
 *
 * @package    WooCommerce_Multi_Inventory
 * @subpackage WooCommerce_Multi_Inventory/admin
 */
class WooCommerce_Multi_Inventory_Admin extends WooCommerce_Multi_Inventory {

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
	protected $userRoles;
	protected $options;
	protected $inventories;

	protected $isSavingOrder;

	/**
	 * Construct the Class
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https://welaunch.io
	 * @param   [type]                       $plugin_name [description]
	 * @param   [type]                       $version     [description]
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;
		$this->userRoles = array();

		$this->isSavingOrder = false;
	}

    /**
     * Enqueue Admin Styles
     * @author Daniel Barenkamp
     * @version 1.0.0
     * @since   1.0.0
     * @link    https://welaunch.io/plugins/woocommerce-multi-inventory/
     * @return  boolean
     */
    public function enqueue_styles()
    {
    	if(isset($_GET['page']) && $_GET['page'] == "woocommerce-multi-inventory-manager") {
			wp_enqueue_style( 'jquery-datatables', 'https://cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css', array(), '1.10.21', 'all' );
			wp_enqueue_style( 'jquery-datatables-fixedheader', 'https://cdn.datatables.net/fixedheader/3.1.7/css/fixedHeader.dataTables.min.css', array(), '3.1.7', 'all' );
		}

		wp_enqueue_style( $this->plugin_name.'-admin', plugin_dir_url( dirname( __FILE__ ) ) . 'assets/css/woocommerce-multi-inventory-admin.css', array(), $this->version);
    }

    /**
     * Enqueue Admin Scripts
     * @author Daniel Barenkamp
     * @version 1.0.0
     * @since   1.0.0
     * @link    http://woocommerce.welaunch.io
     * @return  boolean
     */
    public function enqueue_scripts()
    {
    	if(isset($_GET['page']) && $_GET['page'] == "woocommerce-multi-inventory-manager") {
	    	wp_enqueue_script( 'jquery-datatables', 'https://cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js', array( 'jquery' ), '1.10.21', true );

			$jss = array(
				'datatables-fixedheader' => 'https://cdn.datatables.net/fixedheader/3.1.7/js/dataTables.fixedHeader.min.js',
			);

			foreach ($jss as $key => $js) {
				wp_enqueue_script( $key, $js, array( 'jquery', 'jquery-datatables' ), '1.10.21', true );
			}
		}

        $mapsJS = 'https://maps.google.com/maps/api/js?libraries=places';
        $googleApiKey = $this->get_option('apiKey');
        if (!empty($googleApiKey)) {
            $mapsJS = $mapsJS . '&key=' . $googleApiKey;
        }

        wp_enqueue_script( $this->plugin_name . '-gmaps', $mapsJS, array(), $this->version, true);
		wp_enqueue_script( $this->plugin_name . '-admin', plugin_dir_url( dirname( __FILE__ ) ) . 'assets/js/woocommerce-multi-inventory-admin.js', array('jquery', 'select2'), $this->version, true);

    }


	/**
	 * Load Redux
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https://welaunch.io
	 * @return  [type]                       [description]
	 */
	public function load_redux()
	{
	    if ( file_exists( plugin_dir_path( dirname( __FILE__ ) ) . 'config/options-init.php' ) ) {
	        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'config/options-init.php';
	    }
	}

	/**
	 * Init Admin
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https://welaunch.io
	 * @return  [type]             [description]
	 */
	public function init()
	{
		global $woocommerce_multi_inventory_options;

		if(empty($woocommerce_multi_inventory_options)) {
			$woocommerce_multi_inventory_options = get_option('woocommerce_multi_inventory_options');
		}

		$this->options = $woocommerce_multi_inventory_options;

		if (!$this->get_option('enable')) {
			return false;
		}

		global $wp_roles;
		if(isset($wp_roles->roles)) {
			$this->userRoles = array_keys($wp_roles->roles);
		}

		add_action('woocommerce_after_order_itemmeta', array($this, 'inventory_backend_select_field'), 20, 3 );
		add_action('woocommerce_after_order_object_save', array($this, 'save_backend_item_meta_data'), 9990999, 1 );

		$this->inventories = array();
		if(!$this->get_option('backendEditDisable') || $this->get_option('showInventoriesInProductsBackend')) {

		  	$inventories = get_terms( array(
				'taxonomy' => 'inventories',
				'hide_empty' => false,
		  	));
		  	
	 		if(!empty($inventories) && !is_wp_error($inventories)) {

	 			$tmp = array();
	 			foreach($inventories as $inventory) {
	 				$tmp[$inventory->term_id] = $inventory;
	 			}
	 			$this->inventories = $tmp;
 			}
		}

		add_action( 'woocommerce_payment_complete', array($this, 'reduce_stock') , 0, 1);
		add_action( 'woocommerce_order_status_completed', array($this, 'reduce_stock'), 0, 1 );
		add_action( 'woocommerce_order_status_processing', array($this, 'reduce_stock') , 0, 1);
		add_action( 'woocommerce_order_status_on-hold', array($this, 'reduce_stock'), 0, 1 );

		if($this->get_option('reduceStockOnPendingPayments')) {
			add_action( 'woocommerce_order_status_pending', array($this, 'reduce_stock'), 0, 1 );
		} else {
			add_action( 'woocommerce_order_status_pending', array($this, 'increase_stock'), 0, 1 );
		}

		add_action( 'woocommerce_order_status_cancelled', array($this, 'increase_stock'), 0, 1 );
		add_action('woocommerce_restock_refunded_item', array($this, 'restock_refunded'), 20, 5 );

		if(!$this->get_option('backendEditDisable')) {

			add_action('woocommerce_product_options_stock_status', array($this, 'add_inventory_stock_fields') );
			add_action('woocommerce_variation_options_inventory',array($this, 'add_inventory_stock_fields_for_variations'), 10, 3 ); 

			if($this->get_option('inventoryPrices')) {
				add_action('woocommerce_product_options_general_product_data', array($this, 'add_price_fields') );
				add_action('woocommerce_variation_options_pricing', array($this, 'add_price_fields_for_variations'), 11, 3 ); 
			}

			add_action('woocommerce_process_product_meta', array($this, 'save_custom_fields') );
			add_filter('woocommerce_save_product_variation', array($this,'save_product_variation'), 10, 2 );
		}

		if($this->get_option('reduceManualOrdersStock')) {
			
	        // Reduce or increase order stock when changing the order status on the admin screen.
	        add_action( 'woocommerce_process_shop_order_meta', array( $this, 'admin_manage_stock' ), 45 );

	        // Allow reduce or increase stock using bulk or the actions buttons on the order list screen.
	        add_action( 'woocommerce_order_edit_status', array( $this, 'admin_bulk_manage_stock' ), 20, 2 );
		}

		if($this->get_option('showInventoriesInProductsBackend')) {

        	add_filter('manage_product_posts_columns', array($this, 'columns_head'), 99, 1);
        	add_action('manage_product_posts_custom_column', array($this, 'columns_content'), 10, 1);
    	}

		if($this->get_option('inventoryUsers')) {
			add_action('show_user_profile', array($this, 'custom_user_fields') );
			add_action('edit_user_profile', array($this, 'custom_user_fields') );

			add_action('personal_options_update', array($this, 'save_user_fields') );
			add_action('edit_user_profile_update', array($this, 'save_user_fields') );

			if($this->get_option('inventoryUsersOrdersBackend')) {
				add_action('pre_get_posts', array($this, 'filter_not_shop_manager_orders') );
				add_filter('woocommerce_order_query', array($this, 'test'), 20, 2);
			}
		}		

		if($this->get_option('restockUnpaidOrdersStock')) {
	        add_filter( 'woocommerce_cancel_unpaid_order', array($this, 'decrease_unpaid_orders_stock'), 60, 2 );     
	    }

	    if($this->get_option('orderFlowSplitOrders')) {
	    	add_action('woocommerce_checkout_order_processed', array($this, 'maybe_split_order'), 20, 3 );
	    }
	}

	public function test($results, $args) {

        if(!function_exists('wp_get_current_user')) {
            return false;
        }

        if(!is_admin()) {
            return;
        }

        if(current_user_can('manage_options')) {
        	return $results;
        }

        $current_user = wp_get_current_user();
        $userInventories = get_user_meta($current_user->ID, 'woocommerce_multi_inventory_inventories', true);
        if(empty($userInventories)) {
        	return array();
        }

		foreach($results as $index => $order_id) {
			$order = wc_get_order($order_id);
			$inventoryId = $order->get_meta('woocommerce_multi_inventory_inventory');

	        if(!in_array($inventoryId, $userInventories)) {
	        	unset($results[$index]);
	        }
		}

		return $results;

	}

	public function maybe_split_order( $order_id, $posted_data, $order )
	{
		if(!$order) {
			return;
		}

	    $splitTrue = false;

	    $firstInventoryId = 0;
	    $otherInventories = array();

	    foreach ( $order->get_items() as $item_key => $item ) {
	        // Get product
	        $product = $item->get_product();
	        if(!$product) {
	        	continue;
	        }

	        $productId = $product->get_id();
	        $inventoryId = $item->get_meta('woocommerce_multi_inventory_inventory_' . $productId);
	        if($firstInventoryId == 0) {
	        	$firstInventoryId = $inventoryId;
	        } else {
	        	if($inventoryId != $firstInventoryId) {

	        		$splitTrue = true;
        			$order->remove_item( $item->get_id() );

        			if(!isset($otherInventories[$inventoryId])) {
        				$otherInventories[$inventoryId] = array();
        			}
        			$otherInventories[$inventoryId][] = $item;
	        	}
	        }
	    }

	    if(!$splitTrue) {
	    	return;
	    }

	    $order->calculate_totals();
	    $order->save();

	    // If current order contains backorders, retrieve the necessary data from the existing order and apply it in the new order
	    foreach($otherInventories as $otherInventoryId => $otherInventoryItems) {

            $otherInventoryOrder = wc_create_order();

        	// Add product to 'backorder' order
        	// foreach($otherInventoryItems as $otherInventoryItem) {
        	// 	$otherInventoryOrder->add_item( $otherInventoryItem );
    		// }

			$order_status = $order->get_status();
			$order_coupon = $order->get_items('coupon');

			foreach($otherInventoryItems as $otherInventoryItemKey => $otherInventoryItem) {

				// need support for fees and coupons ... later
				if(!is_a($otherInventoryItem, 'WC_Order_Item_Product')) {
					continue;
				}	

				$values = $otherInventoryItem->get_data();

				if ($values['variation_id'] != 0) {
	                $product = new WC_Product_Variation($values['variation_id']);
	            } else {
	                $product = new WC_Product($values['product_id']);
	            }

	            $product_id = (method_exists($product, 'get_type') && $product->get_type()=='variation') ? $product->get_parent_id() : $product->get_id();
	            $unit_price = $product->get_price();

	            $item                       = new WC_Order_Item_Product();
	            $item->legacy_values        = $values;
	            $item->legacy_cart_item_key = $otherInventoryItemKey;

	            $product_qty = $values['quantity'];

	            $line_price = ($product_qty>=1?($values['total']/$product_qty):$values['total']);
	            $discount_price = ($values['subtotal'] - $values['total']);
	            $line_price = (!empty($order_coupon) && $discount_price > 0 ? $line_price + $discount_price : $line_price);

	            $set_props = array(
	                'quantity'     => $product_qty,
	                'variation'    => $values['variation'],
	                'subtotal_tax' => 0,
	                'total_tax'    => 0,
	                'taxes'        => array(),
	            );

	            if($wc_os_tax_cost){
	                $set_props['subtotal_tax'] = $values['subtotal_tax'];
	                $set_props['total_tax'] = $values['tax'];
	                $set_props['taxes'] = $values['tax_data'];
	            }

	            if($line_price!=$unit_price){
	                $total = $line_price*$set_props['quantity'];
	            }else{
	                $total = false;
	            }

	            $set_props['subtotal'] = ($total?$total:$unit_price*$set_props['quantity']);
	            $set_props['total'] = ($total?$total:$unit_price*$set_props['quantity']);

	            $item->set_props($set_props);

	            if ( $product ) {
	                $item->set_props( array(
	                    'name'         => $values['name'],
	                    'tax_class'    => $product->get_tax_class(),
	                    'product_id'   => $product_id,
	                    'variation_id' => (method_exists($product, 'get_type') && $product->get_type()=='variation') ? $product->get_id() : 0,
	                ) );
	            }

	            $item->set_backorder_meta();
	            $item->save();

	            if($item){

					$wc_get_order_item_meta = $otherInventoryItem->get_meta_data();
					if(!empty($wc_get_order_item_meta)){

						foreach($wc_get_order_item_meta as $item_id => $item_data){
							
							var_dump($item_data);
							if(!is_a($item_data, 'WC_Meta_Data')) {
								continue;
							}
							
							$item_data_meta_data = $item_data->get_data();
							if(empty($item_data_meta_data)) {
								continue;
							}
							
							$item->add_meta_data($item_data_meta_data['key'], $item_data_meta_data['value']);
						}
					}

	                $otherInventoryOrder->add_item( $item );
	            }
            }

	        // Obtain necessary information
	        // Get address
	        $address = array(
	            'company'	 => $order->get_billing_company(),
	            'first_name' => $order->get_billing_first_name(),
	            'last_name'  => $order->get_billing_last_name(),
	            'email'      => $order->get_billing_email(),
	            'phone'      => $order->get_billing_phone(),
	            'address_1'  => $order->get_billing_address_1(),
	            'address_2'  => $order->get_billing_address_2(),
	            'city'       => $order->get_billing_city(),
	            'state'      => $order->get_billing_state(),
	            'postcode'   => $order->get_billing_postcode(),
	            'country'    => $order->get_billing_country()
	        );

	        // Get shipping
	        $shipping = array(
	            'company'	 => $order->get_shipping_company(),
	            'first_name' => $order->get_shipping_first_name(),
	            'last_name'  => $order->get_shipping_last_name(),
	            'address_1'  => $order->get_shipping_address_1(),
	            'address_2'  => $order->get_shipping_address_2(),
	            'city'       => $order->get_shipping_city(),
	            'state'      => $order->get_shipping_state(),
	            'postcode'   => $order->get_shipping_postcode(),
	            'country'    => $order->get_shipping_country()
	        );
	        
	        // Get order currency
	        $currency = $order->get_currency();

	        // Get order payment method
	        $payment_gateway = $order->get_payment_method();
	        $customer_id = $order->get_customer_id();
	        
	        // Required information has been obtained, assign it to the 'backorder' order
	        // Set address
	        $otherInventoryOrder->set_address( $address, 'billing' );
	        $otherInventoryOrder->set_address( $shipping, 'shipping' );

	        // Set the correct currency and payment gateway
	        $otherInventoryOrder->set_currency( $currency );
	        $otherInventoryOrder->set_payment_method( $payment_gateway );
	        $otherInventoryOrder->set_customer_id( $customer_id );

			$fee_items = $order->get_fees();
			if (!empty($fee_items)) {
				
				foreach($fee_items as $fee_key => $fee_value){
					
					$fee_item  = new WC_Order_Item_Fee();
	
					$fee_item->set_props( array(
						'name'        => $fee_value->get_name(),
						'tax_class'   => $fee_value['tax_class'],
						'tax_status'  => $fee_value['tax_status'],
						'total'       => $fee_value['total'],
						'total_tax'   => $fee_value['total_tax'],
						'taxes'       => $fee_value['taxes'],
					) );
					
					$otherInventoryOrder->add_item( $fee_item );	 
					
				}
				
			}

	        // Calculate totals
	        $otherInventoryOrder->calculate_totals();

	        // Set order note with order ID
	        $otherInventoryOrder->add_order_note( 'Automated Multi Inventory splitted  order. Created from the original order ID: ' . $order_id );

	        // Optional: give the new 'backorder' order the correct status
	        $otherInventoryOrder->save();
	    }
	}

    public function decrease_unpaid_orders_stock($cancelled, $order)
    {
        if(!$order) {
            return $cancelled;
        }

		if($cancelled) {

			// Loop through order items
			foreach ( $order->get_items() as $item_id => $item ) {

				$product_id = $item->get_product_id();
				$variation_id = $item->get_variation_id();
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

				if($productId != $product_id) {
					continue;
				}

				$existingInventory = $item->get_meta('woocommerce_multi_inventory_inventory_' . $product_id);
				if(empty($existingInventory)) {
					return;
				}

				$stockDifference = $old_stock - $new_stock;
				$productInventoriesStock = get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
				$productInventoriesStock[$existingInventory] = $productInventoriesStock[$existingInventory] - $stockDifference;
				// update_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);
				$item->update_meta_data('woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);
				$item->save();
				
			}
		}

        return $cancelled;
    }

	public function custom_user_fields($user) 
	{
  		$inventories = get_terms( array(
			'taxonomy' => 'inventories',
			'hide_empty' => false,
  		));

		$userInventories = isset($user->woocommerce_multi_inventory_inventories) ? $user->woocommerce_multi_inventory_inventories : array();
		?>
		<h2><?php esc_html_e('WooCommerce Inventories', 'woocommerce-multi-inventory') ?></h2>
			<table class="form-table" id="fieldset-billing">
				<tbody>
					<tr>
						<th>
							<label for="inventories"><?php esc_html_e('Inventories Access', 'woocommerce-multi-inventory') ?></label>
						</th>
						<td>
							<select name="woocommerce_multi_inventory_inventories[]" multiple="true" id="woocommerce-multi-inventory-inventories" class="select2">
								<?php 
								foreach($inventories as $inventory) {

									$selected = '';
									if(in_array($inventory->term_id, $userInventories)) {
										$selected = 'selected="selected"';
									}

									echo '<option ' . $selected . ' value="' . $inventory->term_id . '">' . $inventory->name . '</option>';
								}
								?>
							</select>
							<p class="description"><?php esc_html_e('Select one or multiple inventories where the user should have access to.', 'woocommerce-multi-inventory') ?></p>
						</td>
					</tr>
				</tbody>
			</table>
		<?php 
	}

	public function save_user_fields($user_id) 
	{
		if(isset($_POST['woocommerce_multi_inventory_inventories'])) {

			$inventories = array_filter($_POST['woocommerce_multi_inventory_inventories']);
			if(empty($inventories)) {
				delete_user_meta($user_id, 'woocommerce_multi_inventory_inventories');
			} else {

				$existingUserInventories = get_user_meta($user_id, 'woocommerce_multi_inventory_inventories', true);
				if(!empty($existingUserInventories)) {

					$existingUserInventories = array_diff( $existingUserInventories, $_POST['woocommerce_multi_inventory_inventories']);

					foreach($existingUserInventories as $existingUserInventory) {

						$existingInventoryUsers = get_term_meta($existingUserInventory, 'woocommerce_multi_inventory_users', true);
						$existingInventoryUsers = array_diff( $existingInventoryUsers, array( $user_id ) );

						if(empty($existingInventoryUsers)) {
							delete_term_meta($existingUserInventory, 'woocommerce_multi_inventory_users');
						} else {
							update_term_meta($existingUserInventory, 'woocommerce_multi_inventory_users', $existingInventoryUsers);
						}
					}
				}

				update_user_meta($user_id, 'woocommerce_multi_inventory_inventories', $_POST['woocommerce_multi_inventory_inventories']);
				foreach($inventories as $inventory) {

					$userIds = array($user_id);

					$existingInventories = get_term_meta($inventory, 'woocommerce_multi_inventory_users', true);

					if(!empty($existingInventories))  {
						if(in_array($user_id, $existingInventories)) {
							continue;
						} else {
							$userIds = $existingInventories;
							$userIds[] = $user_id;
						}
					}

					$userIds = array_unique($userIds);

					update_term_meta($inventory, 'woocommerce_multi_inventory_users', $userIds);

				}
			}
	  	}
	}

    /**
     * Filter not authore ones 
     * @author Daniel Barenkamp
     * @version 1.0.0
     * @since   1.0.0
     * @link    https://www.welaunch.io
     * @param   [type]                       $query [description]
     * @return  [type]                              [description]
     */
    public function filter_not_shop_manager_orders($query)
    {
        if(!function_exists('wp_get_current_user')) {
            return false;
        }

        if(!is_admin()) {
            return;
        }

        $current_user = wp_get_current_user();
        $userInventories = get_user_meta($current_user->ID, 'woocommerce_multi_inventory_inventories', true);

        if (!empty($userInventories) && isset($query->query['post_type']) && ($query->query['post_type'] == "shop_order")) {
        	$tax_query = array();
        	if(!empty($query->get('tax_query'))) {
        		$tax_query = $query->get('tax_query');
        	}

        	$tax_query[] = array(
 				'taxonomy' => 'inventories',
                'field'    => 'ID',
                'operator' => 'IN',
                'terms'    => $userInventories,
        	);

            $query->set('tax_query', $tax_query);
        }
    }

	public function add_price_fields()
	{
		global $post;

		$product = wc_get_product($post->ID);
		if(!$product) {
			return;
		}

		if($product->is_type('variable')) {
			return;
		}

		$productId = $product->get_id();

		echo '<div class="woocommerce-multi-inventory">';

			echo '<h2>' . esc_html__('Inventory Prices', 'woocommerce-multi-inventory') . '</h2>';
		
			$inventoryPrices = get_post_meta($productId, 'woocommerce_multi_inventory_prices', true);	

			$i = 0;
			foreach ($this->inventories as $inventory) {

				$value = "";
				if(isset($inventoryPrices[$inventory->term_id]) && $inventoryPrices[$inventory->term_id] !== "") {
					$value = $inventoryPrices[$inventory->term_id];
				}

			    woocommerce_wp_text_input(
			        array(
			            'id' => 'woocommerce_multi_inventory_prices[' . $productId . '][' . $inventory->term_id . ']',
			            'placeholder' => $inventory->name . ' ' . esc_html__('Price', 'woocommerce-multi-inventory'),
			            'label' => $inventory->name . ' ' . esc_html__('Price', 'woocommerce-multi-inventory'),
						'type'     => 'number',
			            'value'	=> $value,
						'custom_attributes' => array(
							'step' 	=> 'any',
							'min'	=> '0'
						) 
			        )
		        );

		        $i++;
	        }

	     echo '</div>';

	}
	/**
	 * Add variation title backend field
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https:/welaunch.io
	 * @param   [type]             $loop           [description]
	 * @param   [type]             $variation_data [description]
	 * @param   [type]             $variation      [description]
	 */
	public function add_price_fields_for_variations($loop, $variation_data, $variation)
	{
		if(!$variation) {
			return;
		}

		$productId = $variation->ID;
		$inventoryPrices = get_post_meta($productId, 'woocommerce_multi_inventory_prices', true);	

		$i = 1;
		foreach ($this->inventories as $inventory) {

			$class = 'first';
			if($i % 2 == 0) {
				$class = 'last';
			}

			$value = "";
			if(isset($inventoryPrices[$inventory->term_id]) && $inventoryPrices[$inventory->term_id] !== "") {
				$value = $inventoryPrices[$inventory->term_id];
			}
			


	        echo '<div class="form-field form-row form-row-' . $class . '">';

			    woocommerce_wp_text_input(
			        array(
			            'id' => 'woocommerce_multi_inventory_prices[' . $productId . '][' . $inventory->term_id . ']',
			            'placeholder' => $inventory->name . ' ' . esc_html__('Price', 'woocommerce-multi-inventory'),
			            'label' => $inventory->name . ' ' . esc_html__('Price', 'woocommerce-multi-inventory'),
			            'value'	=> $value,
						'custom_attributes' => array(
							'step' 	=> 'any',
							'min'	=> '0'
						) 
			        )
		        );

	        echo '</div>';



	        $i++;
        }

	}

	public function reduce_stock($order_id) 
	{
		
		$order = wc_get_order( $order_id );

		if ( ! $order ) {
			return;
		}

		$stock_reduced  = $order->get_data_store()->get_stock_reduced( $order_id );
		$trigger_reduce = apply_filters( 'woocommerce_payment_complete_reduce_order_stock', ! $stock_reduced, $order_id );

		// Only continue if we're reducing stock.
		if ( ! $trigger_reduce ) {
			return;
		}

		// We need an order, and a store with stock management to continue.
		if ( ! $order || 'yes' !== get_option( 'woocommerce_manage_stock' ) || ! apply_filters( 'woocommerce_can_reduce_order_stock', true, $order ) ) {
			return;
		}

		foreach ( $order->get_items() as $item ) {

			if ( ! $item->is_type( 'line_item' ) ) {
				continue;
			}

			$product_id = $item->get_product_id();
			$variation_id = $item->get_variation_id();

			if($variation_id > 0 ) {

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

			$existingInventory = $item->get_meta('woocommerce_multi_inventory_inventory_' . $product_id);

			$productInventoriesStock = get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
			if(empty($existingInventory)) {
				return;
			}

			$qty = apply_filters( 'woocommerce_order_item_quantity', $item->get_quantity(), $order, $item );

			$productInventoriesStock = get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
			if(isset($productInventoriesStock[$existingInventory]) && $productInventoriesStock[$existingInventory] !== "") {

				$productInventoriesStock[$existingInventory] = $productInventoriesStock[$existingInventory] - $qty;
				$product = wc_get_product($product_id);
				$product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);
				$product->save();
			}

			/**
			 * Filter order item quantity.
			 *
			 * @param int|float             $quantity Quantity.
			 * @param WC_Order              $order    Order data.
			 * @param WC_Order_Item_Product $item Order item data.
			 */

			$item->save();
		}
	}

	public function increase_stock( $order_id ) 
	{
		$order = wc_get_order( $order_id );

		if ( ! $order ) {
			return;
		}

		$stock_reduced    = $order->get_data_store()->get_stock_reduced( $order_id );
		$trigger_increase = (bool) $stock_reduced;

		// Only continue if we're increasing stock.
		if ( ! $trigger_increase ) {
			return;
		}

		// We need an order, and a store with stock management to continue.
		if ( ! $order || 'yes' !== get_option( 'woocommerce_manage_stock' ) || ! apply_filters( 'woocommerce_can_restore_order_stock', true, $order ) ) {
			return;
		}

		$changes = array();

		// Loop over all items.
		foreach ( $order->get_items() as $item ) {
			if ( ! $item->is_type( 'line_item' ) ) {
				continue;
			}

			// Only increase stock once for each item.
			$product            = $item->get_product();
			$item_stock_reduced = $item->get_meta( '_reduced_stock', true );

			if ( ! $item_stock_reduced || ! $product || ! $product->managing_stock() ) {
				continue;
			}

			$product_id = $item->get_product_id();
			$variation_id = $item->get_variation_id();
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

			$existingInventory = $item->get_meta('woocommerce_multi_inventory_inventory_' . $product_id);
			if(empty($existingInventory)) {
				return;
			}

			$productInventoriesStock = (array) get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
			if(!isset($productInventoriesStock[$existingInventory])) {
				$productInventoriesStock[$existingInventory] = 0;
			}
			
			$productInventoriesStock[$existingInventory] = $productInventoriesStock[$existingInventory] + $item_stock_reduced;

			$product = wc_get_product($product_id);
			$product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);
			$product->save();
		}
	}

/**
     * Columns Head.
     *
     * @author Daniel Barenkamp
     *
     * @version 1.0.0
     *
     * @since   1.0.0
     * @link    http://www.welaunch.io
     *
     * @param string $columns Columnd
     *
     * @return string
     */
    public function columns_head($columns)
    {
        $output = array();
        foreach ($columns as $column => $name) {
            $output[$column] = $name;

            if ($column === 'is_in_stock') {
                $output['inventories'] = __('Inventories', 'woocommerce-multi-inventory');
            }
        }

        return $output;
    }

    /**
     * Columns Content.
     *
     * @author Daniel Barenkamp
     *
     * @version 1.0.0
     *
     * @since   1.0.0
     * @link    http://www.welaunch.io
     *
     * @param string $column_name Column Name
     *
     * @return string
     */
    public function columns_content($column_name)
    {
        global $post;

        if ($column_name == 'inventories') {

        	$productInventoriesStock = get_post_meta($post->ID, 'woocommerce_multi_inventory_inventories_stock', true);
        	if(empty($productInventoriesStock)) {
        		echo __('No inventories', 'woocommerce-multi-inventory');
        		return;
        	}

        	if($this->get_option('inventoryPrices')) {
        		$inventoryPrices = get_post_meta($post->ID, 'woocommerce_multi_inventory_prices', true);
        	}

            echo '<div class="woocommerce-multi-inventory-admin-inventories">';

            	foreach($productInventoriesStock as $productInventoriesStockKey => $productInventoryStock) {
        			if(!isset($this->inventories[$productInventoriesStockKey])) {
        				continue;
        			}
					
					$text = $this->inventories[$productInventoriesStockKey]->name . ': '. $productInventoryStock;

					if(isset($inventoryPrices[$productInventoriesStockKey]) && !empty($inventoryPrices[$productInventoriesStockKey])) {
						$text .= ' (' . wc_price($inventoryPrices[$productInventoriesStockKey]) . ')';
					}
					$text .= '<br>';

					echo $text;
            	}

            echo '</div>';
        }
    }

	public function restock_refunded($productId, $old_stock, $new_stock, $order, $product)
	{

		// Loop through order items
		foreach ( $order->get_items() as $item_id => $item ) {

			$product_id = $item->get_product_id();
			$variation_id = $item->get_variation_id();
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

			if($productId != $product_id) {
				continue;
			}

			$existingInventory = $item->get_meta('woocommerce_multi_inventory_inventory_' . $product_id);
			if(empty($existingInventory)) {
				return;
			}

			$stockDifference = $old_stock - $new_stock;
			$productInventoriesStock = get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
			$productInventoriesStock[$existingInventory] = $productInventoriesStock[$existingInventory] - $stockDifference;

			$product = wc_get_product($product_id);
			$product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);
			$product->save();
			
		}
	}

	public function unset_inventory_terms($meta_id, $object_id, $meta_key, $_meta_value)
	{
		global $sitepress;

		if($meta_key != "woocommerce_multi_inventory_inventories_stock") {
			return false;
		}

		$product = wc_get_product($object_id);
		if(!$product) {
			return false;
		}

		$terms = array();
		if(!empty($_meta_value) && is_array($_meta_value)) {
			$terms = array_keys( array_filter( $_meta_value ) );
		}

		$productId = $product->get_id();
		$append = false;
		if($product->get_type() == "variation") {
			
			if($this->get_option('productVariationsAddTerms')) {
				wp_set_post_terms($productId, $terms, 'inventories', $append);
			}

			$parentProduct = wc_get_product( $product->get_parent_id() );
			if(!$parentProduct) {
				return false;
			}
			$productId = $parentProduct->get_id();
			$append = true;
		}

		wp_set_post_terms($productId, $terms, 'inventories', $append);

		$product->save();

		return true;
	}

	public function wpml_update_inventory_stock($meta_id, $object_id, $meta_key, $_meta_value)
	{
		if(!$this->get_option('wpmlSupport')) {
			return false;
		}

		if($meta_key != "woocommerce_multi_inventory_inventories_stock") {
			return false;
		}

		if(empty($_meta_value)) {
			return false;
		}

		global $sitepress, $woocommerce_multisite_inventory_meta_update_running;

		if($woocommerce_multisite_inventory_meta_update_running) {
			return false;
		}

		if($sitepress && !empty($sitepress)) {
			/* Use the TRID to find the translated Product ids */
			$trid = $sitepress->get_element_trid( $object_id, 'post_product' );		

			$woocommerce_multisite_inventory_meta_update_running = true;

			if (is_numeric($trid)) {
				$translations = $sitepress->get_element_translations( $trid, 'post_product' );
				if (is_array($translations)) {

					foreach ($translations as $translation) {
						if ( !isset($translation->element_id) || $translation->element_id == $object_id) {
							continue;
						}

						$product = wc_get_product($translation->element_id);
						if($product) {
							$product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $_meta_value);
							$product->save();
						}
					}
				}
			}
		}

		$woocommerce_multisite_inventory_meta_update_running = false;
	}

 
	public function save_backend_item_meta_data( $order )
	{
		// check if order is NEW and status in _can reduce stock? Possible?

		if($this->isSavingOrder) {
			return false;
		}

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX )
			return false;

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE )
			return false;

		// if ( ! current_user_can( 'edit_shop_order', $post_id ) )
		// 	return $post_id;

		$inventories = array();

		// Loop through order items
		foreach ( $order->get_items() as $item_id => $item ) {

			$product_id = $item->get_product_id();
			$variation_id = $item->get_variation_id();
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

			$product = wc_get_product($product_id);
		
			if( isset( $_POST['woocommerce_multi_inventory_inventory_'. $product_id] ) ) {

				global $wpdb;
				$table = $wpdb->prefix . 'woocommerce_order_itemmeta';
				$dbKey = 'woocommerce_multi_inventory_inventory_' .  $product_id;

				$inventory_id = intval( $_POST['woocommerce_multi_inventory_inventory_'. $product_id] );
				$productInventoriesStock = $product->get_meta('woocommerce_multi_inventory_inventories_stock');

				// Readd previous Stock Quantity (Inventory Changed)
				// Using $item->get_meta('woocommerce_multi_inventory_inventory_' . $product_id) is not working (cache?)
				$existingInventory = $wpdb->get_results("SELECT * FROM $table 
				WHERE order_item_id = '$item_id'
				AND meta_key = '$dbKey'");

				if(!empty($existingInventory)) {
					$existingInventory = $existingInventory[0]->meta_value;

					$purchasing_warehouse = get_term_meta($existingInventory, 'woocommerce_multi_inventory_purchasing_warehouse', true);
					$existingProductInventoryStock = (int) $productInventoriesStock[$existingInventory];
					if($purchasing_warehouse == "on") {
		    			$productInventoriesStock[$existingInventory] = $existingProductInventoryStock - $item->get_quantity();
	    			} else {
	    				$productInventoriesStock[$existingInventory] = $existingProductInventoryStock + $item->get_quantity();
	    			}
				}

				$purchasing_warehouse = get_term_meta($inventory_id, 'woocommerce_multi_inventory_purchasing_warehouse', true);
				$productInventoryStock = (int) $productInventoriesStock[$inventory_id];

				if($purchasing_warehouse == "on") {
					$productInventoriesStock[$inventory_id] = $productInventoryStock + $item->get_quantity();
					$product->set_stock_quantity($productInventoriesStock[$inventory_id]);
				} else {
					$productInventoriesStock[$inventory_id] = $productInventoryStock - $item->get_quantity();
				}
				// update_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);

				// Same here. The preferred solution with $item->update_meta_data('woocommerce_multi_inventory_inventory_' .  $product_id, $inventory_id); 
				// and $item->apply_changes(); does not seem to work (cache?)
			    $newTotalFrontendStock = 0;
			    foreach($productInventoriesStock as $inventoryId => $inventoryStock) {
			    	$frontend = get_term_meta($inventoryId, 'woocommerce_multi_inventory_frontend', true);
			    	if($frontend) {
			    		$newTotalFrontendStock += (int) $inventoryStock;
			    	}
			    }

			    $product->set_stock_quantity($newTotalFrontendStock);

				$product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);
				$product->save();

				$item->update_meta_data( 'woocommerce_multi_inventory_inventory_' . $product_id, $inventory_id);
				$item->update_meta_data( '_woocommerce_multi_inventory_inventory', $inventory_id);
			 	$item->apply_changes();
				$item->save_meta_data();
				$item->save();

				if(!in_array($inventory_id, $inventories)) {
					$inventories[] = $inventory_id;
				}

				// if(empty($existingInventory)) {

				// 	$wpdb->query("INSERT INTO $table 
				// 	(order_item_id, meta_key, meta_value) 
				// 	VALUES
				//     ('$item_id', '$dbKey', $inventory_id)");
			    // } else {
				// 	$wpdb->query("UPDATE $table SET 
				//     meta_value = $inventory_id
				//     WHERE order_item_id = '$item_id'
				//     AND meta_key = '$dbKey'");
			    // }

				// Same here. Not working with saved meta function $item->save_meta_data(); and $item->save();
			}
		}

		$this->isSavingOrder  = true;

		wp_set_post_terms($order->get_id(), $inventories, 'inventories');
		$order->save();

		$this->isSavingOrder = false;
	}


	public function inventory_backend_select_field($item_id, $item, $product)
	{
		if(!$product) {
			return;
		}

		$quantity = $item->get_quantity();
		$product_id = $item->get_product_id();
		$variation_id = $item->get_variation_id();
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

		$product = wc_get_product($product_id);

	  	$inventories = get_terms( array(
			'taxonomy' => 'inventories',
			'hide_empty' => false,

	  	));

		echo '<div class="woocommerce-multi-inventory">';


			echo '<label>' . esc_html__($this->get_option('textsInventoryLabel')) . ': </label>';
		
			$inventoriesStock = $product->get_meta('woocommerce_multi_inventory_inventories_stock');	
			
			$existingInventoryId =  $item->get_meta('woocommerce_multi_inventory_inventory_' . $product_id);
			if(is_array($existingInventoryId) && isset($existingInventoryId['value'])) {
				$existingInventoryId = $existingInventoryId['value'];
			}
			$existingInventoryId = intval( $existingInventoryId );

			echo '<select name="woocommerce_multi_inventory_inventory_' . $product_id . '"" id="woocommerce-multi-inventory-inventory">';
			foreach ($inventories as $inventory) {

				$value = "";

				$purchasing_warehouse = get_term_meta($inventory->term_id, 'woocommerce_multi_inventory_purchasing_warehouse', true);

				$selected = "";
				if($existingInventoryId == $inventory->term_id) {
					$selected = 'selected="selected"';
				}

				if(!isset($inventoriesStock[$inventory->term_id]) || $inventoriesStock[$inventory->term_id] === "") {
					$inventoriesStock[$inventory->term_id] = 0;
				}
				$inventoryStock = $inventoriesStock[$inventory->term_id];

				$disabled = "";

				if(empty($purchasing_warehouse) && !$product->is_on_backorder()) {

					if($quantity > $inventoryStock) {
						$disabled = 'disabled="disabled"';	
					}

					$backend = get_term_meta($inventory->term_id, 'woocommerce_multi_inventory_backend', true);
					if(!$backend || $backend == "off") {
						$disabled = 'disabled="disabled"';
					}
				}

				echo '<option value="' . $inventory->term_id . '" ' . $selected . ' ' . $disabled . '>' . $inventory->name . ': ' . sprintf( $this->get_option('textsLeftInStock'), $inventoryStock) . '</option>';
			}

			echo '</select>';
		echo '</div>';
	}

	public function add_inventory_stock_fields()
	{
		global $post;

		$product = wc_get_product($post->ID);
		if(!$product) {
			return;
		}

		$productId = $product->get_id();

	  	$inventories = get_terms( array(
			'taxonomy' => 'inventories',
			'hide_empty' => false,
	  	));

		echo '<div class="woocommerce-multi-inventory">';


			echo '<h2>' . esc_html__('Multi Inventories', 'woocommerce-multi-inventory') . '</h2>';
		
			$inventoriesStock = get_post_meta($productId, 'woocommerce_multi_inventory_inventories_stock', true);	
			$i = 0;
			foreach ($inventories as $inventory) {

				$value = "";
				if(isset($inventoriesStock[$inventory->term_id]) && $inventoriesStock[$inventory->term_id] !== "") {
					$value = $inventoriesStock[$inventory->term_id];
				}
				
			    woocommerce_wp_text_input(
			        array(
			            'id' => 'woocommerce_multi_inventory_inventories_stock[' . $productId . '][' . $inventory->term_id . ']',
			            'placeholder' => $inventory->name . ' ' . esc_html__('Stock', 'woocommerce-multi-inventory'),
			            'label' => $inventory->name . ' ' . esc_html__('Stock', 'woocommerce-multi-inventory'),
						'type'     => 'number',
			            'value'	=> $value,
						'custom_attributes' => array(
							'step' 	=> 'any',
						) 
			        )
		        );

		        $i++;
	        }

	     echo '</div>';

	}

	public function save_custom_fields($productId)
	{
		$product = wc_get_product($productId);

		if(isset($_POST['woocommerce_multi_inventory_inventories_stock'][$productId]) && $_POST['woocommerce_multi_inventory_inventories_stock'][$productId] !== "") {

		    $inventoriesStock = isset($_POST['woocommerce_multi_inventory_inventories_stock'][$productId]) ? $_POST['woocommerce_multi_inventory_inventories_stock'][$productId] : '';
			if(is_array($inventoriesStock)) {
				$inventoriesStock = array_filter($inventoriesStock, function($k) {
				    return $k !== '';
				});
			}
			
		    $product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $inventoriesStock);

		    $newTotalFrontendStock = 0;
		    foreach($_POST['woocommerce_multi_inventory_inventories_stock'][$productId] as $inventoryId => $inventoryStock) {
		    	$frontend = get_term_meta($inventoryId, 'woocommerce_multi_inventory_frontend', true);
		    	if($frontend) {
		    		$newTotalFrontendStock += (int) $inventoryStock;
		    	}
		    }

		    $product->set_stock_quantity($newTotalFrontendStock);


		} else {
			$product->delete_meta_data('woocommerce_multi_inventory_inventories_stock');
		}

		if($this->get_option('inventoryPrices')) {
			if(isset($_POST['woocommerce_multi_inventory_prices'][$productId]) && $_POST['woocommerce_multi_inventory_prices'][$productId] !== "") {
			    $inventoryPrices = isset($_POST['woocommerce_multi_inventory_prices'][$productId]) ? $_POST['woocommerce_multi_inventory_prices'][$productId] : '';
			    $product->update_meta_data('woocommerce_multi_inventory_prices', $inventoryPrices);
			} else {
				$product->delete_meta_data('woocommerce_multi_inventory_prices');
			}
		}

		$product->save();
	}

	/**
	 * Add variation title backend field
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https:/welaunch.io
	 * @param   [type]             $loop           [description]
	 * @param   [type]             $variation_data [description]
	 * @param   [type]             $variation      [description]
	 */
	public function add_inventory_stock_fields_for_variations($loop, $variation_data, $variation)
	{
		if(!$variation) {
			return;
		}

		$productId = $variation->ID;

	  	$inventories = get_terms( array(
			'taxonomy' => 'inventories',
			'hide_empty' => false,
	  	));

		
			$inventoriesStock = get_post_meta($productId, 'woocommerce_multi_inventory_inventories_stock', true);	

			$i = 1;
			foreach ($inventories as $inventory) {

				$value = "";
				if(isset($inventoriesStock[$inventory->term_id]) && $inventoriesStock[$inventory->term_id] !== "") {
					$value = $inventoriesStock[$inventory->term_id];
				}
				
				$class = 'first';
				if($i % 2 == 0) {
					$class = 'last';
				}

				echo '<div class="form-field form-row form-row-' . $class . '">';

			    woocommerce_wp_text_input(
			        array(
			            'id' => 'woocommerce_multi_inventory_inventories_stock[' . $productId . '][' . $inventory->term_id . ']',
			            'placeholder' => $inventory->name . ' ' . esc_html__('Stock', 'woocommerce-multi-inventory'),
			            'label' => $inventory->name . ' ' . esc_html__('Stock', 'woocommerce-multi-inventory'),
						'type'     => 'number',
			            'value'	=> $value,
						'custom_attributes' => array(
							'step' 	=> 'any',
							'min'	=> '0'
						) 
			        )
		        );

				echo '</div>';

		        $i++;
	        }

	}

	/**
	 * Save Variation Data (title)
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https:/welaunch.io
	 * @param   [type]             $variation_id [description]
	 * @param   [type]             $i            [description]
	 * @return  [type]                           [description]
	 */
	public function save_product_variation($variation_id, $i)
	{
		if(empty($variation_id)) {
			return;
		}

		$product = wc_get_product($variation_id);

		if(isset($_POST['woocommerce_multi_inventory_inventories_stock'][$variation_id]) && $_POST['woocommerce_multi_inventory_inventories_stock'][$variation_id] !== "") {
		    $inventoriesStock = isset($_POST['woocommerce_multi_inventory_inventories_stock'][$variation_id]) ? $_POST['woocommerce_multi_inventory_inventories_stock'][$variation_id] : '';
		    $product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $inventoriesStock);

		    $newTotalFrontendStock = 0;
		    foreach($_POST['woocommerce_multi_inventory_inventories_stock'][$variation_id] as $inventoryId => $inventoryStock) {
		    	$frontend = get_term_meta($inventoryId, 'woocommerce_multi_inventory_frontend', true);
		    	if($frontend) {
		    		$newTotalFrontendStock += (int) $inventoryStock;
		    	}
		    }

		    $product->set_stock_quantity($newTotalFrontendStock);
		    
		} else {
			$product->delete_meta_data('woocommerce_multi_inventory_inventories_stock');
		}

		if($this->get_option('inventoryPrices')) {
			if(isset($_POST['woocommerce_multi_inventory_prices'][$variation_id]) && $_POST['woocommerce_multi_inventory_prices'][$variation_id] !== "") {
			    $inventoryPrices = isset($_POST['woocommerce_multi_inventory_prices'][$variation_id]) ? $_POST['woocommerce_multi_inventory_prices'][$variation_id] : '';
			    $product->update_meta_data('woocommerce_multi_inventory_prices', $inventoryPrices);
			} else {
				$product->delete_meta_data('woocommerce_multi_inventory_prices');
			}
		}

		$product->save();
	}

	/**
	 * Nornalize order status.
	 *
	 * @param  string $status Order status.
	 *
	 * @return string
	 */
	protected function normalize_order_status( $status ) {
		return 'wc-' === substr( $status, 0, 3 ) ? substr( $status, 3 ) : $status;
	}

	/**
	 * Check if can reduce stock.
	 *
	 * @param int    $order_id Order ID.
	 * @param string $status Order status.
	 *
	 * @return bool
	 */
	protected function can_reduce_stock( $order_id, $status ) {
		$status     = $this->normalize_order_status( $status );
		$statuses   = apply_filters( 'woocommerce_multi_inventory_wc_reduce_stock_statuses', array( 'processing', 'completed' ) );
		$data_store = WC_Data_Store::load( 'order' );

		return in_array( $status, $statuses, true ) && ! $data_store->get_stock_reduced( $order_id );
	}

	/**
	 * Reduce order stock.
	 *
	 * @param int $order_id Order ID.
	 */
	protected function reduce_order_stock( $order_id ) {
		wc_reduce_stock_levels( $order_id );

		$data_store = WC_Data_Store::load( 'order' );
		$data_store->set_stock_reduced( $order_id, true );
	}

	/**
	 * Reduce or increase order stock in the admin screen.
	 *
	 * @param int $order_id Order ID.
	 */
	public function admin_manage_stock( $order_id ) {
		$status = filter_input( INPUT_POST, 'order_status' );

		if ( $this->can_reduce_stock( $order_id, $status ) ) {
			$this->reduce_order_stock( $order_id );
		} elseif ( $this->can_increase_stock( $order_id, $status ) ) {
			$this->increase_order_stock( $order_id );
		}
	}

	/**
	 * Increase order stock.
	 *
	 * @param int $order_id Order ID.
	 */
	protected static function increase_order_stock( $order_id ) {
		$order = wc_get_order( $order_id );

		if ( 'yes' === get_option( 'woocommerce_manage_stock' ) && $order && 0 < count( $order->get_items() ) ) {
			foreach ( $order->get_items() as $item ) {
				$product_id = $item->get_id();

				if ( 0 < $product_id ) {
					$product = $order->get_product_from_item( $item );

					if ( $product && $product->exists() && $product->managing_stock() ) {
						$old_stock = $product->get_stock_quantity();
						$quantity  = apply_filters( 'woocommerce_order_item_quantity', $item->get_quantity(), $order, $item );
						$new_stock = wc_update_product_stock( $product, $quantity, 'increase' );

						if ( ! empty( $item['variation_id'] ) ) {
							/* translators: 1: product name 2: variation ID 3: old stock level 4: new stock level */
							$order->add_order_note( sprintf( __( 'Item %1$s variation #%2$s stock increased from %3$s to %4$s.', 'reduce-stock-of-manual-orders-for-woocommerce' ), $product->get_formatted_name(), $item['variation_id'], $old_stock, $new_stock ) );
						} else {
							/* translators: 1: product name 2: old stock level 3: new stock level */
							$order->add_order_note( sprintf( __( 'Item %1$s stock increased from %2$s to %3$s.', 'reduce-stock-of-manual-orders-for-woocommerce' ), $product->get_formatted_name(), $old_stock, $new_stock ) );
						}

						$order->get_data_store()->set_stock_reduced( $order_id, false );
					}
				}
			}
		}
	}

	/**
	 * Check if can increase stock.
	 *
	 * @param int    $order_id Order ID.
	 * @param string $status Order status.
	 *
	 * @return bool
	 */
	protected function can_increase_stock( $order_id, $status ) {
		$status     = $this->normalize_order_status( $status );
		$statuses   = apply_filters( 'woocommerce_multi_inventory_wc_increase_stock_statuses', array( 'cancelled' ) );
		$data_store = WC_Data_Store::load( 'order' );

		return in_array( $status, $statuses, true ) && $data_store->get_stock_reduced( $order_id );
	}

	/**
	 * Reduce or increase order stock using bulk or action buttons on the orders list screen.
	 *
	 * @param int    $order_id Order ID.
	 * @param string $status Order status.
	 */
	public function admin_bulk_manage_stock( $order_id, $status ) {
		if ( $this->can_reduce_stock( $order_id, $status ) ) {
			$this->reduce_order_stock( $order_id );
		}
	}
}		