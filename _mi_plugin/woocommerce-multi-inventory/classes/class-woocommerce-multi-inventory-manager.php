<?php

class WooCommerce_Multi_Inventory_Manager extends WooCommerce_Multi_Inventory
{
	protected $plugin_name;
	protected $version;
    protected $options;

    public $notice;
    public $file;
    public $rows;
    public $columns;

	/**
	 * Construct Price Locator Admin Class
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https://welaunch.io/plugins
	 * @param   string                         $plugin_name
	 * @param   string                         $version    
	 */
	public function __construct($plugin_name, $version)
	{
		$this->plugin_name = $plugin_name;
		$this->version = $version;
		$this->notice = "";
		$this->file = "";
		$this->rows = 0;
		$this->columns = 0;
	}

	public function init()
	{
		global $woocommerce_multi_inventory_options;
		$this->options = $woocommerce_multi_inventory_options;

		add_action('admin_menu', array($this, 'create_menu'));
		add_action('wp_ajax_update_inventory', array($this, 'update_inventory'));
	}

	public function create_menu() 
	{

		add_submenu_page(
			'woocommerce',
			esc_html__('Inventory Manager', 'woocommerce-multi-inventory'),
			esc_html__('Inventory Manager', 'woocommerce-multi-inventory'),
			'manage_woocommerce',
			'woocommerce-multi-inventory-manager',
			array($this, 'settings_page')
		);
	}

