import shutil
import os
from pathlib import Path

# Source directory with GeoJSON files
source_dir = Path("E:/GitHubProjects/BibleProjects/countriesgeojson")
# Destination directory (public/geojson)
dest_dir = Path("./public/geojson")

# Create destination directory if it doesn't exist
dest_dir.mkdir(parents=True, exist_ok=True)

# Copy all .geojson files
if source_dir.exists():
    for geojson_file in source_dir.glob("*.geojson"):
        dest_file = dest_dir / geojson_file.name
        shutil.copy2(geojson_file, dest_file)
        print(f"Copied: {geojson_file.name}")
    print(f"\nAll GeoJSON files copied to {dest_dir}")
else:
    print(f"Source directory not found: {source_dir}")
