from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import os
import sys

# Ensure engine is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import (
    RadarNowcaster,
    DEMProcessor,
    FlowAnalyzer,
    DrainageExtractor,
    CapacityCalculator,
    FloodSimulator
)

app = Flask(__name__, static_folder='static')
CORS(app)

# Initialize singletons for hydrodynamic models
print("[HydroEngine] Initializing Doppler Weather Radar Nowcaster...")
radar_engine = RadarNowcaster()

print("[HydroEngine] Initializing 2D DEM & Terrain Processor...")
dem_engine = DEMProcessor()

print("[HydroEngine] Initializing D8 Flow Analyzer...")
flow_engine = FlowAnalyzer(dem_engine.filled_elevation)

print("[HydroEngine] Initializing CMWSSB Drainage Network Graph...")
drainage_engine = DrainageExtractor()

print("[HydroEngine] Initializing Manning Capacity Calculator...")
capacity_engine = CapacityCalculator()

print("[HydroEngine] Coupling Hydrodynamic Flood Simulator...")
simulator = FloodSimulator(
    radar=radar_engine,
    dem=dem_engine,
    flow=flow_engine,
    drainage=drainage_engine,
    capacity=capacity_engine
)
print("[HydroEngine] Coupled Hydrodynamic Engine Ready!")

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "engine": "Coupled DWR Radar + 2D DEM + Manning Drainage Graph",
        "version": "2.0.0",
        "station": radar_engine.station_name,
        "nodes_loaded": drainage_engine.graph.number_of_nodes(),
        "edges_loaded": drainage_engine.graph.number_of_edges()
    })

@app.route('/api/radar/nowcast', methods=['GET'])
def get_radar_nowcast():
    """Returns 0–3 hr Doppler Weather Radar nowcast timeline and rainfall rate grid."""
    timesteps_param = request.args.get('timesteps', '0,30,60,90,120,180')
    try:
        timesteps = [int(t.strip()) for t in timesteps_param.split(',')]
    except ValueError:
        timesteps = [0, 30, 60, 90, 120, 180]

    nowcast_data = radar_engine.get_nowcast_timesteps(timesteps)
    return jsonify(nowcast_data)

@app.route('/api/routing', methods=['POST'])
def run_routing():
    """Accepts rainfall intensity (mm/h) and storm duration (minutes), returns surface depth grid.
    Uses the FlowAnalyzer (D8) to compute overland runoff depth per DEM cell.
    """
    data = request.json or {}
    rainfall_intensity = float(data.get('rainfallIntensity', 65.0))
    storm_duration = int(data.get('stormDuration', 60))
    # Use the existing DEM and FlowAnalyzer instances
    # Compute surface depth grid (mm) using a new method on FlowAnalyzer
    depth_grid = flow_engine.compute_surface_depth(rainfall_intensity, storm_duration)
    # Simple static bounds; in real case derive from DEM extents
    bounds = {
        'north': 13.2,
        'south': 12.8,
        'east': 80.35,
        'west': 79.9,
    }
    return jsonify({'depthGrid': depth_grid.tolist(), 'bounds': bounds})

@app.route('/api/zones/nowcast', methods=['GET'])
def get_zones_nowcast():
    """Returns current nowcast projections for all monitored Chennai basins."""
    lead_time = int(request.args.get('lead_time_min', 30))
    rain_sample = radar_engine.sample_point(13.04, 80.235, lead_minutes=lead_time)
    current_rain = rain_sample.get("rain_rate_mm_hr", 55.0)

    sim = simulator.run_coupled_simulation(
        rainfall_intensity=current_rain,
        storm_duration_min=60,
        drainage_blockage_pct=15.0
    )

    # Find the timestep closest to requested lead_time
    closest_step = min(sim["timeline"], key=lambda s: abs(s["time_min"] - lead_time))

    return jsonify({
        "lead_time_min": lead_time,
        "radar_sampled_rain_rate_mm_hr": current_rain,
        "zones": closest_step["zones"],
        "summary": sim["summary"]
    })

@app.route('/api/dem/profile', methods=['POST'])
def get_dem_profile():
    """Calculates DEM elevation profile along a path of coordinates."""
    data = request.json or {}
    waypoints_input = data.get("waypoints", [])
    if not waypoints_input:
        return jsonify({"error": "No waypoints provided"}), 400

    waypoints = [(float(w["lat"]), float(w["lng"])) for w in waypoints_input if "lat" in w and "lng" in w]
    profile = dem_engine.get_elevation_profile(waypoints)
    return jsonify({"profile": profile, "total_points": len(profile)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Urban Flood Nowcasting Server on port {port}...")
    app.run(debug=True, host='0.0.0.0', port=port)
