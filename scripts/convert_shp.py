"""
Script to parse the local shapefile (2011_Dist.shp) and convert it
to a web-optimized, detailed district-level GeoJSON boundary with mock data
so that the local dashboard displays individual districts of India.
"""

import os
import sys
import numpy as np

# Add parent directory to sys.path to resolve root-level config imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config

def convert_shapefile():
    shp_path = os.path.join(config.BASE_DIR, "2011_dist", "2011_Dist.shp")
    out_path = os.path.join(config.BASE_DIR, "dashboard", "data", "boundary.geojson")
    
    if not os.path.exists(shp_path):
        print(f"[!] Shapefile not found at: {shp_path}")
        return False
        
    print(f"Initializing shapefile converter for: 2011_Dist.shp...")
    try:
        import geopandas as gpd
    except ImportError:
        print("[!] geopandas library is not installed. Installing it is required to process local shapefiles.")
        print("Please run: pip install geopandas")
        return False
        
    try:
        # Read the local shapefile
        print("Reading district shapefile layers (this may take a moment)...")
        gdf = gpd.read_file(shp_path)
        
        # Ensure correct projection for web maps (Leaflet requires EPSG:4326)
        if gdf.crs and gdf.crs != "EPSG:4326":
            print(f"Reprojecting shapefile from {gdf.crs} to EPSG:4326 (WGS84)...")
            gdf = gdf.to_crs("EPSG:4326")
            
        # Simplify geometry slightly (0.015 degrees tolerance ~ 1.6km)
        # Keeps file sizes small so Leaflet renders the 640+ districts instantly
        print("Simplifying geometry layers for browser performance...")
        gdf["geometry"] = gdf.geometry.simplify(0.015, preserve_topology=True)
        
        # Add simulated index values to each district based on geographical center
        # This makes the offline preview display realistic drought patterns of India
        print("Generating mock vegetation index properties for each district...")
        ndvis_wet = []
        ndvis_dry = []
        vcis = []
        
        for idx, row in gdf.iterrows():
            geom = row['geometry']
            if geom is not None and not geom.is_empty:
                centroid = geom.centroid
                lon, lat = centroid.x, centroid.y
            else:
                lon, lat = 78.0, 20.0 # Default center
                
            # Geographic logic (West/Thar Desert is dry, Indo-Gangetic and Ghats are green)
            is_desert = (lon > 68.5 and lon < 75.5 and lat > 23.0 and lat < 30.0)
            is_lush = (lon > 77.0 and lon < 91.0 and lat > 22.0 and lat < 28.0) or (lat < 13.0) or (lon > 92.0)
            
            # Baseline NDVI values
            if is_desert:
                ndvi_wet = 0.15 + np.random.rand() * 0.08
                ndvi_dry = 0.07 + np.random.rand() * 0.04
            elif is_lush:
                ndvi_wet = 0.65 + np.random.rand() * 0.18
                ndvi_dry = 0.35 + np.random.rand() * 0.12
            else:
                ndvi_wet = 0.42 + np.random.rand() * 0.12
                ndvi_dry = 0.22 + np.random.rand() * 0.08
                
            # Clamp limits and compute VCI
            ndvi_max = ndvi_wet + (np.random.rand() * 0.05)
            ndvi_min = np.min([ndvi_dry - (np.random.rand() * 0.03), 0.15])
            vci = ((ndvi_dry - ndvi_min) / (ndvi_max - ndvi_min)) * 100
            vci = max(0, min(100, vci))
            
            ndvis_wet.append(round(ndvi_wet, 2))
            ndvis_dry.append(round(ndvi_dry, 2))
            vcis.append(round(vci, 1))
            
        gdf["ndvi_wet"] = ndvis_wet
        gdf["ndvi_dry"] = ndvis_dry
        gdf["vci"] = vcis
        
        # Save to dashboard
        print(f"Exporting detailed district layers to GeoJSON format...")
        gdf.to_file(out_path, driver="GeoJSON")
        print(f"[+] Successfully converted shapefile and saved to: {out_path}")
        return True
    except Exception as e:
        print(f"\n[!] Failed to process shapefile: {e}")
        return False

if __name__ == "__main__":
    convert_shapefile()
