const config = {
    'maxZoom': 20,
    'minZoom': 4,
    'minLoadItemsZoom': 17, // Basic limit, we have to be at least this far zoomed in
    'maxLoadingBoundsKm': 2 // Don't load items if the diagonal of the requested map bounds (screen + 50%) is longer than this
}

export function getConfigValue(key) {
    return config[key];
}
