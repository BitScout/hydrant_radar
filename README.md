# Hydrant Radar

A map of nearby fire hydrants and other stuff

![](doc/images/screenshot.jpg)

## Intent

* Simple website that shows firefighting equipment nearby.
* By default, GPS tracking is enabled, giving you a virtual radar view
with variable zoom.
* You can disable GPS tracking using the button in the top right corner,
allowing you to pan and zoom to your target in advance.
* Made from a German perspective, but meant to work worldwide, even if symbols or units (mm) don't match for now.

## Technology

* Uses the default OSM map, using https://leafletjs.com/index.html
* Queries POIs directly from the Overpass API, so updates are visible within minutes!

## Configuration

Depending on your weakest mobile device in use, 
you may want to set the following two values in the code:

* `latLonRange`: The number of degrees vertically and half of this horizontally 
in which hydrants are loaded around the viewed position. 
* `movementLimit`: The number of degrees vertically and half of this horizontally
that you have to move away from the last loading position for the app to load hydrants again.

The `movementLimit` should be about half of `latLonRange`.
