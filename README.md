# Hydrant Radar

A map of nearby fire hydrants and other stuff

![](doc/images/screenshot.jpg)

## Intent

* Simple website that shows firefighting equipment nearby (GPS based).
* No scrolling away, GPS always wins, but you can zoom out.
* Made from a German perspective, but meant to work worldwide, even if symbols or units (mm) don't match for now.

## Technology

* Uses the default OSM map, using https://leafletjs.com/index.html
* Queries POIs directly from the Overpass API, so updates are visible within minutes!
