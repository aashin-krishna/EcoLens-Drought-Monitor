"""
Script to export calculated NDVI and VCI rasters from Google Earth Engine
to local GeoTIFF files. Utilizes GEE's direct download API.
"""

import os
import zipfile
import io
import requests
import sys
# Add parent directory to sys.path to resolve root-level config imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ee
import config
from ee_auth import initialize_ee
from calculate_indices import get_roi_polygon, get_historical_ndvi_limits, get_current_ndvi_sentinel, calculate_vci

def download_gee_raster(image, geometry, filename, scale=250):
    """
    Downloads an ee.Image as a local GeoTIFF.
    Downloads via GEE zip URL, extracts it, and saves it.
    """
    print(f"Generating download URL for {filename} (Scale: {scale}m)...")
    try:
        # Get secure download link from GEE
        download_url = image.getDownloadURL({
            'name': filename,
            'scale': scale,
            'region': geometry,
            'filePerBand': False,
            'format': 'GeoTIFF'
        })
        
        print(f"Requesting data from Google Earth Engine...")
        response = requests.get(download_url, stream=True)
        
        if response.status_code == 200:
            print("Extracting GeoTIFF file...")
            # GEE returns a zip file containing the GeoTIFF
            z = zipfile.ZipFile(io.BytesIO(response.content))
            
            # Find the geotiff filename in the zip
            tif_filename = [name for name in z.namelist() if name.endswith('.tif')][0]
            
            # Save extracted geotiff to output dir
            output_filepath = os.path.join(config.OUTPUT_DIR, f"{filename}.tif")
            with open(output_filepath, 'wb') as f:
                f.write(z.read(tif_filename))
                
            print(f"[+] Successfully saved GeoTIFF to: {output_filepath}")
            return output_filepath
        else:
            print(f"[!] GEE Server error: {response.text}")
            return None
    except Exception as e:
        print(f"[!] Failed to download raster: {e}")
        return None

def main():
    if not initialize_ee():
        print("[!] GEE not initialized. Cannot run export script.")
        return

    # Define region of interest geometry
    roi = get_roi_polygon()
    
    # Calculate target indices
    ndvi_min, ndvi_max = get_historical_ndvi_limits(roi, config.TARGET_MONTH)
    ndvi_current = get_current_ndvi_sentinel(roi, config.TARGET_YEAR, config.TARGET_MONTH)
    vci = calculate_vci(ndvi_current, ndvi_min, ndvi_max)
    
    # Download current NDVI and VCI rasters
    # Scaled at 5000m to fit within standard GEE direct-download size limits for a whole country
    download_gee_raster(ndvi_current, roi, f"ndvi_{config.ROI_NAME}_{config.TARGET_YEAR}_{config.TARGET_MONTH:02d}", scale=5000)
    download_gee_raster(vci, roi, f"vci_{config.ROI_NAME}_{config.TARGET_YEAR}_{config.TARGET_MONTH:02d}", scale=5000)

if __name__ == "__main__":
    main()
