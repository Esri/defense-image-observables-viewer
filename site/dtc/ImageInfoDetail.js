define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dojo/_base/lang", 
"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", 
"dojo/text!./templates/ImageInfoDetail.html", 
"dijit/form/Button",
"dojo/dom", "dojo/dom-style", "dojo/dom-construct", "dijit/registry"], 
function(declare, connect, array, lang,
	_WidgetBase,   _TemplatedMixin, _WidgetsInTemplateMixin, 
	dijitTemplate, 
	Button,
	dom, domStyle, domConstruct, registry) {

	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		declaredClass : "dtc.ImageInfoDetail",
		templateString : dijitTemplate,
		options: {map: null, imageService: null},
		graphics:null,
		map: null,
		imageService: null,
		
		constructor: function(options, srcRefNode) {
			console.log('constructor start');
			declare.safeMixin(this.options, options);

			this.domNode = srcRefNode;

			this.map = this.options.map;
			this.imageService = this.options.imageService;
			console.log('constructor end');
		},
		
		startup: function() {
			console.log('startup1');
			var _self = this;
			
			//Check for the map
				if (!_self.map) {
					console.log('map required');
					_self.destroy();
					return;
				}
			console.log('2')
			//Build the UI
			
			//Wait for the map to load and then initialize
				if (_self.map.loaded) {
					console.log('3A')
					_self._init();
				} else {
					connect.connect(_self.map, "onLoad", function() {
						console.log('3b')
						_self._init();
					});
				}
			
		},
		
		_init: function() {
			console.log('4');
			var _self = this;
			require(['esri/layers/GraphicsLayer'], function(GraphicsLayer){
				//Create a graphics layer to hold image footprint
				console.log('5');
				_self.graphics = new GraphicsLayer();
				_self.map.addLayer(_self.graphics);	
			});
			
			//On an extent change, get the map center point and update the mosaic detail information
			console.log('5');
			//_self.map.on('extent-change', lang.hitch(_self, _self.updateInfo));			
		},
		
		_updateInfo: function() {
			console.log('6');
			var _self = this;
			if (!_self.imageService) {return};
			
			//Identify on the center of the map
			require(["esri/tasks/ImageServiceIdentifyParameters", "esri/tasks/ImageServiceIdentifyTask", ], function(ImageServiceIdentifyParameters, ImageServiceIdentifyTask){
				var params = new ImageServiceIdentifyParameters();
				params.geometry = _self.map.extent.getCenter();
				prarms.returnGeometry = true;
				if (_self.map.timeExtent) {
					params.timeExtent = _self.map.timeExtent;
				}
				var task = new ImageServiceIdentifyTask(_self.imageService.url);
				task.execute(params, lang.hitch(_self, _self.updateResult), lang.hitch(_self, _self.updateError));
				
			});
		},
		
		_updateResult: function(result) {
			console.log(result);
		},
		_updateError: function(error) {
			console.log(error);
		},
		
		//Custom setter for the imageService variable
		_setImageServiceAttr : function(/*string (ID)*/serviceID) {
			var service = null;
			//Get the service from the map
			if (serviceID) {
				service = this.map.getLayer(serviceID);
			}
			//Set the service
			this._set('imageService', service);
		},
		//Corresponding getter so that the get returns the id, which is what set expects
		//In nearly every case you should be able to widget.set('attribute', widget.get('attribute'))
		_getImageServiceAttr : function() {
			return (this.imageService.id)
		},
		
		

	});
});