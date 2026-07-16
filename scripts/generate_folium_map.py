"""
Generates an interactive HTML map using Folium.
Embeds real Google Earth Engine tiles for NDVI and VCI with color palettes and legend.
"""

import os
import folium
import sys
# Add parent directory to sys.path to resolve root-level config imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ee
import config
from ee_auth import initialize_ee
from calculate_indices import get_roi_polygon, get_historical_ndvi_limits, get_current_ndvi_sentinel, calculate_vci

def add_ee_layer(folium_map, ee_image_object, vis_params, name):
    """Helper function to add Google Earth Engine images to a Folium map."""
    map_id_dict = ee.Image(ee_image_object).getMapId(vis_params)
    folium.raster_layers.TileLayer(
        tiles=map_id_dict['tile_fetcher'].url_format,
        attr='Google Earth Engine / Copernicus',
        name=name,
        overlay=True,
        control=True
    ).add_to(folium_map)

def add_legend(folium_map, title, colors, labels):
    """Embeds a HTML legend on the Folium map."""
    legend_html = f'''
     <div style="position: fixed; 
     bottom: 50px; left: 50px; width: 220px; height: auto; 
     border:2px solid grey; z-index:9999; font-size:14px;
     background-color:rgba(255, 255, 255, 0.9);
     border-radius:6px; padding: 10px; box-shadow: 2px 2px 5px rgba(0,0,0,0.3);">
     <p style="margin-top:0px; font-weight:bold; text-align:center;">{title}</p>
    '''
    for color, label in zip(colors, labels):
        legend_html += f'''
        <div style="display:flex; align-items:center; margin-bottom:4px;">
            <div style="background-color:{color}; width:20px; height:12px; margin-right:8px; border:1px solid #aaa;"></div>
            <span>{label}</span>
        </div>
        '''
    legend_html += '</div>'
    folium_map.get_root().html.add_child(folium.Element(legend_html))

def main():
    if not initialize_ee():
        print("[!] GEE not initialized. Cannot run map generation.")
        return

    # Define region of interest and calculate products
    roi = get_roi_polygon()
    ndvi_min, ndvi_max = get_historical_ndvi_limits(roi, config.TARGET_MONTH)
    ndvi_current = get_current_ndvi_sentinel(roi, config.TARGET_YEAR, config.TARGET_MONTH)
    vci = calculate_vci(ndvi_current, ndvi_min, ndvi_max)

    # Initialize Folium Map
    m = folium.Map(location=config.MAP_CENTER, zoom_start=config.MAP_ZOOM, tiles='cartodb positron')

    # Add ROI Boundary Outlines dynamically using GEE FAO geometry
    geojson_boundary = roi.getInfo()
    folium.GeoJson(
        geojson_boundary,
        name=f"Study Area ({config.ROI_NAME})",
        style_function=lambda x: {
            'color': '#3B82F6',
            'weight': 2,
            'fillColor': 'transparent'
        }
    ).add_to(m)

    # Add Sentinel-2 Current NDVI Layer
    ndvi_vis = {
        'min': 0,
        'max': 1,
        'palette': config.NDVI_PALETTE
    }
    add_ee_layer(m, ndvi_current, ndvi_vis, "Current NDVI (Sentinel-2)")

    # Add VCI Layer
    vci_vis = {
        'min': 0,
        'max': 100,
        'palette': config.VCI_PALETTE
    }
    add_ee_layer(m, vci, vci_vis, "Vegetation Condition Index (VCI)")

    # Add VCI Legend
    colors = [config.DROUGHT_CLASSES[c]["color"] for c in config.DROUGHT_CLASSES]
    labels = [c for c in config.DROUGHT_CLASSES]
    add_legend(m, "Drought Classification (VCI)", colors, labels)

    # Add Layer Control
    folium.LayerControl().add_to(m)

    # Save dynamic map
    output_path = os.path.join(config.OUTPUT_DIR, "drought_map.html")
    m.save(output_path)
    print(f"\n[+] Interactive Folium map generated at: {output_path}")

if __name__ == "__main__":
    main()
