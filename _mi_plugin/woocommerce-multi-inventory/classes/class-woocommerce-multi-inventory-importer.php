<?php
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Xls;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class WooCommerce_Multi_Inventory_Importer extends WooCommerce_Multi_Inventory
{
    protected $plugin_name;
    protected $version;
    protected $options;

    public $notice;
    public $file;
    public $rows;
    public $columns;

    /**
     * Construct Inventory Locator Admin Class
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
        add_action('wp_ajax_upload_file', array($this, 'check_file_uploaded'));
        add_action('wp_ajax_import_inventorys', array($this, 'import_inventorys'));
    }

    public function create_menu() 
    {

        add_submenu_page(
            'options-writing.php',
            esc_html__('WooCommerce Inventory Importer', 'woocommerce-multi-inventory'),
            esc_html__('WooCommerce Inventory Importer', 'woocommerce-multi-inventory'),
            'manage_options',
            'woocommerce-multi-inventory-importer',
            array($this, 'settings_page')
        );
    }

    public function settings_page() 
    {
    ?>
        <div class="wrap">
            <h1><?php esc_html_e('WooCommerce Multi Inventory Importer', 'woocommerce-multi-inventory') ?></h1>

            <script>
            (function( $ ) {

                var loadingIcon = '<svg width="40" height="10" viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg" fill="#3171ee"> <circle cx="15" cy="15" r="15"> <animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite" /> <animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite" /> </circle> <circle cx="60" cy="15" r="9" fill-opacity="0.3"> <animate attributeName="r" from="9" to="9" begin="0s" dur="0.8s" values="9;15;9" calcMode="linear" repeatCount="indefinite" /> <animate attributeName="fill-opacity" from="0.5" to="0.5" begin="0s" dur="0.8s" values=".5;1;.5" calcMode="linear" repeatCount="indefinite" /> </circle> <circle cx="1005" cy="15" r="15"> <animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite" /> <animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite" /> </circle></svg>';

                jQuery(document).ready(function(e){

                    var ajaxURL = '<?php echo admin_url('admin-ajax.php'); ?>';
                    var logContainer = $('.woocommerce-multi-inventory-import-log');
                    var maxRows = 0;
                    var maxColumms = 0;
                    var file = "";
                    var batch = 0;
                    var maxBatches = 1;

                    function importInventorys() {

                        $.ajax( {
                            type: "POST",
                            url: ajaxURL,
                            dataType: 'json',
                            data: {
                                'action' : 'import_inventorys',
                                "batch" : batch,
                                "rows" : maxRows,
                                "update_inventorys" : $('#inventory-import-update:checked').val(),
                                "columns" : maxColumms,
                                "file" : file
                            }, 
                            success: function( response ) {

                                logContainer.append(response.message);

                                if(!response.return) {
                                    return;
                                }

                                if(batch == maxBatches) {
                                    $('#inventory-import-button').html('Import Inventorys').removeAttr('disabled');
                                    $('#woocommerce-multi-inventory-import-current').text(maxRows);
                                    return;
                                }

                                $('#woocommerce-multi-inventory-import-current').text( (batch + 1) * 10);

                                batch++;
                                importInventorys();
                            }
                        })
                    }

                    // Submit form data via Ajax
                    jQuery("#woocommerce-multi-inventory-import").on('submit', function(e) {
                        e.preventDefault();
                        
                        // get file field value using field id
                        var fileInputElement = document.getElementById("inventory-import-file").files[0];
                        if(!fileInputElement) {
                            alert('File missing');
                            return false;

                        }  else {
                            
                            var fileName = fileInputElement.name;

                            $('#inventory-import-button').html(loadingIcon).attr('disabled', 'disabled');

                            jQuery.ajax({
                                url: ajaxURL,
                                type: "POST",
                                processData:  false,
                                dataType: 'json',
                                contentType:  false,
                                data:  new FormData(this),
                                success : function( response ){

                                    logContainer.html('<p>' + response.message + '</p>');

                                    maxRows = response.rows;
                                    maxColumms = response.columns;
                                    file = response.file;

                                    if(!response.return) {
                                        alert('File upload error');
                                        return;
                                    }

                                    if(response.return){

                                        maxBatches = Math.ceil( response.rows / 10 ) - 1;
                                        importInventorys();
                                    }
                                },
                            });
                            return false;
                        }
                        return false;
                    });
                });
            })( jQuery );
            </script>

            <form id="woocommerce-multi-inventory-import" method="post" enctype="multipart/form-data">

                <input type="hidden" name="action" value="upload_file">
                <input type="hidden" name="inventory_import_file_path" id="inventory_import_file_path" value="">

                <table class="form-table">            
                    <tr valign="top">
                        <td colspan="2" width="300px">
                            <b><?php esc_html_e('Batch Import:', 'woocommerce-multi-inventory') ?></b> <?php esc_html_e('The importer will import inventorys in batches of 10 via AJAX. You can leave, but do not close this tab until the import has been finished!', 'woocommerce-multi-inventory') ?><br>
                            <b><?php esc_html_e('How to use best:', 'woocommerce-multi-inventory') ?></b> <?php esc_html_e('1. Export all Inventorys (see settings > export inventorys button) 2. Do modifications in excel file. 3. Import modified Excel file.', 'woocommerce-multi-inventory') ?>
                        </td>
                    </tr>                    
                    <tr valign="top">
                        <th scope="row"><?php esc_html_e('File to Import', 'woocommerce-multi-inventory') ?></th>
                        <td><input type="file" id="inventory-import-file" name="inventory_import_file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"></td>
                    </tr>
                </table>

                <p class="submit">
                    <button id="inventory-import-button" type="submit" name="submit" id="submit" class="button button-primary"><?php esc_html_e('Import Inventorys', 'woocommerce-multi-inventory') ?></button>
                </p>
            </form>

            <div class="woocommerce-multi-inventory-import-log" style="max-height: 300px; overflow: scroll; background-color: #eaeaea; padding: 10px;">
                
            </div>
        </div>
    <?php 
    }

    public function check_file_uploaded()
    {
        if(!isset($_POST) || empty($_POST)) {
            return FALSE;
        }

        if(!isset($_FILES['inventory_import_file']['name']) || empty($_FILES['inventory_import_file']['name'])){
            $this->notice = "No file selected.";
            $this->notice(false);
        }

        $xls_mimetypes = array(
                'application/vnd.ms-excel',
                'application/vnd.ms-excel.addin.macroEnabled.12',
                'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
                'application/vnd.ms-excel.sheet.macroEnabled.12',
                'application/vnd.ms-excel.template.macroEnabled.12',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/octet-stream'
        );
        if(!in_array($_FILES['inventory_import_file']['type'], $xls_mimetypes)){
            $this->notice =  "Only Excels files allowed (given: ".$_FILES["inventory_import_file"]["type"].")";
            $this->notice(false);
        }

        // Use the wordpress function to upload
        // inventory_import_file corresponds to the position in the $_FILES array
        // 0 means the content is not associated with any other posts
        $attachment_id = media_handle_upload('inventory_import_file', 0);
        $file = get_attached_file($attachment_id);

        // Error checking using WP functions
        if(is_wp_error($attachment_id)){
            $this->notice = "Error uploading file: " . $attachment_id->get_error_message();
            $this->notice(false);
        }

        $this->file = $file;

       $writer = 'Xlsx';

        $useExcel2007 = $this->get_option('excel2007');
        if($useExcel2007 == "1") {
            $writer = 'Xls';
        }

        $file = str_replace('avada//avada', 'avada', $file);
        $file = str_replace('//', '/', $file);

        try {
            $objReader = IOFactory::createReader($writer);
            $objReader->setReadDataOnly(true);
            $objPHPExcel = $objReader->load($file);

            $objWorksheet = $objPHPExcel->getActiveSheet();
            $this->rows = $objWorksheet->getHighestRow(); 
            $highestColumn = $objWorksheet->getHighestColumn(); 

            $this->columns = Coordinate::columnIndexFromString($highestColumn);
        } catch (Exception $e) {
            $this->notice = 'Your file seems to be corrupt.<br/>' . $e->getMessage();
            $this->notice(false);
        }

        $this->notice = '<b>File uploaded. Found ' . $this->rows . ' rows and ' . $this->columns . ' columns</b>. Importing inventorys now: <span id="woocommerce-multi-inventory-import-current">0</span> / ' . $this->rows;

        $this->notice();
    }

    public function import_inventorys()
    {
       
        if(!isset($_POST['file']) || empty($_POST['file'])) {
            $this->notice .= 'File missing.';
            $this->notice(false);
        }

        $file = $_POST['file'];
        $batch = (int) $_POST['batch'];

        $row = ($batch * 10) + 1;
        $rows = ($batch + 1) * 10;

        if($batch == 0) {
            $row = 2;
            $rows = 10;
        }

        // max rows reached
        if($rows > $_POST['rows']) {
            $rows = $_POST['rows'];
        }

        $writer = 'Xlsx';

        $useExcel2007 = $this->get_option('excel2007');
        if($useExcel2007 == "1") {
            $writer = 'Xls';
        }

        $file = str_replace('avada//avada', 'avada', $file);
        $file = str_replace('//', '/', $file);

        try {
            $objReader = IOFactory::createReader($writer);
            $objReader->setReadDataOnly(true);
            $objPHPExcel = $objReader->load($file);

            $objWorksheet = $objPHPExcel->getActiveSheet();

            $highestColumn = $objWorksheet->getHighestColumn(); 
            $highestColumnIndex = Coordinate::columnIndexFromString($highestColumn); // PHPExcel_Cell::columnIndexFromString($highestColumn); 

            $productsToImport = array();
            $keys = array();

            for ($col = 1; $col <= $highestColumnIndex; ++$col) {
                $keys[$col] = $objWorksheet->getCell( array( $col, 1 ) )->getValue();
                continue;
            }   

            for ($row; $row <= $rows; $row++) {
                for ($col = 1; $col <= $highestColumnIndex; ++$col) {
                    $productsToImport[$row][$keys[$col]] = $objWorksheet->getCell( array( $col, $row ) )->getValue();
                }   
                $firstLine = false;
            }
            

            if(empty($productsToImport)) {
                $this->notice .= 'No Products found<br/>';
            }

            $inventories = get_terms( array(
                'taxonomy' => 'inventories',
                'hide_empty' => false,
            ));

            $i = 1;
            foreach ($productsToImport as $productToImport) {
                $i++;

                $saleInventoryExists = false;

                $this->notice .= 'Row ' . $i . ': ';

                if(empty($productToImport['id']) && empty($productToImport['sku'])) {
                    $this->notice .= 'Product id or sku missing!<br/>';
                    continue; 
                }

                $productId = $productToImport['id'];
                $product = wc_get_product($productId);
                if(!$product) {

                    if(isset($productToImport['sku']) && !empty($productToImport['sku'])) {
                        $productId = wc_get_product_id_by_sku($productToImport['sku']);
                        $product = wc_get_product($productId);
                        if(!$product) {
                            $this->notice .= 'Product with SKU: ' . esc_html( $productToImport['sku'] ) . ' not found<br/>';
                            continue;
                        }
                    } else {
                        $this->notice .= 'Product with ID: ' . $productId . ' not found<br/>';
                        continue;
                    }
                }

                if(isset($productToImport['manage_stock'])) {
                    $product->set_manage_stock($productToImport['manage_stock']);    
                }
                
                // $product->set_stock_quantity($productToImport['total_frontend_stock']);

                $productInventoriesStock = get_post_meta($productId, 'woocommerce_multi_inventory_inventories_stock', true);
                if(empty($productInventoriesStock)) {
                    $productInventoriesStock = array();
                }

                if($this->get_option('inventoryPrices')) {
                    $productInventoryPrices = get_post_meta($productId, 'woocommerce_multi_inventory_prices', true);
                    if(empty($productInventoryPrices)) {
                        $productInventoryPrices = array();
                    }
                }

                $newTotalFrontendStock = 0;
                foreach ($inventories as $inventory) {

                    if(isset($productToImport[$inventory->slug])) {
                        $productInventoriesStock[$inventory->term_id] = $productToImport[$inventory->slug];
                    }

                    if($this->get_option('inventoryPrices')) {
                        if(isset($productToImport[$inventory->slug . '_price'])) {
                            $productInventoryPrices[$inventory->term_id] = $productToImport[$inventory->slug . '_price'];
                        }
                    }
                    

                    $frontend = get_term_meta($inventory->term_id, 'woocommerce_multi_inventory_frontend', true);
                    if($frontend) {
                        $newTotalFrontendStock += $productToImport[$inventory->slug];
                    }
                }
                
                $product->set_stock_quantity($newTotalFrontendStock);

                if(!$productToImport['manage_stock'] && $newTotalFrontendStock > 0) {
                    $product->set_manage_stock(true);
                }

                if(!empty($productInventoriesStock)) {
                    $product->update_meta_data( 'woocommerce_multi_inventory_inventories_stock', $productInventoriesStock);
                }

                if(!empty($productInventoryPrices)) {
                    $product->update_meta_data( 'woocommerce_multi_inventory_prices', $productInventoryPrices);
                }

                $terms = array_keys( array_filter( $productInventoriesStock) );
                wp_set_post_terms($productId, $terms, 'inventories');

                $append = false;
                $productIdToUpdateTerms = $productId;
                if($product->get_type() == 'variation') {
                    
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
                
                $save = $product->save();

                if(!$save) {
                    $this->notice .= 'Inventory: ' . $productToImport['name'] . ' error: <br/>' . $i . '<br/><br/>';
                    continue;
                } else {
                    $this->notice .= 'Product ' . $productToImport['name'] . ' with ID ' . $productId . ' successfully updated<br/>';
                }
            }
        } catch (Exception $e) {
            $this->notice = 'Your file seems to be corrupt.<br/>' . $e->getMessage();
        }

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