### Note on proxy

To provide brightness/contrast controls, we are making use of the canvas HTML 5 element, which respects cross-domain limitations.  To ensure the application works properly, use a proxy (included) or make sure the CORS header on the 
ArcGIS Server *providing the imagery* (`access-control-allow-origin`) is enabled and authorizes the server you host this application on (more information at [Enable-CORS](http://enable-cors.org/ "Enable Cors")). 
