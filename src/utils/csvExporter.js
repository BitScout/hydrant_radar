
export async function generateCsv(map, separator) {
    let csv = [];
    csv.push(['Hydrantennummer', 'Basistyp', 'Hydrantentyp', 'Position', 'Durchmesser', 'Anschlüsse', 'Wasserquelle', 'Straße', 'Hausnummer', 'PLZ', 'Stadt', 'Ortsteil', 'Breitengrad', 'Längengrad', 'Web-Link', 'Hinweise'].join(separator));

    const csvMapping = {
        'emergency': {
            'fire_hydrant': 'Hydrant',
            'suction_point': 'Löschwasserentnahmestelle',
            'water_tank': 'Löschwassertank',
            'key_depot': 'Schlüsseldepot',
        },
        'type': {
            'underground': 'Unterflurhydrant',
            'pillar': 'Überflurhydrant',
        },
        'position': {
            'lane': 'Straßenfläche',
            'parking_lot': 'Parkplatz',
            'sidewalk': 'Gehweg',
            'green': 'Grünfläche',
        },
        'water_source': {
            'main': 'Trinkwasser',
            'water_works': 'Trinkwasser',
            'tap': 'Trinkwasser',
            'powered_pump': 'Löschwassernetz',
        }
    }

    // Request Overpass API data
    let bounds = map.getBounds();
    let latLonFromTo = bounds.getSouth()+','+bounds.getWest()+','+bounds.getNorth()+','+bounds.getEast();
    fetch('https://www.overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node["emergency"]('+latLonFromTo+'););out%20meta;')
        .then(response => response.json())
        .then(response => {
                let urlParts = document.URL.split('#');

                response.elements.forEach((item, index) => {
                    if(!Object.keys(csvMapping['emergency']).includes(item.tags['emergency'])) {
                        return;
                    }

                    let notes = [];

                    if('fire_hydrant' == item.tags['emergency']) {
                        if(undefined == item.tags['fire_hydrant:diameter'] && 'underground' == item.tags['fire_hydrant:type']) {
                            notes.push('Durchmesser fehlt');
                        }
                        if(undefined == item.tags['fire_hydrant:type']) {
                            notes.push('Hydrantentyp fehlt');
                        }
                        if(undefined == item.tags['fire_hydrant:position']) {
                            notes.push('Position fehlt');
                        }
                        if(undefined == item.tags['ref']) {
                            notes.push('Hydrantennummer fehlt');
                        }
                    }

                    let row = [
                        item.tags['ref'],
                        csvMapping['emergency'][item.tags['emergency']],
                        csvMapping['type'][item.tags['fire_hydrant:type']] ?? item.tags['fire_hydrant:type'],
                        csvMapping['position'][item.tags['fire_hydrant:position']] ?? item.tags['fire_hydrant:position'],
                        item.tags['fire_hydrant:diameter'],
                        item.tags['couplings'],
                        csvMapping['water_source'][item.tags['water_source']] ?? item.tags['water_source'],
                        item.tags['object:street'],
                        item.tags['object:housenumber'],
                        item.tags['object:postcode'],
                        item.tags['object:city'],
                        item.tags['object:subdistrict'],
                        item.lat,
                        item.lon,
                        urlParts[0]+'#0/19/'+item.lat+'/'+item.lon,
                        notes.join(', ')
                    ];
                    csv.push(row.join(separator));
                });

                downloadCsv(csv.join('\n'));
            }
        );

    return csv.join('\n');
}

function downloadCsv (data) {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', 'hydrant.csv');
    a.click()
}
