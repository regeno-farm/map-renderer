function initMap(sbiNumber, is_webflow) {

    // Utility - converts map date string to something readable.
    function convertDate(dateString) {
        if (dateString !== "" && dateString !== undefined) {
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            return `${day}/${month}/${year}`;
        }
        else return dateString
    }

    // Pushes a feature update back to the map.
    async function updateFeatures(map, updatedFeature, isDrawing) {
        const source = isDrawing ? draw.getAll() : map.getSource('farm')._data

        const features = source.features.map(f => ((f.properties.ID === updatedFeature.properties.ID && f.properties.ID !== undefined) || (f.id === updatedFeature.id && f.id !== undefined)) ? {
            ...f,
            properties: updatedFeature.properties
        } : f);

        if (isDrawing) {
            draw.deleteAll()
            features.forEach(drawing => {
                draw.add(drawing);
            })
        }
        else {
            map.getSource('farm').setData({
                ...source,
                features: features
            });
        }

        try {
            saveGeojson()
        } catch (error) {
            console.error('Error sending to Memberstack:', error);
        }
        updateTable(map)
    }

    // Updates the table with the latest map data.
    function updateTable(map) {
        const source = map.getSource('farm')._data;
        const features = source.features.sort((a, b) => {
            if (a.properties.SHEET_ID < b.properties.SHEET_ID) {
                return -1;
            } else if (a.properties.SHEET_ID > b.properties.SHEET_ID) {
                return 1;
            } else {
                return a.properties.PARCEL_ID - b.properties.PARCEL_ID;
            }
        });
        const tableBody = document.querySelector('#tableBody');

        features.forEach(obj => {
            const row = document.createElement('div');
            row.classList.add('table-row');
            const form = document.createElement('form');
            form.classList.add('table-form');
            form.innerHTML = `
                <input type="hidden" name="ID" class="hidden-input" value="${obj.properties.ID ?? obj.id}">
                <input type="text" placeholder="Enter current rotation" name="CROP" class="table-cell-wrapper crop" value="${obj.properties.CROP ?? ""}">
                <input type="text" placeholder="Enter field name" name="FIELD_NAME" class="table-cell-wrapper field_name" value="${obj.properties.FIELD_NAME ?? ""}">
                <input type="text" name="SHEET_ID" class="table-cell-wrapper sheet-id" value="${obj.properties.SHEET_ID}">
                <input type="text" name="PARCEL_ID" class="table-cell-wrapper parcel-id" value="${obj.properties.PARCEL_ID}">
                <input type="text" name="DESCRIPTION" class="table-cell-wrapper description" value="${obj.properties.DESCRIPTION}">
                <input type="text" name="AREA_HA" class="table-cell-wrapper area-ha" value="${obj.properties.AREA_HA}">
                <input type="text" name="LAND_COVER_CLASS_CODE" class="table-cell-wrapper land-cover-class-code" value="${obj.properties.LAND_COVER_CLASS_CODE}">
                <input type="text" name="SHAPE_AREA" class="table-cell-wrapper shape-area" value="${obj.properties.SHAPE_AREA}">
                <input type="text" name="SHAPE_PERIMETER" class="table-cell-wrapper shape-perimeter" value="${obj.properties.SHAPE_PERIMETER}">
                <input type="text" name="CREATED_ON" class="table-cell-wrapper created-on" value="${convertDate(obj.properties.CREATED_ON)}">
                <button type="submit" class="table-submit">Submit</button>
            `;

            form.addEventListener('submit', function (event) {
                event.preventDefault();
                handleSubmit(map, new FormData(form));
            });

            row.appendChild(form);
            tableBody.appendChild(row);
        });
    }

    // Matches a form submission to a map feature and pushes a
    // feature update.
    function handleSubmit(map, formData) {
        let isDrawing = false

        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        let originalFeature

        originalFeature = map.queryRenderedFeatures({
            layers: ['farms'],
            filter: ['==', ['get', 'ID'], data.ID]
        })[0];

        if (!originalFeature) {
            originalFeature = draw.getAll().features.find(feature => {
                if (feature.id === data.ID) {
                    isDrawing = true
                    return feature
                }
            });
        }

        const updatedFeature = {
            ...originalFeature,
            properties: {
                ...originalFeature.properties,
                ...data
            }
        };

        updateFeatures(map, updatedFeature, isDrawing)
    }

    // Opens a modal to edit a map feature.
    function openModal(feature, source, map) {
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        const modalClose = document.getElementById('modal-close');

        const form = document.createElement('form');
        form.id = 'modal-form';
        form.classList.add('modal-form');

        form.innerHTML = `
            <input type="hidden" class="hidden-input" name="ID" value="${feature.properties.ID ?? feature.id ?? ""}">
            <div class="f-steps-input sm field-name">
                <label class="f-txt-field-label sm field-name">Field name:</label>
                <input type="text" class="f-input-field sm field-name" name="FIELD_NAME" value="${feature.properties.FIELD_NAME ?? ""}">
            </div><div class="f-steps-input sm crop">
                <label class="f-txt-field-label sm crop">Crop:</label>
                <input type="text" class="f-input-field sm crop" name="CROP" value="${feature.properties.CROP ?? ""}">
            </div><div class="f-steps-input sm sheet-id">
                <label class="f-txt-field-label sm sheet-id">Sheet ID:</label>
                <input type="text" class="f-input-field sm sheet-id" name="SHEET_ID" value="${feature.properties.SHEET_ID ?? ""}">
            </div>
            <div class="f-steps-input sm parcel-id">
                <label class="f-txt-field-label sm parcel-id">Parcel ID:</label>
                <input type="text" class="f-input-field sm parcel-id" name="PARCEL_ID" value="${feature.properties.PARCEL_ID ?? ""}">
            </div>
            <div class="f-steps-input sm description">
                <label class="f-txt-field-label sm description">Current land use:</label>
                <input type="text" class="f-input-field sm description" name="DESCRIPTION" value="${feature.properties.DESCRIPTION ?? ""}">
            </div>
            <div class="f-steps-input sm area-ha">
                <label class="f-txt-field-label sm area-ha">Hectares:</label>
                <input type="text" class="f-input-field sm area-ha" name="AREA_HA" value="${feature.properties.AREA_HA ?? ""}">
            </div>
            <div class="f-steps-input sm land-cover-class-code">
                <label class="f-txt-field-label sm land-cover-class-code">Land cover class code:</label>
                <input type="text" class="f-input-field sm land-cover-class-code" name="LAND_COVER_CLASS_CODE" value="${feature.properties.LAND_COVER_CLASS_CODE ?? ""}">
            </div>
            <div class="f-steps-input sm shape-area">
                <label class="f-txt-field-label sm shape-area">Shape area:</label>
                <input type="text" class="f-input-field sm shape-area" name="SHAPE_AREA" value="${feature.properties.SHAPE_AREA ?? ""}">
            </div>
            <div class="f-steps-input sm shape-perimeter">
                <label class="f-txt-field-label sm shape-perimeter">Shape perimeter:</label>
                <input type="text" class="f-input-field sm shape-perimeter" name="SHAPE_PERIMETER" value="${feature.properties.SHAPE_PERIMETER ?? ""}">
            </div>
            <div class="f-steps-input sm created-on">
                <label class="f-txt-field-label sm created-on">Created on:</label>
                <input type="text" class="f-input-field sm created-on" name="CREATED_ON" value="${convertDate(feature.properties.CREATED_ON ?? "")}">
            </div>
            <button type="submit" class="modal-submit" href="#">Update</button>
        `;

        modalContent.innerHTML = '';
        modalContent.appendChild(form)

        modal.style.display = 'block';
        modal.style.opacity = 0;
        setTimeout(() => {
            modal.style.opacity = 1;
        }, 10);

        modalClose.onclick = () => {
            modal.style.opacity = 0;
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        };

        // Handles form submissions.
        const modalForm = document.getElementById('modal-form');
        modalForm.addEventListener('submit', function (event) {
            event.preventDefault();
            handleSubmit(map, new FormData(modalForm));
            modal.style.opacity = 0;
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });
    }

    // Main map management function.
    function drawMap(geojson, is_webflow, drawings=undefined){
        mapboxgl.accessToken = 'pk.eyJ1IjoicmVnZW5vLWZhcm0tdGVzdCIsImEiOiJjbHhhNmtyMnYxcDV6MmpzYzUyb3N4MWVzIn0.YYa6sVjYPHGAxpCxqPLdBg';

        const bounds = turf.bbox(geojson);
        const center = turf.centerOfMass(geojson);

        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/light-v11',
            projection: 'globe',
            zoom: 13,
            minZoom: 6,
            center: center.geometry.coordinates
        });

        map.fitBounds(bounds, {
            padding: 20
        });

        map.loadImage('https://uploads-ssl.webflow.com/660bcbc48b7009afef8be06d/6669cc4fa365d2efac2b2463_check-circle.png', (error, image) => {
            if (error) throw error;
            map.addImage('checkbox-image', image);
        });

        map.on('load', () => {
            map.addSource('farm', {
                type: 'geojson',
                data: geojson
            });
            if (is_webflow) {
                updateTable(map);
            }

            map.addLayer({
                'id': 'farms',
                'type': 'fill',
                'source': 'farm',
                'layout': {},
                'paint': {
                    'fill-color': [
                        'case',
                        ['has', 'CROP'], '#31A56C',
                        ['match',
                            ['get', 'DESCRIPTION'],
                            'Arable Land', '#F7E16B',
                            'Permanent Grassland', '#97E374',
                            'Woodland', '#508936',
                            'Scrub - Ungrazeable', '#E9E9E9',
                            'Pond', "#5CC7E7",
                            'Farmyards', '#DC772F',
                            'Farm Building', '#DC772F',
                            'Metalled track', '#B7B7B7',
                            'Track - Natural Surface', '#CD9D55',
                            'Residential dwelling, House', "#DC772F",
                            '#4c9370'
                        ]
                    ],
                    'fill-opacity': [
                        'case',
                        ['has', 'CROP'], 1.0,
                        ['match',
                            ['get', 'DESCRIPTION'],
                            'Farm Building', 1.0,
                            'Residential dwelling, House', 1.0,
                            0.3
                        ]
                    ]
                }
            });
            map.addLayer({
                'id': 'farm-outlines',
                'type': 'line',
                'source': 'farm',
                'layout': {},
                'paint': {
                    'line-color': [
                        'case',
                        ['has', 'CROP'], '#BADDCB',
                        ['match',
                            ['get', 'DESCRIPTION'],
                            'Arable Land', '#F7E16B',
                            'Permanent Grassland', '#97E374',
                            'Woodland', '#508936',
                            'Scrub - Ungrazeable', '#E9E9E9',
                            'Pond', "#5CC7E7",
                            'Farmyards', '#DC772F',
                            'Farm Building', '#DC772F',
                            'Metalled track', '#B7B7B7',
                            'Track - Natural Surface', '#CD9D55',
                            'Residential dwelling, House', "#DC772F",
                            '#4c9370'
                        ]
                    ],
                    'line-width': 3
                }
            });

            map.addLayer({
                'id': 'crop-checkbox',
                'type': 'symbol',
                'source': 'farm',
                'layout': {
                    'icon-image': 'checkbox-image',
                    'icon-size': 0.05,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'visibility': 'visible'
                },
                'filter': ['has', 'CROP']
            });

            // Attach basic popup to display land use on map.
            map.on('click', 'farms', (e) => {
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(e.features[0].properties.DESCRIPTION ?? "Hedgerow")
                    .addTo(map);
            });

            map.on('mouseenter', 'farms', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'farms', () => {
                map.getCanvas().style.cursor = '';
            });

            // Attach drawing functions to map.
            if (is_webflow) {
                draw = new MapboxDraw({
                    displayControlsDefault: false,
                    controls: {
                        point: true,
                        line_string: true,
                        polygon: true,
                        trash: true
                    }
                });
                map.addControl(draw);
            }

            // TODO: Clarify the purpose of this, and if we
            // want it in Glide.
            if (drawings) {
                drawings.features.forEach(drawing => {
                    draw.add(drawing);
                })
            }

            map.on('draw.create', updateArea);
            map.on('draw.delete', updateArea);
            map.on('draw.update', updateArea);

            function updateArea(e) {
                const data = draw.getAll();
                const answer = document.getElementById('calculated-area');
                if (data.features.length > 0) {
                    const area = turf.area(data);
                    const rounded_area = Math.round(area * 100) / 100;
                } else {
                    if (e.type !== 'draw.delete')
                        window.alert('Click the map to draw a polygon.');
                }
            }

            // Attach modal opening function to map.
            if (is_webflow) {
                map.on('click', (e) => {

                    let features = [];

                    const clickPoint = {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [e.lngLat.lng, e.lngLat.lat]
                        }
                    };

                    const drawFeatures = draw.getAll().features;
                    const tolerance = 0.02 // kilometres tolerance

                    drawFeatures.forEach(feature => {
                        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                            if (turf.booleanPointInPolygon(clickPoint, feature)) {
                                features.push(feature);
                            }
                        }
                        else if (feature.geometry.type === 'LineString') {
                            if (turf.nearestPointOnLine(feature, clickPoint).properties.dist <= tolerance) {
                                features.push(feature);
                            }
                        }
                        else if (feature.geometry.type === 'Point') {
                            if (turf.distance(clickPoint, feature) <= tolerance) {
                                features.push(feature);
                            }
                        }
                    });

                    if (features.length > 0) {
                        openModal(features[0], drawFeatures, map);
                    }
                    else {
                        const bbox = [
                            [e.point.x - 5, e.point.y - 5],
                            [e.point.x + 5, e.point.y + 5]
                        ];

                        features = map.queryRenderedFeatures(bbox, {
                            layers: ['farms']
                        });

                        if (features.length > 0) {
                            features.sort((a, b) => {
                                if ('length' in a && 'length' in b) return 0;
                                if ('length' in a) return -1;
                                if ('length' in b) return 1;
                                return 0;
                            });
                            openModal(features[0], geojson, map);
                        }
                    }
                });
            }

            setInterval(function() {
                map.resize();
            }, 1000);

            // Update MemberStack with merged drawings and map data.
            window.saveGeojson = async function() {
                const coreFeatures = map.getSource('farm')._data;
                coreFeatures.features.forEach(feature => {
                    feature.properties.collection = 'map';
                });

                let drawFeatures = draw.getAll();
                drawFeatures.features.forEach(feature => {
                    feature.properties.collection = 'drawings';
                });

                if (coreFeatures.features.length !== 0 && drawFeatures.features.length !== 0) {
                    coreFeatures.features.push(...drawFeatures.features);
                }

                try {
                    await window.$memberstackDom.updateMemberJSON({json: coreFeatures})
                } catch (error) {
                    console.error('Error sending to Memberstack:', error);
                }
            }
        });
    }

    // Main script thread starts.
    async function getGeoJSON(sbiNumber, is_webflow) {
        let geojson;

        if (is_webflow) {
            // Try retrieving data from MemberStack.
            try {
                let memberstackData = await window.$memberstackDom.getMemberJSON();
                if (memberstackData.data.hasOwnProperty('features')) {
                    geojson = memberstackData.data;
                }
            } catch (error) {
                console.warn("Couldn't fetch geojson from MemberStack:", error);
            }
        }

        if (!geojson) {
            let sbi = sbiNumber;
            if (!sbi) {
                if (is_webflow) {
                    try {f
                        const memberstackSBI = await window.$memberstackDom.getCurrentMember()
                        sbi = memberstackSBI.data.customFields.sbi
                    } catch (e){
                        console.warn("No existing SBI in MemberStack")
                    }
                } else {
                    // TODO - handle farms with no SBIs gracefully.
                }
            }
            try {
                const sbis = sbi.split(", ");
                let geojsonMerged = {};
                for (const sbi1 of sbis) {
                    const response = await fetch(`https://eu-west-1.aws.data.mongodb-api.com/app/application-0-npilpbx/endpoint/rpadata?SBI=${sbi1}&first=&last=&email=`);
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    geojson = await response.json();
                    if (geojsonMerged.features === undefined) {
                        geojsonMerged = geojson
                    } else {
                        geojsonMerged.features.push(...geojson.features)
                    }
                }
                geojson.features = geojsonMerged.features.filter(feature => feature.properties.AREA_HA > 0.1);

                if (is_webflow) {
                    // Save merged GeoJSON to MemberStack.
                    try {
                        await window.$memberstackDom.updateMemberJSON({json: geojson})
                    } catch (error) {
                        console.warn("Couldn't send geojson to MemberStack:", error);
                    }
                    // Save total hectares to a MemberStack custom field.
                    try {
                        const customFields = {
                            'total-hectares': geojsonMerged["total_ha"]
                        };
                        // Update current member's custom fields
                        await window.$memberstackDom.updateMember({
                            customFields
                        });
                    } catch (error) {
                        console.warn("Couldn't save total hectares to MemberStack:", error);
                    }
                }

            } catch (error) {
                window.alert("No data found for this SBI number. Please try again.")
                console.error('There was a problem with the fetch operation:', error);
            }
        }

        if (geojson) {

            // Split out incoming drawings and map data.
            const mapData = geojson.features.filter(feature => feature.properties.collection !== 'drawings');
            const drawings = geojson.features.filter(feature => feature.properties.collection === 'drawings');

            const mapGeojson = {
                ...geojson,
                features: mapData
            };
            if (drawings.length > 0) {
                const drawingGeojson = {
                    ...geojson,
                    features: drawings
                };
                drawMap(mapGeojson, is_webflow, drawingGeojson);
            }
            else {
                drawMap(mapGeojson, is_webflow);
            }
        }
    }

    let draw;
    const resources = [
        { type: 'style', url: 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css' },
        { type: 'script', url: 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js' },
        { type: 'script', url: 'https://unpkg.com/@turf/turf@6/turf.min.js' },
        { type: 'style', url: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.css' },
        { type: 'script', url: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.js' }
    ];

    function loadResource(resource) {
        return new Promise((resolve, reject) => {
            let element;
            if (resource.type === 'script') {
                element = document.createElement('script');
                element.src = resource.url;
            } else if (resource.type === 'style') {
                element = document.createElement('link');
                element.rel = 'stylesheet';
                element.href = resource.url;
            }
            element.onload = resolve;
            element.onerror = reject;
            document.head.appendChild(element);
        });
    }

    function loadAllResources() {
        return Promise.all(resources.map(loadResource));
    }

    loadAllResources()
        .then(() => {
            getGeoJSON(sbiNumber, is_webflow);
        })
        .catch(error => {
            console.error('Error loading resources:', error);
        });
}
