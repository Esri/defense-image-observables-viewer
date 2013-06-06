define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array", "dojo/_base/lang", "dojo/on",
"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", 
"dojo/text!./templates/ImageInfoDetail.html", 
"dijit/form/Button","dijit/form/CheckBox",
"dojo/dom", "dojo/dom-style", "dojo/dom-construct", "dijit/registry"], 
function(declare, connect, array, lang, on,
	_WidgetBase,   _TemplatedMixin, _WidgetsInTemplateMixin, 
	dijitTemplate, 
	Button, CheckBox,
	dom, domStyle, domConstruct, registry) {

	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		declaredClass : "dtc.ImageInfoDetail",
		templateString : dijitTemplate,
		options: {map: null, imageService: null},
		graphics:null,
		map: null,
		imageService: null,
		imageOutline: null,
		fields: null,
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
			
			//On an extent change, get the map center point and update the mosaic detail information
			_self.map.on('extent-change', lang.hitch(_self, _self._onExtentChange));
			_self.btnIdentify.on('click', lang.hitch(_self, _self._startIdentify));
			_self.chkFootprint.on('change', lang.hitch(_self, _self._toggleFootprint));
		},
		
		_onExtentChange: function() {
			var _self = this;
			if(this.chkAutoUpdate.get('value') === 'on') {
				var point = _self.map.extent.getCenter();
				_self._updateInfo(point);
			}
		},
		
		_startIdentify: function() {
			var _self = this;
			_self.map.setMapCursor('crosshair');
			on.once(this.map, 'click', lang.hitch(_self, _self._onIdentifyClick));
		},
		_onIdentifyClick: function(e) {
			this.map.setMapCursor('default');
			console.log(e);
			this._updateInfo(e.mapPoint);
		},
		
		_updateInfo: function(point) {
			var _self = this;
			lang.hitch(_self, _self._clearInfo);
			if (_self.imageService == null) {return};
			
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
				//TODO Add Error Info
				return
			}

			//add the shape to the graphics layer
			var thisImage = result.catalogItems.features[visibleItem];
			thisImage.setSymbol(_self.imageOutline);
			_self.graphics.add(thisImage);
			
			//and insert the text
			var htmlText = "<table class='details'>";
			_self.copyText = "";
			
			var fieldNames = Object.keys(_self.fields)
			var excludeFields = [result.catalogItems.objectIdFieldName, 'Shape', 'Shape_Area', 'Shape_Length']
			array.forEach(fieldNames, function(name){
				if (excludeFields.indexOf(name)< 0){
					var l = _self.fields[name]['alias'];
					var v;
					//If it's a coded value domain, use it
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
					htmlText +="<tr><td class='field'>"+ l + ":</td></tr>"
					htmlText += "<tr><td class='value'>"+ v + "</td></tr>"
					_self.copyText += l + '\t' + v + '\n';
				}
			});
			//Add details to the DOM
			htmlText += '</table>'
			_self.imageDetails.innerHTML = htmlText;
		},
		
		_clearInfo: function() {
			_self.graphics.clear();
			_self.imageDetails.innerHTML = "";
		},
		
		_updateError: function(error) {
			console.log(error);
		},
		
		_toggleFootprint: function(){
			this.graphics.setVisibility(this.chkFootprint.get('value') == 'on')
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
					var q = new Query;
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