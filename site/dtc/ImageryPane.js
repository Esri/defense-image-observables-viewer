/*
 * Imagery Pane for Basic Viewer
 * James Tedrick (DTC)
 * 05/10/2013
 */

define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./templates/ImageryPane.html", 'dijit/form/Select', "dojo/dom", "dojo/dom-style", "dojo/dom-construct"], function(declare, connect, array, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, dijitTemplate, Select, dom, domStyle, domConstruct) {

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

		constructor : function(options, srcRefNode) {
			declare.safeMixin(this.options, options);

			this.domNode = srcRefNode;

			this.map = this.options.map;
		},

		startup : function() {
			var _self = this;

			require(['dojo/has', 'esri/config'], function(has, esriConfig) {
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

				//Set always use proxy
				esriConfig.defaults.io.alwaysUseProxy = true;

				//Set up the Web Worker
				esriConfig.defaults.esrix = {'layers':{'ipBgWwProc':"./esrix/layers/IPBgWebWorkerProc.js"}};

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
				href : "dtc/css/imageryPane.css"
			}, document.getElementsByTagName('head')[0])
			
			//Insert Filters.js

			require(['esrix/layers/ArcGISImageServiceLayerEx', 'dojo/data/ObjectStore', 'dojo/store/Memory', 'dojo/on', "dtc/ImagePropertiesControl", "dtc/Mensuration"], function(ImageLayerEx, ObjectStore, Memory, on, ImagePropertiesControl, Mensuration) {
				/* Scan the map for image service layers
				 * 1) Replace the Image Service Layer with extended image services supporting brightness/contrast preserving layer order
				 * 2) Reset the declaredClass to esri.layers.ArcGISImageServiceLayer in case any code is checking against the class
				 * 3) Add them to the set of image services to eventually populate the dropdown
				 */
				array.forEach(_self.map.layerIds, function(layerId, i) {
					var thisLayer = _self.map.getLayer(layerId);
					if (thisLayer.declaredClass === "esri.layers.ArcGISImageServiceLayer") {
						var thisLayerEx = new ImageLayerEx(thisLayer.url, {
							//Using the same ID
							id: thisLayer.id,
							//Resetting declaredClass in case any code actually checks for the class
							declaredClass : "esri.layers.ArcGISImageServiceLayer",
							//We're getting the title from the arcgisProps property specific to web map layers
							arcgisProps : thisLayer.arcgisProps, 
							contrastValue : 0,
							brightnessValue : 0
						});
						
						//TODO - Need to update proxyUrl
						esri.addProxyRule({urlPrefix: thisLayer.url, proxyUrl: '/proxy/proxy.ashx'});

						map.removeLayer(thisLayer);
						map.addLayer(thisLayerEx, i);
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

				//Assign default Image Service
				_self.imagePropertiesControl.set('imageService', _self.selectedImageService);
				_self.mensuration.set('imageService', _self.selectedImageService);

				//Update the widgets when the selected image service changes
				_self.imageSelect.on("change", function(newValue) {
					_self.imagePropertiesControl.set('imageService', newValue);
					_self.mensuration.set('imageService', newValue);
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
	});
});
