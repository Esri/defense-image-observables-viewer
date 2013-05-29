/*
 * ImagePropertiesControl
 * James Tedrick (DTC)
 * 5/10/2013
 * 
 */

define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dojo/_base/lang", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
"dojo/text!./templates/ImagePropertiesControl.html", 
"dijit/form/HorizontalSlider", "dijit/form/Select", "dijit/form/CheckBox",
"dojo/dom", "dojo/dom-style", "dojo/dom-construct", "dijit/registry"], function(declare, connect, array, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, dijitTemplate, 
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
			
			//Event handlers
			_self.brightnessSlider.on(	"change", 	lang.hitch(_self, _self._updateBrightness));
			_self.contrastSlider.on(	"change", 	lang.hitch(_self, _self._updateContrast));
			_self.gammaSlider.on(		"change", 	lang.hitch(_self, _self._updateGamma));
			_self.DRAcheck.on(			"change", 	lang.hitch(_self, _self.updateDRA));
			_self.redSelect.on(			"change", 	lang.hitch(_self, _self._updateChannels));
			_self.greenSelect.on(		"change", 	lang.hitch(_self, _self._updateChannels));
			_self.blueSelect.on(		"change", 	lang.hitch(_self, _self._updateChannels));
		},
		
		//Reset the controls to their normal levels and return channels to default
		reset: function(){
			
		},
		
		//Custom setter for the imageService variable to determine what options are supported
		_setImageServiceAttr : function(/*string (ID)*/serviceID) {
			var _self = this;
			var service = null;
			//Get the service from the map 
			if (serviceID) {
				service = this.map.getLayer(serviceID);
				//Check to see if the service is loaded and we can access properties before setting them
				if (service.loaded === true) {
					_self._set('imageService', service);
					lang.hitch(_self, _self._setChannels(service));
				} else {
					service.on('load', function(){
						_self._set('imageService', service);
						lang.hitch(_self, _self._setChannels(service));
					});
				}
			} else {
				_self._set('imageService', null);
			}
		},
		//Corresponding getter so that the get returns the id, which is what set expects
		//In nearly every case you should be able to widget.set('attribute', widget.get('attribute'))
		_getImageServiceAttr : function() {
			return (this.imageService.id)
		},

		_setChannels: function(service) {
			var _self = this;
			var bandList = [];
			for (var i=0; i < service.bandCount; i++)
			{
				bandList.push(i);
			}
			_self.redSelect.addOption(bandList);
			_self.greenSelect.addOption(bandList);
			_self.blueSelect.addOption(bandList);
			//default is 0,1,2 ?
			if (service.bandIds === null) {
				_self.redSelect.set('value', 0);
				_self.greenSelect.set('value', 1);
				_self.blueSelect.set('value', 2);
			} else {
				_self.redSelect.set('value', service.bandIds[0]);
				_self.greenSelect.set('value', service.bandIds[1]);
				_self.blueSelect.set('value', service.bandIds[2]);
			}
		},
		
		_updateBrightness : function() {
			console.log(this.brightnessSlider.value);
			this.imageService.setBrightnessValue(this.brightnessSlider.value);
		}, 
		
		_updateContrast : function() {
			console.log('Contrast');
			console.log(this.contrastSlider.value);
			this.imageService.setContrastValue(this.contrastSlider.value);

		},
		
		_updateGamma: function() {
			console.log('Gamma');
		},
		
		_toggleDRA: function() {
			console.log('DRA');
		},
		
		_updateChannels: function() {
			console.log('updateChannels')
		}

	});

});
