/*
 * ImagePropertiesControl
 * James Tedrick (DTC)
 * 5/10/2013
 * 
 */

define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dojo/_base/lang", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
"dojo/text!./templates/ImagePropertiesControl.html", 
"dijit/form/HorizontalSlider", "dijit/form/Select", "dijit/form/CheckBox", "dijit/form/Button", 
"esri/layers/RasterFunction", 
"dojo/dom-construct" 
], function(declare, connect, array, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, dijitTemplate, 
	HorizontalSlider, Select, CheckBox, Button,
	RasterFunction,
	domConstruct ) {
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
				href : "dtc/css/ImagePropertiesControl.css"
			}, document.getElementsByTagName('head')[0]);
			
			//Event handlers
			_self.brightnessSlider.on(	"change", 	lang.hitch(_self, _self._updateBrightness));
			_self.contrastSlider.on(	"change", 	lang.hitch(_self, _self._updateContrast));
			_self.gammaSlider.on(		"change", 	lang.hitch(_self, _self._updateRasterFunction));
			_self.DRAcheck.on(			"change", 	lang.hitch(_self, _self._updateRasterFunction));
			_self.redSelect.on(			"change", 	lang.hitch(_self, _self._updateChannels));
			_self.greenSelect.on(		"change", 	lang.hitch(_self, _self._updateChannels));
			_self.blueSelect.on(		"change", 	lang.hitch(_self, _self._updateChannels));
			_self.resetButton.on(		"click",	lang.hitch(_self, _self._reset));
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
					_self._resetUI();
					lang.hitch(_self, _self._setChannels(service));
				} else {
					service.on('load', function(){
						_self._set('imageService', service);
						_self._resetUI();
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
			//Get bandIds
			var bandList = [];
			for (var i=0; i < service.bandCount; i++)
			{
				bandList.push({label:String(i), value: String(i)});
			}
			//For each dropdown, clear the options, load the bands in and select based on r,g,b index
			array.forEach([this.redSelect, this.greenSelect, this.blueSelect], function(thisSelect, index){
				thisSelect.removeOption(thisSelect.getOptions());
				var thisBandList = lang.clone(bandList);
				thisSelect.addOption(thisBandList);
				if (service.bandIds == null) {
					thisSelect.set('value', index);
				} else {
					thisSelect.set('value', thisBandList[service.bandIds[index]]);
				}
			});
		},
		
		_updateBrightness : function() {
			//Use the setBrightnessValue function of the ImageLayerEx
			//This happens dynamically in browser
			this.imageService.setBrightnessValue(this.brightnessSlider.value);
			this.brightnessValue.innerHTML = this.brightnessSlider.value;
		}, 
		
		_updateContrast : function() {
			//Use the setContrastValue function of the ImageLayerEx
			//This happens dynamically in browser
			this.imageService.setContrastValue(this.contrastSlider.value);
			this.contrastValue.innerHTML = this.contrastSlider.value;
		},
		
		_updateRasterFunction: function() {
			//The raster function controls Gamma and DRA
			var rf = new RasterFunction();
			//Function name is one of a set of predefined function names, in this case we're using stretch
			rf.functionName = 'Stretch';
			var arguments = {};
			//Check for DRA (when checked, the value is 'on')
			arguments.DRA = (this.DRAcheck.get('value') == 'on');
			//Gamma takes an array - possibly seperate values for R,G,B
			arguments.Gamma = [this.gammaSlider.value, this.gammaSlider.value, this.gammaSlider.value];
			rf.arguments = arguments;
			rf.variableName = "Raster";
			//Set the image service's rendering rule as the raster function
			this.imageService.setRenderingRule(rf);
			this.gammaValue.innerHTML = this.gammaSlider.value.toFixed(1);
		},
		
		_updateChannels: function() {
			//Set the band IDs based on dropdown values
			//Values are strings, so use parseInt
			this.imageService.setBandIds([
					parseInt(this.redSelect.get('value')),
					parseInt(this.greenSelect.get('value')),
					parseInt(this.blueSelect.get('value'))
			]);
		},
		
		_reset: function() {
			//Reset all options on the image
			this.imageService.suspend();
			this.imageService.setBrightnessValue(0);
			this.imageService.setContrastValue(0);
			this.imageService.setBandIds([null,null,null]);
			this.imageService.setRenderingRule(new RasterFunction());
			this.imageService.resume();
			this.imageService.refresh();
			//Reset the UI values
			this.redSelect.set('value', 0);
			this.greenSelect.set('value', 1);
			this.blueSelect.set('value', 2);
			this._resetUI();  //This is used in the imageService setter, hence the breakout
		},
		_resetUI: function(){
			this.brightnessSlider.set('value', 0);
			this.contrastSlider.set('value', 0);
			this.gammaSlider.set('value', 1);
			this.DRAcheck.set('value', false);
		}

	});

});
