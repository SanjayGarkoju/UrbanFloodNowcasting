"""
flow_analysis.py
2D Overland Surface Flow & Hydrological Runoff Routing Engine
- Deterministic 8-Neighbor (D8) Flow Direction Solver
- Flow Accumulation (Upstream Drainage Catchment Matrix)
- Urban Concrete Imperviousness & Infiltration Module
- 2D Overland Surface Runoff Routing to Stormwater Inlets
"""

import numpy as np
from typing import Tuple, Dict, Any, List

class FlowAnalyzer:
    # D8 Direction encoding: E=1, SE=2, S=4, SW=8, W=16, NW=32, N=64, NE=128
    D8_OFFSETS = [
        (0, 1, 1),    # E  (0)
        (1, 1, 2),    # SE (1)
        (1, 0, 4),    # S  (2)
        (1, -1, 8),   # SW (3)
        (0, -1, 16),  # W  (4)
        (-1, -1, 32), # NW (5)
        (-1, 0, 64),  # N  (6)
        (-1, 1, 128)  # NE (7)
    ]
    DIST_FACTORS = [1.0, np.sqrt(2), 1.0, np.sqrt(2), 1.0, np.sqrt(2), 1.0, np.sqrt(2)]

    def __init__(self, dem: np.ndarray, cell_size_m: float = 10.0):
        self.dem = dem
        self.rows, self.cols = dem.shape
        self.cell_size_m = cell_size_m
        self.cell_area_m2 = cell_size_m * cell_size_m

        # Compute D8 flow direction and accumulation
        self.flow_dir = self._compute_d8_flow_direction()
        self.flow_accum = self._compute_flow_accumulation()

        # Land use imperviousness map (Chennai urban core ~85% concrete/asphalt)
        self.imperviousness_grid = self._generate_imperviousness_map()

    def _compute_d8_flow_direction(self) -> np.ndarray:
        """
        D8 Algorithm: Assigns flow from each cell to its steepest downhill neighbor.
        """
        flow_dir = np.zeros((self.rows, self.cols), dtype=np.int32)

        for r in range(self.rows):
            for c in range(self.cols):
                max_slope = 0.0
                best_dir = 0
                z_curr = self.dem[r, c]

                for idx, (dr, dc, code) in enumerate(self.D8_OFFSETS):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < self.rows and 0 <= nc < self.cols:
                        dz = z_curr - self.dem[nr, nc]
                        dist = self.DIST_FACTORS[idx] * self.cell_size_m
                        slope = dz / dist
                        if slope > max_slope:
                            max_slope = slope
                            best_dir = code

                flow_dir[r, c] = best_dir

        return flow_dir

    def _compute_flow_accumulation(self) -> np.ndarray:
        """
        Computes flow accumulation grid: Total number of upstream contributing cells draining through each point.
        """
        accum = np.ones((self.rows, self.cols), dtype=np.float32)

        # Sort all cells by elevation in descending order
        flat_indices = np.argsort(-self.dem.ravel())

        for idx in flat_indices:
            r = idx // self.cols
            c = idx % self.cols
            code = self.flow_dir[r, c]
            if code == 0:
                continue

            for idx_off, (dr, dc, offset_code) in enumerate(self.D8_OFFSETS):
                if offset_code == code:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < self.rows and 0 <= nc < self.cols:
                        accum[nr, nc] += accum[r, c]
                    break

        return accum

    def _generate_imperviousness_map(self) -> np.ndarray:
        """
        Runoff coefficient C based on Chennai urban fabric:
        - Dense Commercial & Paved Roads (T. Nagar, George Town): C = 0.88–0.92
        - Medium Density Residential (Anna Nagar, Nungambakkam): C = 0.75–0.82
        - Green Parks & Waterbodies (Guindy park, Chetpet eco park): C = 0.30–0.45
        """
        c_map = np.full((self.rows, self.cols), 0.84, dtype=np.float32)

        # Add spatial variability based on urban density patterns
        r_coords = np.linspace(0, 1, self.rows)[:, None]
        c_coords = np.linspace(0, 1, self.cols)[None, :]

        # Guindy Park green lungs (lower imperviousness)
        dist_guindy = np.sqrt(((r_coords - 0.35) / 0.15) ** 2 + ((c_coords - 0.35) / 0.15) ** 2)
        c_map -= 0.35 * np.exp(-0.5 * (dist_guindy / 0.08) ** 2)

        return np.clip(c_map, 0.30, 0.95)

    def route_rainfall_to_inlets(
        self,
        rainfall_mm_hr: float,
        inlet_nodes: List[Dict[str, Any]],
        lat_bounds: Tuple[float, float],
        lon_bounds: Tuple[float, float]
    ) -> Dict[str, Dict[str, float]]:
        """
        Routes 2D overland rainfall volume across the terrain model directly into underground inlet nodes.
        Returns per-inlet:
            - tributary_area_m2: Upstream surface area draining to this inlet
            - surface_runoff_m3s: Peak overland runoff rate reaching inlet (m³/s)
            - runoff_coeff: Average catchment imperviousness
        """
        # Rainfall conversion: mm/hr -> m/s
        rain_m_s = (rainfall_mm_hr / 1000.0) / 3600.0

        inlet_inflow: Dict[str, Dict[str, float]] = {}

        for node in inlet_nodes:
            nid = node["id"]
            coords = node["coords"] # [lon, lat]
            lon, lat = coords[0], coords[1]

            # Map to grid cell
            r = int(np.clip((lat - lat_bounds[0]) / (lat_bounds[1] - lat_bounds[0]) * (self.rows - 1), 0, self.rows - 1))
            c = int(np.clip((lon - lon_bounds[0]) / (lon_bounds[1] - lon_bounds[0]) * (self.cols - 1), 0, self.cols - 1))

            # Contributing surface area
            accum_cells = float(self.flow_accum[r, c])
            # Cap local inlet catchment between 1,500 m² and 35,000 m² to prevent unrealistic boundary accumulation
            catchment_area_m2 = float(np.clip(accum_cells * self.cell_area_m2 * 0.15, 1800.0, 32000.0))

            c_coeff = float(self.imperviousness_grid[r, c])

            # Overland Rational Method: Q = C * i * A
            q_surface = c_coeff * rain_m_s * catchment_area_m2

            inlet_inflow[nid] = {
                "tributary_area_m2": round(catchment_area_m2, 1),
                "surface_runoff_m3s": round(q_surface, 4),
                "runoff_coeff": round(c_coeff, 2),
                "grid_elev_m": round(float(self.dem[r, c]), 2)
            }

        return inlet_inflow

    def compute_surface_depth(self, rainfall_mm_hr: float, duration_min: int) -> np.ndarray:
        """Compute surface runoff depth (mm) for each DEM cell using a kinematic‑wave shallow‑water solver.
        This replaces the previous linear approximation.
        """
        from .shallow_water import route_overland
        # route_overland returns depth in meters; convert to millimetres for consistency with the API
        depth_m = route_overland(self.dem, self.imperviousness_grid, rainfall_mm_hr, duration_min)
        return (depth_m * 1000).astype(np.float64)

        """Compute surface runoff depth (mm) for each DEM cell.
        Uses the imperviousness grid as runoff coefficient C.
        Depth (mm) = C * i * (duration_hours) where i is rainfall intensity (mm/h).
        """
        duration_hr = duration_min / 60.0
        depth_grid = self.imperviousness_grid * rainfall_mm_hr * duration_hr
        return depth_grid
