"""
episode_manifest.json — defines the 6 demo library episodes.

Each episode contains:
  - label        : episode name stored in metadata
  - count        : target number of photos
  - queries      : Unsplash search terms to download images
  - date_range   : realistic date window (ISO format)
  - location     : human-readable location label
  - latitude     : approximate lat
  - longitude    : approximate lng
  - purpose_hint : hint for the tagger (memory | receipt | reminder | proof)
"""
# This file is auto-loaded by download_images.py and tag_images.py.
# Edit the queries array to tune what images are downloaded per episode.
