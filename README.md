# UrbanFloodNowcasting

Prototype Chennai urban-flood nowcasting layers.

## Interactive Chennai map

Run `python app.py`, then open `http://localhost:5000`. The browser model uses the repository's 800 manholes, 300 inlets, and 253 drain segments to provide:

- one shared MapLibre map with flood-depth and drainage-graph overlays;
- a synchronized 0–180 minute rainfall and hydraulic timeline;
- capacity-based graph styling and node inflow/capacity popups;
- flood-cell selection that highlights the associated upstream drain; and
- button and swipe/drag controls with a CSS 3D view transition.

The surface layer is a deterministic flood-depth proxy derived from the current drainage dataset and simulation. It is not a calibrated DEM result; replace its `depthCm` calculation when a DEM-based 2D surface model is available.

## Drainage graph layer

The backend graph layer lives in `engine/drainage_graph.py`. It converts GCC/OpenCity ward-level stormwater-drain KML/KMZ files into a projected `networkx.DiGraph` for later coupling with a DEM-based 2D surface flow model and rainfall nowcasting grid.

```python
from engine.drainage_graph import load_drainage_graph, update_graph_state

graph = load_drainage_graph(
    "chennai-data/gcc-ward-drains.kml",
    target_crs="EPSG:32644",
    dem_sampler=lambda x, y: dem.sample_projected(x, y),
    dem_transform=dem.transform,
    dem_shape=dem.shape,
    outfall_points=[(80.2707, 13.0827)],  # lon/lat accepted
)

update_graph_state(
    graph,
    node_inflows_m3={"N000001": 45.0},
    edge_flows_m3s={("N000001", "N000002"): 1.2},
    dt_seconds=60,
)
```

### Public data sources

- OpenCity/GCC SWD Map 2023 publishes public Chennai stormwater-drain KML data from GCC.
- OSM `waterway=drain|ditch|canal` tags can be added later as a lower-confidence gap-fill source where ward KML coverage is sparse.
- EPSG:32644 (WGS 84 / UTM zone 44N) is used by default so graph length, slope, and capacity calculations are in metres for Chennai.

### Hydraulic assumptions

When KML attributes do not include measured dimensions, `estimate_capacity()` uses hierarchy-specific proxy dimensions with Manning's equation. This follows the CPHEEO Manual on Storm Water Drainage Systems, Volume I - Engineering Design (MoHUA, 2019) at the method level: real design should use surveyed geometry, slope, and roughness; the defaults are clearly marked placeholders for prototype nowcasting and can be replaced through `capacity_assumptions`.

### Quick debug plot

```python
from engine.drainage_graph import plot_graph_state

ax = plot_graph_state(graph)
ax.figure.savefig("graph-state.png", dpi=160)
```

## Local setup

```bash
python -m pip install -r requirements.txt
pytest
node --test tests/test_frontend_model.js
python app.py
```
