/*
 * Imagery Pane for Basic Viewer
 * James Tedrick (DTC)
 * 05/10/2013
 */

define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", 
"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",

"dojo/text!./templates/ImageryPane.html", 
'dijit/form/Select',  

"dojo/dom", "dojo/dom-style", "dojo/dom-construct"], function(declare, connect, array, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, dijitTemplate, 
	Select,  
	dom, domStyle, domConstruct) {

	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		declaredClass : "dtc.ImageryPane",
		templateString : dijitTemplate,

		options : {
			map : null
		},
		imageServices : [],
		selectedImageService : null,
		
		//These will be the dijits we load into the pane
		imageControls: null,
		mensuration: null,
		measure: null,

		constructor : function(options, srcRefNode) {
			declare.safeMixin(this.options, options);

			this.domNode = srcRefNode;

			this.map = this.options.map;
		},

		startup : function() {
			var _self = this;

			if (!_self.map) {
				console.log('map required');
				_self.destroy();
			}

			if (this.map.loaded) {
				_self._init();
			} else {
				connect.connect(_self.map, "onLoad", function() {
					_self._init()
				});
			}
		},
		
		destroy : function() {
			this.inherited(arguments);
		},

		_init : function() {
			var _self = this;
			//Insert the stylesheet
			domConstruct.create("link", {rel:"stylesheet", type:"text/css", href:"dtc/css/imageryPane.css"}, document.getElementsByTagName('head')[0])
			
			//Scan the map for image service layers and create an array of them
			array.forEach(_self.map.layerIds, function(layerId) {
				var thisLayer = _self.map.getLayer(layerId);
				if (thisLayer.declaredClass == "esri.layers.ArcGISImageServiceLayer") {
					_self.imageServices.push({
						label : thisLayer.arcgisProps.title,
						id : layerId
					});
				}
			});
			
			/*	Load the image service array into the select
			 *	Add the widgets- since we need to have the image services loaded & set for ImagePropertiesControl and Mensuration,
			 *	we'll keep them in the same require
			 */
			require(['dojo/data/ObjectStore', 'dojo/store/Memory', 'dojo/on', "dtc/ImagePropertiesControl", "dtc/Mensuration"], 
			function(ObjectStore, Memory, on, ImagePropertiesControl, Mensuration) {
				var store = new Memory({data:_self.imageServices});
				var os = new ObjectStore({objectStore: store});
				_self.imageSelect.setStore(os, _self.imageServices[0]);
				

				if(_self.imageServices.length > 0) {
					_self.selectedImageService = _self.imageServices[0]['id'];
				}

				//Image Properties Widget				
				_self.imagePropertiesControl = new ImagePropertiesControl({map:_self.map, imageService: _self.selectedImageService}, "imageServiceProps")
				_self.imagePropertiesControl.startup();

				//Mensuration Widget
				_self.mensuration = new Mensuration({map:_self.map, imageService: _self.selectedImageService}, "mensurationTools")//.placeAt(_self.imagePaneRoot);
				_self.mensuration.startup();
				
				//Update the widgets when the selected image service changes
				_self.imageSelect.on("change", function(newValue){
					_self.imagePropertiesControl.set('imageService', newValue);
					_self.mensuration.set('imageService', newValue);
				});				
			});
			
			//Create the Measurement widget
			//Note- getting multiple load errors when loading via AMD with the build being used by Basic Viewer
			_self.measure = new esri.dijit.Measurement({
				map: _self.map,
				id: 'imageMeasureTool'
			}, 'imageMeasure');
			_self.measure.startup();
			
		},		
	});
});
