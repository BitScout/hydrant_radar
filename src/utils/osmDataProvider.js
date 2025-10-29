import localforage from "localforage";

import {
    buildApiBoundsString,
    generateRequiredBoundsForMap,
    generateApiRequestBoundsForMap
} from './mapBoundsHelpers.js';

const daysAfterWhichToRequestNewData = 1; // If the latest OSM API dataset is older than this many days, a new one will be requested.
const daysAfterWhichRequestIsInvalidated = 60; // An OSM API dataset will be used for up to this many days

let latestApiRequestTimestamp = 0;

export async function getOsmItems(map, callback) {
    let osmApiDatasets = await localforage.getItem("osmApiDatasets");

    if (osmApiDatasets) {
        console.log("Offline data found, " + osmApiDatasets.length + " entries.");
        osmApiDatasets = cleanupStoredDatasets(osmApiDatasets, daysAfterWhichRequestIsInvalidated);

        let datasetsMatchingRequestedBounds = [];
        osmApiDatasets.forEach((item, index) => {
            let datasetBounds = item.bounds;
            let requestedBounds = generateRequiredBoundsForMap(map);

            if (datasetBounds.west <= requestedBounds.west
                && datasetBounds.east >= requestedBounds.east
                && datasetBounds.south <= requestedBounds.south
                && datasetBounds.north >= requestedBounds.north) {
                datasetsMatchingRequestedBounds.push(item);
            }
        });

        console.log(datasetsMatchingRequestedBounds.length + " dataset(s) contain the requested area.");

        if (datasetsMatchingRequestedBounds.length < 1) {
            performApiRequestAndStoreResponse(map, osmApiDatasets, callback);
        } else {
            handleRequestResult(map, getLatestDataset(datasetsMatchingRequestedBounds), callback);

            if (cleanupStoredDatasets(datasetsMatchingRequestedBounds, daysAfterWhichToRequestNewData).length < 1) {
                console.log("Found no matching datasets younger than 30 days, fetching a new one just to be safe.")
                performApiRequestAndStoreResponse(map, osmApiDatasets, null);
            }
        }

    } else {
        console.log("No data available offline.");

        performApiRequestAndStoreResponse(map, [], callback);
    }
}

function handleRequestResult(map, response, callback) {
    let rb = generateRequiredBoundsForMap(map);
    let responseItems = [];

    for (const item of response.elements) {
        let c;

        if (item.type === "node") {
            c = item;
        } else if (item.type === "way") {
            c = item.geometry[0];
        }

        if (c.lat < rb.north && c.lat > rb.south && c.lon > rb.west && c.lon < rb.east) {
            responseItems.push(item);
        }
    }

    if (callback) {
        callback(responseItems);
    }
}

function cleanupStoredDatasets(responseItems, maxAgeInDays) {
    let newResponseItems = [];

    for (const item of responseItems) {
        let datasetAgeInDays = getDatasetAgeInDays(item);
        //console.log("Dataset is "+datasetAgeInDays+" days old");

        if (datasetAgeInDays <= maxAgeInDays) {
            newResponseItems.push(item);
        }
    }

    if (responseItems.length > 10) {
        newResponseItems.sort((a, b) => b.timestamp - a.timestamp);
        newResponseItems = newResponseItems.slice(0, 9);
    }

    return newResponseItems;
}

function performApiRequestAndStoreResponse(map, osmApiDatasets, callback) {
    let apiRequestBounds = generateApiRequestBoundsForMap(map);
    let latLonFromTo = buildApiBoundsString(apiRequestBounds);

    if (latestApiRequestTimestamp + 10 * 1000 > Date.now()) {
        console.log("Skipping request to avoid multiple request in a short timespan.");

        return;
    }

    console.log("Querying API for new API bounds: " + latLonFromTo);
    latestApiRequestTimestamp = Date.now();

    fetch('https://www.overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node["emergency"]('
        + latLonFromTo + ');way["leisure"="swimming_pool"](' + latLonFromTo + '););out%20geom%20meta;')
        //.then(response => response.json())
        .then(response => {
            if (response.status === 200) {
                response.json().then(function (response) {
                    response.bounds = apiRequestBounds;
                    response.timestamp = latestApiRequestTimestamp;

                    //console.log("Data before pushing new entry contains " + osmApiDatasets.length + " entries.");
                    osmApiDatasets = cleanupStoredDatasets(osmApiDatasets, daysAfterWhichRequestIsInvalidated);
                    //console.log("After cleanup, " + osmApiDatasets.length + " entries are left.");

                    osmApiDatasets.push(response);

                    localforage.setItem("osmApiDatasets", osmApiDatasets, function (err) {
                        handleRequestResult(map, response, callback);
                    });
                });
            } else if (response.status === 504) {
                console.log("Zu viele Datenbankanfragen!");
                let showModal = $state(false);
            } else {
                console.log("HTTP error " + response.status);
            }

            console.log(response);
        });
}

function getLatestDataset(items) {
    let latestDataset = null;

    for (const item of items) {
        if (latestDataset == null || item.timestamp > latestDataset.timestamp) {
            latestDataset = item;
        }
    }

    return latestDataset;
}

function getDatasetAgeInDays(dataset) {
    return Math.round((Date.now() - dataset.timestamp) / 86400000);
}
