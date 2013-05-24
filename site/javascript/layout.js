dojo.require("esri.widgets");
dojo.require("esri.arcgis.utils");
dojo.require("dojox.layout.FloatingPane");

dojo.require("utilities.custommenu");

dojo.require("apl.ElevationsChart.Pane");

//JT - add imageryPane
dojo.require("dtc.ImageryPane");

var map;
var clickHandler, clickListener;
var editLayers = [], editorWidget;
var webmapExtent;
var configOptions;

var measure;

function initMap(options) {
       /*Patch to fix issue with floating panes used to display the measure and time panel. They
       moved slightly each time the window was toggled due to this bug
       http://bugs.dojotoolkit.org/ticket/5849
       */
       dojox.layout.FloatingPane.prototype.show = function(callback){
        var anim = dojo.fadeIn({node:this.domNode, duration:this.duration,
            beforeBegin: dojo.hitch(this,function(){
            this.domNode.style.display = ""; this.domNode.style.visibility = "visible"; if (this.dockTo && this.dockable) { this.dockTo._positionDock(null); } if (typeof callback == "function") { callback(); } this._isDocked = false; if (this._dockNode) {
                this._dockNode.destroy(); this._dockNode = null;
            }
            })
        }).play(); this.resize(dojo.coords(this.domNode));
    }



    configOptions = options;
    //handle config options with different name 
    if (options.link1text !== undefined) configOptions.link1.text = options.link1text;
    if (options.link1url !== undefined) configOptions.link1.url = options.link1url;
    if (options.link2text !== undefined) configOptions.link2.text = options.link2text;
    if (options.link2url !== undefined) configOptions.link2.url = options.link2url;
    if (options.placefinderfieldname !== undefined) configOptions.placefinder.singlelinefieldname = options.placefinderfieldname;
    if (options.searchextent !== undefined) configOptions.placefinder.currentExtent = options.searchextent;
    if (options.customlogoimage !== undefined) configOptions.customlogo.image = options.customlogoimage;
    if (options.customlogolink !== undefined) configOptions.customlogo.link = options.customlogolink;
    if (options.basemapgrouptitle !== undefined && options.basemapgroupowner !== undefined) {
        configOptions.basemapgroup.title = options.basemapgrouptitle;
        configOptions.basemapgroup.owner = options.basemapgroupowner;
    };
    if (configOptions.leftpanelvisible) {
        configOptions.leftPanelVisibility = (configOptions.leftpanelvisible === 'true' || configOptions.leftpanelvisible === true) ? true : false;
    }

    configOptions.displaytitle = (configOptions.displaytitle === "true" || configOptions.displaytitle === true) ? true : false;
    configOptions.displaymeasure = (configOptions.displaymeasure === "true" || configOptions.displaymeasure === true) ? true : false;
    configOptions.displayshare = (configOptions.displayshare === "true" || configOptions.displayshare === true) ? true : false;
    configOptions.displaybasemaps = (configOptions.displaybasemaps === "true" || configOptions.displaybasemaps === true) ? true : false;
    configOptions.displayoverviewmap = (configOptions.displayoverviewmap === "true" || configOptions.displayoverviewmap === true) ? true : false;
    configOptions.displayeditor = (configOptions.displayeditor === "true" || configOptions.displayeditor === true) ? true : false;
    configOptions.displaylegend = (configOptions.displaylegend === "true" || configOptions.displaylegend === true) ? true : false;
    configOptions.displaysearch = (configOptions.displaysearch === "true" || configOptions.displaysearch === true) ? true : false;
    configOptions.displaybookmarks = (configOptions.displaybookmarks === "true" || configOptions.displaybookmarks === true) ? true : false;
    configOptions.displaylayerlist = (configOptions.displaylayerlist === "true" || configOptions.displaylayerlist === true) ? true : false;
    configOptions.displaydetails = (configOptions.displaydetails === "true" || configOptions.displaydetails === true) ? true : false;
    configOptions.displaytimeslider = (configOptions.displaytimeslider === "true" || configOptions || displaytimeslider === true) ? true : false;
    configOptions.displayelevation = (configOptions.displayelevation === "true" || configOptions.displayelevation === true) ? true : false;
    configOptions.displayprint = (configOptions.displayprint === "true" || configOptions.displayprint === true) ? true : false;
    configOptions.showelevationdifference = (configOptions.showelevationdifference === "true" || configOptions.showelevationdifference === true) ? true : false;

	//JT add display imagetools
	configOptions.displayimagetools = (configOptions.displayimagetools === "true" || configOptions.displayimagetools === true) ? true : false;

    configOptions.displayscalebar = (configOptions.displayscalebar === "true" || configOptions.displayscalebar === true) ? true : false;
    configOptions.displayslider = (configOptions.displayslider === "true" || configOptions.displayslider === true) ? true : false;
    configOptions.constrainmapextent = (configOptions.constrainmapextent === "true" || configOptions.constrainmapextent === true) ? true : false;
    configOptions.embed = (configOptions.embed === "true" || configOptions.embed === true) ? true : false;
    configOptions.leftpanelvisible = (configOptions.leftpanelvisible === "true" || configOptions.leftpanelvisible === true) ? true : false;

    createApp();
}

function createApp() {
    //load the specified theme 
    var ss = document.createElement("link");
    ss.type = "text/css";
    ss.rel = "stylesheet";
    ss.href = "css/" + configOptions.theme + ".css";
    document.getElementsByTagName("head")[0].appendChild(ss);

    //will this app be embedded - if so turn off title and links
    if (configOptions.embed || configOptions.displaytitle === false) {
        configOptions.displaytitle = false;
        configOptions.link1.url = "";
        configOptions.link2.url = "";
    } else {
        dojo.addClass(dojo.body(), 'notembed');
        dojo.query("html").addClass("notembed");
    }

    //create the links for the top of the application if provided
    if (configOptions.link1.url && configOptions.link2.url) {
        if (configOptions.displaytitle === false) {
            //size the header to fit the links
            dojo.style(dojo.byId("header"), "height", "25px");
        }
        esri.show(dojo.byId('nav'));
        dojo.create("a", {
            href: configOptions.link1.url,
            target: '_blank',
            innerHTML: configOptions.link1.text
        }, 'link1List');
        dojo.create("a", {
            href: configOptions.link2.url,
            target: '_blank',
            innerHTML: configOptions.link2.text
        }, 'link2List');
    }


    //create the map and enable/disable map options like slider, wraparound, esri logo etc
    if (configOptions.displayslider) {
        configOptions.displaySlider = true;
    } else {
        configOptions.displaySlider;
    }


    if (configOptions.gcsextent) {
        //make sure the extent is valid minx,miny,maxx,maxy
        var extent = configOptions.gcsextent;
        if (extent) {
            var extArray = extent.split(",");
            if (dojo.some(extArray, function (value) {
                return isNaN(value);
            })) {
                getItem(configOptions.webmap);
            } else {
                if (extArray.length == 4) {
                    getItem(configOptions.webmap, extArray);
                } else {
                    createMap(configOptions.webmap);
                }
            }
        }
    } else {
        createMap(configOptions.webmap);
    }
}

