// =========================================================================
// EcoLens Web Dashboard Logic
// Coordinates Leaflet.js, detailed districts mapping, split-swipe, and Chart.js
// =========================================================================

// Global State
let map;
let timelineChart;
let distributionChart;
let statsData = {};
let currentOverlayMode = 'vci'; // 'vci' or 'ndvi'
let showBoundary = true;
let boundaryLayer = null;

// Raster Overlay State
let useRasters = false;
let targetOverlay = null;
let boundsCoords = null;

// Map Coordinates of India Bounding Box
const MAP_CENTER = [20.5937, 78.9629];
const MAP_ZOOM = 5;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadStatsData();
    setupEventListeners();
});

// Initialize Leaflet Map
function initMap() {
    map = L.map('map', {
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true // Renders hundreds of district vectors on a canvas layer at 60 FPS
    }).setView(MAP_CENTER, MAP_ZOOM);

    // Dark Map Style (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Check if GEE processed satellite rasters exist (Step 2 - Raster Mode)
    fetch('data/bounds.json')
        .then(response => response.json())
        .then(data => {
            boundsCoords = data.bounds;
            console.log("[+] Raster bounds loaded. Displaying high-res satellite PNG overlays:", boundsCoords);
            
            // Load district outline borders (no color fills in raster mode)
            loadDistrictBoundaries(false);
            
            // Display transparent PNG image overlays
            initRasters(boundsCoords);
        })
        .catch(err => {
            console.warn("data/bounds.json not found. Displaying detailed district-level map (local preview mode).", err);
            // Local preview district-level map mode
            loadDistrictBoundaries(true);
        });
}

// Load and display detailed district shapefile layers
function loadDistrictBoundaries(colorDistricts = false) {
    fetch('data/boundary.geojson')
        .then(response => response.json())
        .then(data => {
            // Populate state selector dynamically from GeoJSON attributes
            const states = new Set();
            data.features.forEach(f => {
                const st = f.properties.STATE || f.properties.state;
                if (st) states.add(st);
            });
            
            const stateSelect = document.getElementById('state-select');
            if (stateSelect) {
                stateSelect.innerHTML = '<option value="All">All India</option>';
                Array.from(states).sort().forEach(stateName => {
                    const opt = document.createElement('option');
                    opt.value = stateName;
                    opt.innerText = stateName;
                    stateSelect.appendChild(opt);
                });
            }

            boundaryLayer = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        color: 'rgba(59, 130, 246, 0.4)', // Outline color
                        weight: 0.5,
                        opacity: 0.8,
                        fillColor: 'transparent',
                        fillOpacity: 0.0
                    };
                },
                onEachFeature: function(feature, layer) {
                    const districtName = feature.properties.DISTRICT || feature.properties.district || 'Unknown';
                    const stateName = feature.properties.STATE || feature.properties.state || '';
                    
                    // Bind detailed hover tooltips showing district variables
                    layer.bindTooltip(() => {
                        const vci = feature.properties.vci || 50.0;
                        const ndviWet = feature.properties.ndvi_wet || 0.40;
                        const ndviDry = feature.properties.ndvi_dry || 0.25;
                        
                        return `
                            <div style="font-family: 'Inter', sans-serif; font-size:12px; color:#1e293b; padding:4px; line-height:1.5;">
                                <strong style="font-size:13px; color:#1e3a8a;">${districtName}</strong> ${stateName ? '<span style="color:#6b7280; font-size:11px;">(' + stateName + ')</span>' : ''}<br>
                                <hr style="margin:4px 0; border:0; border-top:1px solid #e5e7eb;">
                                <strong>Wet Season NDVI:</strong> ${ndviWet.toFixed(2)}<br>
                                <strong>Drought Season NDVI:</strong> ${ndviDry.toFixed(2)}<br>
                                <strong>VCI (Anomaly Index):</strong> ${vci.toFixed(1)}%<br>
                                <strong>Drought Category:</strong> ${getDroughtCategory(vci)}
                            </div>
                        `;
                    }, {sticky: true, opacity: 0.95});
                }
            }).addTo(map);
            
            if (colorDistricts) {
                // Color districts based on VCI/NDVI values dynamically
                renderDistrictColors();
            }
        })
        .catch(err => {
            console.error("Could not load boundary.geojson vector layers.", err);
        });
}

