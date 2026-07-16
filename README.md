# EcoLens: Drought Severity Mapping using VCI & NDVI

EcoLens is a geospatial monitoring platform designed to analyze, map, and visualize regional vegetation stress and agricultural drought conditions using multi-temporal satellite observations. 

This repository provides an end-to-end Python pipeline leveraging the Google Earth Engine (GEE) API to calculate indices alongside a self-contained, interactive web dashboard for presenting analytical findings.

---

## Key Features

* **Vegetation Condition Index (VCI)**: Standardizes current vegetation health against a 10-year historical pixel-wise minimum/maximum envelope calculated from MODIS datasets (2015-2024).
* **Interactive Web Dashboard**:
  - **Leaflet Map Overlay**: Responsive spatial grid showing localized coordinates, indices, and severity categories.
  - **State-wise Filtering**: Dropdown selector to zoom to specific state boundaries, dim unrelated regions, and update charts dynamically.
  - **Timeline Analytics**: Shaded multi-year baseline envelope plots using Chart.js.
* **Production GIS Exports**: Export computed indices directly as geo-referenced GeoTIFF files or generate shareable interactive Folium HTML maps.

---

## Repository Structure

```text
drought-severity-mapping/
├── .gitignore                   # Exclude virtual environments and local GeoTIFF outputs
├── README.md                    # Project documentation
├── requirements.txt             # Python dependencies
├── config.py                    # Bounding boxes, target dates, and styling variables
├── run.bat                      # Windows launcher script
├── run_dashboard.bat            # Launches local web server for dashboard
├── run_calculations.bat        # Runs Python calculation scripts
├── install_requirements.bat     # Installs dependencies
├── scripts/
│   ├── ee_auth.py               # Earth Engine authentication wizard
│   ├── calculate_indices.py     # Main calculations script (NDVI, historical min/max, VCI)
│   ├── export_geotiff.py        # GEE GeoTIFF downloading engine
│   └── generate_folium_map.py   # Folium interactive map exporter
└── dashboard/                   # Web Dashboard
    ├── index.html               # Main dashboard UI
    ├── style.css                # Premium dark-theme stylesheets
    ├── app.js                   # Interactive Leaflet mapping and Chart.js code
    └── data/
        ├── boundary.geojson     # Study region vector polygon
        └── sample_stats.json    # Pre-computed statistics
```

---

## Scientific Methodology

### 1. NDVI (Normalized Difference Vegetation Index)
NDVI measures chlorophyll absorption of red light and reflection of near-infrared (NIR) light:

$$NDVI = \frac{NIR - Red}{NIR + Red}$$

* MODIS Bands: Pre-computed at source (`MOD13Q1` collection).

### 2. VCI (Vegetation Condition Index)
VCI scales the target NDVI against the worst-ever and best-ever NDVI values observed for that pixel and calendar month historically:

$$VCI = \frac{NDVI_{\text{current}} - NDVI_{\text{min}}}{NDVI_{\text{max}} - NDVI_{\text{min}}} \times 100$$

#### Drought Severity Classification

| VCI Range | Severity Classification | Visual Color |
| :--- | :--- | :--- |
| VCI &le; 20 | Extreme Drought | Red (`#d73027`) |
| 20 < VCI &le; 35 | Severe Drought | Orange (`#f46d43`) |
| 35 < VCI &le; 50 | Moderate Drought | Light Yellow (`#fdae61`) |
| 50 < VCI &le; 70 | Mild Stress | Light Green (`#a6d96a`) |
| VCI > 70 | Normal / Wet Condition | Dark Green (`#1a9850`) |

---

## Quick Start Guide

### Setup & Launch (Windows)

1. Double-click the **`run.bat`** file in the root folder.
2. Select **`[3] Install requirements.txt`** to install dependencies (runs `pip install -r requirements.txt`).
3. Select **`[1] Launch Interactive Web Dashboard`**. This spins up a local server and opens your browser at `http://localhost:8080` to demonstrate the dashboard instantly with pre-computed statistics.

---

## Google Earth Engine Data Extraction

To run calculations with actual satellite imagery (Option `[2]` in `run.bat`):

1. **Sign Up for GEE**: Register a free developer account at [signup.earthengine.google.com](https://signup.earthengine.google.com/).
2. **Authorize GEE**: In your command prompt, run:
   ```bash
   earthengine authenticate
   ```
3. **Execute calculations**:
   ```bash
   python scripts/calculate_indices.py
   ```
   This will run cloud processing and save regional statistics to `dashboard/data/sample_stats.json`.
4. **Export GeoTIFF maps**:
   ```bash
   python scripts/export_geotiff.py
   ```
   Saves geo-referenced GeoTIFF files to `data/output/` for import into QGIS or ArcGIS.
5. **Export Folium map**:
   ```bash
   python scripts/generate_folium_map.py
   ```
   Generates a shareable `drought_map.html` under `data/output/`.

---

## Configuration

You can change the analysis region, years, and parameters by modifying **`config.py`**:
* **`SHP_PATH`**: Path to the study area boundary shapefile.
* **`TARGET_YEAR` / `TARGET_MONTH`**: Modify the evaluation month (default: August 2025).
* **`HISTORICAL_START_YEAR` / `HISTORICAL_END_YEAR`**: Shift the baseline timeline range.