function getItem(item, extArray) {
    //get the item and update the extent then create the map 
    var deferred = esri.arcgis.utils.getItem(item);

    deferred.addCallback(function (itemInfo) {
        if (extArray) {
            itemInfo.item.extent = [
                [parseFloat(extArray[0]), parseFloat(extArray[1])],
                [parseFloat(extArray[2]), parseFloat(extArray[3])]
            ];
        }
        createMap(itemInfo);
    });

    deferred.addErrback(function (error) {
        alert(i18n.viewer.errors.createMap + " : " + dojo.toJson(error.message));
    });
}

function createMap(webmapitem) {
    var mapDeferred = esri.arcgis.utils.createMap(webmapitem, "map", {
        mapOptions: {
            slider: configOptions.displaySlider,
            sliderStyle: 'small',
            wrapAround180: !configOptions.constrainmapextent,
            showAttribution: true,
            //set wraparound to false if the extent is limited.
            logo: !configOptions.customlogo.image //hide esri logo if custom logo is provided
        },
        ignorePopups: false,
        bingMapsKey: configOptions.bingmapskey
    });

    mapDeferred.addCallback(function (response) {
        //add webmap's description to details panel 
        if (configOptions.description === "") {
            if (response.itemInfo.item.description !== null) {
                configOptions.description = response.itemInfo.item.description;
            }
        }
        initialExtent = response.map.extent;
        if (configOptions.extent) {
            var extent = new esri.geometry.Extent(dojo.fromJson(configOptions.extent));
            initialExtent = extent;
        }

        configOptions.owner = response.itemInfo.item.owner;
        document.title = configOptions.title || response.itemInfo.item.title;
        //add a title
        if (configOptions.displaytitle === "true" || configOptions.displaytitle === true) {
            configOptions.title = configOptions.title || response.itemInfo.item.title;
            dojo.create("p", {
                id: 'webmapTitle',
                innerHTML: configOptions.title
            }, "header");
            dojo.style(dojo.byId("header"), "height", "38px");
        } else if (!configOptions.link1.url && !configOptions.link2.url) {
            //no title or links - hide header
            esri.hide(dojo.byId('header'));
            dojo.addClass(dojo.body(), 'embed');
            dojo.query("html").addClass("embed");
        }


        //get the popup click handler so we can disable it when measure tool is active
        clickHandler = response.clickEventHandle;
        clickListener = response.clickEventListener;
        map = response.map;

        //Constrain the extent of the map to the webmap's initial extent
        if (configOptions.constrainmapextent) {
            webmapExtent = response.map.extent.expand(1.5);
        }



        if (map.loaded) {
            initUI(response);
        } else {
            dojo.connect(map, "onLoad", function () {
                initUI(response);
            });
        }
        map.setExtent(initialExtent);
    });

    mapDeferred.addErrback(function (error) {
        alert(i18n.viewer.errors.createMap + " : " + dojo.toJson(error.message));
    });
}

function initUI(response) {
    adjustPopupSize();
    var layers = response.itemInfo.itemData.operationalLayers;


    //constrain the extent
    if (configOptions.constrainmapextent) {
        var basemapExtent = map.getLayer(map.layerIds[0]).fullExtent.expand(1.5);
        //create a graphic with a hole over the web map's extent. This hole will allow
        //the web map to appear and hides the rest of the map to limit the visible extent to the webmap.
        var clipPoly = new esri.geometry.Polygon(map.spatialReference);
        clipPoly.addRing([
            [basemapExtent.xmin, basemapExtent.ymin],
            [basemapExtent.xmin, basemapExtent.ymax],
            [basemapExtent.xmax, basemapExtent.ymax],
            [basemapExtent.xmax, basemapExtent.ymin],
            [basemapExtent.xmin, basemapExtent.ymin]
        ]);
        //counter-clockwise to add a hole
        clipPoly.addRing([
            [webmapExtent.xmin, webmapExtent.ymin],
            [webmapExtent.xmax, webmapExtent.ymin],
            [webmapExtent.xmax, webmapExtent.ymax],
            [webmapExtent.xmin, webmapExtent.ymax],
            [webmapExtent.xmin, webmapExtent.ymin]
        ]);

        var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(), new dojo.Color("white"));

        var maxExtentGraphic = new esri.Graphic(clipPoly, symbol);

        map.graphics.add(maxExtentGraphic);
    }



    //add a custom logo to the map if provided
    if (configOptions.customlogo.image) {
        esri.show(dojo.byId('logo'));
        //if a link isn't provided don't make the logo clickable
        if (configOptions.customlogo.link) {
            var link = dojo.create('a', {
                href: configOptions.customlogo.link,
                target: '_blank'
            }, dojo.byId('logo'));

            dojo.create('img', {
                src: configOptions.customlogo.image
            }, link);
        } else {
            dojo.create('img', {
                id: 'logoImage',
                src: configOptions.customlogo.image
            }, dojo.byId('logo'));
            //set the cursor to the default instead of the pointer since the logo is not clickable
            dojo.style(dojo.byId('logo'), 'cursor', 'default');
        }

    }


    if (configOptions.displayscalebar === true) {
        //add scalebar
        var scalebar = new esri.dijit.Scalebar({
            map: map,
            scalebarUnit: i18n.viewer.main.scaleBarUnits //metric or english
        });
    }

    //Add/Remove tools depending on the config settings or url parameters
    if (configOptions.displayprint === true) {
        addPrint();

    }
    if (configOptions.displaylayerlist === true) {
        addLayerList(layers);
    }
    if (configOptions.displaybasemaps === true) {
        //add menu driven basemap gallery if embed = true
        if (configOptions.embed) {
            addBasemapGalleryMenu();
        } else {
            addBasemapGallery();
        }
    }

    if (configOptions.displaymeasure === true) {
        addMeasurementWidget();
    } else {
        esri.hide(dojo.byId('floater'));
    }
    if (configOptions.displayelevation && configOptions.displaymeasure) {

        esri.show(dojo.byId('bottomPane'));
        createElevationProfileTools();
    }
    if (configOptions.displaybookmarks === true) {
        addBookmarks(response);
    }
    if (configOptions.displayoverviewmap === true) {
        //add the overview map - with initial visibility set to false.
        addOverview(false);
    }

    //do we have any editable layers - if not then set editable to false
    editLayers = hasEditableLayers(layers);
    if (editLayers.length === 0) {
        configOptions.displayeditor = false;
    }

    //do we have any operational layers - if not then set legend to false
    var layerInfo = esri.arcgis.utils.getLegendLayers(response);
    if (layerInfo.length === 0) {
        configOptions.displaylegend = false;
    }
    
    //JT - Code to detect Image Service Layers for Pane should go here?
    if (configOptions.displayimagetools === true) {
    	esri.show(dojo.byId('rightPane'));
    	addImageryPane();
    }


    if (displayLeftPanel()) {

        //create left panel
        var bc = dijit.byId('leftPane');
        esri.show(dojo.byId('leftPane'));
        var cp = new dijit.layout.ContentPane({
            id: 'leftPaneHeader',
            region: 'top',
            style: 'height:10px;',
            content: esri.substitute({
                close_title: i18n.panel.close.title,
                close_alt: i18n.panel.close.label
            }, '<div style="float:right;clear:both;" id="paneCloseBtn"><a title=${close_title} alt=${close_alt} href="JavaScript:hideLeftPanel();"><img src=images/closepanel.png border="0"/></a></div>')
        });
        bc.addChild(cp);
        var cp2 = new dijit.layout.StackContainer({
            id: 'stackContainer',
            region: 'center',
            style: 'height:98%;'
        });
        bc.addChild(cp2);
        if (configOptions.embed) {
            dojo.style(dojo.byId("leftPane"), "width", configOptions.leftpanewidth);
        } else {
            dojo.style(dojo.byId("leftPane"), "width", configOptions.leftpanewidth + "px");
        }
        //Add the Editor Button and Panel
        if (configOptions.displayeditor == 'true' || configOptions.displayeditor === true) {
            addEditor(editLayers); //only enabled if map contains editable layers
        }



        //Add the Detail button and panel
        if (configOptions.displaydetails === true && configOptions.description !== "") {

            var detailTb = new dijit.form.ToggleButton({
                showLabel: true,
                label: i18n.tools.details.label,
                title: i18n.tools.details.title,
                checked: true,
                iconClass: 'esriDetailsIcon',
                id: 'detailButton'
            }, dojo.create('div'));
            dojo.byId('webmap-toolbar-left').appendChild(detailTb.domNode);

            dojo.connect(detailTb, 'onClick', function () {
                navigateStack('detailPanel');
            });

            var detailCp = new dijit.layout.ContentPane({
                title: i18n.tools.details.title,
                selected: true,
                region: 'center',
                id: "detailPanel"
            });


            //set the detail info
            detailCp.set('content', configOptions.description);


            dijit.byId('stackContainer').addChild(detailCp);
            dojo.addClass(dojo.byId('detailPanel'), 'panel_content');
            navigateStack('detailPanel');
        }
        if (configOptions.displaylegend === true) {
            addLegend(layerInfo);
        }
        if (configOptions.leftPanelVisibility === false) {
            hideLeftPanel();
        }
        dijit.byId('mainWindow').resize();

        resizeMap();

    }


    //Create the search location tool
    if (configOptions.displaysearch === true) {
        createSearchTool();
    } else {
        esri.hide(dojo.byId('webmap-toolbar-right'));
    }

    //add the time slider if the layers are time-aware 
    if (configOptions.displaytimeslider === true) {
        if (response.itemInfo.itemData.widgets && response.itemInfo.itemData.widgets.timeSlider) {
            addTimeSlider(response.itemInfo.itemData.widgets.timeSlider.properties);
        } else {
            //check to see if we have time aware layers 
            var timeLayers = hasTemporalLayer(layers);
            if (timeLayers.length > 0) {
                //do we have time aware layers? If so create time properties
                var fullExtent = getFullTimeExtent(timeLayers);
                var timeProperties = {
                    'startTime': fullExtent.startTime,
                        'endTime': fullExtent.endTime,
                        'thumbCount': 2,
                        'thumbMovingRate': 2000,
                        'timeStopInterval': findDefaultTimeInterval(fullExtent)
                }
                addTimeSlider(timeProperties);
            } else {
                configOptions.displaytimeslider = false;
                esri.hide(dojo.byId('timeFloater'));
            }

        }
    }

    //Display the share dialog if enabled 
    if (configOptions.displayshare === true) {
        createSocialLinks();
    }

    //resize the border container 
    dijit.byId('bc').resize();

    resizeMap(); //resize the map in case any of the border elements have changed


}

