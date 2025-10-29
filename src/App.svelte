<script>
    import { setupPWA } from './pwa.js';
    import {onMount} from 'svelte';
    import L from 'leaflet';
    import { generateCsv } from './utils/csvExporter.js';
    import { generateAuditChecklist } from './utils/checklistGenerator.js';
    import { calculateSurfaceArea } from './utils/surfaceCaclulator.js';
    import { getOsmItems } from './utils/osmDataProvider.js';
    import { roundCoord } from './utils/mapBoundsHelpers.js';
    import localforage from "localforage";

    let updateSW;
    let updateAvailable;

    const movementLimit = 0.007;
    let initialPosition = [49.8022, 10.1603];

    let gpsEnabled = true; // Default value, unless set in the URL anchor.
    let surveyModeEnabled = false;

    let map;
    let icons = [];
    let distanceCircles = [];
    let currentPositionMarker;
    let lastUpdatedPosition = [0, 0];
    let markers = [];

    onMount(() => {
        ensureHTTPS();

        updateSW = setupPWA(
            () => {
                updateAvailable = true; // called when new version is ready
            },
            () => {
                console.log('App ready for offline use');
            }
        );

        updateButtonsVisuals();
        initializeMap();
        initializeIcons();
        initializeDistanceCircles();
        initializeGps();
        mapMoved();
    });

    async function doUpdate() {
        // Delete all stored API data!
        localforage.setItem("osmApiDatasets", []);

        // Clear caches
        const keys = await caches.keys();
        for (const key of keys) {
            if (key.startsWith('osm-') || key.startsWith('app-')) {
                await caches.delete(key);
                console.log('Deleted cache:', key);
            }
        }

        // Update the app
        if (updateSW) {
            updateSW(true); // tells SW to skip waiting and activate new version
        }

        window.location.reload();
    }

    function ensureHTTPS() {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            location.replace(`https:${location.href.substring(location.protocol.length)}`);
        }
    }

    function initializeMap() {
        const mapDiv = document.getElementById('map');
        if (!mapDiv) {
            console.error("Map container not found!");
            return;
        }

        let urlParts = document.URL.split('#');
        let anchor = urlParts[1];

        if (undefined != anchor) {
            let anchorParts = anchor.split('/');

            gpsEnabled = (anchorParts[0] == "1");
            updateButtonsVisuals();
            initialPosition = [anchorParts[2], anchorParts[3]];
            //map.setView([anchorParts[2], anchorParts[3]], anchorParts[1]);
            //updateView(Number(anchorParts[2]), Number(anchorParts[3]), false);
        }

        map = L.map(mapDiv).setView(initialPosition, 19);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            minZoom: 4,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://www.feuerwehr-dettelbach.de/" target="_blank">FF Dettelbach</a> | <a href="https://github.com/BitScout/hydrant_radar" target="_blank">GitHub</a> | <a href="https://legacy.hydranten.eu/">Alte Version</a>'
        }).addTo(map);
    }

    function initializeIcons() {
        let newIcon;
        let iconDefinitions = [
            'icon_hydrant_red',
            'icon_hydrant_red_underground',
            'icon_hydrant_red_pillar',
            'icon_hydrant_blue',
            'icon_hydrant_blue_underground',
            'icon_hydrant_blue_pillar',
            'icon_suction_point',
            'icon_water_tank',
            'icon_key_depot',
            'icon_swimming_pool',
        ];

        iconDefinitions.forEach((item, index) => {
            newIcon = L.icon({
                iconUrl: 'images/' + item + '.png',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, 0],
            });
            icons[item] = newIcon;
        });

        currentPositionMarker = L.marker(initialPosition).addTo(map);
    }

    function initializeDistanceCircles() {
        distanceCircles = [
            L.circle(initialPosition, {color: 'grey', fillOpacity: 0.0, radius: 20}).addTo(map), // 1x B
            L.circle(initialPosition, {color: 'grey', fillOpacity: 0.0, radius: 40}).addTo(map), // 2x B
            L.circle(initialPosition, {color: 'grey', fillOpacity: 0.0, radius: 60}).addTo(map), // 3x B
            L.circle(initialPosition, {color: 'red', fillOpacity: 0.0, radius: 100}).addTo(map), // 5x B = 1x caddy
            L.circle(initialPosition, {color: 'red', fillOpacity: 0.0, radius: 200}).addTo(map), // 10x B = 2x caddy
            L.circle(initialPosition, {color: 'black', fillOpacity: 0.0, radius: 500}).addTo(map), // 50x B = 1x container
            L.circle(initialPosition, {color: 'black', fillOpacity: 0.0, radius: 1000}).addTo(map) // 100x B = 2x container
        ];
    }

    function initializeGps() {
        const gpsOptions = {
            enableHighAccuracy: true,
            maximumAge: 600000,
        };
        navigator.geolocation.watchPosition(gpsPositionChanged, positionError, gpsOptions);
        map.on("moveend", mapMoved);
        map.on("zoomend", mapZoomed);
    }

    function addHydrant(item) {
        let label = '';
        let itemIcon = icons['icon_hydrant_red'];
        let highlighted = false;
        const blueWaterSources = ['powered_pump'];

        if (item.tags['colour'] == 'blue' || blueWaterSources.includes(item.tags['water_source'])) {
            itemIcon = icons['icon_hydrant_blue'];
        }

        if (item.tags['name']) {
            label = item.tags['name'] + '<br>';
        }

        switch (item.tags['fire_hydrant:type']) {
            case 'underground':
                label += 'UH';
                itemIcon = icons['icon_hydrant_red_underground'];
                if (item.tags['colour'] == 'blue' || blueWaterSources.includes(item.tags['water_source'])) {
                    itemIcon = icons['icon_hydrant_blue_underground'];
                }

                if ((undefined == item.tags['fire_hydrant:diameter']) && (undefined == item.tags['diameter'])) {
                    highlighted = true;
                }
                break;
            case 'pillar':
                label += 'OH';
                itemIcon = icons['icon_hydrant_red_pillar'];
                if (item.tags['colour'] == 'blue' || blueWaterSources.includes(item.tags['water_source'])) {
                    itemIcon = icons['icon_hydrant_blue_pillar'];
                }
                break;
        }

        if (item.tags['fire_hydrant:diameter']) {
            label += ' ' + item.tags['fire_hydrant:diameter'] + ' mm'
        } else if (item.tags['diameter']) {
            label += ' ' + item.tags['diameter'] + ' mm'
        }

        if (item.tags['fire_hydrant:position']) {
            switch (item.tags['fire_hydrant:position']) {
                case 'lane':
                    label += '<br>Straßenfläche';
                    break;
                case 'sidewalk':
                    label += '<br>Gehsteig';
                    break;
                case 'green':
                    label += '<br>Grünfläche';
                    break;
                case 'parking_lot':
                    label += '<br>Stellplatzfläche';
                    break;
            }
        }

        if (item.tags['water_source']) {
            switch (item.tags['water_source']) {
                case 'main':
                case 'water_works':
                case 'tap':
                case undefined:
                    // Show nothing, this is the default
                    break;
                case 'well':
                case 'tube_well':
                case 'groundwater':
                    label += '<br>Brunnen';
                    break;
                case 'river':
                    label += '<br>Fluss';
                    break;
                case 'stream':
                    label += '<br>Bach';
                    break;
                case 'lake':
                    label += '<br>See';
                    break;
                default:
                    label += '<br>Löschwassernetz';
                    break;
            }
        }

        if (surveyModeEnabled && (item.tags['ref'] || (item.tags['object:street'] && item.tags['object:housenumber']))) {
            label += '<br>';

            if (item.tags['ref']) {
                label += ' [' + item.tags['ref'] + ']';
            }

            if (item.tags['object:street'] && item.tags['object:housenumber']) {
                label += ' ' + item.tags['object:street'] + ' ' + item.tags['object:housenumber'];
            }
        }

        if (item.tags['description']) {
            label += '<br>' + item.tags['description'];
        }

        if (label == '') {
            label = '[keine Informationen]';
        }

        if ((undefined == item.tags['water_source']) || ((undefined == item.tags['fire_hydrant:position']) && (undefined == item.tags['position']))) {
            highlighted = true;
        }

        if (!item.tags['object:housenumber']) {
            highlighted = true;
        }

        let markerOpacity = highlighted ? 1 : getSurveyMarkerOpacity();
        markers.push(L.marker([item.lat, item.lon], {
            icon: itemIcon,
            opacity: markerOpacity
        }).addTo(map).bindPopup(label));
    }

    function addPool(item) {
        let label = 'Schwimmbecken<br>ca. ' + Math.round(calculateSurfaceArea(item.geometry)) + ' m²';
        let itemIcon = icons['icon_swimming_pool'];
        let bounds = item.bounds;
        let position = [(bounds.minlat + (bounds.maxlat - bounds.minlat) / 2), (bounds.minlon + (bounds.maxlon - bounds.minlon) / 2)];
        let markerOpacity = getSurveyMarkerOpacity();

        markers.push(L.marker(position, {icon: itemIcon, opacity: markerOpacity}).addTo(map).bindPopup(label));
    }

    function addSuctionPoint(item) {
        let label = 'Löschwasserentnahmestelle';

        if (surveyModeEnabled && item.tags['object:street'] && item.tags['object:housenumber']) {
            label += '<br>' + item.tags['object:street'] + ' ' + item.tags['object:housenumber'];
        }

        markers.push(L.marker([item.lat, item.lon], {
            title: 'label',
            icon: icons['icon_suction_point'],
            opacity: getSurveyMarkerOpacity()
        }).addTo(map).bindPopup(label));
    }

    function addWaterTank(item) {
        let label = 'Löschwassertank';

        if (parseInt(item.tags['water_volume']) > 1) {
            label += ' ' + parseInt(item.tags['water_volume']) + ' m&sup3;'
        } else if (parseInt(item.tags['water_tank:volume']) > 1) {
            label += ' ' + parseInt(item.tags['water_tank:volume']) + ' m&sup3;'
        }

        markers.push(L.marker([item.lat, item.lon], {
            title: 'label',
            icon: icons['icon_water_tank'],
            opacity: getSurveyMarkerOpacity()
        }).addTo(map).bindPopup(label));
    }

    function addKeyDepot(item) {
        let label = 'Schlüsseldepot';
        markers.push(L.marker([item.lat, item.lon], {
            title: 'label',
            icon: icons['icon_key_depot'],
            opacity: getSurveyMarkerOpacity()
        }).addTo(map).bindPopup(label));
    }

    function getSurveyMarkerOpacity() {
        return surveyModeEnabled ? .3 : 1;
    }

    function updateItems(lat, lon) {
        lastUpdatedPosition = [lat, lon];

        getOsmItems(map, function (items) {
            // Remove existing hydrants etc from map
            markers.forEach((marker, index) => {
                marker.removeFrom(map);
            });

            items.forEach((item, index) => {
                if (item.tags['leisure']) {
                    addPool(item);
                } else {
                    switch (item.tags['emergency']) {
                        case 'fire_hydrant':
                            addHydrant(item);
                            break;
                        case 'suction_point':
                            addSuctionPoint(item);
                            break;
                        case 'water_tank':
                            addWaterTank(item);
                            break;
                        case 'key_depot':
                            addKeyDepot(item);
                            break;
                        default:
                        //console.log(item.tags['emergency']);
                    }
                }
            });
        });
    }

    function mapMoved() {
        if (gpsEnabled) {
            return;
        }

        let currentPos = map.getCenter();
        updateView(currentPos.lat, currentPos.lng, false)
    }

    function mapZoomed() {
        let currentPos = map.getCenter();
        updateView(currentPos.lat, currentPos.lng, false, true)
    }

    function gpsPositionChanged(pos) {
        let mapPosition = pos.coords;
        currentPositionMarker.setLatLng([mapPosition.latitude, mapPosition.longitude]);

        if (gpsEnabled) {
            updateView(mapPosition.latitude, mapPosition.longitude, true)
        }
    }

    function positionError(err) {
        console.error(`ERROR(${err.code}): ${err.message}`);
    }

    function updateCircles(lat, lon) {
        distanceCircles.forEach((item, index) => {
            item.setLatLng([lat, lon]);
            item.setStyle({opacity: surveyModeEnabled ? 0 : 1});
        });
    }

    function updateView(lat, lon, setView, skipMinorChangeCheck = false) {
        if (map.getZoom() < 16) {
            return; // Too far zoomed out, we wouldn't see anything anyways
        }

        updateCircles(lat, lon);
        updateAnchor();

        if (setView) {
            map.setView([lat, lon]);
        }

        // Decide if we moved enough to justify updating map elements
        let mapBounds = map.getBounds();
        let minorChange = skipMinorChangeCheck ? false : (lastUpdatedPosition[0] > mapBounds._southWest.lat && lastUpdatedPosition[0] < mapBounds._northEast.lat && lastUpdatedPosition[1] > mapBounds._southWest.lng && lastUpdatedPosition[1] < mapBounds._northEast.lng);

        if (!minorChange) {
            updateItems(lat, lon);
        }
    }

    function updateAnchor() {
        let mapPosition = map.getCenter();
        history.replaceState(undefined, undefined, "#" + Number(gpsEnabled) + "/" + map.getZoom() + "/" + roundCoord(mapPosition.lat) + "/" + roundCoord(mapPosition.lng))
    }

    function updateButtonsVisuals() {
        let button = document.getElementById('gpsToggleButton');
        button.style.borderColor = gpsEnabled ? 'red' : 'black';
        button.style.backgroundColor = gpsEnabled ? 'pink' : 'white';

        document.getElementById('downloadCsvButton').style.display = surveyModeEnabled ? 'block' : 'none';
        document.getElementById('openAuditChecklistButton').style.display = surveyModeEnabled ? 'block' : 'none';
        document.getElementById('resetButton').style.display = surveyModeEnabled ? 'block' : 'none';
    }

    function gpsButtonClicked(e) {
        gpsEnabled = !gpsEnabled;
        updateButtonsVisuals();
        updateAnchor();
    }

    function surveyModeToggleButtonClicked() {
        surveyModeEnabled = !surveyModeEnabled;
        updateButtonsVisuals();

        let urlParts = document.URL.split('#');
        let anchor = urlParts[1];
        let anchorParts = anchor.split('/');
        updateCircles(Number(anchorParts[2]), Number(anchorParts[3]));
        updateItems(Number(anchorParts[2]), Number(anchorParts[3]));

        let button = document.getElementById('gpsToggleButton');
        button.style.borderColor = gpsEnabled ? 'red' : 'black';
        button.style.backgroundColor = gpsEnabled ? 'lightpink' : 'white';
    }

    function downloadCsvButtonClicked() {
        if (map.getZoom() < 13) {
            alert('Bitte wählen Sie einen kleineren Kartenausschnitt.')

            return;
        }

        generateCsv(map, ';');
    }

    function openAuditChecklistButtonClicked() {
        if (map.getZoom() < 13) {
            alert('Bitte wählen Sie einen kleineren Kartenausschnitt.')

            return;
        }

        generateAuditChecklist(map);
    }

    function helpButtonClicked() {
        window.location.href = "de_hilfe.html";
    }
