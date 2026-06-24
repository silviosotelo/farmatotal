<?php

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the admin area.
 *
 * @link       https://welaunch.io/plugins
 * @since      1.0.0
 *
 * @package    WooCommerce_Multi_Inventory
 * @subpackage WooCommerce_Multi_Inventory/includes
 */

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    WooCommerce_Multi_Inventory
 * @subpackage WooCommerce_Multi_Inventory/includes
 * @author     Daniel Barenkamp <support@welaunch.io>
 */
class WooCommerce_Multi_Inventory {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      WooCommerce_Multi_Inventory_Loader    $loader    Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $plugin_name    The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $version    The current version of the plugin.
	 */
	protected $version;

	protected $plugin_i18n;
	protected $admin;
	protected $importer;
	protected $manager;
	protected $public;
	protected $taxonomy;
	protected $delivery_costs;
	protected $radiusShipping;
	protected $logger;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */

	public function __construct($version) 
	{
		$this->plugin_name = 'woocommerce-multi-inventory';
		$this->version = $version;

		$this->load_dependencies();
		$this->set_locale();
		$this->define_hooks();

	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * Include the following files that make up the plugin:
	 *
	 * - WooCommerce_Multi_Inventory_Loader. Orchestrates the hooks of the plugin.
	 * - WooCommerce_Multi_Inventory_i18n. Defines internationalization functionality.
	 * - WooCommerce_Multi_Inventory_Admin. Defines all hooks for the admin area.
	 * - WooCommerce_Multi_Inventory_Public. Defines all hooks for the public side of the site.
	 *
	 * Create an instance of the loader which will be used to register the hooks
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies()
	{
		/**
		 * The class responsible for orchestrating the actions and filters of the
		 * core plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-woocommerce-multi-inventory-loader.php';

		/**
		 * The class responsible for defining internationalization functionality
		 * of the plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-woocommerce-multi-inventory-i18n.php';

		/**
		 * The class responsible for defining all actions that occur in the admin area.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-admin.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-importer.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-logging.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-delivery-costs.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-manager.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-exporter.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-taxonomy.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-radius-shipping.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-public.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'classes/class-woocommerce-multi-inventory-rest-controller.php';
		

        if (file_exists(plugin_dir_path(dirname(__FILE__)).'classes/Tax-meta-class/Tax-meta-class.php')) {
            require_once plugin_dir_path(dirname(__FILE__)).'classes/Tax-meta-class/Tax-meta-class.php';
        }

     	if ( file_exists( plugin_dir_path( dirname( __FILE__ ) ) . 'vendor/autoload.php' ) ) {
	        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'vendor/autoload.php';
	    }

		$this->loader = new WooCommerce_Multi_Inventory_Loader();

	}

	/**
	 * Define the locale for this plugin for internationalization.
	 *
	 * Uses the WooCommerce_Multi_Inventory_i18n class in order to set the domain and to register the hook
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function set_locale() 
	{
		$this->plugin_i18n = new WooCommerce_Multi_Inventory_i18n();
		$this->loader->add_action( 'init', $this->plugin_i18n, 'load_plugin_textdomain', 0 );
	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_hooks() 
	{
		// Admin
		$this->admin = new WooCommerce_Multi_Inventory_Admin( $this->get_plugin_name(), $this->get_version() );
		$this->loader->add_action( 'init', $this->admin, 'load_redux', 5 );
		$this->loader->add_action( 'init', $this->admin, 'init', 1 );
		$this->loader->add_action( 'admin_init', $this->admin, 'init' );
		$this->loader->add_action( 'admin_enqueue_scripts', $this->admin, 'enqueue_styles', 20);
		$this->loader->add_action( 'admin_enqueue_scripts', $this->admin, 'enqueue_scripts', 20);
		$this->loader->add_action( 'updated_post_meta', $this->admin, 'wpml_update_inventory_stock', 20, 4);
		$this->loader->add_action( 'updated_post_meta', $this->admin, 'unset_inventory_terms', 20, 4);
   
   		// Importer
        $this->importer = new WooCommerce_Multi_Inventory_Importer($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('init', $this->importer, 'init');

   		// Exporter
        if(isset($_GET['woocommerce-multi-inventory-export'])) {
        	$this->exporter = new WooCommerce_Multi_Inventory_Exporter($this->get_plugin_name(), $this->get_version());
            $this->loader->add_action( 'init', $this->exporter, 'init', 100 );
        }

   		// Manager
        $this->manager = new WooCommerce_Multi_Inventory_Manager($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('init', $this->manager, 'init');
        $this->loader->add_action('wp_ajax_woocommerce_multi_inventory_update_stock', $this->manager, 'update_inventory');
    		
    	// Public
		$this->public = new WooCommerce_Multi_Inventory_Public( $this->get_plugin_name(), $this->get_version() );
        $this->loader->add_action( 'wp_enqueue_scripts', $this->public, 'enqueue_scripts_styles');
        $this->loader->add_action( 'init', $this->public, 'init');

        $this->loader->add_action( 'wp_ajax_nopriv_woocommerce_multi_inventory_get_variation_stock', $this->public, 'ajax_get_variation_stock');
        $this->loader->add_action( 'wp_ajax_woocommerce_multi_inventory_get_variation_stock', $this->public, 'ajax_get_variation_stock');

        $this->loader->add_action( 'wp_ajax_nopriv_woocommerce_multi_inventory_get_inventories', $this->public, 'ajax_get_inventories');
        $this->loader->add_action( 'wp_ajax_woocommerce_multi_inventory_get_inventories', $this->public, 'ajax_get_inventories');

        $this->loader->add_action( 'wp_ajax_nopriv_woocommerce_multi_inventory_get_stock', $this->public, 'ajax_get_stock');
        $this->loader->add_action( 'wp_ajax_woocommerce_multi_inventory_get_stock', $this->public, 'ajax_get_stock');
        

        
        
        $this->taxonomy = new WooCommerce_Multi_Inventory_Taxonomy($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('init', $this->taxonomy, 'init', 90);

        $this->delivery_costs = new WooCommerce_Multi_Inventory_Delivery_Costs($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('init', $this->delivery_costs, 'init', 20);        

		// Radius Shipping
		$this->radiusShipping = new WooCommerce_Multi_Inventory_Radius_Shipping( $this->get_plugin_name(), $this->get_version(), $this->public );
		$this->loader->add_action( 'init', $this->radiusShipping, 'init', 10);

   		// logger
        $this->logger = new WooCommerce_Multi_Inventory_Logger($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('init', $this->logger, 'init');

        // REST
        add_filter('woocommerce_rest_api_get_rest_namespaces', function($controllers) {
			$controllers['wc/multi-inventory/v1']['multi-inventory'] = 'WooCommerce_Multi_Inventory_REST_Controller';
			return $controllers;
    	}, 10, 1);

	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() 
	{
		$this->loader->run();
	}

	/**
	 * Get Options
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https://www.welaunch.io
	 * @param   [type]                       $option [description]
	 * @return  [type]                               [description]
	 */
    protected function get_option($option)
    {
    	if(!isset($this->options)) {
    		return false;
    	}

    	if(!is_array($this->options)) {
    		return false;
    	}
    	
    	if(!array_key_exists($option, $this->options)) {
    		return false;
    	}

    	return $this->options[$option];
    }

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @since     1.0.0
	 * @return    string    The name of the plugin.
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @since     1.0.0
	 * @return    WooCommerce_Multi_Inventory_Loader    Orchestrates the hooks of the plugin.
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @since     1.0.0
	 * @return    string    The version number of the plugin.
	 */
	public function get_version() {
		return $this->version;
	}

 	protected function get_user_order_count($userId = 0) 
 	{
	    global $wpdb;
	    
	    // Based on user ID (registered users)
	    if ( is_numeric( $userId) ) { 
	        $meta_key   = '_customer_user';
	        $meta_value = $userId == 0 ? (int) get_current_user_id() : (int) $userId;
	    } 
	    // Based on billing email (Guest users)
	    else { 
	        $meta_key   = '_billing_email';
	        $meta_value = sanitize_email( $userId );
	    }

	    $count = $wpdb->get_var( $wpdb->prepare("
	        SELECT COUNT(p.ID) FROM {$wpdb->prefix}posts AS p
	        INNER JOIN {$wpdb->prefix}postmeta AS pm ON p.ID = pm.post_id
	        WHERE p.post_type LIKE 'shop_order'
	        AND pm.meta_key = '%s'
	        AND pm.meta_value = %s
	        LIMIT 1
	    ", $meta_key, $meta_value ) );

	    // Return a boolean value based on orders count
	    return $count > 0 ? $count : false;
	}

	protected function get_user_review_count($userId)
	{
		$args = array(
		    'user_id' => $userId,
		    'count'   => true
		);

		$userCommentsCount = get_comments( $args );

		return $userCommentsCount;
	}

	/**
	 * Return the current user role
	 * @author Daniel Barenkamp
	 * @version 1.0.0
	 * @since   1.0.0
	 * @link    https://www.welaunch.io
	 * @return  [type]                       [description]
	 */
	protected function get_user_role($userId)
	{
		$user = get_userdata($userId);
		if(!$user) {
			return false;
		}
		
		$user_roles = $user->roles;
		if(empty($user_roles)) {
			return false;
		}

		$user_role = array_shift($user_roles);

		return $user_role;
	}
}