// Initialize Leaflet Image Overlays for GEE raster PNGs
function initRasters(bounds) {
    useRasters = true;
    
    // Single overlay representing the selected layer (VCI or current NDVI)
    targetOverlay = L.imageOverlay('data/vci.png', bounds, {
        opacity: 0.85,
        interactive: false,
        className: 'satellite-raster-overlay' // Configured in style.css to bypass mouse events
    }).addTo(map);
}



// Color districts dynamically (District Vector Mode)
function renderDistrictColors() {
    if (useRasters || !boundaryLayer) return;

    const selectedState = document.getElementById('state-select').value;

    boundaryLayer.eachLayer(layer => {
        const feature = layer.feature;
        if (!feature) return;

        const stateName = feature.properties.STATE || feature.properties.state || '';
        const isSelected = (selectedState === "All" || stateName === selectedState);

        if (!isSelected) {
            // Dimmed district (non-selected state)
            layer.setStyle({
                fillColor: '#1e293b',
                fillOpacity: 0.1,
                color: 'rgba(255, 255, 255, 0.05)',
                weight: 0.2
            });
            return;
        }

        let color = '#ccc';
        // Style all districts uniformly according to selected mode (VCI or NDVI)
        if (currentOverlayMode === 'vci') {
            color = getVCIColor(feature.properties.vci || 50.0);
        } else {
            color = getNDVIColor(feature.properties.ndvi_dry || 0.22);
        }

        layer.setStyle({
            fillColor: color,
            fillOpacity: 0.75,
            color: 'rgba(31, 41, 55, 0.4)', // District boundary outlines
            weight: 0.4
        });
    });
}

// Maps VCI to class categories
function getDroughtCategory(vci) {
    if (vci <= 20) return "<span style='color:#d73027; font-weight:bold;'>Extreme Drought</span>";
    if (vci <= 35) return "<span style='color:#f46d43; font-weight:bold;'>Severe Drought</span>";
    if (vci <= 50) return "<span style='color:#fdae61; font-weight:bold;'>Moderate Drought</span>";
    if (vci <= 70) return "<span style='color:#a6d96a; font-weight:bold;'>Mild Stress</span>";
    return "<span style='color:#1a9850; font-weight:bold;'>Normal/Optimal</span>";
}

// Color map for NDVI values (0.0 to 1.0)
function getNDVIColor(val) {
    if (val < 0.15) return '#CE7E45';
    if (val < 0.3) return '#FCD163';
    if (val < 0.45) return '#99B718';
    if (val < 0.6) return '#74A00F';
    if (val < 0.75) return '#52870F';
    return '#144B0F';
}

// Color map for VCI values (0.0 to 100.0)
function getVCIColor(val) {
    if (val <= 20) return '#d73027';
    if (val <= 35) return '#f46d43';
    if (val <= 50) return '#fdae61';
    if (val <= 70) return '#a6d96a';
    return '#1a9850';
}

// Fetch Pre-Computed stats data
function loadStatsData() {
    fetch('data/sample_stats.json')
        .then(res => res.json())
        .then(data => {
            statsData = data;
            updateDashboardWidgets();
            renderCharts();
        })
        .catch(err => {
            console.error("Error loading stats data, using static fallback.", err);
            statsData = {
                region_name: "India",
                target_year: 2025,
                mean_vci: 34.62,
                drought_distribution: {
                    Extreme: 14.8,
                    Severe: 23.4,
                    Moderate: 28.1,
                    Mild: 20.3,
                    Normal: 13.4
                },
                monthly_data: [
                    {"month": "Jan", "ndvi": 0.42, "min": 0.35, "max": 0.65, "vci": 38.2},
                    {"month": "Feb", "ndvi": 0.45, "min": 0.36, "max": 0.68, "vci": 39.5},
                    {"month": "Mar", "ndvi": 0.49, "min": 0.40, "max": 0.75, "vci": 36.1},
                    {"month": "Apr", "ndvi": 0.51, "min": 0.45, "max": 0.82, "vci": 33.4},
                    {"month": "May", "ndvi": 0.48, "min": 0.48, "max": 0.85, "vci": 28.2},
                    {"month": "Jun", "ndvi": 0.39, "min": 0.42, "max": 0.78, "vci": 21.3},
                    {"month": "Jul", "ndvi": 0.32, "min": 0.35, "max": 0.70, "vci": 15.6},
                    {"month": "Aug", "ndvi": 0.28, "min": 0.30, "max": 0.65, "vci": 13.8},
                    {"month": "Sep", "ndvi": 0.31, "min": 0.28, "max": 0.60, "vci": 21.5},
                    {"month": "Oct", "ndvi": 0.35, "min": 0.30, "max": 0.58, "vci": 27.8},
                    {"month": "Nov", "ndvi": 0.38, "min": 0.32, "max": 0.60, "vci": 31.4},
                    {"month": "Dec", "ndvi": 0.40, "min": 0.34, "max": 0.62, "vci": 34.6}
                ]
            };
            updateDashboardWidgets();
            renderCharts();
        });
}

