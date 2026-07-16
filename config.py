"""
Configuration file for Drought Severity Mapping using VCI & NDVI.
Defines coordinates, shapefile paths, and baseline analysis parameters.
"""

import os

# Base Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data Output Directory
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# -------------------------------------------------------------------------
# Shapefile and Map Center Settings
# -------------------------------------------------------------------------
SHP_PATH = os.path.join(BASE_DIR, "2011_dist", "2011_Dist.shp")
ROI_NAME = "India"
MAP_CENTER = [20.5937, 78.9629]  # Center of India [Latitude, Longitude]
MAP_ZOOM = 5

# Bounding box coordinates for fallback spatial filtering [min_lon, min_lat, max_lon, max_lat]
BBOX = [68.1, 6.5, 97.4, 35.7]

# -------------------------------------------------------------------------
# Analysis Timeframes
# -------------------------------------------------------------------------
TARGET_YEAR = 2025
TARGET_MONTH = 8  # August (Late monsoon / agricultural monitoring period)

HISTORICAL_START_YEAR = 2015
HISTORICAL_END_YEAR = 2024

CLOUD_FILTER = 25.0

# -------------------------------------------------------------------------
# Export and Styling Settings
# -------------------------------------------------------------------------
NDVI_PALETTE = ['#FFFFFF', '#CE7E45', '#DF923D', '#F1B555', '#FCD163', '#99B718', '#74A00F', '#52870F', '#306912', '#144B0F', '#09360D']
VCI_PALETTE = ['#D73027', '#F46D43', '#FDAE61', '#FEE08B', '#D9EF8B', '#A6D96A', '#66BD63', '#1A9850']

DROUGHT_CLASSES = {
    "Extreme Drought": {"max_val": 20, "color": "#d73027"},
    "Severe Drought": {"max_val": 35, "color": "#f46d43"},
    "Moderate Drought": {"max_val": 50, "color": "#fdae61"},
    "Mild Stress": {"max_val": 70, "color": "#a6d96a"},
    "Optimal/Normal": {"max_val": 100, "color": "#1a9850"}
}
