from __future__ import annotations

import math

import matplotlib
import networkx as nx
from shapely.geometry import LineString

from engine.drainage_graph import (
    DEFAULT_CAPACITY_ASSUMPTIONS,
    CapacityAssumption,
    estimate_capacity,
    load_drainage_graph,
    plot_graph_state,
    snap_point_to_dem_grid,
    update_edge_state,
    update_node_state,
)

matplotlib.use("Agg")


def test_load_graph_nodes_intersections_and_dem_indices(monkeypatch):
    def fake_read_drain_lines(_path, _target_crs):
        return [
            {
                "geometry": LineString([(500000.0, 1440000.0), (500010.0, 1440000.0)]),
                "attributes": {"Type": "Primary macro drain", "Ward": "T Nagar"},
            },
            {
                "geometry": LineString([(500005.0, 1439995.0), (500005.0, 1440005.0)]),
                "attributes": {"Type": "Secondary ward drain", "Name": "North cross"},
            },
        ]

    monkeypatch.setattr("engine.drainage_graph._read_drain_lines", fake_read_drain_lines)

    def dem_sampler(x, y):
        return 20.0 - ((x - 500000.0) * 0.1) - ((y - 1440000.0) * 0.01)

    graph = load_drainage_graph(
        "unused.kml",
        dem_sampler=dem_sampler,
        dem_transform=(499990.0, 5.0, 0.0, 1440010.0, 0.0, -5.0),
        dem_shape=(10, 10),
    )

    assert graph.number_of_nodes() == 5
    assert graph.number_of_edges() == 4
    assert graph.graph["crs"] == "EPSG:32644"
    assert all("dem_row" in attrs and "dem_col" in attrs for _, attrs in graph.nodes(data=True))
    assert {attrs["kind"] for _, attrs in graph.nodes(data=True)} >= {"junction", "inlet", "outfall"}
    assert {attrs["hierarchy"] for _, _, attrs in graph.edges(data=True)} == {
        "primary",
        "secondary",
    }
    assert all(attrs["capacity_m3s"] > 0 for _, _, attrs in graph.edges(data=True))


def test_estimate_capacity_uses_hierarchy_and_can_be_overridden():
    primary = estimate_capacity({"hierarchy": "primary"})
    secondary = estimate_capacity({"hierarchy": "secondary"})
    tertiary = estimate_capacity({"hierarchy": "tertiary"})
    assert primary > secondary > tertiary

    custom = estimate_capacity(
        {"hierarchy": "secondary"},
        {"secondary": CapacityAssumption("secondary", width_m=0.4, depth_m=0.4, manning_n=0.02, slope=0.001)},
    )
    assert custom < secondary


def test_estimate_capacity_uses_measured_diameter_when_available():
    capacity = estimate_capacity({"diameter_mm": "1200", "slope": 0.001, "manning_n": 0.013})
    radius = 0.6
    area = math.pi * radius * radius
    hydraulic_radius = area / (2 * math.pi * radius)
    expected = (1 / 0.013) * area * (hydraulic_radius ** (2 / 3)) * math.sqrt(0.001)
    assert capacity == expected


def test_state_updates_flag_surcharging():
    graph = nx.DiGraph()
    graph.add_node("A")
    graph.add_node("B")
    graph.add_edge("A", "B", capacity_m3s=2.0)

    edge_state = update_edge_state(graph, "A", "B", flow_m3s=2.4, dt_seconds=60)
    assert edge_state["capacity_utilization"] == 1.2
    assert edge_state["surcharging"] == "surcharging"

    node_state = update_node_state(graph, "A", inflow_volume_m3=90.0, dt_seconds=60)
    assert node_state["capacity_utilization"] == 0.75
    assert node_state["surcharging"] == "watch"


def test_snap_point_to_dem_grid_supports_gdal_geotransform():
    assert snap_point_to_dem_grid(500012.0, 1440002.0, (500000.0, 5.0, 0.0, 1440010.0, 0.0, -5.0)) == (
        2,
        2,
    )
    assert snap_point_to_dem_grid(
        500012.0,
        1440002.0,
        (500000.0, 5.0, 0.0, 1440010.0, 0.0, -5.0),
        dem_shape=(1, 1),
    ) is None


def test_plot_graph_state_returns_axes():
    graph = nx.DiGraph(crs="EPSG:32644")
    graph.add_node("A", x=0.0, y=0.0, state={"capacity_utilization": 0.25})
    graph.add_node("B", x=1.0, y=1.0, state={"capacity_utilization": 0.75})
    graph.add_edge(
        "A",
        "B",
        geometry=LineString([(0.0, 0.0), (1.0, 1.0)]),
        state={"capacity_utilization": 0.5},
    )

    ax = plot_graph_state(graph)
    assert ax.get_title() == "Stormwater drainage graph state"
