# Changelog
======
1.5.7
======
- NEW:	Fixed an issue with inventoryUsersOrdersBackend feature causing a fatal error
- FIX:	Email sending for variations where manage stock parent was set were not sending

======
1.5.6
======
- NEW:	Live Validate Stock on Product pages
		https://imgur.com/a/d87Fd0t
- NEW:	Option to hide the close option in the popup to force users to select an inventory
- FIX:	Inventory users order restriction not working in HPOS only mode
- FIX:	JS issue when inventory name contains & signs

======
1.5.5
======
- NEW:	Variation export adds attribute name in title
- FIX:	Labelpopup issue with variations
- FIX:  Email inventory not working with variation
- FIX:	Multi inventory exporter exports now all post status
- FIX:	JS issue with state replace

======
1.5.4
======
- FIX:	Rest update allows negative stock now

======
1.5.3
======
- NEW:	INventory manager pagination
		https://imgur.com/a/ZSHmP8w
- NEW:	Disable State replace:
		https://imgur.com/a/5tqfitg
- NEW:	Added company name & bank data fields for inventories
		https://imgur.com/a/eECsU7e
- NEW:	Saving ONE inventory ID on order meta level
- NEW:	Variation inventory prices show in category & product pages
- NEW:	Improved radius distance option
- FIX:	Virtual products showing stock when not empty allowed
- FIX:	Wrong inventory selected when order flow always disabled, 
		but product not in inventory stock
- FIX:	Max quantity changed even though modify stock quantity was disabled
- FIX:	Updated vendor libraries
- FIX:	Backorder products issue when ordered (inventory stock not decreased)
- FIX:	Translations in backend not shown

======
1.5.2
======
- NEW:	Shortcode accepts product_id (or uses default product)
		to hide empty inventories when enabled
		https://imgur.com/a/owYhM5K
- NEW:	Show product stock in popup
		https://imgur.com/a/35Lu2SI
- NEW:	2 hooks
		woocommerce_multi_inventory_before_inventories_container
		woocommerce_multi_inventory_after_inventories_container
- NEW:	Option to use geojs IP to country service
		https://imgur.com/a/KdWKGYP
- NEW:	ORder spliting accepts item meta
- FIX:	Cookie set wrong name in backend
- FIX:	Get variation AJAX call improvements
- FIX:	Inventory manager showed wrong total frontend stock when 
		modify stock inventory was enabled in plugin settings

======
1.5.1.1
======
- FIX:	Fatal error when using restrict cart

======
1.5.1
======
- NEW:	When always use order flow enabled, it will also
		be used when a user adds product to cart
- NEW:	Show inventory description in Emails
		https://ibb.co/album/ZRhNp9
- NEW:	Performance improvements
- FIX:	Quick view variable inventory show issue
- FIX:	Wrong quantity shown in label product page view
- FIX:	Inventories not shown when geolocation disabled
- FIX:	Issue when purchasing warehouse has string stock
- FIX:	Issue when inventories ahad the same lat / lng
- FIX:	Max quantity for on bacorder products

======
1.5.0
======
- NEW:	Search field in popup with autocomplete function
		https://imgur.com/a/eFFmCnX
- NEW:	Inventories are loaded via AJAX for performance
- NEW:	Delivery costs per Inventory
		https://imgur.com/a/b3ji38i
- NEW:	Mixed cart inventories info text
		https://imgur.com/a/yL2uHfX
- NEW:	Order splitting
		https://imgur.com/a/nwTXVgG
- NEW:	Advanced settings > Variations Add terms option
- NEW:	Popup list view layout
		https://imgur.com/a/i2uL1Kh
- NEW:	Switch Inventory in cart
		https://imgur.com/a/xNunP5q
- NEW:	Set payment / shipping methods in Click & Collect
		https://imgur.com/a/rxfc6DC
- NEW:	OVerride Shipping address with inventory data
		https://imgur.com/a/S9XZtWT