	public function settings_page() 
	{

		$limit = 400;
		$paged = isset( $_GET['paged'] ) ? absint( $_GET['paged'] ) : 1;
		$offset = ( $paged - 1 ) * $limit;
		   	

	  	$inventories = get_terms( array(
			'taxonomy' => 'inventories',
			'hide_empty' => false,
	  	));

 		if(empty($inventories)) {
 			esc_html_e('No inventories created so far ...', 'woocommerce-multi-inventory');
 			return false;
		}

	  	// $products = get_posts( array(
		// 	'post_type' => array('product', 'product_variation'),
		// 	'post_status' => 'publish',
		// 	'numberposts' => $limit,
		// 	'suppress_filters' => false,
	  	// ));

		$args = array( 
			'posts_per_page' => $limit, 
			'paged' => $paged,
			'post_type' => array('product', 'product_variation'),
			'offset'  => $offset,
			'suppress_filters' => false,
		);

		if(isset($_GET['search']) && !empty($_GET['search'])) {
			$args['s'] = esc_attr( $_GET['search'] );
		}

    	$query = new WP_Query( $args );
    	$products = $query->posts;
	   	$pagedTotal = $query->max_num_pages;

 		if(empty($products)) {
 			esc_html_e('No Products found ...', 'woocommerce-multi-inventory');
 			return false;
		}

	?>
		<div class="woocommerce-multi-inventory-manager-wrap">

		  <h1><?php esc_html_e('Inventory Manager', 'woocommerce-multi-inventory'); ?></h1>

		  	<?php

			$page_links = paginate_links( array(
			    'base' => add_query_arg( 'paged', '%#%' ),
			    'total' => $pagedTotal,
			    'current' => $paged
			) );

			if ( $page_links ) {
			?>

			   	When you have more than 200 products please use the global search or pagination:<br>

				<form style="display: inline;" action="<?php echo $requestURI ?>" method="GET">
				    <input type="hidden" name="page" value="woocommerce-multi-inventory-manager">
				    <input type="hidden" name="paged" value="1">  
					<input type="text" name="search" placeholder="<?php esc_html_e('Search for Product', 'woocommerce-multi-inventory') ?>" value="<?php echo isset($_GET['search']) ? esc_attr($_GET['search']) : '' ?>">
					<input type="submit" class="button" value="<?php esc_html_e('Search', 'woocommerce-multi-inventory') ?>">
				</form>
				<br>

			    <div class="tablenav-pages" style="margin: 1em 0"><?php echo $page_links ?></div>
		    
		    <?php
			}
			?>


		  <table class="woocommerce-multi-inventory-manager-table">
		  <thead>
			<tr>
				<th scope="col"><?php esc_html_e('ID', 'woocommerce-multi-inventory') ?></th>
				<th scope="col"><?php esc_html_e('Image', 'woocommerce-multi-inventory') ?></th>
				<th scope="col"><?php esc_html_e('SKU', 'woocommerce-multi-inventory') ?></th>
				<th scope="col"><?php esc_html_e('Name', 'woocommerce-multi-inventory') ?></th>
				<th scope="col"><?php esc_html_e('Manage Stock', 'woocommerce-multi-inventory') ?> </th>
				<th scope="col"><?php esc_html_e('Stock Status', 'woocommerce-multi-inventory') ?> </th>
				

			  <?php
			  	$inventoriesTemp = array();
				foreach($inventories as $inventory) {

					$inventoryName = $inventory->name;

					$frontend = get_term_meta($inventory->term_id, 'woocommerce_multi_inventory_frontend', true);
					if($frontend) {
						$inventoryName .= ' <img alt="' . esc_html__('Frontend Inventory', 'woocommerce-multi-inventory') . '"  title="' . esc_html__('Frontend Inventory', 'woocommerce-multi-inventory') . '" class="woocommerce-multi-inventory-manager-table-icon woocommerce-multi-inventory-manager-table-icon-yes" src="' . plugin_dir_url( dirname( __FILE__ ) ) . 'assets/img/frontend.svg' . '">'; 
					} else {
						$inventoryName .= ' <img alt="' . esc_html__('No Frontend Inventory', 'woocommerce-multi-inventory') . '" title="' . esc_html__('No Frontend Inventory', 'woocommerce-multi-inventory') . '" class="woocommerce-multi-inventory-manager-table-icon woocommerce-multi-inventory-manager-table-icon-no" src="' . plugin_dir_url( dirname( __FILE__ ) ) . 'assets/img/frontend-none.svg' . '">'; 
					}

					$backend = get_term_meta($inventory->term_id, 'woocommerce_multi_inventory_backend', true);
					if($backend) {
						$inventoryName .= ' <img alt="' . esc_html__('Backend Inventory', 'woocommerce-multi-inventory') . '" title="' . esc_html__('Backend Inventory', 'woocommerce-multi-inventory') . '" class="woocommerce-multi-inventory-manager-table-icon woocommerce-multi-inventory-manager-table-icon-yes" src="' . plugin_dir_url( dirname( __FILE__ ) ) . 'assets/img/backend.svg' . '">'; 
					} else {
						$inventoryName .= ' <img alt="' . esc_html__('No Backend Inventory', 'woocommerce-multi-inventory') . '" title="' . esc_html__('No Backend Inventory', 'woocommerce-multi-inventory') . '" class="woocommerce-multi-inventory-manager-table-icon woocommerce-multi-inventory-manager-table-icon-no" src="' . plugin_dir_url( dirname( __FILE__ ) ) . 'assets/img/backend-none.svg' . '">'; 
					}

					$inventoriesTemp[$inventory->term_id] = array(
						'frontend' => $frontend,
						'backend' => $backend,
					);

					echo '<th scope="col">';
					echo sprintf( esc_html__('IV: %s', 'woocommerce-multi-inventory'), $inventoryName);
					echo '</th>';
				}			  
			  ?>
			  <th scope="col"><?php esc_html_e('Total Frontend Stock *', 'woocommerce-multi-inventory') ?></th>
			  <th scope="col"><?php esc_html_e('Total Backend Stock', 'woocommerce-multi-inventory') ?></th>
			  <th scope="col"><?php esc_html_e('Total Stock', 'woocommerce-multi-inventory') ?></th>
			</tr>
		  </thead>
		  <tbody>
		  	<?php
		  	
		  	foreach($products as $post) {

		  		$totalStock = 0;
		  		$totalBackendStock = 0;

		  		$product = wc_get_product($post->ID);
		  		if(!$product) {
		  			continue;
		  		}

		  		$productId = $product->get_id();
		  		$productInventoriesStock = get_post_meta($productId, 'woocommerce_multi_inventory_inventories_stock', true);
		  		if( !is_array($productInventoriesStock)) {
		  			$productInventoriesStock = array();
		  		}

		  		$productName = $product->get_name();
		  		if(empty($productName)) {
		  			continue;
		  		}

		  		$backendId = $productId;
		  		if($product->is_type('variation')) {
		  			$backendId = $product->get_parent_id();
		  		}

		  		?>

				<tr>
					<td><?php echo $productId ?></td>
					<td>
						<?php 
						$imageId = $product->get_image_id();
						if(!empty($imageId)) {
							$imageSrc = wp_get_attachment_image_src($imageId, 'thumbnail');
							if(!empty($imageSrc)) {
								echo '<img class="woocommerce-multi-inventory-manager-table-image" src="' . $imageSrc[0] . '" alt="' . $productName .'">';
							}
						} else {

						}
						?>
							
					</td>
					<td><?php echo $product->get_sku() ?></td>
					<td data-order="<?php echo esc_attr($productName) ?>">
						<?php echo $product->is_type('variation') ? '→ ' : '' ?>
						<a href="<?php echo admin_url('post.php?post=' . $backendId . '&action=edit') ?>" target="_blank"><?php echo esc_attr($productName) ?></a>
					</td>
					<td><?php echo $product->get_manage_stock() ?></td>
					<td><?php echo wc_get_stock_html($product) ?></td>

					<?php 
					foreach($inventories as $inventory) {
						$inventoryID = $inventory->term_id;
						$inventoryStock = isset($productInventoriesStock[$inventoryID]) ? (int) $productInventoriesStock[$inventoryID] : 0;
						$totalStock += $inventoryStock;

						$class = '';
						if($inventoriesTemp[$inventoryID]['frontend']) {
							$class .= ' woocommerce-multi-inventory-manager-table-frontend-stock';
						}

						if($inventoriesTemp[$inventoryID]['backend']) {
							$class .= ' woocommerce-multi-inventory-manager-table-backend-stock';
							$totalBackendStock += $inventoryStock;
						}

						?>
						<td data-order="<?php echo $inventoryStock ?>">
							<input class="woocommerce-multi-inventory-manager-table-stock woocommerce-multi-inventory-manager-table-inventory-stock <?php echo $class ?>" data-product-id="<?php echo $productId ?>" data-inventory-id="<?php echo $inventoryID ?>" name="stock" type="number" value="<?php echo $inventoryStock ?>">
						</td>
						<?php
					}
					?>

					<td data-order="<?php echo $product->get_stock_quantity() ?>">
						<input class="woocommerce-multi-inventory-manager-table-total-frontend-stock" disabled="disabled" data-product-id="<?php echo $productId ?>" data-inventory-id="1" name="stock" type="number" value="<?php echo $product->get_stock_quantity() ?>">
					</td>

					<td data-order="<?php echo $totalBackendStock ?>">
						<input type="number" class="woocommerce-multi-inventory-manager-table-total-backend-stock" value="<?php echo $totalBackendStock ?>" disabled="disabled">
					</td>
					<td data-order="<?php echo $totalStock ?>">
						<input type="number" class="woocommerce-multi-inventory-manager-table-total-stock" value="<?php echo $totalStock ?>" disabled="disabled">
					</td>

				</tr>

		  		<?php
		  	}
		  	?>

		</table>

		<div class="woocommerce-multi-inventory-manager-table-spinner-overlay">
			<div class="woocommerce-multi-inventory-manager-table-spinner"></div>
		</div>

		</div>

		<p>* This is the WooCommerce default stock amount. </p>
	<?php 
	}

  