function displayLeftPanel() {
    //display the left panel if any of these options are enabled. 
    var display = false;
    if (configOptions.displaydetails && configOptions.description !== '') {
        display = true;
    }
    if (configOptions.displaylegend) {
        display = true;
    }
    if (configOptions.displayeditor) {
        display = true;
    }
    return display;
}

function resizeMap() {
    if (map) {
        map.resize(true);
        map.reposition();
    }
}


//select panels in the stack container. The stack container is used to organize content 
//in the left panel (editor, legend, details)
function navigateStack(label) {
    //display the left panel if its hidden
    showLeftPanel();

    //select the appropriate container 
    dijit.byId('stackContainer').selectChild(label);

    //hide or show the editor 
    if (label === 'editPanel') {
        createEditor();
    } else {
        destroyEditor();
    }

    //toggle the other buttons
    var buttonLabel = '';
    switch (label) {
        case 'editPanel':
            buttonLabel = 'editButton';
            break;
        case 'legendPanel':
            buttonLabel = 'legendButton';
            break;
        case 'detailPanel':
            buttonLabel = 'detailButton';
            break;
    }
    toggleToolbarButtons(buttonLabel);
}

//Utility functions that handles showing and hiding the left panel. Hide occurs when 
//the x (close) button is clicked. 
function showLeftPanel() {
    //display the left panel if hidden
    var leftPaneWidth = dojo.style(dojo.byId("leftPane"), "width");
    if (leftPaneWidth === 0) {
        if (configOptions.embed) {
            dojo.style(dojo.byId("leftPane"), "width", configOptions.leftpanewidth);
        } else {
            dojo.style(dojo.byId("leftPane"), "width", configOptions.leftpanewidth + "px");
        }
        dijit.byId("mainWindow").resize();
    }
}

function hideLeftPanel() {
    //close the left panel when x button is clicked
    var leftPaneWidth = dojo.style(dojo.byId("leftPane"), "width");
    if (leftPaneWidth === 0) {
        leftPaneWidth = configOptions.leftpanewidth;
    }
    dojo.style(dojo.byId("leftPane"), "width", "0px");
    dijit.byId('mainWindow').resize();
    resizeMap();
    //uncheck the edit, detail and legend buttons
    setTimeout(function () {
        toggleToolbarButtons('');

    }, 100);

}

function toggleToolbarButtons(label) {
    var buttons = ['detailButton', 'editButton', 'legendButton'];
    dojo.forEach(buttons, function (button) {
        if (dijit.byId(button)) {
            if (button === label) {
                dijit.byId(label).set('checked', true);
            } else {
                dijit.byId(button).set('checked', false);
            }
        }
    });

}

//Create links for sharing the app via social networking 
function updateLinkUrls() {
    //get the current map extent
    var extent = "";
    extent = "&extent=" + dojo.toJson(map.extent.toJson());

    var appUrl = (document.location.href.split("?"));
    var link = appUrl[0] + "?" + extent;
    if (appUrl[1]) {
        link += "&" + appUrl[1];
    }


    var mapTitle = "Web Map";
    if (dojo.byId("webmapTitle")) {
        mapTitle = encodeURIComponent(dojo.byId("webmapTitle").innerHTML);
    }

    //Get URL to add to email (bitly support removed 3/2013)
    var url = encodeURIComponent(link);
    createLink(mapTitle, url);

    //enable menu items now that links are working
    var menu = dijit.byId('socialMenu');
    dojo.forEach(menu.getChildren(), function (item) {
        item.set("disabled", false);
    });

    dijit.byId("shareButton").focus();

}

