<?php

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Xls;

class WooCommerce_Multi_Inventory_Exporter extends WooCommerce_Multi_Inventory 
{
    protected $plugin_name;
    protected $version;
    protected $options;
    public $notice;

    /**
     * Construct Store Locator Admin Class
     * @author Daniel Barenkamp
     * @version 1.0.0
     * @since   1.0.0
     * @link    http://www.welaunch.io
     * @param   string                         $plugin_name
     * @param   string                         $version    
     */
    public function __construct($plugin_name, $version)
    {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        $this->notice = "";
    }

    public function init()
    {
        global $woocommerce_multi_inventory_options;
        $this->options = $woocommerce_multi_inventory_options;

        add_action( 'admin_notices', array($this, 'notice' ));

        if ( ! is_admin() || !is_user_logged_in() || !current_user_can('manage_options')) {
            $this->notice .= esc_html__("You are not an admin", 'woocommerce-multi-inventory');
            return FALSE;
        }

        $this->inventories = get_terms( array(
            'taxonomy' => 'inventories',
            'hide_empty' => false,
        ));

        $products = $this->get_products();
        if(empty($products)) {
            $this->notice .= esc_html__("No products to Export", 'woocommerce-multi-inventory');
            return FALSE;
        }

        
        if($this->build_export($products)) {
            $this->notice .= esc_html__("Your Store Export is ready. The Download should start automatically.", 'woocommerce-multi-inventory');
        } else {
            $this->notice .= esc_html__("Something was wrong with the export generation ...", 'woocommerce-multi-inventory');
        };

    }

    public function get_products()
    {
        $args = array(
            'posts_per_page'   => -1,
            'post_type'        => array('product', 'product_variation'),
            'post_status'      => 'any',
            'suppress_filters' => false,
        );
        $posts = get_posts( $args );

        $products = array();
        foreach ($posts as $post) {

            $id = $post->ID;
            $product = wc_get_product($id);

            $products[$id]['id'] = $id;
            $products[$id]['type'] = $product->get_type();
            $products[$id]['name'] = $this->my_variation_title_with_atts( apply_filters('the_title', $product->get_name(), $post->ID), $product);
            $products[$id]['sku'] = $product->get_sku();

            $products[$id]['total_frontend_stock'] = $product->get_stock_quantity();
            $products[$id]['manage_stock'] = (string) $product->get_manage_stock();

            $productInventoriesStock = get_post_meta($id, 'woocommerce_multi_inventory_inventories_stock', true);

            if($this->get_option('inventoryPrices')) {
                $productInventoryPrices = get_post_meta($id, 'woocommerce_multi_inventory_prices', true);
            }

            foreach ($this->inventories as $inventory) {
                $products[$id][$inventory->slug] = isset($productInventoriesStock[$inventory->term_id]) ? $productInventoriesStock[$inventory->term_id] : 0;

                if($this->get_option('inventoryPrices')) {
                    $products[$id][$inventory->slug . '_price'] = isset($productInventoryPrices[$inventory->term_id]) ? $productInventoryPrices[$inventory->term_id] : 0;
                }
            }
        }

        return $products;
    }

    public function my_variation_title_with_atts( $title, $product ) {

        // Safety check – run only on real variations
        if ( ! is_a( $product, 'WC_Product_Variation' ) ) {
            return $title;
        }

        // 1. Collect the variation’s attributes
        $attributes   = $product->get_attributes();
        $attr_values  = [];

        foreach ( $attributes as $taxonomy => $value ) {

            // a) Global attribute (stored as term slug)
            if ( taxonomy_exists( $taxonomy ) ) {
                $term = get_term_by( 'slug', $value, $taxonomy );
                if ( $term && ! is_wp_error( $term ) ) {
                    $attr_values[] = $term->name;          // “Red”, “XL”, …
                }

            // b) Custom attribute (stored as plain text)
            } elseif ( ! empty( $value ) ) {
                $attr_values[] = wc_clean( $value );       // “Matte Black”, …
            }
        }

        // 2. Append to the original title
        if ( ! empty( $attr_values ) ) {
            $title .= ' – ' . implode( ' / ', $attr_values );
        }

        return $title;
    }

    public function build_export($products)
    {
        $excelExt = '.xlsx';
        $writer = 'Xlsx';

        $useExcel2007 = $this->get_option('excel2007');

        if($useExcel2007 == "1") {
            $excelExt = '.xls';
            $writer = 'Xls';
        }

        $spreadsheet = new Spreadsheet();

        // Set document properties
        $spreadsheet->getProperties()->setCreator("weLaunch")
                                     ->setLastModifiedBy("weLaunch")
                                     ->setTitle("Inventory Export (".date('Y.m.d - H:i:s').")")
                                     ->setSubject("Inventory export")
                                     ->setDescription("Inventory export.")
                                     ->setKeywords("woocommerce inventorys");
        // Add some data
        // A note from the manual: In PHPExcel column index is 0-based while row index is 1-based. That means 'A1' ~ (0,1)
        $row = 1; // 1-based index
        $firstLine = true;
        foreach ($products as $fields) {
            $col = 1;
            if ($firstLine) {
                $keys = array_keys($fields);
                foreach ($keys as $key) {
                    $spreadsheet->getActiveSheet()->setCellValue(array($col, $row), $key);
                    $col++;
                }
                $row++;
                $col = 1;
                $firstLine = false;
            } 
           
            foreach($fields as $key => $value) {

                $spreadsheet->getActiveSheet()->setCellValue(array($col, $row), $value);
                $col++;
            }
            $row++;
        }

        // Rename worksheet
        $spreadsheet->getActiveSheet()->setTitle('Export ('.date('Y.m.d - H.i.s').')');
        // Set active sheet index to the first sheet, so Excel opens this as the first sheet
        $spreadsheet->setActiveSheetIndex(0);
        // Redirect output to a client’s web browser (Excel2007) using ob_end_clean();
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="inventorys-export_' . date('Y-m-d_H-i-s') . $excelExt . '"');
        header('Cache-Control: max-age=0');
        // If you're serving to IE 9, then the following may be needed
        header('Cache-Control: max-age=1');
        // If you're serving to IE over SSL, then the following may be needed
        header ('Expires: Mon, 26 Jul 1997 05:00:00 GMT'); // Date in the past
        header ('Last-Modified: '.gmdate('D, d M Y H:i:s').' GMT'); // always modified
        header ('Cache-Control: cache, must-revalidate'); // HTTP/1.1
        header ('Pragma: public'); // HTTP/1.0

        $writer = IOFactory::createWriter($spreadsheet, $writer);
        $writer->save('php://output');
        die();
        exit();
        return TRUE;
    }

    public function notice()
    {
        ?>
        <div class="notice notice-success is-dismissible">
            <p><?php echo esc_attr($this->notice) ?></p>
        </div>
        <?php
    }
}