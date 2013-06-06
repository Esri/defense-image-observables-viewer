/*
 * Mensuration Widget
 * Logic code from Ian Wilson's (Esri PS) Image Observables demo
 * Transformed into a widget (mostly AMD) for the Basic Viewer by James Tedrick
 *
 * Declaration syntax:
 * require(['dtc/Mensuration], function(Mensuration){
 * 	new Mensuration({map: <esri.Map>, imageService: <esri.layers.ArcGISImageServiceLayer>}, <string|domNode>domNode)
 * });
 *
 * Resources used by this widget:
 * 		-templates/Mensuration.html
 * 		-css/Mensuration.css
 * 		-assets/BaseTop.png
 * 		-assets/BaseTopShadow.png
 * 		-assets/TopTopShadow.png
 *
 */

define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dojo/_base/lang", 
		"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", 
		"dojo/text!./templates/Mensuration.html", 
		"dijit/form/Select", "dijit/form/DropDownButton", 
		"dojo/dom", "dojo/dom-attr", "dojo/dom-construct", "dijit/registry"], 
		function(	declare, connect, array, lang, 
					_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, 
					dijitTemplate, 
					Select, ToggleButton,
					dom, domAttr, domConstruct, registry) {
	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		declaredClass : "dtc.Mensuration",
		templateString : dijitTemplate,

		options : {
			map : null,
			imageService : null
		},
		//imageService: esri.layers.ArcGISImageServiceLayer
		imageService : null,
		//drawToolbar: esri.toolbars.Draw
		drawToolbar : null,
		//measureMethod: string -> esriMensurationHeightFromBaseAndTop|esriMensurationHeightFromBaseAndTopShadow|esriMensurationHeightFromTopAndTopShadow
		measureMethod : null,
		//measureLine: esri.geometry.Polyline (in this application, it will always be a 2 point line)
		measureLine : null,
		//units: string (Linear units from esri.Units)
		units : null,
		//_MENSURATIONOPTIONS: The types of mensuration operations that can be done.  Populates the buttons during startup
		_MENSURATIONOPTIONS : [{
			method : "esriMensurationHeightFromBaseAndTop",
			title : "Measure from the base of the building to the top of the building",
			iconClass : "iconBaseTop"
		}, {
			method : "esriMensurationHeightFromBaseAndTopShadow",
			title : "Measure from the base of the building to the shadow of the top of the building",
			iconClass : "iconBaseTopShadow"
		}, {
			method : "esriMensurationHeightFromTopAndTopShadow",
			title : "Measure from the top of the building to the shadow of the top of the building",
			iconClass : "iconTopTopShadow"
		}],
		//_UNITS: the types of valid (i.e., linear) units. Populates this.unitsSelect during startup
		_UNITS : [{
			value : "esriInches",
			label : "Inches"
		}, {
			value : "esriFeet",
			label : "Feet"
		}, {
			value : "esriYards",
			label : "Yards"
		}, {
			value : "esriMiles",
			label : "Miles"
		}, {
			value : "esriMillimeters",
			label : "Millimeters"
		}, {
			value : "esriCentimeters",
			label : "Centimeters"
		}, {
			value : "esriMeters",
			label : "Meters",
			selected : true
		}, {
			value : "esriKilometers",
			label : "Kilometers"
		}, {
			value : "esriDecimeters",
			label : "Decimeters"
		}],

		constructor : function(options, srcRefNode) {
			declare.safeMixin(this.options, options);

			this.domNode = srcRefNode;
			this.map = this.options.map;
			this.imageService = this.options.imageService;

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

		//Initialization code here (called by startup)
		_init : function() {
			var _self = this;
			//Load the stylesheet
			domConstruct.create("link", {
				rel : "stylesheet",
				type : "text/css",
				href : "dtc/css/Mensuration.css"
			}, document.getElementsByTagName('head')[0]);

			//Instantiate the draw toolbar and have it perform a measurement when the line is completed
			//I'm getting a multiple define error when I try to load via AMD (5/10/13)
			_self.drawToolbar = new esri.toolbars.Draw(this.map, {
				tooltipOffset : 50
			});
			connect.connect(_self.drawToolbar, "onDrawEnd", lang.hitch(_self, _self.measureBuilding));

			//Add the Units to the Select and set the default
			_self.unitsSelect.addOption(_self._UNITS);
			_self.units = 'esriMeters';
			
			//When we change the units, update the units and fire off a new mensuration request to update the result
			_self.unitsSelect.on("change", function(newValue) {
				_self.units = newValue;
				_self.measureBuilding(null);
			});

			//Buttons - using the _MENSURATIONOPTIONS to simplify construction code with a for loop
			require(["dijit/form/Button"], function(Button) {
				array.forEach(_self._MENSURATIONOPTIONS, function(option) {
					new Button({
						onClick : lang.hitch(_self, function() {
							_self.drawBuildingHeight(option.method);
						}),
						title : option.title,
						iconClass : option.iconClass
					}).placeAt(_self.buttonContainer);
				});
			});
		},

		//Custom setter for the imageService variable to determine whether the service supports mensuration
		_setImageServiceAttr : function(/*string (ID)*/serviceID) {
			var _self = this;
			var service = null;
			//Get the service from the map and find out if it's mensurable
			if (serviceID) {
				service = this.map.getLayer(serviceID);
				if (service.loaded === true) {
					_self._buttonSet(service);
				} else {
					service.on("load", function() {
						_self._buttonSet(service);
					});
				}
			}
			//Set the service
			this._set('imageService', service);
		},
		//Corresponding getter so that the get returns the id, which is what set expects
		//In nearly every case you should be able to widget.set('attribute', widget.get('attribute'))
		_getImageServiceAttr : function() {
			return (this.imageService.id)
		},

		//Detect whether the image service supports mensuration
		_buttonSet : function(service) {
			var isNotMensurable = true;
			if (service.hasOwnProperty('capabilities')) {
				isNotMensurable = (service.capabilities.indexOf('Mensuration') < 0);
			}

			//If the service doesn't support mensuration, disable the buttons
			var buttons = registry.findWidgets(this.buttonContainer);
			array.forEach(buttons, function(button) {
				button.set('disabled', isNotMensurable);
			});
		},

		//Begin measurement- change the cursor and show the line being drawn
		drawBuildingHeight : function(method) {
			this.resetHeights();
			this.measureMethod = method;
			this.measureLine = null;
			this.map.setMapCursor('crosshair');
			this.drawToolbar.activate(esri.toolbars.Draw.LINE);
		},

		measureBuilding : function(result) {
			var _self = this;
			this.drawToolbar.deactivate();
			var imageServiceLayer = this.imageService.url;
			if (result) {
				_self.measureLine = result;
			}
			if (!_self.measureLine) {
				return;
			}
			var fromPoint = _self.measureLine.getPoint(0, 0);
			var toPoint = _self.measureLine.getPoint(0, 1);
			domAttr.set('output.info', "innerHTML", 'Measuring building heights...');
			require(["dojo/json", "esri/request"], function(JSON, esriRequest) {
				var contentObj = {
					fromGeometry : JSON.stringify(fromPoint.toJson()),
					toGeometry : JSON.stringify(toPoint.toJson()),
					geometryType : 'esriGeometryPoint',
					measureOperation : _self.measureMethod,
					linearUnit : _self.units,
					mosaicRule : '',
					pixelSize : '',
					f : 'json'
				};
				new esriRequest({
					url : lang.replace("{0}/{1}", [imageServiceLayer, 'measure']),
					content : contentObj,
					callbackParamName : "callback",
					load : lang.hitch(_self, _self.onResult),
					error : lang.hitch(_self, _self.onResultError)
				});
			});
		},

		onResult : function(response) {
			domAttr.set('output.info', "innerHTML", '');
			// ANALYSIS RESULTS - MEASUREMENTS //
			var measurement = response.height;
			//console.log(measurement);
			// NUMBER FORMATTING //
			var numFormat = {
				places : 2
			};
			// UPDATE MEASUREMENT UI //
			require(['dojo/number'], function(number) {
				domAttr.set('output.MensurationHeight', "innerHTML", number.format(Math.abs(measurement.value), numFormat));
				domAttr.set('output.HeightUncertainty', "innerHTML", number.format(measurement.uncertainty, numFormat));
			});
			// DISPLAY MEASUREMENT GRAPHICS //
			this.map.setMapCursor('default');

		},
		onResultError : function(error) {
			domAttr.set('output.info', "innerHTML", error.message);
			this.map.setMapCursor('default');
		},

		resetHeights : function() {
			// RESET MEASUREMENT UI //
			domAttr.set('output.MensurationHeight', "innerHTML", '0.00');
			domAttr.set('output.HeightUncertainty', "innerHTML", '0.00');
			domAttr.set('output.info', "innerHTML", '');
		}
	});

});