</script>

<main style="width: 100%; height: 100%;">
    <div id="map" style="width: 100%; height: 100%;"></div>
    <button id="gpsToggleButton" on:click={gpsButtonClicked}
            style="width: 5em; left: 45%; top: 1em; font-weight: bold;">GPS
    </button>
    <button id="surveyModeToggleButton" on:click={surveyModeToggleButtonClicked} style="width: 4em; top: 1em;">
        ☰
    </button>
    <button id="downloadCsvButton" on:click={downloadCsvButtonClicked} style="width: 10em; top: 4.5em; display: none;">
        CSV-Tabelle
    </button>
    <button id="openAuditChecklistButton" on:click={openAuditChecklistButtonClicked}
            style="width: 10em; top: 8em; display: none;">Checkliste
    </button>
    <button id="resetButton" on:click={doUpdate} style="top: 11.5em; width: 10em; display: none;">Zurücksetzen</button>
    <button id="helpButton" on:click={helpButtonClicked} style="width: 5em; left: 49%; bottom: 1em; font-weight: bold; display: none;">
        Hilfe
    </button>
</main>

<style>
    main {
        font-family: sans-serif;
        text-align: center;
    }

    button {
        z-index: 600;
        position: absolute;
        padding: 0.3rem 1rem;
        color: black;
        border-color: black;
        background-color: white;
        border-width: 0.4rem;
        border-radius: 1em;
        height: 2.8em;
        right: 1em;
    }
</style>
