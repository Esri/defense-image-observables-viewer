/*
 * Imagery Pane for Basic Viewer
 * 
 * Declaration syntax:
 * require(['dtc/ImageryPane], function(ImageryPane){
 * 	new ImageryPane({map: <esri.Map>, <string|domNode>domNode)
 * });
 * 
 * Requires HTML 5 canvas support (IE9+, FF, Chrome, Safari)
 *
 * Widgets used by this widget:
 * 		-dtc/ImageInfoDetail
 * 		-dtc/ImagePropertiesControl
 * 		-dtc/Mensuration
 * 		-esrix/layers/ArcGISImageServiceLayerEx
 * 
 * Resources used by this widget:
 * 		-templates/ImagePane.html
 * 		-css/ImagePane.css
 * 
 */

define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./templates/ImageryPane.html", 'dijit/form/Select',"esri/config","dojo/dom-construct", "dijit/registry"], function(declare, connect, array, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, dijitTemplate, Select, esriConfig, domConstruct, registry) {

	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		declaredClass : "dtc.ImageryPane",
		templateString : dijitTemplate,

		options : {
			map : null
		},
		imageServices : [],
		selectedImageService : null,

		//These will be the dijits we load into the pane
		imageControls : null,
		mensuration : null,
		measure : null,
		imageInfoDetail : null,

		constructor : function(options, srcRefNode) {
			declare.safeMixin(this.options, options);

			this.domNode = srcRefNode;

			this.map = this.options.map;
		},

		startup : function() {
			var _self = this;

			require(['dojo/has'], function(has) {
				//Add in checkers for Canvas & Web Workers
				has.add("canvas2D", function(global, document, anElement) {
					try {
						return !!document.createElement("canvas").getContext;
					} catch (e) {
						return false;
					}
				}/*, true*/);
				has.add("webWorker", function(global, document, anElement) {
					try {
						return typeof (Worker) !== "undefined";
					} catch (e) {
						return false;
					}
				}/*, true*/);

				//Check for the map
				if (!_self.map) {
					console.log('map required');
					_self.destroy();
					return;
				}

				//Check for Canvas
				if (!has("canvas2D")) {
					console.log('No Canvas');
					_self.destroy();
					return;
				}
				//Check for Web Worker
				if (!has("webWorker")) {
					console.log('No Web Workers')
					_self.destroy();
					return;
				}

				//Set up the Web Worker
				esriConfig.defaults.esrix = {
					'layers' : {
						'ipBgWwProc' : "./esrix/layers/IPBgWebWorkerProc.js"
					}
				};

				//Wait for the map to load and then initialize
				if (_self.map.loaded) {
					_self._init();
				} else {
					connect.connect(_self.map, "onLoad", function() {
						_self._init();
					});
				}

			});
		},

		destroy : function() {
			this.inherited(arguments);
		},

		_init : function() {
			var _self = this;
			//Insert the stylesheet
			domConstruct.create("link", {
				rel : "stylesheet",
				type : "text/css",
				href : "dtc/css/ImageryPane.css"
			}, document.getElementsByTagName('head')[0])

			//Insert Filters.js

			require(['esrix/layers/ArcGISImageServiceLayerEx', 'dojo/data/ObjectStore', 'dojo/store/Memory', "esri/urlUtils", "dtc/ImagePropertiesControl", "dtc/Mensuration", "dtc/ImageInfoDetail"], function(ImageLayerEx, ObjectStore, Memory, urlUtils, ImagePropertiesControl, Mensuration, ImageInfoDetail) {
				/* 
				 * Load Image Services
				 * 
				 * Scan the map for image service layers
				 * 1) Replace the Image Service Layer with extended image services supporting brightness/contrast preserving layer order
				 * 2) Reset the declaredClass to esri.layers.ArcGISImageServiceLayer in case any code is checking the class value
				 * 3) Add them to the set of image services to eventually populate the dropdown
				 */
				array.forEach(_self.map.layerIds, function(layerId, i) {
					var thisLayer = _self.map.getLayer(layerId);
					if (thisLayer.declaredClass === "esri.layers.ArcGISImageServiceLayer") {
						var thisLayerEx = new ImageLayerEx(thisLayer.url, {
							//Using the same ID
							id : thisLayer.id,
							//Resetting declaredClass in case any code actually checks for the class
							declaredClass : "esri.layers.ArcGISImageServiceLayer",
							//We're getting the title from the arcgisProps property specific to web map layers
							arcgisProps : thisLayer.arcgisProps,
							contrastValue : 0,
							brightnessValue : 0
						});
						
						urlUtils.addProxyRule({
							urlPrefix : thisLayer.url,
							proxyUrl : esriConfig.defaults.io.proxyUrl
						});

						//Replace the image service with with ArcGISImageServiceEx version in place
						map.removeLayer(thisLayer);
						map.addLayer(thisLayerEx, i);
						
						//Update the Layer List to work with the new layer
						array.forEach(registry.byId('layerMenu').getChildren(), function(menuItem) {
							if (menuItem.label === thisLayerEx.arcgisProps.title) {
								menuItem.onChange = function() {
									thisLayerEx.setVisibility(!thisLayerEx.visible)
								}
							}
						});
						
						//Add to the internal list of image services
						_self.imageServices.push({
							label : thisLayerEx.arcgisProps.title,
							id : thisLayerEx.id
						});
					}
				});

				/*	Load the image service array into the select
				 *	Add the widgets- since we need to have the image services loaded & set for ImagePropertiesControl and Mensuration,
				 *	we'll keep them in the same require
				 */
				var store = new Memory({
					data : _self.imageServices
				});
				var os = new ObjectStore({
					objectStore : store
				});
				_self.imageSelect.setStore(os, _self.imageServices[0]);

				if (_self.imageServices.length > 0) {
					_self.selectedImageService = _self.imageServices[0]['id'];
				}

				/*
				 * Load Widgets
				 */
				//Image Properties Widget
				_self.imagePropertiesControl = new ImagePropertiesControl({
					map : _self.map
				}, "imageServiceProps")
				_self.imagePropertiesControl.startup();

				//Mensuration Widget
				_self.mensuration = new Mensuration({
					map : _self.map
				}, "mensurationTools")//.placeAt(_self.imagePaneRoot);
				_self.mensuration.startup();

				_self.imageInfoDetail = new ImageInfoDetail({
					map : _self.map
				}, "imageInfoDetails");
				_self.imageInfoDetail.startup();

				//Assign default Image Service
				_self.imagePropertiesControl.set('imageService', _self.selectedImageService);
				_self.mensuration.set('imageService', _self.selectedImageService);
				_self.imageInfoDetail.set('imageService', _self.selectedImageService);

				//Update the widgets when the selected image service changes
				_self.imageSelect.on("change", function(newValue) {
					_self.imagePropertiesControl.set('imageService', newValue);
					_self.mensuration.set('imageService', newValue);
					_self.imageInfoDetail.set('imageService', newValue);
//Potential UI enhancement - have dropdown control viewable image layer
//					_self._changeVisibility(newValue);
				});
			});

			//Create the Measurement widget
			//Note- getting multiple load errors when loading via AMD with the build being used by Basic Viewer
			_self.measure = new esri.dijit.Measurement({
				map : _self.map,
				id : 'imageMeasureTool'
			}, 'imageMeasure');
			_self.measure.startup();

		},
	
		_changeVisibility: function(newService) {
			var _self = this;
			array.forEach(this.imageServices, function(service){
				_self.map.getLayer(service.id).setVisibility(service.id === newService);
			});
		}
	});
});
