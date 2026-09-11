import sys, os
# Add project root to sys.path so that the 'engine' package can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from engine.shallow_water import route_overland
import numpy as np

def test_route_overland_basic():
    # Simple DEM descending toward bottom‑right
    dem = np.array([
        [10, 9, 8],
        [11, 10, 9],
        [12, 11, 10]
    ], dtype=float)
    imperv = np.ones_like(dem)  # fully impervious
    rainfall = 60.0  # mm/h
    duration = 60  # minutes
    # Run the routing algorithm
    depth = route_overland(dem, imperv, rainfall, duration, dt=5.0)
    assert depth.shape == dem.shape
    assert np.all(depth >= 0)
    rows, cols = dem.shape
    max_idx = np.unravel_index(np.argmax(depth), depth.shape)
    # The deepest accumulation should be at a boundary cell (edge of the domain)
    assert max_idx[0] == rows - 1 or max_idx[1] == cols - 1

if __name__ == "__main__":
    test_route_overland_basic()
    print("Shallow water routing test passed.")