function createLink(mapTitle, url) {
    dojo.byId('mailLink').href = "mailto:?subject=" + mapTitle + "&body=Check out this map: %0D%0A " + url;
    dojo.byId('facebookLink').href = "http://www.facebook.com/sharer.php?u=" + url + "&t=" + mapTitle;
    dojo.byId('twitterLink').href = "http://www.twitter.com/home?status=" + mapTitle + "+" + url;
}

function getBasemapGroup() {
    //get the basemap group if a custom one is defined or if a hosted or portal app with a custom group.

    var basemapGroup = null;
    if (configOptions.basemapgroup.title && configOptions.basemapgroup.owner) {
        basemapGroup = {
            "owner": configOptions.basemapgroup.owner,
            "title": configOptions.basemapgroup.title
        }
    }else if(configOptions.basemapgroup.id){
        basemapGroup = {
            "id": configOptions.basemapgroup.id
        }
    }
    return basemapGroup;

}

function addBasemapGalleryMenu() {
    //This option is used for embedded maps so the gallery fits well with apps of smaller sizes. 

    var ht = map.height / 2;
    var cp = new dijit.layout.ContentPane({
        id: 'basemapGallery',
        style: "height:" + ht + "px;width:190px;"
    });

    var basemapMenu = new dijit.Menu({
        id: 'basemapMenu'
    });

    //if a bing maps key is provided - display bing maps too.
    var basemapGallery = new esri.dijit.BasemapGallery({
        showArcGISBasemaps: true,
        basemapsGroup: getBasemapGroup(),
        bingMapsKey: configOptions.bingmapskey,
        map: map
    });
    cp.set('content', basemapMenu.domNode);

    dojo.connect(basemapGallery, 'onLoad', function () {
        var menu = dijit.byId("basemapMenu")
        dojo.forEach(basemapGallery.basemaps, function (basemap) {
            //Add a menu item for each basemap, when the menu items are selected
            menu.addChild(new utilities.custommenu({
                label: basemap.title, 
                iconClass: "menuIcon",
                iconSrc: basemap.thumbnailUrl,
                onClick: function(){
                    basemapGallery.select(basemap.id);
                }
            }));
        });
    });




    var button = new dijit.form.DropDownButton({
        label: i18n.tools.basemap.label,
        id: "basemapBtn",
        iconClass: "esriBasemapIcon",
        title: i18n.tools.basemap.title,
        dropDown: cp
    });

    dojo.byId('webmap-toolbar-center').appendChild(button.domNode);

    dojo.connect(basemapGallery, "onSelectionChange", function () {
        //close the basemap window when an item is selected
        //destroy and recreate the overview map  - so the basemap layer is modified.
        destroyOverview();
        dijit.byId('basemapBtn').closeDropDown();
    });

    basemapGallery.startup();
}


//Add the basemap gallery widget to the application. 
function addBasemapGallery() {

    var cp = new dijit.layout.ContentPane({
        id: 'basemapGallery',
        style: "max-height:448px;width:380px;"
    });

    //if a bing maps key is provided - display bing maps too.
    var basemapGallery = new esri.dijit.BasemapGallery({
        showArcGISBasemaps: true,
        basemapsGroup: getBasemapGroup(),
        bingMapsKey: configOptions.bingmapskey,
        map: map
    }, dojo.create('div'));


    cp.set('content', basemapGallery.domNode);


    var button = new dijit.form.DropDownButton({
        label: i18n.tools.basemap.label,
        id: "basemapBtn",
        iconClass: "esriBasemapIcon",
        title: i18n.tools.basemap.title,
        dropDown: cp
    });

    dojo.byId('webmap-toolbar-center').appendChild(button.domNode);

    dojo.connect(basemapGallery, "onSelectionChange", function () {
        //close the basemap window when an item is selected
        //destroy and recreate the overview map  - so the basemap layer is modified.
        destroyOverview();
        dijit.byId('basemapBtn').closeDropDown();
    });

    basemapGallery.startup();
}

//add any bookmarks to the application
function addBookmarks(info) {
    //does the web map have any bookmarks
    if (info.itemInfo.itemData.bookmarks) {
        var bookmarks = new esri.dijit.Bookmarks({
            map: map,
            bookmarks: info.itemInfo.itemData.bookmarks
        }, dojo.create("div"));


        dojo.connect(bookmarks, "onClick", function () {
            //close the bookmark window when an item is clicked
            dijit.byId('bookmarkButton').closeDropDown();
        });


        var cp = new dijit.layout.ContentPane({
            id: 'bookmarkView'
        });
        cp.set('content', bookmarks.bookmarkDomNode);
        var button = new dijit.form.DropDownButton({
            label: i18n.tools.bookmark.label,
            id: "bookmarkButton",
            iconClass: "esriBookmarkIcon",
            title: i18n.tools.bookmark.title,
            dropDown: cp
        });

        dojo.byId('webmap-toolbar-center').appendChild(button.domNode);
    }

}
//Create a menu with a list of operational layers. Each menu item contains a check box
//that allows users to toggle layer visibility. 
function addLayerList(layers) {
    var layerList = buildLayerVisibleList(layers);
    if (layerList.length > 0) {
        //create a menu of layers
        layerList.reverse();
        var menu = new dijit.Menu({
            id: 'layerMenu'
        });
        dojo.forEach(layerList, function (layer) {
            menu.addChild(new dijit.CheckedMenuItem({
                label: layer.title,
                checked: layer.visible,
                onChange: function () {
                    if (layer.layer.featureCollection) {
                        //turn off all the layers in the feature collection even
                        //though only the  main layer is listed in the layer list 
                        dojo.forEach(layer.layer.featureCollection.layers, function (layer) {
                            layer.layerObject.setVisibility(!layer.layerObject.visible);
                        });
                    } else {
                        layer.layer.setVisibility(!layer.layer.visible);
                    }

                }
            }));
        });


        var button = new dijit.form.DropDownButton({
            label: i18n.tools.layers.label,
            id: "layerBtn",
            iconClass: "esriLayerIcon",
            title: i18n.tools.layers.title,
            dropDown: menu
        });

        dojo.byId('webmap-toolbar-center').appendChild(button.domNode);
    }
}

