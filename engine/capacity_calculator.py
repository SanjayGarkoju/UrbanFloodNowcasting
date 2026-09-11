"""
capacity_calculator.py
Underground Stormwater Conduit Hydraulic Capacity Engine
- Manning's Equation for gravity and pressurized closed conduit flow:
    Q = (1/n) * A * R_h^(2/3) * S_0^(1/2)
- Supports circular conduits (100mm to 1600mm) and box culverts
- Accounts for siltation blockages, pipe material roughness, and hydraulic grade lines
"""

import numpy as np
from typing import Dict, Any

class CapacityCalculator:
    # Standard Manning roughness values (n) for Chennai drainage assets
    ROUGHNESS_TABLE = {
        "rcc_pipe": 0.013,        # Reinforced Cement Concrete
        "brick_arch": 0.016,      # Heritage British-era brick arch conduits
        "pvc_pipe": 0.011,        # Smooth PVC / HDPE
        "cast_iron": 0.012,       # Ductile / Cast Iron
        "unlined_channel": 0.024  # Open silted earthen storm channel
    }

    def __init__(self, default_roughness: float = 0.013):
        self.default_roughness = default_roughness

    def circular_manning_capacity(
        self,
        diameter_mm: float,
        slope: float,
        roughness: float = None,
        siltation_pct: float = 0.0
    ) -> Dict[str, float]:
        """
        Calculates full-flow hydraulic capacity (m³/s) and velocity (m/s) for circular pipes.
        """
        if roughness is None:
            roughness = self.default_roughness

        d_m = max(diameter_mm / 1000.0, 0.1) # mm -> meters
        s = max(slope, 0.0004)               # minimum slope 0.04%

        # Effective area adjusted for siltation / debris sedimentation
        blockage_factor = max(0.0, min(siltation_pct / 100.0, 0.85))
        effective_area_ratio = 1.0 - blockage_factor

        area_m2 = (np.pi * (d_m ** 2) / 4.0) * effective_area_ratio
        wetted_perimeter = np.pi * d_m
        hydraulic_radius = area_m2 / wetted_perimeter

        # Manning equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
        q_capacity_m3s = (1.0 / roughness) * area_m2 * (hydraulic_radius ** (2.0 / 3.0)) * np.sqrt(s)
        velocity_m_s = q_capacity_m3s / area_m2 if area_m2 > 0 else 0.0

        return {
            "diameter_mm": diameter_mm,
            "slope": slope,
            "roughness": roughness,
            "siltation_pct": siltation_pct,
            "capacity_m3s": round(float(q_capacity_m3s), 4),
            "full_velocity_ms": round(float(velocity_m_s), 2),
            "area_m2": round(float(area_m2), 4)
        }

    def evaluate_pipe_surcharge(
        self,
        inflow_m3s: float,
        pipe_capacity_m3s: float
    ) -> Dict[str, Any]:
        """
        Evaluates pipe surcharge state, utilization ratio, and backflow rate.
        """
        if pipe_capacity_m3s <= 0:
            utilization = 2.0
        else:
            utilization = inflow_m3s / pipe_capacity_m3s

        is_surcharged = utilization > 1.0
        backflow_m3s = max(0.0, inflow_m3s - pipe_capacity_m3s)

        if utilization >= 1.4:
            state = "CRITICAL_SURCHARGE"
        elif utilization > 1.0:
            state = "SURCHARGED"
        elif utilization > 0.8:
            state = "HIGH_STRESS"
        elif utilization > 0.5:
            state = "MODERATE"
        else:
            state = "OPTIMAL"

        return {
            "inflow_m3s": round(inflow_m3s, 4),
            "capacity_m3s": round(pipe_capacity_m3s, 4),
            "utilization_pct": round(utilization * 100.0, 1),
            "state": state,
            "is_surcharged": is_surcharged,
            "backflow_rate_m3s": round(backflow_m3s, 4)
        }
