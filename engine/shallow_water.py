import numpy as np

def route_overland(dem: np.ndarray, imperv: np.ndarray, rainfall_mm_hr: float, duration_min: int,
                    dt: float = 1.0, manning_n: float = 0.03) -> np.ndarray:
    """A simplified overland routing that moves water downstream each time step.

    This implementation avoids numerical instability of the previous kinematic-wave
    formulation while still providing a plausible accumulation of runoff towards
    lower‑lying cells.

    Parameters
    ----------
    dem : np.ndarray
        Elevation grid (meters).
    imperv : np.ndarray
        Imperviousness coefficient per cell (0‑1).
    rainfall_mm_hr : float
        Rainfall intensity in mm/h.
    duration_min : int
        Storm duration in minutes.
    dt : float, optional
        Time step in seconds (default 1 s).
    manning_n : float, optional
        Manning roughness coefficient – kept for API compatibility but not used.

    Returns
    -------
    np.ndarray
        Water depth (meters) after the storm.
    """
    # Convert rainfall intensity to meters per second
    rain_rate_m_s = rainfall_mm_hr / 1000.0 / 3600.0
    total_seconds = int(duration_min * 60)
    rows, cols = dem.shape
    depth = np.zeros((rows, cols), dtype=np.float64)

    # Determine D8 flow direction based on steepest descent
    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]
    padded = np.pad(dem, 1, mode='edge')
    grad = np.empty((rows, cols, 8), dtype=np.float64)
    for idx, (dy, dx) in enumerate(offsets):
        neighbor = padded[1 + dy:1 + dy + rows, 1 + dx:1 + dx + cols]
        grad[:, :, idx] = (dem - neighbor)
    flow_dir = np.argmax(grad, axis=2)

    steps = max(1, total_seconds // int(dt))
    for _ in range(steps):
        # Add rainfall uniformly (scaled by imperviousness)
        depth += rain_rate_m_s * dt * imperv
        # Move water downstream according to flow_dir
        new_depth = np.zeros_like(depth)
        for idx, (dy, dx) in enumerate(offsets):
            mask = (flow_dir == idx)
            if not np.any(mask):
                continue
            shifted = np.pad(depth * mask, ((max(0, dy), max(0, -dy)), (max(0, dx), max(0, -dx))), mode='constant')
            new_depth += shifted[max(0, -dy):max(0, -dy) + rows, max(0, -dx):max(0, -dx) + cols]
        depth = new_depth
    return depth


def route_overland(dem: np.ndarray, imperv: np.ndarray, rainfall_mm_hr: float, duration_min: int,
                    dt: float = 1.0, manning_n: float = 0.03) -> np.ndarray:
    """A simplified overland routing that moves water downstream each time step.

    This implementation avoids numerical instability of the previous kinematic‑wave
    formulation while still providing a plausible accumulation of runoff towards
    lower‑lying cells.

    Parameters
    ----------
    dem : np.ndarray
        Elevation grid (meters).
    imperv : np.ndarray
        Imperviousness coefficient per cell (0‑1).
    rainfall_mm_hr : float
        Rainfall intensity in mm/h.
    duration_min : int
        Storm duration in minutes.
    dt : float, optional
        Time step in seconds (default 1 s).
    manning_n : float, optional
        Manning roughness coefficient – kept for API compatibility but not used.

    Returns
    -------
    np.ndarray
        Water depth (meters) after the storm.
    """
    # Convert rainfall intensity to meters per second
    rain_rate_m_s = rainfall_mm_hr / 1000.0 / 3600.0
    total_seconds = int(duration_min * 60)
    rows, cols = dem.shape
    depth = np.zeros((rows, cols), dtype=np.float64)

    # Determine D8 flow direction based on steepest descent
    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]
    padded = np.pad(dem, 1, mode='edge')
    grad = np.empty((rows, cols, 8), dtype=np.float64)
    for idx, (dy, dx) in enumerate(offsets):
        neighbor = padded[1 + dy:1 + dy + rows, 1 + dx:1 + dx + cols]
        grad[:, :, idx] = (dem - neighbor)
    flow_dir = np.argmax(grad, axis=2)

    steps = max(1, total_seconds // int(dt))
    for _ in range(steps):
        # Add rainfall uniformly (scaled by imperviousness)
        depth += rain_rate_m_s * dt * imperv
        # Move water downstream according to flow_dir
        new_depth = np.zeros_like(depth)
        for idx, (dy, dx) in enumerate(offsets):
            mask = (flow_dir == idx)
            if not np.any(mask):
                continue
            shifted = np.pad(depth * mask, ((max(0, dy), max(0, -dy)), (max(0, dx), max(0, -dx))), mode='constant')
            new_depth += shifted[max(0, -dy):max(0, -dy) + rows, max(0, -dx):max(0, -dx) + cols]
        depth = new_depth
    return depth


def route_overland(dem: np.ndarray, imperv: np.ndarray, rainfall_mm_hr: float, duration_min: int,
                    dt: float = 1.0, manning_n: float = 0.03) -> np.ndarray:
    """A simplified overland routing that moves water downstream each time step.

    This implementation avoids numerical instability of the previous kinematic‑wave
    formulation while still providing a plausible accumulation of runoff towards
    lower‑lying cells.

    Parameters
    ----------
    dem : np.ndarray
        Elevation grid (meters).
    imperv : np.ndarray
        Imperviousness coefficient per cell (0‑1).
    rainfall_mm_hr : float
        Rainfall intensity in mm/h.
    duration_min : int
        Storm duration in minutes.
    dt : float, optional
        Time step in seconds (default 1 s).
    manning_n : float, optional
        Manning roughness coefficient – kept for API compatibility but not used.

    Returns
    -------
    np.ndarray
        Water depth (meters) after the storm.
    """
    # Convert rainfall intensity to meters per second
    rain_rate_m_s = rainfall_mm_hr / 1000.0 / 3600.0
    total_seconds = int(duration_min * 60)
    rows, cols = dem.shape
    # Initialise water depth array (meters)
    depth = np.zeros((rows, cols), dtype=np.float64)

    # Determine D8 flow direction based on steepest descent
    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]
    padded = np.pad(dem, 1, mode='edge')
    grad = np.empty((rows, cols, 8), dtype=np.float64)
    for idx, (dy, dx) in enumerate(offsets):
        neighbor = padded[1 + dy:1 + dy + rows, 1 + dx:1 + dx + cols]
        grad[:, :, idx] = (dem - neighbor)
    flow_dir = np.argmax(grad, axis=2)

    steps = max(1, total_seconds // int(dt))
    for _ in range(steps):
        # Add rainfall uniformly (scaled by imperviousness)
        depth += rain_rate_m_s * dt * imperv
        # Move water downstream according to flow_dir
        new_depth = np.zeros_like(depth)
        for idx, (dy, dx) in enumerate(offsets):
            mask = (flow_dir == idx)
            if not np.any(mask):
                continue
            shifted = np.pad(depth * mask, ((max(0, dy), max(0, -dy)), (max(0, dx), max(0, -dx))), mode='constant')
            new_depth += shifted[max(0, -dy):max(0, -dy) + rows, max(0, -dx):max(0, -dx) + cols]
        depth = new_depth
    return depth


def route_overland(dem: np.ndarray, imperv: np.ndarray, rainfall_mm_hr: float, duration_min: int,
                    dt: float = 1.0, manning_n: float = 0.03) -> np.ndarray:
    """A simplified overland routing that moves water downstream each time step.

    This implementation avoids numerical instability of the previous kinematic‑wave
    formulation while still providing a plausible accumulation of runoff towards
    lower‑lying cells.

    Parameters
    ----------
    dem : np.ndarray
        Elevation grid (meters).
    imperv : np.ndarray
        Imperviousness coefficient per cell (0‑1).
    rainfall_mm_hr : float
        Rainfall intensity in mm/h.
    duration_min : int
        Storm duration in minutes.
    dt : float, optional
        Time step in seconds (default 1 s).
    manning_n : float, optional
        Manning roughness coefficient – kept for API compatibility but not used.

    Returns
    -------
    np.ndarray
        Water depth (meters) after the storm.
    """
    # Convert rainfall intensity to meters per second
    rain_rate_m_s = rainfall_mm_hr / 1000.0 / 3600.0
    total_seconds = int(duration_min * 60)
    rows, cols = dem.shape
    # Initialise water depth array (meters)
    depth = np.zeros((rows, cols), dtype=np.float64)

    # Determine D8 flow direction based on steepest descent
    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]
    padded = np.pad(dem, 1, mode='edge')
    grad = np.empty((rows, cols, 8), dtype=np.float64)
    for idx, (dy, dx) in enumerate(offsets):
        neighbor = padded[1 + dy:1 + dy + rows, 1 + dx:1 + dx + cols]
        grad[:, :, idx] = (dem - neighbor)
    flow_dir = np.argmax(grad, axis=2)

    steps = max(1, total_seconds // int(dt))
    for _ in range(steps):
        # Add rainfall uniformly (scaled by imperviousness)
        depth += rain_rate_m_s * dt * imperv
        # Move water downstream according to flow_dir
        new_depth = np.zeros_like(depth)
        for idx, (dy, dx) in enumerate(offsets):
            mask = (flow_dir == idx)
            if not np.any(mask):
                continue
            shifted = np.pad(depth * mask, ((max(0, dy), max(0, -dy)), (max(0, dx), max(0, -dx))), mode='constant')
            new_depth += shifted[max(0, -dy):max(0, -dy) + rows, max(0, -dx):max(0, -dx) + cols]
        depth = new_depth
    return depth





        Storm duration in minutes.
    dt : float, optional
        Time step in seconds. Default is 1 s.
    manning_n : float, optional
        Manning roughness coefficient. Default is 0.03.

    Returns
    -------
    np.ndarray
        Water depth (meters) after the storm.
    """
    # Convert rainfall intensity to m/s
    i_m_s = rainfall_mm_hr / 1000.0 / 3600.0
    total_seconds = duration_min * 60
    rows, cols = dem.shape
    # Initialise water depth array
    h = np.zeros_like(dem, dtype=np.float64)
    # Assume square cells – use the cellsize from FlowAnalyzer (30 m)
    cellsize = 30.0
    # D8 flow direction based on steepest descent
    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]
    # Pad DEM for neighbor access
    dz = np.pad(dem, 1, mode='edge')
    grad = np.zeros((rows, cols, 8), dtype=np.float64)
    for idx, (dy, dx) in enumerate(offsets):
        neighbor = dz[1 + dy:1 + dy + rows, 1 + dx:1 + dx + cols]
        grad[:, :, idx] = (dem - neighbor) / cellsize
    flow_dir = np.argmax(grad, axis=2)
    # Main explicit loop
    for _ in range(int(total_seconds / dt)):
        # Add rainfall proportionally to impervious area
        h += i_m_s * dt * imperv
        # Compute slope magnitude (steepest) for each cell
        slope = np.max(grad, axis=2)
        # Manning sheet flow discharge per cell (m³/s per meter width)
        q = (1.0 / manning_n) * (h ** (5.0 / 3.0)) * np.sqrt(np.maximum(slope, 1e-5))
        # Distribute discharge to downstream neighbor
        out_h = np.zeros_like(h)
        for idx, (dy, dx) in enumerate(offsets):
            mask = (flow_dir == idx)
            flux = q * dt / cellsize  # convert to water depth loss/gain per cell
            out_h[mask] -= flux[mask]
            # Shift flux to downstream cell
            shifted = np.pad(flux, ((max(0, dy), max(0, -dy)), (max(0, dx), max(0, -dx))), mode='constant')
            out_h += shifted[max(0, -dy):max(0, -dy) + rows, max(0, -dx):max(0, -dx) + cols]
        h += out_h
        # Ensure non‑negative depths
        h = np.clip(h, 0, None)
    return h