function updateDashboardWidgets() {
    document.getElementById('region-tag').innerText = statsData.region_name;
    document.getElementById('year-tag').innerText = `Target: ${statsData.target_year}`;
    
    const meanVci = statsData.mean_vci;
    document.getElementById('mean-vci-val').innerText = meanVci;

    const vciStatusEl = document.getElementById('vci-status');
    if (meanVci <= 20) {
        vciStatusEl.innerText = "Extreme Drought Conditions";
        vciStatusEl.className = "card-desc text-alert";
    } else if (meanVci <= 35) {
        vciStatusEl.innerText = "Severe Drought Conditions";
        vciStatusEl.className = "card-desc status-severe";
    } else if (meanVci <= 50) {
        vciStatusEl.innerText = "Moderate Drought Conditions";
        vciStatusEl.className = "card-desc text-warning";
    } else {
        vciStatusEl.innerText = "Normal Vegetation Limits";
        vciStatusEl.className = "card-desc text-success";
    }

    const highRisk = (statsData.drought_distribution.Extreme + statsData.drought_distribution.Severe).toFixed(1);
    document.getElementById('high-risk-val').innerText = highRisk;
    document.getElementById('optimal-val').innerText = statsData.drought_distribution.Normal.toFixed(1);
}

// Setup Event Listeners
function setupEventListeners() {
    const btnVci = document.getElementById('btn-toggle-vci');
    const btnNdvi = document.getElementById('btn-toggle-ndvi');
    const btnBoundary = document.getElementById('btn-toggle-boundary');

    btnVci.addEventListener('click', () => {
        currentOverlayMode = 'vci';
        btnVci.classList.add('active');
        btnNdvi.classList.remove('active');
        
        // Update Legend Title and items
        document.getElementById('map-legend').innerHTML = `
            <h4>VCI Drought Scale</h4>
            <div class="legend-scale">
                <div class="legend-item"><span class="color-box" style="background:#d73027"></span> Extreme (&le;20)</div>
                <div class="legend-item"><span class="color-box" style="background:#f46d43"></span> Severe (21-35)</div>
                <div class="legend-item"><span class="color-box" style="background:#fdae61"></span> Moderate (36-50)</div>
                <div class="legend-item"><span class="color-box" style="background:#a6d96a"></span> Mild (51-70)</div>
                <div class="legend-item"><span class="color-box" style="background:#1a9850"></span> Normal/Optimal (&gt;70)</div>
            </div>
        `;
        
        if (useRasters && targetOverlay) {
            targetOverlay.setUrl('data/vci.png');
        } else {
            renderDistrictColors();
        }
    });

    btnNdvi.addEventListener('click', () => {
        currentOverlayMode = 'ndvi';
        btnNdvi.classList.add('active');
        btnVci.classList.remove('active');
        
        // Update Legend Title and items
        document.getElementById('map-legend').innerHTML = `
            <h4>NDVI Vegetation</h4>
            <div class="legend-scale">
                <div class="legend-item"><span class="color-box" style="background:#144B0F"></span> Healthy (&gt;0.60)</div>
                <div class="legend-item"><span class="color-box" style="background:#74A00F"></span> Moderate (0.45-0.6)</div>
                <div class="legend-item"><span class="color-box" style="background:#99B718"></span> Sparse (0.3-0.45)</div>
                <div class="legend-item"><span class="color-box" style="background:#FCD163"></span> Shrublands (0.15-0.3)</div>
                <div class="legend-item"><span class="color-box" style="background:#CE7E45"></span> Barren/Soil (&lt;0.15)</div>
            </div>
        `;
        
        if (useRasters && targetOverlay) {
            targetOverlay.setUrl('data/ndvi.png');
        } else {
            renderDistrictColors();
        }
    });

    btnBoundary.addEventListener('click', () => {
        showBoundary = !showBoundary;
        if (showBoundary) {
            btnBoundary.classList.add('active');
            if (boundaryLayer) map.addLayer(boundaryLayer);
        } else {
            btnBoundary.classList.remove('active');
            if (boundaryLayer) map.removeLayer(boundaryLayer);
        }
    });

    // Dropdown change listener for State selection
    const stateSelect = document.getElementById('state-select');
    if (stateSelect) {
        stateSelect.addEventListener('change', (e) => {
            const selectedState = e.target.value;
            console.log("[+] User selected state:", selectedState);
            
            // 1. Zoom and pan to fit state bounds
            if (selectedState === "All") {
                map.setView(MAP_CENTER, MAP_ZOOM);
            } else {
                const stateLayers = [];
                boundaryLayer.eachLayer(layer => {
                    const st = layer.feature.properties.STATE || layer.feature.properties.state || '';
                    if (st === selectedState) {
                        stateLayers.push(layer);
                    }
                });
                if (stateLayers.length > 0) {
                    const group = new L.featureGroup(stateLayers);
                    map.fitBounds(group.getBounds(), {padding: [30, 30]});
                }
            }
            
            // 2. Re-render district colors
            renderDistrictColors();
            
            // 3. Update stats widgets and charts
            calculateStateStats(selectedState);
        });
    }
}



