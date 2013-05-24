/*
 * ImagePropertiesControl
 * James Tedrick (DTC)
 * 5/10/2013
 * 
 */

define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
"dojo/text!./templates/ImagePropertiesControl.html", 
"dijit/form/HorizontalSlider", "dijit/form/Select", "dijit/form/CheckBox",
"dojo/dom", "dojo/dom-style", "dojo/dom-construct", "dijit/registry"], function(declare, connect, array, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, dijitTemplate, 
	HorizontalSlider, Select, CheckBox,
	dom, domStyle, domConstruct, registry) {
	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		declaredClass : "dtc.ImagePropertiesControl",
		templateString : dijitTemplate,

		options : {
			imageService : null,
			map: null
		},
		rasterFunction: null,

		constructor : function(options, srcRefNode) {
			declare.safeMixin(this.options, options);

			this.domNode = srcRefNode;
			this.map = this.options.map;
			this.imageService = this.options.imageService;

		},

		startup : function() {
			var _self = this;
			
			_self._init();

		},

		//Private Variables

		_init : function() {
			var _self = this;
			//Load the stylesheet
			domConstruct.create("link", {
				rel : "stylesheet",
				type : "text/css",
				href : "dtc/css/imagePropertiesControl.css"
			}, document.getElementsByTagName('head')[0]);

		},
		
		//Reset the controls to their normal levels and remove the raster function
		reset: function(){
			
		},
		
		//Custom setter for the imageService variable to determine what options are supported
		_setImageServiceAttr : function(/*string (ID)*/serviceID) {
			//Get the service from the map 
			var service = this.map.getLayer(serviceID);

			//Set the service
			this._set('imageService', service);
		},
		//Corresponding getter so that the get returns the id, which is what set expects
		//In nearly every case you should be able to widget.set('attribute', widget.get('attribute'))
		_getImageServiceAttr : function() {
			return (this.imageService.id)
		},

		_updateBrightness : function() {
			
		}, 
		
		_updateContrast : function() {
			
		},
		
		_updateGamma: function() {
			
		},
		
		_toggleDRA: function() {
			
		},
		
		_updateChannel: function() {
			
		}

	});

});
