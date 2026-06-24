<?php


/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://welaunch.io/plugins/woocommerce-multi-inventory/
 * @since      1.0.0
 *
 * @package    WooCommerce_delivery
 * @subpackage WooCommerce_delivery/public
 */
class WooCommerce_Multi_Inventory_REST_Controller {

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

	protected $namespace = 'wc/multi-inventory/v1';

	public function register_routes() {

		register_rest_route(
			$this->namespace,
			'/stock',
			array(
				array(
					'methods' => 'GET',
					'callback' => array( $this, 'get_stock' ),
					'permission_callback' => '__return_true'
				),
				array(
					'methods' => 'POST',
					'callback' => array( $this, 'update_stock' ),
					'permission_callback' => '__return_true'
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/inventories',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_inventories' ),
				'permission_callback' => '__return_true'
			),
		);

		register_rest_route(
			$this->namespace,
			'/orders',
			array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_orders' ),
				'permission_callback' => '__return_true'
			),
		);

	}

	public function get_inventories( $request )
	{
		$response = array(
			'status' => false,
			'msg' => '',
			'data' => array(),
		);

  		$inventories = get_terms( array(
			'taxonomy' => 'inventories',
			'hide_empty' => false,
	  	));

		if(empty($inventories)) {
			$response['msg'] = 'No inventories created yet.';
			return rest_ensure_response($response);
		}

		$response['msg'] = 'Inventories found.';
		$response['status'] = true;
		$response['data'] = $inventories;

		return rest_ensure_response($response);
	}

	public function get_stock( $request )
	{

		$response = array(
			'status' => false,
			'msg' => '',
			'data' => array(),
		);

		$sku = $request->get_param('sku');
		if(!empty($sku)) {
			$product_id = wc_get_product_id_by_sku($sku);
			if(empty($product_id)) {
				$response['msg'] = 'No product found for this sku';
				return rest_ensure_response($response);
			}
		} else {
			$product_id = $request->get_param('product_id');
		}

		if(empty($product_id)) {
			$response['msg'] = 'Product ID or SKU missing';
			return rest_ensure_response($response);
		}

		$product = wc_get_product($product_id);
		if(empty($product)) {
			$response['msg'] = 'Product not found.';
			return rest_ensure_response($response);
		}

		$inventoryStock = $product->get_meta('woocommerce_multi_inventory_inventories_stock');
		if(empty($inventoryStock)) {
			$response['msg'] = 'Product has no inventory stock.';
			return rest_ensure_response($response);
		}

		$response['msg'] = 'Stock found.';
		$response['status'] = true;
		$response['data'] = $inventoryStock;

		return rest_ensure_response($response);
	}

	public function update_stock( $request ) 
	{
		$response = array(
			'status' => false,
			'msg' => '',
			'data' => array(),
		);

		$sku = $request->get_param('sku');
		if(!empty($sku)) {
			$product_id = wc_get_product_id_by_sku($sku);
			if(empty($product_id)) {
				$response['msg'] = 'No product found for this sku';
				return rest_ensure_response($response);
			}
		} else {
			$product_id = $request->get_param('product_id');
		}

		if(empty($product_id)) {
			$response['msg'] = 'Product ID or SKU missing';
			return rest_ensure_response($response);
		}

		$product = wc_get_product($product_id);
		if(empty($product)) {
			$response['msg'] = 'Product not found.';
			return rest_ensure_response($response);
		}


		$stock = (int) $request->get_param('stock');
		if($stock === "") {
			$response['msg'] = 'Stock data missing.';
			return rest_ensure_response($response);
		}

		$inventory = (int) $request->get_param('inventory');
		if(empty($inventory)) {
			$response['msg'] = 'Inventory missing.';
			return rest_ensure_response($response);
		}

		$inventoryExists = get_term($inventory, 'inventories');
		if(!$inventoryExists) {
			$response['msg'] = 'Inventory does not exists.';
			return rest_ensure_response($response);
		}

		$existingInventoryStock = $product->get_meta('woocommerce_multi_inventory_inventories_stock');
		if(empty($existingInventoryStock)) {
			$existingInventoryStock = array(
				$inventory => $stock
			);
		} else {
			$existingInventoryStock[$inventory] = $stock;
		}

		$newTotalFrontendStock = 0;
		foreach($existingInventoryStock as $inventoryId => $stockAmount) {
			$frontend = get_term_meta($inventoryId, 'woocommerce_multi_inventory_frontend', true);
	    	if($frontend) {
	    		$newTotalFrontendStock += (int) $stockAmount;
	    	}			
		}


    	$product->set_stock_quantity($newTotalFrontendStock);
    	$product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $existingInventoryStock);
    	$product->save();

		// Update Terms
	    $productToGetTermsFrom = $product;
	    $productId = $product->get_id();
	    if($product->get_type() == "variation") {
	        $productToGetTermsFrom = wc_get_product( $product->get_parent_id() );
	        if(!$productToGetTermsFrom) {
	            return false;
	        }
	    }

	    $existingTerms = get_the_terms($productToGetTermsFrom->get_id(), 'inventories');
	    if(!empty($existingTerms)) {

	        $existingTerms = wp_list_pluck($existingTerms, 'term_id');
	        $existingTerms = array_combine($existingTerms, $existingTerms);

	        foreach($existingInventoryStock as $inventory_id => $inventory_stock) {
	            if(empty($inventory_stock) && isset($existingTerms[$inventory_id]) ) {
	                unset($existingTerms[$inventory_id]);
	            } elseif($inventory_stock > 0 && !isset($existingTerms[$inventory_id]) ) {
	                $existingTerms[$inventory_id] = $inventory_id;
	            }
	        }

	    } else {
	        $existingTerms = array_keys($existingInventoryStock);
	    }


	    wp_set_post_terms($productToGetTermsFrom->get_id(), $existingTerms, 'inventories');

	    $productToGetTermsFrom->save();

	}

	public function get_orders( $request )
	{

		$response = array(
			'status' => false,
			'msg' => '',
			'data' => array(),
		);

		$inventoryId = $request->get_param('inventory');
		if(empty($inventoryId)) {
			$response['msg'] = 'Inventory ID parameter missing.';
			return rest_ensure_response($response);
		}

		$inventory = get_term($inventoryId, 'inventories');
		if(empty($inventory)) {

			$inventory = get_term_by('slug', $inventoryId, 'inventories');
			if(empty($inventory)) {
				$response['msg'] = 'Inventory not found.';
				return rest_ensure_response($response);
			}
		}

		// get orders by taxonomy inventory with inventory ID
		$order_ids = get_posts(
			array(
		        'posts_per_page' => -1,
		        'post_type' => 'shop_order',
		        'post_status'    => 'any',
		        'fields' => 'ids',
		        'tax_query' => array(
		            array(
		                'taxonomy' => 'inventories',
		                'field' => 'term_id',
		                'terms' => $inventoryId,
		            )
		        )
	        )
		);
		if(empty($order_ids)) {
			$response['msg'] = 'No orders found.';
			return rest_ensure_response($response);
		}

		// $status = $request->get_param('status');

		// $tmp = array();
		// foreach($order_ids as $order_id) {

		// 	$order = wc_get_order($order_id);
		// 	if($order) {

		// 		if(!empty($status) && $status != $order->get_status()) {
		// 			continue;
		// 		}

		// 		$tmp[] = $order;
		// 	}
		// }
		// $orders = $tmp;

		// var_dump($orders);
		// $query = new WC_Order_Query();
		// $query->set( 'customer', 'woocommerce@woocommerce.com' );
		// $orders = $query->get_orders();

		$response['msg'] = 'Orders found.';
		$response['status'] = true;
		$response['data'] = $order_ids;

		return rest_ensure_response($response);
	}

}