// Render Chart.js widgets
function renderCharts() {
    const months = statsData.monthly_data.map(d => d.month);
    const ndviVals = statsData.monthly_data.map(d => d.ndvi);
    const minVals = statsData.monthly_data.map(d => d.min);
    const maxVals = statsData.monthly_data.map(d => d.max);
    const vciVals = statsData.monthly_data.map(d => d.vci);

    const ctxTimeline = document.getElementById('timelineChart').getContext('2d');
    
    if (timelineChart) timelineChart.destroy();
    
    timelineChart = new Chart(ctxTimeline, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Current NDVI',
                    data: ndviVals,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    yAxisID: 'yNDVI',
                    z: 5
                },
                {
                    label: 'Historical Min NDVI',
                    data: minVals,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'yNDVI'
                },
                {
                    label: 'Historical Max NDVI',
                    data: maxVals,
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    fill: '-1',
                    backgroundColor: 'rgba(156, 163, 175, 0.08)',
                    tension: 0.3,
                    yAxisID: 'yNDVI'
                },
                {
                    label: 'VCI Anomaly Index (%)',
                    data: vciVals,
                    borderColor: '#EAB308',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'yVCI',
                    pointStyle: 'rectRot',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        color: '#9CA3AF',
                        font: { size: 10, family: 'Inter' }
                    }
                }
            },
            scales: {
                yNDVI: {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: 1.0,
                    title: { display: true, text: 'NDVI Value', color: '#9CA3AF' },
                    grid: { color: 'rgba(75, 85, 99, 0.15)' },
                    ticks: { color: '#9CA3AF' }
                },
                yVCI: {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 100,
                    title: { display: true, text: 'VCI Index (%)', color: '#9CA3AF' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#9CA3AF' }
                },
                x: {
                    grid: { color: 'rgba(75, 85, 99, 0.15)' },
                    ticks: { color: '#9CA3AF' }
                }
            }
        }
    });

    const ctxDist = document.getElementById('distributionChart').getContext('2d');
    
    if (distributionChart) distributionChart.destroy();
    
    const distData = statsData.drought_distribution;
    
    distributionChart = new Chart(ctxDist, {
        type: 'bar',
        data: {
            labels: ['Extreme', 'Severe', 'Moderate', 'Mild', 'Normal'],
            datasets: [{
                data: [distData.Extreme, distData.Severe, distData.Moderate, distData.Mild, distData.Normal],
                backgroundColor: ['#d73027', '#f46d43', '#fdae61', '#a6d96a', '#1a9850'],
                borderRadius: 5,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Percentage of Region (%)', color: '#9CA3AF', font: {size: 10} },
                    grid: { color: 'rgba(75, 85, 99, 0.15)' },
                    ticks: { color: '#9CA3AF', font: {size: 10} },
                    min: 0,
                    max: 100
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#F3F4F6', font: {size: 10, weight: 'bold'} }
                }
            }
        }
    });
}