//build a list of layers for the toggle layer list - this list
//is slightly different than the legend because we don't want to list lines,points,areas etc for each
//feature collection type. 
function buildLayerVisibleList(layers) {
    var layerInfos = [];
    dojo.forEach(layers, function (mapLayer, index) {
        if (mapLayer.featureCollection && !mapLayer.layerObject) {
            if (mapLayer.featureCollection.layers) {
                //add the first layer in the layer collection... not all  - when we turn off the layers we'll 
                //turn them all off 
                if (mapLayer.featureCollection.layers) {
                    layerInfos.push({
                        "layer": mapLayer,
                            "visible": mapLayer.visibility,
                            "title": mapLayer.title
                    });
                }
            }
        } else if (mapLayer.layerObject) {
            layerInfos.push({
                layer: mapLayer.layerObject,
                visible: mapLayer.layerObject.visible,
                title: mapLayer.title
            });
        }
    });
    return layerInfos;
}

function addPrint() {
    var layoutOptions = {
        'authorText': configOptions.owner,
        'titleText': configOptions.title,
        'scalebarUnit': (i18n.viewer.main.scaleBarUnits === 'english') ? 'Miles' : 'Kilometers',
        'legendLayers': []
    };

    //default template options
     var templates = dojo.map(configOptions.printlayouts, function (layout) {
            layout.layoutOptions = layoutOptions;
            return layout;
    });
    if(configOptions.printlayout){ //when true use all print options
        //get all the layouts from the service. 
        var printInfo = esri.request({
            url: configOptions.helperServices.printTask.url,
            content:{"f": "json"},
            callbackParamName:"callback"
        },{useProxy:true});
        printInfo.then(function(response){


            var layoutTemplate, templateNames, mapOnlyIndex, templates;

            layoutTemplate = dojo.filter(response.parameters, function(param, idx) {
              return param.name === "Layout_Template";
            });
            
            if ( layoutTemplate.length == 0 ) {
              console.log("print service parameters name for templates must be \"Layout_Template\"");
              return;
            }
            templateNames = layoutTemplate[0].choiceList;

            // remove the MAP_ONLY template then add it to the end of the list of templates 
            mapOnlyIndex = dojo.indexOf(templateNames, "MAP_ONLY");
            if ( mapOnlyIndex > -1 ) {
              var mapOnly = templateNames.splice(mapOnlyIndex, mapOnlyIndex + 1)[0];
              templateNames.push(mapOnly);
            }
            
            // create a print template for each choice
            templates = dojo.map(templateNames, function(name) {
              var plate = new esri.tasks.PrintTemplate();
              plate.layout = plate.label = name;
              plate.format = configOptions.printformat;
              plate.layoutOptions = layoutOptions;
              return plate;
            });
            updatePrint(templates);
        }, function(error){
            updatePrint(templates)
        });


    }else{
        updatePrint(templates);
    }
}
function updatePrint(templates){
        // print dijit
    var printer = new esri.dijit.Print({
        map: map,
        templates: templates,
        url: configOptions.helperServices.printTask.url
    }, dojo.create('span'));

    dojo.query('.esriPrint').addClass('esriPrint');

    dojo.byId('webmap-toolbar-center').appendChild(printer.printDomNode);

    printer.startup();
}
//create a floating pane to hold the measure widget and add a button to the toolbar
//that allows users to hide/show the measurement widget.
function addMeasurementWidget() {
    var fp = new dojox.layout.FloatingPane({
        title: i18n.tools.measure.title,
        resizable: false,
        dockable: false,
        closable: false,
        style: "position:absolute;top:0;left:50px;width:245px;height:175px;z-index:100;visibility:hidden;",
        id: 'floater'
    }, dojo.byId('floater'));
    fp.startup();

    var titlePane = dojo.query('#floater .dojoxFloatingPaneTitle')[0];
    //add close button to title pane
    var closeDiv = dojo.create('div', {
        id: "closeBtn",
        innerHTML: esri.substitute({
            close_title: i18n.panel.close.title,
            close_alt: i18n.panel.close.label
        }, '<a alt=${close_alt} title=${close_title} href="JavaScript:toggleMeasure();"><img  src="images/close.png"/></a>')
    }, titlePane);

    measure = new esri.dijit.Measurement({
        map: map,
        id: 'measureTool'
    }, 'measureDiv');

    measure.startup();


    var toggleButton = new dijit.form.ToggleButton({
        label: i18n.tools.measure.label,
        title: i18n.tools.measure.title,
        id: "toggleButton",
        iconClass: "esriMeasureIcon"
    });

    dojo.connect(toggleButton, "onClick", function () {
        toggleMeasure();
    });

    dojo.byId('webmap-toolbar-center').appendChild(toggleButton.domNode);
}

//Show/hide the measure widget when the measure button is clicked.
function toggleMeasure() {
    if (dojo.byId('floater').style.visibility === 'hidden') {
        
        dijit.byId('floater').show();

        disablePopups(); //disable map popups otherwise they interfere with measure clicks
    } else {
        dijit.byId('floater').hide();
        enablePopups(); //enable map popup windows
        dijit.byId('toggleButton').set('checked', false); //uncheck the measure toggle button
        //deactivate the tool and clear the results
        var measure = dijit.byId('measureTool');
        measure.clearResult();
        if (measure.activeTool) {
            measure.setTool(measure.activeTool, false);
        }
    }

}

function addOverview(isVisible) {
    //attachTo:bottom-right,bottom-left,top-right,top-left
    //opacity: opacity of the extent rectangle - values between 0 and 1. 
    //color: fill color of the extnet rectangle
    //maximizeButton: When true the maximize button is displayed
    //expand factor: The ratio between the size of the ov map and the extent rectangle.
    //visible: specify the initial visibility of the ovmap.
    var overviewMapDijit = new esri.dijit.OverviewMap({
        map: map,
        attachTo: "top-right",
        opacity: 0.5,
        color: "#000000",
        expandfactor: 2,
        maximizeButton: false,
        visible: isVisible,
        id: 'overviewMap'
    });
    overviewMapDijit.startup();
}

function destroyOverview() {
    var ov = dijit.byId('overviewMap');
    if (ov) {
        var vis = ov.visible;
        ov.destroy();
        addOverview(vis);
    }
}

//Add the legend to the application - the legend will be 
//added to the left panel of the application. 
function addLegend(layerInfo) {

    var legendTb = new dijit.form.ToggleButton({
        showLabel: true,
        label: i18n.tools.legend.label,
        title: i18n.tools.legend.title,
        checked: true,
        iconClass: 'esriLegendIcon',
        id: 'legendButton'
    }, dojo.create('div'));

    dojo.byId('webmap-toolbar-left').appendChild(legendTb.domNode);

    dojo.connect(legendTb, 'onClick', function () {
        navigateStack('legendPanel');
    });
    var legendCp = new dijit.layout.ContentPane({
        title: i18n.tools.legend.title,
        selected: true,
        region: 'center',
        id: "legendPanel"
    });

    dijit.byId('stackContainer').addChild(legendCp);
    dojo.addClass(dojo.byId('legendPanel'), 'panel_content');

    var legendDijit = new esri.dijit.Legend({
        map: map,
        layerInfos: layerInfo
    }, dojo.create('div'));

    dojo.byId('legendPanel').appendChild(legendDijit.domNode);

    navigateStack('legendPanel');
    if (dojo.isIE === 8) {
        setTimeout(function () {
            legendDijit.startup();
        }, 100);
    } else {
        legendDijit.startup();
    }

}


