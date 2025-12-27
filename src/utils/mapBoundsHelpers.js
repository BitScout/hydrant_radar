
import {getConfigValue} from './config.js';

export function buildApiBoundsString(bounds) {
    return bounds.south + ',' + bounds.west + ',' + bounds.north + ',' + bounds.east;
}

export function generateRequiredBoundsForMap(map) {
    let mapBounds = map.getBounds();

    let mapHeight = Math.abs(mapBounds._northEast.lat - mapBounds._southWest.lat);
    let mapWidth = Math.abs(mapBounds._northEast.lng - mapBounds._southWest.lng);

    let bounds = {};
    bounds.north = roundCoord(mapBounds._northEast.lat + mapHeight);
    bounds.south = roundCoord(mapBounds._southWest.lat - mapHeight);
    bounds.west = roundCoord(mapBounds._southWest.lng - mapWidth);
    bounds.east = roundCoord(mapBounds._northEast.lng + mapWidth);

    return bounds;
}

export function generateExtendedBoundsForMap(map, km) {
    let mapBounds = map.getBounds();
    let horizontalDegreesDistance = getDegreeOffsets(map.getBounds()._northEast.lat, km);

    let bounds = {};
    bounds.north = roundCoord(mapBounds._northEast.lat + km / 100);
    bounds.south = roundCoord(mapBounds._southWest.lat - km / 100);
    bounds.west = roundCoord(mapBounds._southWest.lng - horizontalDegreesDistance);
    bounds.east = roundCoord(mapBounds._northEast.lng + horizontalDegreesDistance);

    return bounds;
}

export function getDegreeOffsets(lat, distanceKm) {
    const earthRadiusKmPerDegree = 111.32;

    return distanceKm / (earthRadiusKmPerDegree * Math.cos(lat * Math.PI / 180));
}

export function convertBoundsToLeafletBounds(bounds) {
    return [[bounds.west, bounds.south], [bounds.east, bounds.north]];
}

export function roundCoord(input) {
    return Math.round(input * 100000) / 100000;
}

export function shouldMapBoundsBeLoaded(bounds) {
    return getConfigValue('maxLoadingBoundsKm') >= calcDistance(bounds);
}

export function calcDistance(bounds)
{
    let R = 6371; // km
    let dLat = toRad(bounds.south - bounds.north);
    let dLon = toRad(bounds.east - bounds.west);
    let lat1 = toRad(bounds.north);
    let lat2 = toRad(bounds.south);

    let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function toRad(Value)
{
    return Value * Math.PI / 180;
}
