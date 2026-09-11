"""
drainage_extractor.py
Stormwater & Sewer Drainage Network Graph Extractor
- Parses CMWSSB network geometry from static/js/chennai-data.js
- Constructs a NetworkX Directed Graph (DiGraph)
    * Nodes: Manholes & Junction Inlets with 3D coordinates & MSL elevation
    * Edges: Underground conduits with diameter, length, slope, and Manning roughness
"""

import json
import re
import os
import networkx as nx
from typing import Dict, Any, List, Tuple

class DrainageExtractor:
    def __init__(self, data_file_path: str = None):
        if data_file_path is None:
            # Default to static/js/chennai-data.js
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_file_path = os.path.join(base_dir, "static", "js", "chennai-data.js")

        self.data_file_path = data_file_path
        self.drains: List[Dict[str, Any]] = []
        self.inferred: List[Dict[str, Any]] = []
        self.manholes: List[Dict[str, Any]] = []
        self.inlets: List[Dict[str, Any]] = []

        self.graph = nx.DiGraph()
        self._load_and_parse_data()
        self._build_graph()

    def _load_and_parse_data(self):
        """Extracts JSON arrays from JavaScript constants in chennai-data.js."""
        if not os.path.exists(self.data_file_path):
            raise FileNotFoundError(f"Cannot find drainage data file: {self.data_file_path}")

        with open(self.data_file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Regex extract DRAINAGE_NETWORK
        m_drains = re.search(r"const\s+DRAINAGE_NETWORK\s*=\s*(\[.*?\]);", content, re.DOTALL)
        if m_drains:
            self.drains = json.loads(m_drains.group(1))

        # Regex extract INFERRED_NETWORK
        m_inf = re.search(r"const\s+INFERRED_NETWORK\s*=\s*(\[.*?\]);", content, re.DOTALL)
        if m_inf:
            self.inferred = json.loads(m_inf.group(1))

        # Regex extract MANHOLES
        m_mh = re.search(r"const\s+MANHOLES\s*=\s*(\[.*?\]);", content, re.DOTALL)
        if m_mh:
            self.manholes = json.loads(m_mh.group(1))

        # Regex extract JUNCTION_NODES
        m_jn = re.search(r"const\s+JUNCTION_NODES\s*=\s*(\[.*?\]);", content, re.DOTALL)
        if m_jn:
            self.inlets = json.loads(m_jn.group(1))

    def _build_graph(self):
        """Constructs NetworkX DiGraph connecting manhole nodes and pipe edges."""
        # Add manholes
        for mh in self.manholes:
            self.graph.add_node(
                mh["id"],
                type="manhole",
                coords=mh["coords"],
                elevation=mh.get("elevation", 10.0),
                depth_m=2.5 # standard 2.5m drop shaft
            )

        # Add inlet junction nodes
        for jn in self.inlets:
            self.graph.add_node(
                jn["id"],
                type="inlet",
                coords=jn["coords"],
                elevation=jn.get("elevation", 11.0),
                depth_m=1.8
            )

        # Helper to find closest node to a coordinate
        node_lookup = {nid: self.graph.nodes[nid]["coords"] for nid in self.graph.nodes}

        def find_nearest_node(lon: float, lat: float, max_dist_deg: float = 0.005) -> str:
            best_id = None
            best_dist = max_dist_deg
            for nid, (nlon, nlat) in node_lookup.items():
                d = ((lon - nlon) ** 2 + (lat - nlat) ** 2) ** 0.5
                if d < best_dist:
                    best_dist = d
                    best_id = nid
            return best_id

        # Add real CMWSSB pipes
        for p in self.drains:
            coords = p["coords"]
            start_coord = coords[0]
            end_coord = coords[-1]

            u = find_nearest_node(start_coord[0], start_coord[1])
            v = find_nearest_node(end_coord[0], end_coord[1])

            if u and v and u != v:
                # Calculate approximate length in meters
                length_m = ((end_coord[0] - start_coord[0]) ** 2 + (end_coord[1] - start_coord[1]) ** 2) ** 0.5 * 111000.0
                self.graph.add_edge(
                    u, v,
                    id=p["id"],
                    diameter_mm=p.get("mm", 600),
                    slope=p.get("slope", 0.001),
                    length_m=max(length_m, 15.0),
                    roughness=0.013, # RCC
                    is_real=True
                )

        # Add inferred pipes
        for inf in self.inferred:
            u = inf.get("from")
            v = inf.get("to")
            if u and v and u in self.graph and v in self.graph and u != v:
                self.graph.add_edge(
                    u, v,
                    id=inf["id"],
                    diameter_mm=int(inf.get("thickness", 1.0) * 350.0),
                    slope=0.0012,
                    length_m=35.0,
                    roughness=0.014,
                    is_real=False,
                    confidence=inf.get("connection_confidence", 0.7)
                )

    def get_summary(self) -> Dict[str, Any]:
        return {
            "total_nodes": self.graph.number_of_nodes(),
            "manhole_count": len(self.manholes),
            "inlet_count": len(self.inlets),
            "total_pipes": self.graph.number_of_edges(),
            "real_drains_count": len(self.drains),
            "inferred_drains_count": len(self.inferred)
        }