//Determine if the webmap has any editable layers  
function hasEditableLayers(layers) {
    var layerInfos = [];
    dojo.forEach(layers, function (mapLayer, index) {
        if (mapLayer.layerObject) {
          if(mapLayer.layerObject instanceof esri.layers.FeatureLayer && mapLayer.layerObject.isEditable()){
            if(mapLayer.capabilities && mapLayer.capabilities === "Query"){
                //is capabilities set to Query if so then editing was disabled in the web map so 
                //we won't add to editable layers.
            }else{
                layerInfos.push({
                    'featureLayer': mapLayer.layerObject
                });
            }

            }
        }


    });
    return layerInfos;
}



//if the webmap contains editable layers add an editor button to the map
//that adds basic editing capability to the app.
function addEditor(editLayers) {

    //create the button that show/hides the editor 
    var editTb = new dijit.form.ToggleButton({
        showLabel: true,
        label: i18n.tools.editor.label,
        title: i18n.tools.editor.title,
        checked: false,
        iconClass: 'esriEditIcon',
        id: 'editButton'
    }, dojo.create('div'));

    //add the editor button to the left side of the application toolbar 
    dojo.byId('webmap-toolbar-left').appendChild(editTb.domNode);
    dojo.connect(editTb, 'onClick', function () {
        navigateStack('editPanel');
    });

    //create the content pane that holds the editor widget 
    var editCp = new dijit.layout.ContentPane({
        title: i18n.tools.editor.title,
        selected: "true",
        id: "editPanel",
        region: "center"
    });

    //add this to the existing div
    dijit.byId('stackContainer').addChild(editCp);
    navigateStack('editPanel');
    //create the editor if the legend and details panels are hidden - otherwise the editor
    //will be created when the edit button is clicked.
    if ((configOptions.displaydetails === false) && (configOptions.displaylegend === false)) {
        createEditor();
    }
}

//Functions to create and destroy the editor. We do this each time the edit button is clicked. 
function createEditor() {

    if (editorWidget) {
        return;
    }
    if (editLayers.length > 0) {
        //create template picker 
        var templateLayers = dojo.map(editLayers, function (layer) {
            return layer.featureLayer;
        });

        var eDiv = dojo.create("div", {
            id: "editDiv"
        });
        dojo.byId('editPanel').appendChild(eDiv);
        var editLayerInfo = editLayers;
         //add field infos if applicable - this will contain hints if defined in the popup. Also added logic to hide fields that have visible = false. The popup takes 
         //care of this for the info window but not for the edit window. 
         dojo.forEach(editLayerInfo, function(layer){
            if(layer.featureLayer && layer.featureLayer.infoTemplate && layer.featureLayer.infoTemplate.info && layer.featureLayer.infoTemplate.info.fieldInfos){
             //only display visible fields 
                var fields = layer.featureLayer.infoTemplate.info.fieldInfos;
                var fieldInfos = [];
                dojo.forEach(fields, function(field){
                  if(field.visible){
                    fieldInfos.push(field);
                  }
                });
                layer.fieldInfos = fieldInfos;
            }
         });
        var templatePicker = new esri.dijit.editing.TemplatePicker({
            featureLayers: templateLayers,
            rows: 'auto',
            columns: 'auto',
            grouping: true,
            showTooltip: false,
            style: 'height:98%;width:' + (configOptions.leftpanewidth - 4) + 'px;'
        }, 'editDiv');
        templatePicker.startup();

        var settings = {
            map: map,
            templatePicker: templatePicker,
            layerInfos: editLayerInfo,
            toolbarVisible: false
        };
        var params = {
            settings: settings
        };
        editorWidget = new esri.dijit.editing.Editor(params);
        editorWidget.startup();

        disablePopups();
    }

}

function destroyEditor() {
    if (editorWidget) {
        editorWidget.destroy();
        editorWidget = null;
        enablePopups();
    }

}
//Utility methods used to enable/disable popups. For example when users are measuring locations
//on the map we want to turn popups off so they don't appear when users click to specify a measure area. 
function enablePopups() {
    if (clickListener) {
        clickHandler = dojo.connect(map, "onClick", clickListener);
    }
}

function disablePopups() {
    if (clickHandler) {
        dojo.disconnect(clickHandler);
    }
}

//Create menu of social network sharing options (Email, Twitter, Facebook)
function createSocialLinks() {
    //extend the menu item so the </a> links are clickable 
    dojo.provide('dijit.anchorMenuItem');

    dojo.declare('dijit.anchorMenuItem', dijit.MenuItem, {
        _onClick: function (evt) {
            this.firstChild.click(this, evt);
        }
    });
    //create a dropdown button to display the menu
    //build a menu with a list of sharing options 
    var menu = new dijit.Menu({
        id: 'socialMenu',
        style: 'display:none;'
    });

    menu.addChild(new dijit.anchorMenuItem({
        label: esri.substitute({
            email_text: i18n.tools.share.menu.email.label
        }, "<a id='mailLink' target='_blank' class='iconLink'>${email_text}</a>"),
        iconClass: "emailIcon",
        disabled: true
    }));
    menu.addChild(new dijit.anchorMenuItem({
        label: esri.substitute({
            facebook_text: i18n.tools.share.menu.facebook.label
        }, "<a id='facebookLink' target='_blank' class='iconLink'>${facebook_text}</a>"),
        iconClass: "facebookIcon",
        disabled: true
    }));
    menu.addChild(new dijit.anchorMenuItem({
        label: esri.substitute({
            twitter_text: i18n.tools.share.menu.twitter.label
        }, "<a id='twitterLink' target='_blank' class='iconLink'>${twitter_text}</a>"),
        iconClass: "twitterIcon",
        disabled: true
    }));
    //create dropdown button to display menu
    var menuButton = new dijit.form.DropDownButton({
        label: i18n.tools.share.label,
        id: 'shareButton',
        title: i18n.tools.share.title,
        dropDown: menu,
        iconClass: 'esriLinkIcon'
    });
    menuButton.startup();

    dojo.byId('webmap-toolbar-center').appendChild(menuButton.domNode);
    dojo.connect(menuButton, 'onClick', function () {
        updateLinkUrls();
    });
}

