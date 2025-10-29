export async function generateAuditChecklist(map) {
    let html = '<html><body><script src=\"https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js\"><\/script><style>';
    html += 'td {border: 1px solid; padding: .5em; vertical-align: top;}';
    html += 'a {color: black; text-decoration: none;}';
    html += '.qrCode {padding-bottom: .5em;}';
    html += '@media print {.hydrant {break-inside: avoid;} .page-break { break-after: page; }}';
    html += '</style>';

    let today = new Date();
    let options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
    html += 'Hydrantenprüfliste, erzeugt am ' + today.toLocaleDateString("de-DE", options) + '<br>Bitte alles erwähnenswerte notieren, unzutreffendes bitte streichen.<br><br>';

    // Request Overpass API data
    let bounds = map.getBounds();
    let latLonFromTo = bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast();
    fetch('https://www.overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node["emergency"](' + latLonFromTo + '););out%20meta;')
        .then(response => response.json())
        .then(response => {
                let data = {};
                data.streets = {};

                // Group hydrants by street
                response.elements.forEach((item, index) => {
                    if ('fire_hydrant' != item.tags['emergency']) {
                        return;
                    }

                    let street;

                    if ('object:street' in item.tags) {
                        street = item.tags['object:street'];
                    } else {
                        street = "";
                    }

                    data.streets[street] = data.streets[street] || [];
                    data.streets[street].push(item);
                });

                // Get sorted list of street names
                let streetnames = Object.keys(data.streets);
                streetnames.sort((a, b) => a.localeCompare(b));

                // Sort by house number
                streetnames.forEach(streetname => {
                    let hydrants = data.streets[streetname];
                    hydrants.sort((a, b) => parseInt(a.tags['object:housenumber']) - parseInt(b.tags['object:housenumber']));
                    data.streets[streetname] = hydrants;
                })

                streetnames.forEach(streetname => {
                    let hydrants = data.streets[streetname];

                    hydrants.forEach((hydrant) => {
                        let tags = hydrant.tags;

                        html += '<table class="hydrant"><tr><td style="width: 12em;">';
                        html += ((tags['object:subdistrict'] ? tags['object:subdistrict'] : tags['object:city']) ?? '') + '<br><b>'

                        if ('ref' in tags) {
                            html += '[' + tags['ref'] + '] ';
                        }
                        html += (tags['object:street'] ?? '') + ' ' + (tags['object:housenumber'] ?? '') + '</b><br>';

                        switch (tags['fire_hydrant:type']) {
                            case 'underground':
                                html += 'Unterflurhydrant ';
                                if (tags['fire_hydrant:diameter']) {
                                    html += '(' + tags['fire_hydrant:diameter'] + ' mm)'
                                }
                                break;
                            case 'pillar':
                                html += 'Überflurhydrant ';
                                break;
                            default:
                                html += tags['fire_hydrant:type'];
                        }

                        if (tags['water_source']) {
                            switch (tags['water_source']) {
                                case 'main':
                                case 'water_works':
                                case 'tap':
                                case 'well':
                                case 'tube_well':
                                case 'groundwater':
                                case 'river':
                                case 'stream':
                                case 'lake':
                                case undefined:
                                    // Show nothing, this is the default
                                    break;
                                default:
                                    html += '<br>Löschwassernetz';
                                    break;
                            }
                        }

                        if (tags['fire_hydrant:position']) {
                            html += '<br>';
                            switch (tags['fire_hydrant:position']) {
                                case 'green':
                                    html += 'Grünfläche';
                                    break;
                                case 'lane':
                                    html += 'Straßenfläche';
                                    break;
                                case 'sidewalk':
                                    html += 'Gehsteig';
                                    break;
                                case 'parking_lot':
                                    html += 'Stellplatzfläche';
                                    break;
                            }
                        }

                        if (tags['description']) {
                            html += '<br>' + tags['description'];
                        }

                        html += '</td>';
                        html += '<td style="width: 27em;">'

                        switch (tags['fire_hydrant:type']) {
                            case 'underground':
                                html += 'Schild: &#9744; Vorhanden & korrekt&nbsp;&nbsp;&nbsp;&#9744; Falsch&nbsp;&nbsp;&nbsp;&#9744; Fehlt<br>';
                                html += 'Hydrantendeckel: &#9744; OK&nbsp;&nbsp;&nbsp;&#9744; Öse fehlt&nbsp;&nbsp;&nbsp;&#9744; Nicht zu öffnen<br>';
                                html += 'Klauendeckel: &#9744; OK&nbsp;&nbsp;&nbsp;&#9744; Nicht befestigt&nbsp;&nbsp;&nbsp;&#9744; Fehlt<br>';
                                html += 'Wasserabfluss: &#9744; OK&nbsp;&nbsp;&nbsp;&#9744; Langsam&nbsp;&nbsp;&nbsp;&#9744; Nein<br>';
                                break;
                            case 'pillar':
                                html += ' ';
                                html += 'Abdeckungen: &#9744; OK&nbsp;&nbsp;&nbsp;&#9744;<br>';
                                html += 'Hydrantenkörper: &#9744; OK&nbsp;&nbsp;&nbsp;&#9744;<br>';
                                break;
                        }
                        html += 'Ventil: &#9744; OK&nbsp;&nbsp;&nbsp;&#9744; (Sehr) Schwergängig&nbsp;&nbsp;&nbsp;&#9744; nicht drehbar';

                        html += '</td>';
                        html += '<td style="vertical-align: center; font-size: small;">';
                        let hydrantUrl = 'https://hydranten.eu/#0/19/' + hydrant.lat + '/' + hydrant.lon;
                        let qrDivId = Array(16 + 1).join((Math.random().toString(36) + '00000000000000000').slice(2, 18)).slice(0, 16);
                        html += '<a href="' + hydrantUrl + '">' + hydrant.lat + '<br>' + hydrant.lon + '</a>';
                        html += '<div class="qrCode" id="' + qrDivId + '"><\/div><script type="text/javascript">new QRCode(document.getElementById("' + qrDivId + '"), {text: "' + hydrantUrl + '", width: 82, height: 82});<\/script>';
                        html += '</td>';
                        html += '</tr></table>';
                    });

                    html += '<div class="page-break"></div>';
                });

                openAuditChecklist(html);
            }
        );

    html += '</body></html>';

    return html;
}

function openAuditChecklist(html) {
    let newWindow = window.open();
    newWindow.document.write(html);
}