- NEW:	Disable Geolocation in Popup
		https://imgur.com/a/rW3Mdad
- NEW:	Warhouse inventories
		https://imgur.com/a/gvVLSPj
- FIX:	?location param got added to mailto  & tel links
- FIX:	WPML issue when changing stock in backend order
- FIX:	Replaced ?location parameter with ?inventory (IIS issue)
- FIX:	order inventory taxonomy terms not updated when updating an order inventory manually

======
1.4.0
======
- NEW:	Important change in label text:
		https://imgur.com/a/KsNyf9a
- NEW:	Click & collect:
		https://imgur.com/a/EjVJ8us
		https://imgur.com/a/iahXi0L
- NEW:	Popup Layout 2
		https://imgur.com/a/XB4XHir
- NEW:	Delivery Time per Inventory
		https://imgur.com/a/J1jM5Fm
- NEW:	Default Inventory
		https://imgur.com/a/ahsXA29
- NEW:	Inventory choosen on add to cart will be set as default inventory
- NEW:	Option to reduce stock on pending payments
		https://imgur.com/a/PshWVz5
- NEW:	Start Support for HPOS
		https://github.com/woocommerce/woocommerce/wiki/High-Performance-Order-Storage-Upgrade-Recipe-Book#apis-for-gettingsetting-posts-and-postmeta
- NEW:	Added support for on backorder
- NEW:	Delivery fees & radius shipping
		https://imgur.com/a/PgNKhYq
- NEW:	Use Google Geocoding instead of Distance matrix to save costs
		https://imgur.com/a/Ia9yMGa
- NEW:	Inventory calculation is done now BEFORE product is added to cart
- NEW: 	Popup speed up caching geolocaiton for 1 hour
- FIX:	Country order flow skips empty inventories and tries to find next ones
- FIX:	PHP Notice & Warning

======
1.3.4
======
- NEW:	Show stock information on category level
		https://imgur.com/a/nEYteBx
- NEW:	Added support for woocommerce_quantity_input_max
- FIX:	JS Syntax error, unrecognized expression: #?location=
- FIX:	Using only backend order flow checkes stock amount uncorrectly

======
1.3.3
======
- NEW:	Added support for WC bundles plugin
		https://imgur.com/a/IuX3jyL
- NEW:	Added out / in stock CSS class return for filter
- NEW:	REST API controller update inventory terms
- FIX:	Inventory manager checks product name exists to avoid orphaned variations to show
- FIX:	Product page text only > variations show missing data
- FIX:	woocommerce_add_cart_item_data does not retun cart_item_data on wrong validation
- FIX:	Recoded the validate cart hook
- FIX:	h not defined error

======
1.3.2
======
- NEW:	?location Parameter now overrides cookie and seleted location
- FIX:	Support for themes using old shortcode paraemter with 2 instead of 3 arguments

======
1.3.1
======
- NEW:	Restock unpaid orders (BETA)
		https://imgur.com/a/6Ibjlw2
- NEW:	Update all page links adding current location ID
- NEW:	products shortcode attribute: inventory
		https://imgur.com/a/dwqImdG
- FIX:	Fatal error in admin php file
- FIX:	Out of Stock Variations can be added to cart


======
1.3.0
======
- NEW:	Inventory User Access
		https://imgur.com/a/eHAtZmj
- NEW:	REST API
		https://www.welaunch.io/en/knowledge-base/faq/woocommerce-multi-inventory-rest-api/
- NEW:	Restrict inventory in cart to one
		https://imgur.com/a/yrhNQWF
- NEW:	Always use order flow
		https://imgur.com/a/di6l5eb
- NEW:	Variation support for text and textOnlySelected
- FIX: 	Backend edit not working
- FIX:	Inventory Image with in backend decreased to 200px
- FIX:	Cart item meta contains inventory ID even for backend order flows only

======
1.2.1
======
- NEW:	Change stock quantity display
		https://imgur.com/a/9Y4vApX
- NEW:	Option to enable / disable Inventory in Emails
		https://imgur.com/a/eGrGaOU