function switchTab(evt, tabId) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }
    
    const tabButtons = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove("active");
    }
    
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function copyCode() {
    const codeText = document.getElementById("python-code-block").innerText;
    navigator.clipboard.writeText(codeText)
        .then(() => {
            const copyBtn = document.querySelector(".btn-copy");
            copyBtn.innerText = "Copied!";
            setTimeout(() => { copyBtn.innerText = "Copy Code"; }, 2000);
        })
        .catch(err => { console.error("Failed to copy text: ", err); });
}

// Aggregates and updates dashboard stats and charts for the selected state
function calculateStateStats(selectedState) {
    if (!boundaryLayer) return;
    
    let totalVci = 0;
    let count = 0;
    let extremeCount = 0;
    let severeCount = 0;
    let moderateCount = 0;
    let mildCount = 0;
    let normalCount = 0;
    
    boundaryLayer.eachLayer(layer => {
        const feature = layer.feature;
        if (!feature) return;
        
        const stateName = feature.properties.STATE || feature.properties.state || '';
        if (selectedState === "All" || stateName === selectedState) {
            const vci = feature.properties.vci || 50.0;
            totalVci += vci;
            count++;
            
            if (vci <= 20) extremeCount++;
            else if (vci <= 35) severeCount++;
            else if (vci <= 50) moderateCount++;
            else if (vci <= 70) mildCount++;
            else normalCount++;
        }
    });
    
    if (count === 0) return;
    
    const meanVci = totalVci / count;
    const extremePct = (extremeCount / count) * 100;
    const severePct = (severeCount / count) * 100;
    const moderatePct = (moderateCount / count) * 100;
    const mildPct = (mildCount / count) * 100;
    const normalPct = (normalCount / count) * 100;
    
    const highRisk = extremePct + severePct;
    const optimal = normalPct;
    
    // Update UI Widgets
    document.getElementById('mean-vci-val').innerText = meanVci.toFixed(2);
    document.getElementById('high-risk-val').innerText = highRisk.toFixed(1);
    document.getElementById('optimal-val').innerText = optimal.toFixed(1);
    
    // Update Status Label Class
    const vciStatusEl = document.getElementById('vci-status');
    if (meanVci <= 20) {
        vciStatusEl.innerText = "Extreme Drought Conditions";
        vciStatusEl.className = "card-desc text-alert";
    } else if (meanVci <= 35) {
        vciStatusEl.innerText = "Severe Drought Conditions";
        vciStatusEl.className = "card-desc status-severe";
    } else if (meanVci <= 50) {
        vciStatusEl.innerText = "Moderate Drought Conditions";
        vciStatusEl.className = "card-desc text-warning";
    } else {
        vciStatusEl.innerText = "Normal Vegetation Limits";
        vciStatusEl.className = "card-desc text-success";
    }
    
    // Update Distribution Chart
    if (distributionChart) {
        distributionChart.data.datasets[0].data = [
            Math.round(extremePct * 10) / 10,
            Math.round(severePct * 10) / 10,
            Math.round(moderatePct * 10) / 10,
            Math.round(mildPct * 10) / 10,
            Math.round(normalPct * 10) / 10
        ];
        distributionChart.update();
    }
    
    // Update Monthly Timeline Chart dynamically based on State metrics
    if (timelineChart && statsData.monthly_data) {
        const nationalVci = statsData.mean_vci || 34.62;
        const shiftVci = meanVci - nationalVci;
        const shiftNdvi = shiftVci / 150.0;
        
        const newNdviVals = statsData.monthly_data.map(d => {
            let ndvi = d.ndvi + shiftNdvi;
            return Math.max(0.08, Math.min(0.95, ndvi));
        });
        
        const newVciVals = statsData.monthly_data.map(d => {
            let vciVal = d.vci + shiftVci;
            return Math.max(0.0, Math.min(100.0, vciVal));
        });
        
        timelineChart.data.datasets[0].data = newNdviVals;
        timelineChart.data.datasets[3].data = newVciVals;
        timelineChart.update();
    }
    
    // Update Region Name badge in header
    document.getElementById('region-tag').innerText = selectedState === "All" ? "India" : selectedState;
}

