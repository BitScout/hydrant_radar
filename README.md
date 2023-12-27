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

## Features

* Circles show you important distances:
  * Grey: 20 m (standard "B" length)
  * Red: 100 m (standard reel length)
  * Black: 500 m (standard container for long distances)
* If you enable survey mode ("Zensus"), the circles will disappear
and all POIs with sufficient data will become partially transparent.
This allows you to see at a glance, which hydrants need additional information.
* Survey mode also shows you a button for exporting all POIs in the viewport
into a single CSV file.

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