- NEW:	Added 10 more hooks to product page positon
		(these are for info / showing only - not tested with form submit)
- FIX:	Stock not working when a product was not available
		in the DEFAULT WPML language
- FIX:	Updated all Translations

======
1.2.0
======
- NEW:	Use order flow fallback on product pages when stock is empty
- NEW:	Stock text field 
		https://imgur.com/a/5htCsqY
- NEW:	Support on variation level for stock availability
		https://imgur.com/a/Ub1H95j
- NEW:	Custom Inventory Order can now be edited
		https://imgur.com/a/Y5TQbUo
- FIX:	Logger not logging correct
- FIX:	Added missing popup text strings to WPML
- FIX:	Product page order not working
- FIX:	Inventory price set to 0 when added to cart
- FIX:	Error for orphaned products in multi inventory manager
- FIX:	Variation updates update variable parent products inventory terms
- FIX:	Variation support for label fields

======
1.1.3.1
======
- FIX:	Inventory ID not set

======
1.1.3
======
- NEW:	Rewritten the checkout validation
- FIX:	Most / Lowest stock order not working

======
1.1.2
======
- NEW:	"By Country" Order Flow 
		Set countries you ship to on inventory level, 
		our plugin will then take users shipping / billing country
		and match them
		https://imgur.com/a/61vcprO
- NEW:	Text (only selected inventory) display option
		https://imgur.com/a/KRVQ4uP
- NEW:	Select2 in Backend
		https://imgur.com/a/uRXNy9q
- FIX:	Empty stock unset inventory term connection

======
1.1.1
======
- NEW:	Added variation support for select fields
- NEW:	Redirect popup change inventory with a query parameter
		(first step to avoid caching issues)
- NEW:	Reload page after location changed
- FIX:	When inventory stock was not set, but custom price
		it should not show the price
- FIX:	Inventories not show up

======
1.1.0
======
- NEW:	Hide unavailable Products in Categories & Listings
		https://imgur.com/a/HFmGrsc
- NEW:	Modify Price when inventory selected
		https://imgur.com/a/jqdqF0e
- NEW:	Modify Stock Quantity
		https://imgur.com/a/2wkUz9L
- NEW:	WPML Support
		https://imgur.com/a/a0oFNVC
- NEW:	Added an option for select plaholder:
		https://imgur.com/a/1Yuyric
- NEW:	Hidden Display Option
		https://imgur.com/a/qiAjzYj
- NEW:	Enable / Disable inventory required
		Allow Products to be added to cart that has empty (not zero) stock
		https://imgur.com/a/fzU5fZ2
- FIX:	Optimized the stock management on variation level

======
1.0.3
======
- NEW:	Set custom prices per inventory
		https://imgur.com/a/OShjPM0
- NEW:	Only show stock info text option:
		https://imgur.com/a/MNl9mDG
- NEW:	Inventory Logger
		https://imgur.com/a/A3CmoYP
- NEW:	Completely rewritten the way stocks are updated in order to work with failed & cancelled orders
- NEW:	Customer can not change the quantity higher than available in cart
- FIX:	Inventory manager reduced ajax call & implemented loading spinner
- FIX:	Inventory Importer not updating total frontend Stock

======
1.0.2
======
- NEW:	See inventories + stock in products overview page
		https://imgur.com/a/LTMGImu
- NEW:	Added support for our Store Locator Plugin
		https://imgur.com/a/qtmoT8Y
- NEW:	When importing excel files, the total frontend stock
		get automatically calculated
- NEW:	Import stocks by SKU (fallback when ID is empty)
- NEW:	Added shortcode for product pages
		https://www.welaunch.io/en/knowledge-base/faq/woocommerce-multi-inventory-shortcodes/
- FIX:	The inventory manager works with change + keyup now

======
1.0.1
======
- FIX:	Shop managers can't access inventory manager
- FIX:	Multiple issues

======
1.0.0
======
- Initial release