//Uses the Geocoder Widget (from 3.3) 
function createSearchTool() {
    //support pre 3.3 config settings 
    var geocodeOptions = {};

    if (configOptions.placefinder.placeholder === "") {
        geocodeOptions.placeholder = i18n.tools.search.title;
    } else {
        geocodeOptions.placeholder = configOptions.placefinder.placeholder;
    }
    if (configOptions.placefinder.currentExtent) {
        geocodeOptions.searchExtent = map.extent;
    }
    if (configOptions.placefinder.countryCode !== "") {
        geocodeOptions.sourceCountry = configOptions.placefinder.countryCode;
    }


    var geocoder = [];
    var gurl = null;

    if(configOptions.placefinder.url !== ""){
        gurl = configOptions.placefinder.url;
    }
    if(configOptions.helperServices && configOptions.helperServices.geocode && configOptions.helperServices.geocode[0] && configOptions.helperServices.geocode[0].url){
        if(configOptions.helperServices.geocode[0].url.indexOf("/World/GeocodeServer") === -1){
            gurl = configOptions.helperServices.geocode[0].url
        }
        if(configOptions.helperServices.geocode[0].singleLineFieldName !== ""){
            configOptions.placefinder.singlelinefieldname = configOptions.helperServices.geocode[0].singleLineFieldName;
        }
    }
    if(gurl !== null){
        //custom locator defined 
        var customOptions = {
            url: gurl,
            name: "Custom ",
            outFields: "*",
            singleLineFieldName: configOptions.placefinder.singlelinefieldname
        };
        if(geocodeOptions.placeholder){
            customOptions.placeholder = geocodeOptions.placeholder
        }
        geocoder.push(customOptions)
        geocodeOptions = false;
    }

    var geocoder = new esri.dijit.Geocoder({
        map: map,
        geocoders: geocoder,
        theme: "simpleGeocoder",
        arcgisGeocoder: geocodeOptions
    }, "webmap-toolbar-right");
    geocoder.startup();



    dojo.connect(geocoder, "onFindResults", function (results) {
        dojo.some(results.results, function (result) {
            //clear existing selection 
            map.infoWindow.clearFeatures();
            //display a popup for the first result 
            map.infoWindow.setTitle(i18n.tools.search.title);
            map.infoWindow.setContent(result.name);
            map.infoWindow.show(result.feature.geometry);
            return true;

        });
    });
    dojo.connect(geocoder, "onClear", function () {
        if (map.infoWindow.isShowing) {
            map.infoWindow.hide();
        }
    });
}
//Add the time slider if the webmap has time-aware layers 
function addTimeSlider(timeProperties) {
    esri.show(dojo.byId('timeFloater'));
    //add time button and create floating panel
    var fp = new dojox.layout.FloatingPane({
        title: i18n.tools.time.title,
        resizable: false,
        dockable: false,
        closable: false,
        style: "position:absolute;top:30px;left:0;width:70%;height:150px;z-index:100;visibility:hidden;",
        id: 'timeFloater'
    }, dojo.byId('timeFloater'));
    fp.startup();



    //add close button to title pane
    var titlePane = dojo.query('#timeFloater .dojoxFloatingPaneTitle')[0];
    var closeDiv = dojo.create('div', {
        id: "closeBtn",
        innerHTML: esri.substitute({
            close_title: i18n.panel.close.title,
            close_alt: i18n.panel.close.label
        }, '<a alt=${close_alt} title=${close_title} href="JavaScript:toggleTime(null);"><img  src="images/close.png"/></a>')
    }, titlePane);


    //add a button to the toolbar to toggle the time display 
    var toggleButton = new dijit.form.ToggleButton({
        label: i18n.tools.time.label,
        title: i18n.tools.time.title,
        id: "toggleTimeButton",
        iconClass: "esriTimeIcon"
    });

    dojo.connect(toggleButton, "onClick", function () {
        toggleTime(timeProperties);
    });

    dojo.byId('webmap-toolbar-center').appendChild(toggleButton.domNode);


}

function formatDate(date, datePattern) {
    return dojo.date.locale.format(date, {
        selector: 'date',
        datePattern: datePattern
    });
}

function hasTemporalLayer(layers) {
    var timeLayers = [];
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (layer.layerObject) {
            if (layer.layerObject.timeInfo && layer.layerObject.visible) {
                timeLayers.push(layer.layerObject);
            }
        }
    }
    return timeLayers;
}

function getFullTimeExtent(timeLayers) {
    var fullTimeExtent = null;
    dojo.forEach(timeLayers, function (layer) {
        var timeExtent = layer.timeInfo.timeExtent;
        if (!fullTimeExtent) {
            fullTimeExtent = new esri.TimeExtent(new Date(timeExtent.startTime.getTime()), new Date(timeExtent.endTime.getTime()));
        } else {
            if (fullTimeExtent.startTime > timeExtent.startTime) {
                fullTimeExtent.startTime = new Date(timeExtent.startTime.getTime());
            }
            if (fullTimeExtent.endTime < timeExtent.endTime) {
                fullTimeExtent.endTime = new Date(timeExtent.endTime.getTime());
            }
        }
    });
    // round off seconds
    fullTimeExtent.startTime = new Date(fullTimeExtent.startTime.getFullYear(), fullTimeExtent.startTime.getMonth(), fullTimeExtent.startTime.getDate(), fullTimeExtent.startTime.getHours(), fullTimeExtent.startTime.getMinutes(), 0, 0);
    fullTimeExtent.endTime = new Date(fullTimeExtent.endTime.getFullYear(), fullTimeExtent.endTime.getMonth(), fullTimeExtent.endTime.getDate(), fullTimeExtent.endTime.getHours(), fullTimeExtent.endTime.getMinutes() + 1, 1, 0);
    return fullTimeExtent;
}

