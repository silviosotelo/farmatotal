(function( $ ) {
	'use strict';

	// Create the defaults once
	var pluginName = "multiInventory",
		defaults = {
			overlay : $('#woocommerce-multi-inventory-overlay'),
			popup : $('#woocommerce-multi-inventory-popup-container'),
			nearestLocationLoader : $('.woocommerce-multi-inventory-popup-locations-nearest-location-loader'),
			allLocationsContainer : $('.woocommerce-multi-inventory-popup-locations-container'),
			nearestLocationError : $('.woocommerce-multi-inventory-popup-locations-nearest-location-error'),
			nearestLocation : $('.woocommerce-multi-inventory-popup-locations-nearest-location'),
			deliveryLocationContainer : $('.woocommerce-multi-inventory-popup-locations-delivery-location-container'),
			
		};

	// The actual plugin constructor
	function Plugin ( element, options ) {
		this.element = element;
		this.settings = $.extend( {}, defaults, options );
		this._defaults = defaults;
		this.trans = this.settings.trans;
		this._name = pluginName;
		this.init();
	}

	// Avoid Plugin.prototype conflicts
	$.extend( Plugin.prototype, {
		init: function() {
			this.window = $(window);
			this.currentURL = window.location.href;
			this.documentHeight = $( document ).height();
			this.windowHeight = this.window.height();
			this.products = {};

			if(typeof(google) != "undefined" && this.settings.googleAPIKey) {
				this.geocoder = new google.maps.Geocoder();
			}

			this.maybeChangeLinks();
			this.popup();
			this.variationStock();
			this.changeInventory();
			this.popupInventorySearch();
			this.labelPopup();

			var that = this;
			setTimeout( function() {
				that.validateStock();
			}, 250 );
			
			$(document).on('change', '[name="woocommerce_multi_inventory_inventory"]', function(e) {
				that.validateStock();
			});
		},		
		labelPopup : function() {

			var that = this;

			$('.woocommerce-multi-inventory-inventories-container').on('click', '.woocommerce-multi-inventory-inventories-delivery-container', function() {
				$('.woocommerce-multi-inventory-inventories-click-collect-container').find('input').prop('checked', false);
				if($('.woocommerce-checkout').length > 0) {

					var deliveryInventoryId = $('.woocommerce-multi-inventory-inventories-delivery-container').find('input[name="woocommerce_multi_inventory_inventory"]').val();
					let url = window.location.href;    
					url = url.split("?")[0];
					window.location.href = url + '?inventory=' + deliveryInventoryId;
				}
			});

			$('.woocommerce-multi-inventory-inventories-container').on('click', '.woocommerce-multi-inventory-inventories-click-collect-container', function() {

				$('.woocommerce-multi-inventory-inventories-delivery-container').find('input').prop('checked', false);
				$(this).find('input[name="woocommerce_multi_inventory_fake"]').prop('checked', true);

				if($('.woocommerce-multi-inventory-inventories-layout-labelPopup').length > 0) {
					that.popupOpen();
				}
			});

		},
		maybeChangeLinks : function() {

			var that = this;
			if(that.settings.disableStateReplace == "1") {
				return;
			}

			var currentInventory = this.getParameterByName('inventory');
			if(!currentInventory || currentInventory == "") {
				currentInventory = this.readCookie('woocommerce_multi_inventory_inventory');
				if(!currentInventory || currentInventory == "") {
					return;
				}
			}

			var urls = [];
			var url;
			var newURL;
			$("a").attr('href', function(i, h) {

				if(typeof(h) == "undefined"  || h === "") {
					return h;
				}

				if(h.indexOf('#') != -1 || h.indexOf('tel:') != -1 || h.indexOf('?inventory') != -1 || h.indexOf('mailto:') != -1) {
					return h;
				}

		 		return h + (h.indexOf('?') != -1 ? "&inventory=" + currentInventory : "?inventory=" + currentInventory);
			});

		},
		popup : function() {

			var that = this;

			var existingInventory = that.readCookie('woocommerce_multi_inventory_inventory');
			if(existingInventory) {

				var existingInventoryName = that.readCookie('woocommerce_multi_inventory_inventory_name');
				if(existingInventoryName != "") {
					$('.woocommerce-multi-inventory-selected-location').html(existingInventoryName);
				}
			}

			$(document).on('click', '.woocommerce-multi-inventory-open-poup, .woocommerce-multi-inventory-cart-switch-inventory-button', function(e) {
				e.preventDefault();

				that.productId = $(this).data('product-id');
				that.popupOpen();
			})

			if(that.settings.popupHideClose != "1") {
				that.settings.overlay.on('click', function(e){
					$(this).fadeOut();
					that.settings.popup.fadeOut();
				});

				$('.woocommerce-multi-inventory-popup-container').on('click', '.woocommerce-multi-inventory-popup-close-container', function(e) {
					e.preventDefault();
					that.settings.overlay.fadeOut();
					that.settings.popup.fadeOut();
				});
			}

			$(document).on('click', '.woocommerce-multi-inventory-choose-location', function(e) {

				$('.woocommerce-multi-inventory-choose-location').removeClass('woocommerce-multi-inventory-choose-location-selected');

				e.preventDefault();
				var $this = $(this);
				var inventoryId = $this.data('id');
				var inventoryName = $this.data('name');
				$('.woocommerce-multi-inventory-selected-location').text(inventoryName);

				that.saveCookie('woocommerce_multi_inventory_inventory', inventoryId, 365);
				that.saveCookie('woocommerce_multi_inventory_inventory_name', inventoryName, 365);

				that.settings.overlay.fadeOut();
				that.settings.popup.fadeOut();

				$this.addClass('woocommerce-multi-inventory-choose-location-selected');

				window.location.href = window.location.href.replace( /[\?#].*|$/, "?inventory=" + inventoryId );
			})

			if(that.settings.popup.length < 1) {
				return;
			}

			var popupShowed = that.readCookie('woocommerce_multi_inventory_popup');
			if(popupShowed || that.settings.popupEnable != "1" || that.settings.popupShowAutomatically != "1") {
				return;
			}

			that.popupOpen();

		},
		popupInventorySearch : function() {

			var that = this;

			$('.woocommerce-multi-inventory-popup').on('keyup', '.woocommerce-multi-inventory-popup-address', function(e) {
				if (e.keyCode === 13) {
				    $(".woocommerce-multi-inventory-popup-address-button").click();
				}
			});

			$('.woocommerce-multi-inventory-popup').on('click', '.woocommerce-multi-inventory-popup-address-button', function(e) {

				e.preventDefault();

				var address = {
					address : $('.woocommerce-multi-inventory-popup-address').val()
				};

				that.geocoder.geocode( address, function ( results, status ) {
					if ( status === google.maps.GeocoderStatus.OK ) {
						var geometryLocation = results[0].geometry.location;
						that.getInventories(geometryLocation.lat(), geometryLocation.lng());
					}
				} );

			});

			var autocompleteOptions = {
				fields: ["name", "geometry.location", "place_id", "formatted_address"],
				type : ['geocode'],
			};

			if(that.settings.popupShowSearchAutocomplete == "1" && typeof(google) != "undefined" ) {

				var autocomplete = new google.maps.places.Autocomplete($('.woocommerce-multi-inventory-popup-address')[0], autocompleteOptions);
				autocomplete.addListener('place_changed', function(e){
					var place = autocomplete.getPlace();
					if(place.formatted_address != "") {
						var address = {
							address : place.formatted_address
						};

						that.geocoder.geocode( address, function ( results, status ) {
							if ( status === google.maps.GeocoderStatus.OK ) {
								var geometryLocation = results[0].geometry.location;
								that.getInventories(geometryLocation.lat(), geometryLocation.lng());
							}
						} );
					}
				});
			}
		},
		popupOpen : function(showInventories) {

			var that = this;

			that.settings.nearestLocation.html('');
			that.settings.nearestLocationLoader.show();
			that.settings.allLocationsContainer.hide();
			that.settings.deliveryLocationContainer.hide();

			var searchFieldExists = $('.woocommerce-multi-inventory-popup-address');

			if(showInventories) {
				$('.woocommerce-multi-inventory-popup-all-locations-location').show();
			}
			
			$('.woocommerce-multi-inventory-popup-all-locations-location').show();

			if(that.settings.popupDisableGeolocation == "1") {

				that.getInventories(null, null);

			} else {

				navigator.geolocation.getCurrentPosition(
					function(position) {

						let lat = position.coords.latitude;
						let lng = position.coords.longitude;

						if(searchFieldExists.length > 0) {

							var latlng = {lat: lat, lng: lng};

							that.geocoder.geocode({'location': latlng}, function(results, status) {
								if (status === google.maps.GeocoderStatus.OK) {
									if (results[1]) {
										searchFieldExists.val(results[1].formatted_address);
									} else {
										console.log(results);
									}
								} else {
									window.alert('Geocoder failed due to: ' + status);
								}
							});
						}

						that.saveCookie('woocommerce_multi_inventory_lat', lat, 365);
						that.saveCookie('woocommerce_multi_inventory_lng', lng, 365);

						that.getInventories(lat, lng);
						
						// var distances = [];
						// var locations = $('.woocommerce-multi-inventory-popup-all-locations-location');
						// $.each(locations, function(i, index) {
						// 	var $this = $(this);
						// 	var locationId = $this.data('id');
						// 	var locationLat = $this.data('lat');
						// 	var locationLng = $this.data('lng');

						// 	if(!locationLat || locationLat == "" || !locationLng || locationLng == "") {
						// 		return;
						// 	}

						// 	if(showInventories && !showInventories.includes(locationId)) {
						// 		$('.woocommerce-multi-inventory-popup-all-locations-location-' + locationId).hide();
						// 		return;
						// 	}

						// 	var distance = that.getDistance( lat, lng, locationLat, locationLng).toFixed(1);
						// 	if(distance && distance > 0 && distance != "") {

						// 		$('.woocommerce-multi-inventory-popup-locations-location[data-id="' + locationId + '"]').find('.woocommerce-multi-inventory-popup-locations-location-distance-value').text(distance);
						// 		$('.woocommerce-multi-inventory-popup-locations-location[data-id="' + locationId + '"]').find('.woocommerce-multi-inventory-popup-locations-location-distance').show();
						// 		distances.push({
						// 			ID : locationId,
						// 			distance: distance,
						// 		});
						// 	}
						// });

						// distances.sort(function(a,b) { return a['distance'] - b['distance'];});
						// if(distances && distances.length > 0) {
							
						// 	var nearestLocationHTML = $('.woocommerce-multi-inventory-popup-locations-location[data-id="' + distances[0].ID + '"]')[0].outerHTML;
						// 	$('.woocommerce-multi-inventory-popup-locations-location[data-id=' + distances[0].ID + ']').hide();
						// 	if(nearestLocationHTML) {
						// 		that.settings.nearestLocation.html(nearestLocationHTML);
						// 	}
						// }

						// that.settings.nearestLocationLoader.hide();
						// that.settings.allLocationsContainer.show();
						// that.settings.deliveryLocationContainer.show();
					},
					function(error) {

						that.getInventories(null, null);

						// that.settings.nearestLocationError.show();
						// that.settings.nearestLocationLoader.hide();	
						// that.settings.allLocationsContainer.show();
						// that.settings.deliveryLocationContainer.show();
					},
					{
						enableHighAccuracy: false,
						maximumAge: 3600000
					}
				);
			}

			that.settings.overlay.fadeIn();
			that.settings.popup.fadeIn();

			this.saveCookie('woocommerce_multi_inventory_popup', true, 365);

		},
		getInventories : function(lat, lng) {

			var that = this;

			jQuery.ajax({
				url: that.settings.ajax_url,
				type: 'post',
				dataType: 'JSON',
				data: {
					action: 'woocommerce_multi_inventory_get_inventories',
					lat: lat,
					lng: lng,
					product_id: that.productId,
				},
				beforeSend: function() {

					that.settings.nearestLocation.html('');
					that.settings.nearestLocationLoader.show();
					that.settings.allLocationsContainer.hide();
					that.settings.deliveryLocationContainer.hide();

				},
				success : function( response ) {

					if(!response.status) {
						that.settings.allLocationsContainer.show();
						that.settings.nearestLocationLoader.hide();	
						$('.woocommerce-multi-inventory-popup-locations').html('No inventories found');
						return;
					}

					$('.woocommerce-multi-inventory-popup-locations').html(response.inventories_html);

					if(response.first_inventory) {
						var nearestLocationHTML = $('.woocommerce-multi-inventory-popup-locations-location[data-id="' + response.first_inventory + '"]')[0].outerHTML;
						$('.woocommerce-multi-inventory-popup-locations-location[data-id=' + response.first_inventory + ']').hide();
						if(nearestLocationHTML) {
							that.settings.nearestLocation.html(nearestLocationHTML);
						}
					}

					that.settings.nearestLocationError.hide();
					that.settings.nearestLocationLoader.hide();	
					that.settings.allLocationsContainer.show();
					that.settings.deliveryLocationContainer.show();
					that.settings.deliveryLocationContainer.find('.woocommerce-multi-inventory-popup-locations-location').show();
				},
			});

		},
		changeInventory : function () {

			$(document).on('click', '.woocommerce-multi-inventory-label-change', function(e) {
				e.preventDefault();
				$('.woocommerce-multi-inventory-label-container .woocommerce-multi-inventory-inventories-row').toggle();
			});

		},
		getDistance : function(lat1, lon1, lat2, lon2) 
		{
		  var R = 6371; // km
		  if(this.settings.popupMiles == "1") {
		  	R = 3956; // miles
		  }

		  var dLat = this.toRad(lat2-lat1);
		  var dLon = this.toRad(lon2-lon1);
		  var lat1 = this.toRad(lat1);
		  var lat2 = this.toRad(lat2);

		  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
		  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		  var d = R * c;
		  return d;
		},
		// Converts numeric degrees to radians
		toRad : function(value) 
		{
		    return value * Math.PI / 180;
		},
		validateStock : function() {

			var that = this;

			if(that.settings.productPageDisplay == "select") {
				var inventory_id = $("#woocommerce-multi-inventory-select option:selected").val();
			} else {
				var inventory_id = $("input[name=woocommerce_multi_inventory_inventory]:checked").val();
			}
			
			if(!inventory_id) {
				inventory_id = that.readCookie('woocommerce_multi_inventory_inventory');
			}

			var product_id = $('[name="product_id"]').val();
			if(!product_id) {
				product_id = $('.single_add_to_cart_button').val();
			}

			if(!product_id) {
				return;
			}

			jQuery.ajax({
				url: that.settings.ajax_url,
				type: 'post',
				dataType: 'JSON', 
				data: {
					action: 'woocommerce_multi_inventory_get_stock',
					product_id: product_id,
					variation_id: $('[name="variation_id"]').val(),
					inventory_id: inventory_id,
				},
				success : function( response ) {

					if(response.msg != "") {
						$('.stock, .inventory_status').text(response.msg);
					}

					if(!response.status) {
						$('.single_add_to_cart_button').attr('disabled', true);
					} else {
						$('.single_add_to_cart_button').attr('disabled', false);
					}
					$("input[name=woocommerce_multi_inventory_inventory][value=" + response.inventory_id + "]").prop('checked', true);
				}
			});   

		},
		variationStock : function() {

			
		    // var checkVariations = $('.variations_form');
		    // if(checkVariations.length < 1 || inventoriesContainer.length < 1) {
		    // 	return;
			// } 

			var that = this;
			var spinner = $('.woocommerce-multi-inventory-manager-table-spinner');
			// var availableVariations = $(checkVariations.data('product_variations'));
			// woocommerce_variation_has_changed
			$(document).on('show_variation', '.variations_form', function(e, variation) {

				if(!variation) {
					return;
				}

				if(variation.id == "") {
					return;
				}

				var inventoriesContainer = $('.woocommerce-multi-inventory-inventories-variable');
		    	var _this = $(this);
		    	var variationId = variation.variation_id;

		    	if(variationId == "0" || !variationId) {
		    		inventoriesContainer.hide();
		    		return;
		    	}

		    	that.validateStock();

		    	spinner.show();

				jQuery.ajax({
					url: that.settings.ajax_url,
					type: 'post',
					dataType: 'JSON',
					data: {
						action: 'woocommerce_multi_inventory_get_variation_stock',
						variation_id: variationId,
					},
					success : function( response ) {

						if(!response.status) {
							inventoriesContainer.hide();
							spinner.hide();
							return;
						}

						var select = $('#woocommerce-multi-inventory-select');

						$.each(response.inventories_stock, function(i, index) {

							if(select.length > 0) {

								var inventory = select.find('option[value="' + i + '"]');
								if(inventory.length < 1) {
									return;
								}

								var name = inventory.data('name');
								if(that.settings.productPageStockDisplay == "count") {
									inventory.text( name + ' ' + that.settings.textsLeftInStock.replace('%s', index) );
								} else if(that.settings.productPageStockDisplay == "inout") {

									if(index > 0) {
										inventory.text( name + ' ' + that.settings.textsInStock );
									} else {
										inventory.text( name + ' ' + that.settings.textsOutOfStock );
									}

								} else {
									inventory.text( name );
								}

								if(index > 0) {
									inventory.prop('disabled', false);
								} else {
									inventory.prop('disabled', true);
								}

							} else {

								var inventory = $('.woocommerce-multi-inventory-inventories-row-inventory-' + i);
								if(inventory.length < 1) {
									return;
								}

								if(that.settings.productPageStockDisplay == "count") {
									inventory.find('.woocommerce-multi-inventory-inventories-stock').text( that.settings.textsLeftInStock.replace('%s', index) );
								} else if(that.settings.productPageStockDisplay == "count") {

									if(index > 0) {
										inventory.find('.woocommerce-multi-inventory-inventories-stock').text( that.settings.textsInStock );
									} else {
										inventory.find('.woocommerce-multi-inventory-inventories-stock').text( that.settings.textsOutOfStock );
									}

								} else {
									inventory.find('.woocommerce-multi-inventory-inventories-stock').text( '' );
								}

								if(index > 0) {
									inventory.find('.woocommerce-multi-inventory-inventories-stock').removeClass('woocommerce-multi-inventory-inventories-stock-out-of-stock').addClass('woocommerce-multi-inventory-inventories-stock-on-stock');
									inventory.find('.woocommerce-multi-inventory-inventories-radio input').prop('disabled', false);
								} else {
									inventory.find('.woocommerce-multi-inventory-inventories-stock').removeClass('woocommerce-multi-inventory-inventories-stock-on-stock').addClass('woocommerce-multi-inventory-inventories-stock-out-of-stock');
									inventory.find('.woocommerce-multi-inventory-inventories-radio input').prop('disabled', true);
								}
							}
						});


						var existingInventory = that.readCookie('woocommerce_multi_inventory_inventory');
						if(existingInventory < 1) {
							existingInventory = that.settings.defaultInventory;
						}

						if(existingInventory > 0) {
							if(select.length < 1) {
								
								var existingInventoryInputField = $('.woocommerce-multi-inventory-inventories-row-inventory-' + existingInventory).find('input');
								if(existingInventoryInputField.length > 0) {
									existingInventoryInputField.prop('checked', true);
								}
							}

							if( (that.settings.productPageDisplay == "label" || that.settings.productPageDisplay == "labelPopup") && existingInventory > 0) {
								$('.woocommerce-multi-inventory-label-current-stock').text(  response.inventories_stock[existingInventory] );
							}
						}

						if(that.settings.productPageDisplay == "text" || that.settings.productPageDisplay == "textOnlySelected") {
							$('.woocommerce-multi-inventory-text').html(response.text);
						}

						inventoriesContainer.show();
						spinner.hide();
						
						$('.woocommerce-multi-inventory-open-poup').data('product-id', variationId);
						
					}
				});    

		    })
			setTimeout( function() {
				$('.variations select').trigger('change');
			}, 250 );

		},
		//////////////////////
		///Helper Functions///
		//////////////////////
		buildReplaceState : function() {
			var that = this;
			var products = that.products;
						
			that.currentURL = that.removeURLParameter(that.currentURL, 'compare');
			
			var queryCheck = that.currentURL.split('?');
			if (queryCheck.length > 1 && queryCheck[1] !== '') {
				var url = that.currentURL + '&';
			} else if(queryCheck.length > 1 && queryCheck[1] == '') {
				var url = that.currentURL;
			} else {
				var url = that.currentURL + '?';
			}
			if(!that.isEmpty(products)) {
				url += 'compare=' + Object.keys(products).map(function(k){return products[k]}).join(",");;
			}

			window.history.replaceState('woo_multi_inventory', 'WooCommerce Better Compare', url);
		},
		getParameterByName : function (name, url) {
		    if (!url) url = window.location.href;
		    name = name.replace(/[\[\]]/g, "\\$&");
		    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		        results = regex.exec(url);
		    if (!results) return null;
		    if (!results[2]) return '';
		    return decodeURIComponent(results[2].replace(/\+/g, " "));
		},
		removeURLParameter : function (url, parameter) {
		    //prefer to use l.search if you have a location/link object
		    var urlparts= url.split('?');   
		    if (urlparts.length>=2) {

		        var prefix= encodeURIComponent(parameter)+'=';
		        var pars= urlparts[1].split(/[&;]/g);

		        //reverse iteration as may be destructive
		        for (var i= pars.length; i-- > 0;) {    
		            //idiom for string.startsWith
		            if (pars[i].lastIndexOf(prefix, 0) !== -1) {  
		                pars.splice(i, 1);
		            }
		        }

		        url= urlparts[0]+'?'+pars.join('&');
		        return url;
		    } else {
		        return url;
		    }
		},
		isEmpty: function(obj) {

		    if (obj == null)		return true;
		    if (obj.length > 0)		return false;
		    if (obj.length === 0)	return true;

		    for (var key in obj) {
		        if (hasOwnProperty.call(obj, key)) return false;
		    }

		    return true;
		},
		saveCookie: function(name, value, days) {

			var expires = "";
			if (days) {
		        var date = new Date();
		        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		        expires = "; expires=" + date.toGMTString();
		    }

			var cookie = name + '=' + encodeURIComponent(JSON.stringify(value)) + expires + '; path=/;';
			document.cookie = cookie;
		},
		readCookie: function(name) {
		    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
		    if (match) {
		        try {
		            return JSON.parse(decodeURIComponent(match[1]));
		        } catch (e) {
		            console.error('Error parsing cookie:', e);
		            return null;
		        }
		    }
		    return null;
		},
		deleteCookie: function(name) {
			document.cookie = [name, '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; path=/;'].join('');
		},
		getObjectSize : function(obj) {
		    var size = 0, key;
		    for (key in obj) {
		        if (obj.hasOwnProperty(key)) size++;
		    }
		    return size;
		},
	} );

	// Constructor wrapper
	$.fn[ pluginName ] = function( options ) {
		return this.each( function() {
			if ( !$.data( this, "plugin_" + pluginName ) ) {
				$.data( this, "plugin_" +
					pluginName, new Plugin( this, options ) );
			}
		} );
	};

	$.fn.emulateTransitionEnd = function (duration) {
		var called = false
		var $el = this
		$(this).one('bsTransitionEnd', function () { called = true })
		var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
		setTimeout(callback, duration)
		return this
	}

	$(document).ready(function() {

		$( "body" ).multiInventory( 
			woocommerce_multi_inventory_options
		);

	} );

})( jQuery );