<?php

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

class WooCommerce_Multi_Inventory_Logger extends WooCommerce_Multi_Inventory
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

		if(!$this->get_option('enable')) {
			return false;
		}

		if(!$this->get_option('loggingEnabled')) {
			return false;
		}

		add_action('added_post_meta', array($this, 'log'), 50, 4);
		add_action('updated_post_meta', array($this, 'log'), 50, 4);
	}

	public function log( $meta_id, $post_id, $meta_key, $meta_value )
	{

		if($meta_key != "_stock" && $meta_key != 'woocommerce_multi_inventory_inventories_stock') {
			return;
		}

		$log = new Logger('WooCommerce_Multi_Inventory_Logger');
		$log->pushHandler(new StreamHandler( plugin_dir_path( __FILE__ ) .'../logs/' . date('Y-m-d') . '.log', Logger::INFO));

		if(is_array($meta_value)) {
			$tmp = "";
			foreach($meta_value as $meta_value_key => $meta_value_value) {
				$tmp .= 'Inventory ' . $meta_value_key . ' (Stock: ' . $meta_value_value . ') ';
			}
			$meta_value = $tmp;
		}
		
		// add records to the log
		$log->info( sprintf( __('Product ID %d updated %s with %s', 'woocommerce-multi-inventory'), $post_id, $meta_key, $meta_value ) );
	}

}