function findDefaultTimeInterval(fullTimeExtent) {
    var interval;
    var units;
    var timePerStop = (fullTimeExtent.endTime.getTime() - fullTimeExtent.startTime.getTime()) / 10;
    var century = 1000 * 60 * 60 * 24 * 30 * 12 * 100;
    if (timePerStop > century) {
        interval = Math.round(timePerStop / century);
        units = "esriTimeUnitsCenturies";
    } else {
        var decade = 1000 * 60 * 60 * 24 * 30 * 12 * 10;
        if (timePerStop > decade) {
            interval = Math.round(timePerStop / decade);
            units = "esriTimeUnitsDecades";
        } else {
            var year = 1000 * 60 * 60 * 24 * 30 * 12;
            if (timePerStop > year) {
                interval = Math.round(timePerStop / year);
                units = "esriTimeUnitsYears";
            } else {
                var month = 1000 * 60 * 60 * 24 * 30;
                if (timePerStop > month) {
                    interval = Math.round(timePerStop / month);
                    units = "esriTimeUnitsMonths";
                } else {
                    var week = 1000 * 60 * 60 * 24 * 7;
                    if (timePerStop > week) {
                        interval = Math.round(timePerStop / week);
                        units = "esriTimeUnitsWeeks";
                    } else {
                        var day = 1000 * 60 * 60 * 24;
                        if (timePerStop > day) {
                            interval = Math.round(timePerStop / day);
                            units = "esriTimeUnitsDays";
                        } else {
                            var hour = 1000 * 60 * 60;
                            if (timePerStop > hour) {
                                interval = Math.round(timePerStop / hour);
                                units = "esriTimeUnitsHours";
                            } else {
                                var minute = 1000 * 60;
                                if (timePerStop > minute) {
                                    interval = Math.round(timePerStop / minute);
                                    units = "esriTimeUnitsMinutes";
                                } else {
                                    var second = 1000;
                                    if (timePerStop > second) {
                                        interval = Math.round(timePerStop / second);
                                        units = "esriTimeUnitsSeconds";
                                    } else {
                                        interval = Math.round(timePerStop);
                                        units = "esriTimeUnitsMilliseconds";
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    var timeStopInterval = {};
    timeStopInterval.units = units;
    timeStopInterval.interval = interval;
    return timeStopInterval;


}

function toggleTime(timeProperties) {
    if (dojo.byId('timeFloater').style.visibility === 'hidden') {
        //create and display the time slider 
        createTimeSlider(timeProperties);
        dijit.byId('timeFloater').show();
        dijit.byId('mainWindow').resize();
        resizeMap();
    } else {
        //stop the time slider if its playing then destroy and hide the time slider 
        if (dijit.byId('timeSlider').playing) {
            dijit.byId('timeSlider').pause();
        }
        dijit.byId('timeSlider').destroy();
        map.setTimeExtent(null);
        map.setTimeSlider(null);

        dijit.byId('timeFloater').hide();
        dijit.byId('toggleTimeButton').set('checked', false);
    }
}

function createTimeSlider(timeProperties) {
    var startTime = timeProperties.startTime;
    var endTime = timeProperties.endTime;
    var fullTimeExtent = new esri.TimeExtent(new Date(startTime), new Date(endTime));

    map.setTimeExtent(fullTimeExtent);
    var timeView = dojo.create('div', {
        id: 'timeViewContent'
    });
    dijit.byId('timeFloater').set('content', timeView);

    //create a time slider and a label to hold date details and add to the floating time panel
    var timeSlider = new esri.dijit.TimeSlider({
        style: "width: 100%;",
        id: "timeSlider"
    }, dojo.create('div'));

    var timeSliderLabel = dojo.create('div', {
        id: 'timeSliderLabel'
    }, dojo.byId('timeViewContent'));

    dojo.addClass('timeSliderLabel', 'timeLabel');

    dojo.place(timeSlider.domNode, dojo.byId('timeViewContent'), "last");


    map.setTimeSlider(timeSlider);
    //Set time slider properties 
    timeSlider.setThumbCount(timeProperties.thumbCount);
    timeSlider.setThumbMovingRate(timeProperties.thumbMovingRate);
    //define the number of stops
    if (timeProperties.numberOfStops) {
        timeSlider.createTimeStopsByCount(fullTimeExtent, timeProperties.numberOfStops);
    } else {
        timeSlider.createTimeStopsByTimeInterval(fullTimeExtent, timeProperties.timeStopInterval.interval, timeProperties.timeStopInterval.units);
    }
    //set the thumb index values if the count = 2
    if (timeSlider.thumbCount === 2) {
        timeSlider.setThumbIndexes([0, 1]);
    }

    dojo.connect(timeSlider, 'onTimeExtentChange', function (timeExtent) {
        //update the time details span.
        var timeString, datePattern;
        if (timeProperties.timeStopInterval !== undefined) {
            switch (timeProperties.timeStopInterval.units) {
                case 'esriTimeUnitsCenturies':
                    datePattern =  i18n.tools.time.centuryPattern; // 'yyyy G'
                    break;
                case 'esriTimeUnitsDecades':
                    datePattern = i18n.tools.time.decadePattern; //'yyyy'
                    break;
                case 'esriTimeUnitsYears':
                    datePattern = i18n.tools.time.yearPattern; //'MMMM yyyy'
                    break;
                case 'esriTimeUnitsWeeks':
                    datePattern = i18n.tools.time.weekPattern; //'MMMM d, yyyy'
                    break;
                case 'esriTimeUnitsDays':
                    datePattern = i18n.tools.time.weekPattern; //'MMMM d, yyyy'
                    break;
                case 'esriTimeUnitsHours':
                    datePattern = i18n.tools.time.hourTimePattern; //'h:m:s.SSS a'
                    break;
                case 'esriTimeUnitsMilliseconds':
                    datePattern = i18n.tools.time.millisecondTimePattern; //'h:m:s.SSS a'
                    break;
                case 'esriTimeUnitsMinutes':
                    datePattern = i18n.tools.time.minuteTimePattern; //'h:m:s.SSS a'
                    break;
                case 'esriTimeUnitsMonths':
                    datePattern = i18n.tools.time.monthPattern; //'MMMM d, y'
                    break;
                case 'esriTimeUnitsSeconds':
                    datePattern = i18n.tools.time.secondTimePattern; //'h:m:s.SSS a'
                    break;
            }
            var startTime = formatDate(timeExtent.startTime, datePattern);
            var endTime = formatDate(timeExtent.endTime, datePattern);
            timeString = esri.substitute({
                "start_time": startTime,
                    "end_time": endTime
            }, i18n.tools.time.timeRange);
        } else {
            timeString = esri.substitute({
                "time": formatDate(timeExtent.endTime, datePattern)
            }, i18n.tools.time.timeRangeSingle);

        }
        dojo.byId('timeSliderLabel').innerHTML = timeString;
    });
    timeSlider.startup();

}

function createElevationProfileTools() {

    // DO WE HAVE THE MEASURE TOOL ENABLED //
    if (!measure) {
        console.error("This template requires the measure tool to be enabled.");
        return;
    }



    dijit.byId('bottomPane').set('content', '<div id="profileChartPane" dojotype="apl.ElevationsChart.Pane"></div>');

    // GET DEFAULT DISTANCE UNITS BASED ON SCALEBAR UNITS     //
    // IF SCALEBAR IS NOT DISPLAYED THEN USE MILES AS DEFAULT //
    var defaultDistanceUnits = measure.units.esriMiles;
    if (configOptions.displayscalebar === "true" || configOptions.displayscalebar === true) {
        if (i18n.viewer.main.scaleBarUnits === 'metric') {
            defaultDistanceUnits = measure.units.esriKilometers;
        }
    }


    // INITIALIZE ELEVATIONS PROFILE CHART WIDGET               //
    //                                                          //
    // @param {esri.Map} map                                    //
    // @param {esri.dijit.Measurement} measure                  //
    // @param {String} defaultDistanceUnits ( Miles || Meters ) //
    // @param {Boolean} showElevationDifference                 //
    dijit.byId('profileChartPane').init({
        map: map,
        measure: measure,
        defaultDistanceUnits: defaultDistanceUnits,
        showElevationDifference: configOptions.showelevationdifference
    });
}


      function adjustPopupSize() {
        var box = dojo.contentBox(map.container);        
        
        var width = 270, height = 300, // defaults
            newWidth = Math.round(box.w * 0.60),             
						newHeight = Math.round(box.h * 0.45);        
        if (newWidth < width) {
          width = newWidth;
        }
        
        if (newHeight < height) {
          height = newHeight;
        }
        
        map.infoWindow.resize(width, height);
      }

//JT Code additions for Imagery Pane here

function addImageryPane(){
	esri.show(dojo.byId('rightPane'));
	require(["dtc/ImageryPane"], function(ImageryPane){
		var IP = new ImageryPane({'map':map}, "imgPane");
		IP.startup();
	})
}      