	public function update_inventory()
	{
		if(!isset($_POST['inventory_id']) || empty($_POST['inventory_id'])) {
			$this->notice .= esc_html__('Inventory ID missing.', 'woocommerce-multi-inventory');
			$this->notice(false);
		}

		if(!isset($_POST['product_id']) || empty($_POST['product_id'])) {
			$this->notice .= esc_html__('Product ID missing.', 'woocommerce-multi-inventory');
			$this->notice(false);
		}

		if(!isset($_POST['stock'])) {
			$this->notice .= esc_html__('Stock missing.', 'woocommerce-multi-inventory');
			$this->notice(false);
		}

		$inventory_id = intval( $_POST['inventory_id'] );
		$product_id = intval( $_POST['product_id'] );
		$stock = intval( $_POST['stock'] );

		$product = wc_get_product($product_id);
		if(!$product) {
			$this->notice .= 'Invalid Product.';
			$this->notice(false);
		}

		if($stock > 0 && !$product->get_manage_stock()) {
			$product->set_manage_stock(true);
		}

		$inventoriesStock = get_post_meta($product_id, 'woocommerce_multi_inventory_inventories_stock', true);
		if(empty($inventoriesStock) || !is_array($inventoriesStock)) {
			$inventoriesStock = array();
		}

		$inventoriesStock[$inventory_id] = $stock;
		$product->update_meta_data('woocommerce_multi_inventory_inventories_stock', $inventoriesStock);

		$newTotalFrontendStock = 0;
	    foreach($inventoriesStock as $inventoryId => $inventoryStock) {
	    	$frontend = get_term_meta($inventoryId, 'woocommerce_multi_inventory_frontend', true);
	    	if($frontend) {
	    		$newTotalFrontendStock += (int) $inventoryStock;
	    	}
	    }

	    $product->set_stock_quantity($newTotalFrontendStock);

		$terms = array_keys( array_filter($inventoriesStock) );

		$productIdToUpdateTerms = $product->get_id();
		$append = false;
		if($product->get_type() == "variation") {

			if($this->get_option('productVariationsAddTerms')) {
				wp_set_post_terms($productIdToUpdateTerms, $terms, 'inventories', $append);
			}

			$parentProduct = wc_get_product( $product->get_parent_id() );
			if(!$parentProduct) {
				return false;
			}
			$productIdToUpdateTerms = $parentProduct->get_id();
			$append = true;
		}

		wp_set_post_terms($productIdToUpdateTerms, $terms, 'inventories', $append);


		$product->save();

		$this->notice(true);
	}

	public function notice($return = true)
	{
		$response = array(
			'return' => $return,
			'message' => $this->notice,
			'file' => $this->file,
			'rows' => $this->rows,
			'columns' => $this->columns,
		);

		echo json_encode($response);
		die();
	}
}