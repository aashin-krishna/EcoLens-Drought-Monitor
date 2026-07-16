"""
Google Earth Engine (GEE) Authentication and Initialization Helper.
Checks if GEE is authorized and assists the user in setting it up.
Supports newer Google Cloud Project ID requirements.
"""

import sys
import os
import ee

# Define path for caching GEE Project ID in base dir
PROJECT_CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "gee_project.txt")

def initialize_ee():
    """Initializes Google Earth Engine. If not authenticated, guides the user."""
    print("Checking Google Earth Engine (GEE) authentication status...")
    
    project_id = None
    if os.path.exists(PROJECT_CACHE_FILE):
        try:
            with open(PROJECT_CACHE_FILE, 'r') as f:
                project_id = f.read().strip()
                if not project_id:
                    project_id = None
        except Exception:
            pass

    try:
        # Attempt to initialize Earth Engine with cached project or default credentials
        if project_id:
            ee.Initialize(project=project_id)
        else:
            ee.Initialize()
        print("Earth Engine successfully initialized!")
        return True
    except Exception as e:
        err_msg = str(e)
        
        # Check if the error is due to a missing Google Cloud project
        if "no project" in err_msg.lower() or "project" in err_msg.lower():
            print("\n[!] Earth Engine requires a Google Cloud Project ID to initialize.")
            print("To find your project ID, check your Google Cloud Console or Earth Engine setup.")
            try:
                user_project = input("Enter your GEE / Google Cloud Project ID: ").strip()
                if user_project:
                    ee.Initialize(project=user_project)
                    # Cache the verified project ID
                    with open(PROJECT_CACHE_FILE, 'w') as f:
                        f.write(user_project)
                    print(f"Earth Engine successfully initialized with project: {user_project}!")
                    return True
            except Exception as inner_e:
                print(f"Failed to initialize with provided project: {inner_e}")
                
        print("\n[!] Earth Engine initialization failed.")
        print(f"Details: {e}")
        print("\nYou may need to authenticate your Google Earth Engine account.")
        print("Please run the following command in your terminal to authenticate:")
        print("  earthengine authenticate")
        print("\nAlternative: If you do not have an active GEE account, you can sign up for free (non-commercial) at:")
        print("  https://signup.earthengine.google.com/")
        print("-" * 60)
        
        # Interactive prompting for authentication
        try:
            choice = input("Would you like to run the GEE authentication wizard now? (y/n): ").strip().lower()
            if choice == 'y':
                print("Launching GEE authentication wizard...")
                ee.Authenticate()
                
                # Ask for project ID after authentication
                user_project = input("Enter your GEE / Google Cloud Project ID: ").strip()
                if user_project:
                    ee.Initialize(project=user_project)
                    with open(PROJECT_CACHE_FILE, 'w') as f:
                        f.write(user_project)
                else:
                    ee.Initialize()
                    
                print("Earth Engine successfully authenticated and initialized!")
                return True
            else:
                print("GEE authentication skipped. GEE-based scripts will not execute.")
                return False
        except Exception as auth_err:
            print(f"Authentication failed: {auth_err}")
            return False

if __name__ == "__main__":
    initialize_ee()
