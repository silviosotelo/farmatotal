(function( $ ) {
	'use strict';

	$(document).ready(function() {	

		$('#woocommerce_multi_inventory_users').attr('disabled', true);

		$('.taxonomy-inventories select[multiple]').select2();
		$('#woocommerce-multi-inventory-inventories').select2();

		function delay(callback, ms) {
			var timer = 0;
			return function() {
				var context = this, args = arguments;
				clearTimeout(timer);
				timer = setTimeout(function () {
					callback.apply(context, args);
				}, ms || 0);
			};
		}

		var inventoryManagerTable = $('.woocommerce-multi-inventory-manager-table');
		if(inventoryManagerTable.length > 0) {
			
			var overlay = $('.woocommerce-multi-inventory-manager-table-spinner-overlay');

			inventoryManagerTable.dataTable({
				"pageLength" : 200,
		        "order": [[ 3, "asc" ]],
		        "paging": false
		    });

			// $(document).on('keyup', '.woocommerce-multi-inventory-manager-table-stock', function(e) {
			// 	var $this = $(this);
			//     $this.trigger('change');
			// });

			var bind_to = '.woocommerce-multi-inventory-manager-table-stock';
			$(document.body).off('change', bind_to);

			var typingTimer, 
				productId, 
				inventoryId, 
				stock,
				previousProductId, 
				previousInventoryId, 
				previousStock;


			var doneTypingInterval = 600;
			var updatedBefore = {};
			$(document).on('change keyup', bind_to, function(e) {

				e.preventDefault();
				var $this = $(this);

				productId = $this.data('product-id');
				inventoryId = $this.data('inventory-id');
				stock = $this.val();

				if(productId == previousProductId && previousInventoryId == inventoryId && previousStock == stock) {
					return false;
				}

				previousProductId = productId;
				previousInventoryId = inventoryId;
				previousStock = stock;

				clearTimeout(typingTimer);

				typingTimer = setTimeout(function(){

					overlay.show();

					var data = {
						'action': 'woocommerce_multi_inventory_update_stock',
						'product_id': productId,
						'inventory_id': inventoryId,
						'stock': stock,
					};					

					jQuery.post(
						ajaxurl, 
						data, 
						function(response) {

							if(!response.return) {
								alert('Error: ' + response.message);
							}

							if($this.hasClass('woocommerce-multi-inventory-manager-table-frontend-stock')) {
								var frontendStock = 0;
								var frontendStocks = $this.parents('tr').find('.woocommerce-multi-inventory-manager-table-frontend-stock');
								$.each(frontendStocks, function(i, index) {
									frontendStock += parseInt( $(this).val() );
								})
								$this.parents('tr').find('.woocommerce-multi-inventory-manager-table-total-frontend-stock').val(frontendStock).trigger('keyup');
							}

							if($this.hasClass('woocommerce-multi-inventory-manager-table-backend-stock')) {
								var backendStock = 0;
								var backendStocks = $this.parents('tr').find('.woocommerce-multi-inventory-manager-table-backend-stock');
								$.each(backendStocks, function(i, index) {
									backendStock += parseInt( $(this).val() );
								})
								$this.parents('tr').find('.woocommerce-multi-inventory-manager-table-total-backend-stock').val(backendStock);
							}

							if($this.hasClass('woocommerce-multi-inventory-manager-table-inventory-stock')) {
								var totalStock = 0;
								var stocks = $this.parents('tr').find('.woocommerce-multi-inventory-manager-table-inventory-stock');
								$.each(stocks, function(i, index) {
									totalStock += parseInt( $(this).val() );
								})
								$this.parents('tr').find('.woocommerce-multi-inventory-manager-table-total-stock').val(totalStock);
							}

							overlay.hide();
						},
						'json'
					);
				}, doneTypingInterval);

			});
		}
		
	} );



})( jQuery );