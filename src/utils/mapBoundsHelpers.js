
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

export function generateApiRequestBoundsForMap(map) {
    let mapBounds = map.getBounds();
    let horizontalDegreesDistance = getDegreeOffsets(map.getBounds()._northEast.lat, 20);

    let bounds = {};
    bounds.north = roundCoord(mapBounds._northEast.lat + 0.20);
    bounds.south = roundCoord(mapBounds._southWest.lat - 0.20);
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
