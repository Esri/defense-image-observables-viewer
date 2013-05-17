﻿{
  "values": {
    "displaybasemaps": "true",
    "displaylegend": "true",
    "displayshare": "true",
    "displaymeasure": "true",
    "displayelevation": "false",
	"showelevationdifference": "false",
    "theme": "gray",
    "displaydetails": "true",
    "displayeditor": "true",
    "displaylayerlist": "true",
    "displayoverviewmap": "true",
    "displaytimeslider": "true",
    "displayprint": "true",
    "displaysearch": "true"
  },
  "configurationSettings": [{
    "category": "<b>General Settings</b>",
    "fields": [{
      "label": "Color Scheme:",
      "fieldName": "theme",
      "type": "string",
      "options": [{
        "value": "blue",
        "label": "Blue"
      }, {
        "value": "gray",
        "label": "Gray"
      }, {
        "value": "green",
        "label": "Green"
      }, {
        "value": "orange",
        "label": "Orange"
      }, {
        "value": "purple",
        "label": "Purple"
      }],
      "tooltip": "Color theme to use"
    }, {
      "label": "Show Title",
      "fieldName": "displaytitle",
      "type": "boolean",
      "tooltip": ""
    }, {
      "placeHolder": "Defaults to map name",
      "label": "Title Text:",
      "fieldName": "title",
      "type": "string",
      "tooltip": ""
    }, {
      "placeHolder": "URL to image",
      "label": "Logo on map:",
      "fieldName": "customlogoimage",
      "type": "string",
      "tooltip": "Url for image"
    }, {
      "label": "Include Overview Map",
      "fieldName": "displayoverviewmap",
      "type": "boolean",
      "tooltip": ""
    }]
  }, {
    "category": "<b>Menu Items</b>",
    "fields": [{
      "label": "Legend *",
      "fieldName": "displaylegend",
      "type": "boolean",
      "tooltip": ""
    }, {
      "label": "Details *",
      "fieldName": "displaydetails",
      "type": "boolean",
      "tooltip": ""
    }, {
      "label": "Editor *",
      "fieldName": "displayeditor",
      "type": "boolean",
      "tooltip": "Display editor if web map contains feature service layer"
    }, {
      "label": "Time Slider *",
      "fieldName": "displaytimeslider",
      "type": "boolean",
      "tooltip": "Display time slider for time enabled web map"
    }, {
      "label": "Print",
      "fieldName": "displayprint",
      "type": "boolean",
      "tooltip": ""
    }, {
      "label": "Layer List *",
      "fieldName": "displaylayerlist",
      "type": "boolean",
      "tooltip": ""
    }, {
      "label": "Basemaps",
      "fieldName": "displaybasemaps",
      "type": "boolean",
      "tooltip": ""
    }, {
      "label": "Bookmarks",
      "fieldName": "displaybookmarks",
      "type": "boolean",
      "tooltip": "Display the read-only bookmarks contained in the web map."
    }, {
      "label": "Measure",
      "fieldName": "displaymeasure",
      "type": "boolean",
      "tooltip": ""
    }, {
      "label": "Elevation",
      "fieldName": "displayelevation",
      "type": "boolean",
      "tooltip": "Dispay an elevation profile. Note that the measure tool must be active for this tool to work."
    },{
	   "label": "Show elevation difference",
	   "fieldName": "showelevationdifference",
	   "tooltip":,"When true elevation gain loss is shown from the first location to the location under the cursor/finger."
	}, {
      "label": "Share",
      "fieldName": "displayshare",
      "type": "boolean",
      "tooltip": ""
    }, {
      "label": "Search",
      "fieldName": "displaysearch",
      "type": "boolean",
      "tooltip": ""
    }, {
      "value": "* These menu items will appear in the application when the web map has layers that require them.",
      "type": "paragraph"
    }]
  }]
}