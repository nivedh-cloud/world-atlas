#!/usr/bin/env python3
"""
Download national emblems (coats of arms) from REST Countries API.
Saves SVG files to 'emblems' folder with country code as filename.
"""

import os
import requests
from pathlib import Path
import time

# Configuration
EMBLEMS_FOLDER = "emblems"
API_URL = "https://restcountries.com/v3.1/all"
QUERY_PARAMS = {"fields": "name,cca2,coatOfArms"}

def create_emblems_folder():
    """Create the emblems folder if it doesn't exist."""
    Path(EMBLEMS_FOLDER).mkdir(exist_ok=True)
    print(f"[+] Emblems folder ready: {os.path.abspath(EMBLEMS_FOLDER)}")

def fetch_countries_data():
    """Fetch all countries data from REST Countries API."""
    try:
        response = requests.get(API_URL, params=QUERY_PARAMS, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"✗ Error fetching countries data: {e}")
        return []

def download_emblem(cca2, coatofarms_url):
    """
    Download a single emblem SVG file.
    
    Args:
        cca2: 2-letter country code (e.g., 'in', 'us')
        coatofarms_url: URL of the coat of arms SVG
    
    Returns:
        True if successful, False otherwise
    """
    if not coatofarms_url:
        return False
    
    try:
        response = requests.get(coatofarms_url, timeout=10)
        response.raise_for_status()
        
        filename = f"{cca2.lower()}.svg"
        filepath = os.path.join(EMBLEMS_FOLDER, filename)
        
        with open(filepath, "wb") as f:
            f.write(response.content)
        
        return True
    except requests.exceptions.RequestException as e:
        print(f"  ✗ {cca2}: Failed to download - {e}")
        return False
    except IOError as e:
        print(f"  ✗ {cca2}: Failed to save file - {e}")
        return False

def main():
    """Main execution function."""
    print("[*] Starting emblem download process...\n")
    
    # Create folder
    create_emblems_folder()
    
    # Fetch countries
    print("[*] Fetching countries data from REST Countries API...")
    countries = fetch_countries_data()
    
    if not countries:
        print("[!] No countries data retrieved.")
        return
    
    print(f"[+] Retrieved {len(countries)} countries\n")
    
    # Download emblems
    downloaded = 0
    skipped = 0
    failed = 0
    
    print("[*] Downloading emblems...")
    for idx, country in enumerate(countries, 1):
        cca2 = country.get("cca2", "").lower()
        name = country.get("name", {}).get("common", "Unknown")
        coatofarms_url = country.get("coatOfArms", {}).get("svg") if isinstance(country.get("coatOfArms"), dict) else None
        
        if not cca2:
            skipped += 1
            continue
        
        if not coatofarms_url:
            print(f"  [-] {cca2.upper()} ({name}): No emblem URL")
            skipped += 1
            continue
        
        if download_emblem(cca2, coatofarms_url):
            print(f"  [+] {cca2.upper()} ({name})")
            downloaded += 1
        else:
            failed += 1
        
        # Small delay to avoid rate limiting
        time.sleep(0.1)
    
    # Summary
    print(f"\n{'='*50}")
    print(f"[*] Download Summary")
    print(f"{'='*50}")
    print(f"[+] Successfully downloaded: {downloaded}")
    print(f"[-] Skipped (no emblem data):  {skipped}")
    print(f"[!] Failed:                    {failed}")
    print(f"[*] Saved to:                 {os.path.abspath(EMBLEMS_FOLDER)}")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    main()
