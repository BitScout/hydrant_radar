
export function calculateSurfaceArea(coordinates) {
    if (undefined === coordinates || coordinates.length < 3) {
        return 0;
    }

    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Ensure the last coordinate is the same as the first one to close the polygon
    coordinates.push(coordinates[0]);

    const EARTH_RADIUS = 6371000;
    let area = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const {lat: lat1, lon: lon1} = coordinates[i];
        const {lat: lat2, lon: lon2} = coordinates[i + 1];
        area += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
    }

    area = (area * EARTH_RADIUS * EARTH_RADIUS) / 2;

    return Math.abs(area);
}
