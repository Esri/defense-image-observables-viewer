/*
 * Image Information Details Widget
 * 
 * Declaration Syntax:
 * require(['dtc/ImageInfoDetails], function(ImageInfoDetails){
 * 	new ImageInfoDetails({map: <esri.Map>, imageService: <esri.layers.ArcGISImageServiceLayer>}, <string|domNode>domNode)
 * });
 * 
 * Resources used by this widget:
 * 		-templates/ImageInfoDetails.html
 * 		-css/ImageInfoDetails.css
 * 		-assets/crosshair.png
 * 
 */

define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dojo/_base/lang", "dojo/on",
"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", 
"dojo/text!./templates/ImageInfoDetail.html", 
"dijit/form/ToggleButton","dijit/form/CheckBox",
"dojo/dom", "dojo/dom-style", "dojo/dom-construct", "dijit/registry"], 
function(declare, connect, array, lang, on,
	_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, 
	dijitTemplate, 
	Button, CheckBox,
	dom, domStyle, domConstruct, registry) {

	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		declaredClass : "dtc.ImageInfoDetail",
		templateString : dijitTemplate,
		options: {map: null, imageService: null},
		//map: esri.Map
		map: null,
		//imageService: esri.layers.ArcGISImageServiceLayer
		imageService: null,
		//graphics: esri.layers.GraphicsLayer
		graphics:null,
		//imageOutline: esri.Graphic (footprint of image)
		imageOutline: null,
		//fields: String[]
		fields: null,
		//copyText: string
		copyText: null,

		constructor: function(options, srcRefNode) {
			declare.safeMixin(this.options, options);

			this.domNode = srcRefNode;

			this.map = this.options.map;
			this.imageService = this.options.imageService;
		},
		
		startup: function() {
			var _self = this;
			
			//Check for the map
				if (!_self.map) {
					console.log('map required');
					_self.destroy();
					return;
				}
			
			//Wait for the map to load and then initialize
				if (_self.map.loaded) {
					_self._init();
				} else {
					connect.connect(_self.map, "onLoad", function() {
						_self._init();
					});
				}
			
		},
		
		//Initialization code (called by startup once the map is loaded)
		_init: function() {
			var _self = this;
			
			//Insert the stylesheet
			domConstruct.create("link", {
				rel : "stylesheet",
				type : "text/css",
				href : "dtc/css/ImageInfoDetail.css"
			}, document.getElementsByTagName('head')[0])

			//Create a graphics layer to hold image footprint			
			require(['esri/layers/GraphicsLayer'], function(GraphicsLayer){
				_self.graphics = new GraphicsLayer();
				_self.graphics.setVisibility(false);
				_self.map.addLayer(_self.graphics);	
			});
			
			//Set up the default image symbol
			require(["esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "dojo/_base/Color"], function(SFS, SLS, Color){
				_self.imageOutline = new SFS(SFS.STYLE_SOLID, 
					new SLS(SLS.STYLE_SOLID, new Color([255,255,0]), 2), 
					new Color([255,255,0, 0.25]));
			});
			
			/*
			 * Event Handlers
			 */
			//On an extent change, get the map center point and update the mosaic detail information
			_self.map.on('extent-change', lang.hitch(_self, _self._onExtentChange));
			//Allow the user to click on the map and get image info
			_self.btnIdentify.on('click', lang.hitch(_self, _self._startIdentify));
			//Toggle the footprint on/off
			_self.chkFootprint.on('change', lang.hitch(_self, _self._toggleFootprint));
			//Copy/download the metadata text.  Stubbed for future use
			//_self.btnCopy.on('click', lang.hitch(_self, _self._getData));
		},
		
		//Get the new center of the map and send the point to _updateInfo
		_onExtentChange: function() {
			if(this.chkAutoUpdate.get('value') === 'on') {
				var point = this.map.extent.getCenter();
				this._updateInfo(point);
			}
		},
		
		//Modify the cursor and set up the response for a map click
		_startIdentify: function() {
			var _self = this;
			_self.map.setMapCursor('crosshair');
			on.once(this.map, 'click', lang.hitch(_self, _self._onIdentifyClick));
		},
		
		//Revert the cursor and send the point to _updateInfo
		_onIdentifyClick: function(e) {
			this.map.setMapCursor('default');
			this._updateInfo(e.mapPoint);
		},
		
		//Based on the input point, run an identify against the selected image service
		_updateInfo: function(point) {
			var _self = this;
			_self._clearInfo();
			if (_self.imageService == null) {
				_self.updateError('No image service selected');
				return
			};
			
			//Identify on the center of the map
			require(["esri/tasks/ImageServiceIdentifyParameters", "esri/tasks/ImageServiceIdentifyTask", ], function(ImageServiceIdentifyParameters, ImageServiceIdentifyTask){
				var params = new ImageServiceIdentifyParameters();
				params.geometry = point;
				params.mosaicRule = (_self.imageService.mosaicRule === null) ? _self.imageService.defaultMosaicRule : _self.imageService.mosaicRule; 
				params.returnGeometry = true;
				if (_self.map.timeExtent) {
					params.timeExtent = _self.map.timeExtent;
				}
				var task = new ImageServiceIdentifyTask(_self.imageService.url);
				task.execute(params, lang.hitch(_self, _self._updateResult), lang.hitch(_self, _self._updateError));
			});
		},
		
		_updateResult: function(result) {
			var _self = this;

			//Find the visible image from the catalog results
			var visibleItem;
			array.forEach(result.catalogItemVisibilities, function(isVis, index){
				if (isVis === 1) visibleItem = index;
			});
			if (visibleItem == null) {
				_self._updateError("No images found.")
				return
			}

			//add the shape to the graphics layer
			var thisImage = result.catalogItems.features[visibleItem];
			thisImage.setSymbol(_self.imageOutline);
			_self.graphics.add(thisImage);
			
			//and insert the text
			var htmlText = "<div class='details'>";
			_self.copyText = "";
			
			var fieldNames = Object.keys(_self.fields)
			var excludeFields = [result.catalogItems.objectIdFieldName, 'Shape', 'Shape_Area', 'Shape_Length']
			array.forEach(fieldNames, function(name){
				if (excludeFields.indexOf(name)< 0){
					var l = _self.fields[name]['alias'];
					var v;
					//If it's a coded value domain, use the domain value
					if (_self.fields[name].domain !== null && _self.fields[name].domain.type === 'codedValue') {
						array.forEach(_self.fields[name].domain.codedValues, function(codedValue){
							if (codedValue.code === thisImage.attributes[name]) {
								v = codedValue.name;
							}
						});
					} else {
						//Otherwise, get the string representation
						v = String(thisImage.attributes[name])
					}
					//add to our outputs
					htmlText +="<span class='field'>"+ l + ":</span>"
					htmlText += "<span class='value'>"+ v + "</span>"
					_self.copyText += l + '\t' + v + '\n';
				}
			});
			//Add details to the DOM
			htmlText += '</table>'
			_self.imageDetails.innerHTML = htmlText;
		},
		
		//Clear out the information on a new request
		_clearInfo: function() {
			this.graphics.clear();
			this.copyText = ""
			this.imageDetails.innerHTML = "";
		},
		
		//Present the error to the user
		_updateError: function(error) {
			this.imageDetails.innerHTML = "An error has occured.<br />" + error
			console.log(error);
		},
		
		//Turn the footprint or off
		_toggleFootprint: function(){
			this.graphics.setVisibility(this.chkFootprint.get('value') == 'on')
		},
		
		//_getData: copy/download the metadata text.  Stubbed for future use
		_getData: function(){
			
		},
				
		//Custom setter for the imageService variable
		_setImageServiceAttr : function(/*string (ID)*/serviceID) {
			var _self = this;
			var service = null;
			//Get the service from the map
			if (serviceID) {
				service = this.map.getLayer(serviceID);
				//Conduct a query to get the field info (they do not come with identify)
				require(["esri/tasks/query", "esri/tasks/QueryTask"], function(Query, Task){
					var q = new Query();
					//We don't need actually results, just the overhead
					q.where = '1=0';
					q.returnGeometry = false;
					q.outFields = ['*']
					var qt = new Task(service.url)
					qt.execute(q, function(fSet){
						_self.fields = {};
						array.forEach(fSet.fields, function(fieldInfo){
							_self.fields[fieldInfo.name] = fieldInfo
						});
						//Now that we've loaded the field information, let's load up the image info that we're seeing
						lang.hitch(_self, _self.updateInfo());
					});
				});
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