// Simulation engine — Manning's Equation + Rational Method
// Implements the hydrology pipeline described in the problem statement

class FloodSimulator {
  constructor() {
    this.nodes = [];
    this.network = [];
    this.results = [];
    this.params = {
      rainfallIntensity: 50, // mm/hr
      stormDuration: 60,     // minutes
      catchmentArea: 10,     // hectares
      runoffCoeff: 0.70,
      timeStep: 1            // minutes
    };
  }

  // Manning's equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
  // Returns capacity in m³/s
  manningCapacity(drain) {
    const n = drain.n;                    // Manning's roughness
    const w = drain.width;                // width (m)
    const d = drain.depth;                // depth (m)
    const S = drain.slope;                // slope
    const A = w * d;                      // cross-section area (m²)
    const P = w + 2 * d;                  // wetted perimeter (m)
    const R = A / P;                      // hydraulic radius (m)
    return (1 / n) * A * Math.pow(R, 2/3) * Math.pow(S, 0.5);
  }

  // Rational Method: Q = C * i * A
  // Q = peak flow (m³/s), C = runoff coefficient, i = intensity (m/s), A = area (m²)
  rationalFlow(C, intensity_mm_hr, area_ha) {
    const i = intensity_mm_hr / 1000 / 3600; // mm/hr → m/s
    const A = area_ha * 10000;               // hectares → m²
    return C * i * A;
  }

  // Get rainfall intensity at time t from profile (interpolate)
  getRainfallAt(t, duration) {
    const maxT = RAINFALL_PROFILE[RAINFALL_PROFILE.length - 1].t;
    const scale = duration / maxT;
    const scaledT = t * scale;

    for (let i = 0; i < RAINFALL_PROFILE.length - 1; i++) {
      const p1 = RAINFALL_PROFILE[i];
      const p2 = RAINFALL_PROFILE[i + 1];
      if (scaledT >= p1.t && scaledT <= p2.t) {
        const frac = (scaledT - p1.t) / (p2.t - p1.t);
        return p1.intensity + frac * (p2.intensity - p1.intensity);
      }
    }
    return RAINFALL_PROFILE[RAINFALL_PROFILE.length - 1].intensity;
  }

  // Run full simulation — returns per-timestep results
  runSimulation(params) {
    this.params = { ...this.params, ...params };
    const { rainfallIntensity, stormDuration, catchmentArea, runoffCoeff, timeStep } = this.params;
    this.results = [];

    // Pre-compute capacity for each drain
    const drainCapacities = {};
    DRAINAGE_NETWORK.forEach(d => {
      drainCapacities[d.id] = this.manningCapacity(d);
    });

    // Build node-to-drain connectivity
    const nodeDrains = {};
    JUNCTION_NODES.forEach(node => { nodeDrains[node.id] = []; });
    DRAINAGE_NETWORK.forEach(drain => {
      const start = drain.coords[0];
      const end = drain.coords[drain.coords.length - 1];
      JUNCTION_NODES.forEach(node => {
        const d0 = Math.hypot(node.coords[0] - start[0], node.coords[1] - start[1]);
        const d1 = Math.hypot(node.coords[0] - end[0], node.coords[1] - end[1]);
        if (d0 < 0.005 || d1 < 0.005) {
          nodeDrains[node.id].push(drain.id);
        }
      });
    });

    // Time-series simulation
    for (let t = 0; t <= stormDuration; t += timeStep) {
      const rainfall = this.getRainfallAt(t, stormDuration);
      const scale = rainfall / 100; // scale to parameter intensity

      // Total inflow via Rational Method
      const totalFlow = this.rationalFlow(runoffCoeff, rainfall * (rainfallIntensity / 100), catchmentArea);

      // Distribute flow across nodes (weighted by connectivity)
      const nodeCount = JUNCTION_NODES.length;
      const baseFlowPerNode = totalFlow / nodeCount;

      // Per-node analysis
      const nodeResults = JUNCTION_NODES.map((node, idx) => {
        // Slight randomness to simulate real behavior
        const hash = Math.sin(idx * 127.1 + t * 311.7) * 43758.5453;
        const jitter = 1 + (hash - Math.floor(hash)) * 0.3 - 0.15;
        const inflow = baseFlowPerNode * jitter;

        // Find connected drains and check capacity
        const connectedDrains = nodeDrains[node.id] || [];
        let totalCapacity = 0;
        const drainDetails = connectedDrains.map(did => {
          const drain = DRAINAGE_NETWORK.find(d => d.id === did);
          const cap = drainCapacities[did];
          totalCapacity += cap;
          return { id: did, capacity: cap, flow: 0, overflow: 0 };
        });

        // How much water enters each connected drain (proportional to capacity)
        let totalAssigned = 0;
        drainDetails.forEach(dd => {
          dd.flow = totalCapacity > 0 ? (dd.capacity / totalCapacity) * inflow : 0;
          dd.overflow = Math.max(0, dd.flow - dd.capacity);
          totalAssigned += dd.flow;
        });

        const overflow = Math.max(0, inflow - totalCapacity);
        const depthRatio = totalCapacity > 0 ? Math.min(inflow / totalCapacity, 2.0) : 0;
        const overflowVolume = overflow * timeStep * 60; // m³

        return {
          nodeId: node.id,
          coords: node.coords,
          elevation: node.elevation,
          inflow: inflow,
          capacity: totalCapacity,
          overflow: overflow,
          overflowVolume: overflowVolume,
          depthRatio: depthRatio,
          isOverflowing: overflow > 0.001,
          drains: drainDetails
        };
      });

      // Drain segment analysis
      const drainResults = DRAINAGE_NETWORK.map(drain => {
        const cap = drainCapacities[drain.id];
        const totalInflowToDrain = nodeResults
          .filter(nr => (nodeDrains[nr.nodeId] || []).includes(drain.id))
          .reduce((sum, nr) => {
            const dd = nr.drains.find(d => d.id === drain.id);
            return sum + (dd ? dd.flow : 0);
          }, 0);

        return {
          drainId: drain.id,
          coords: drain.coords,
          capacity: cap,
          flow: totalInflowToDrain,
          utilization: cap > 0 ? Math.min(totalInflowToDrain / cap, 2.0) : 0,
          isOverflowing: totalInflowToDrain > cap,
          type: drain.type,
          name: drain.name
        };
      });

      // Overflow nodes for this timestep
      const overflowNodes = nodeResults.filter(n => n.isOverflowing);
      const totalOverflow = overflowNodes.reduce((s, n) => s + n.overflowVolume, 0);
      const maxDepthRatio = Math.max(...nodeResults.map(n => n.depthRatio));

      // Risk classification
      let riskLevel = 'LOW';
      if (maxDepthRatio > 1.8) riskLevel = 'EXTREME';
      else if (maxDepthRatio > 1.4) riskLevel = 'HIGH';
      else if (maxDepthRatio > 1.0) riskLevel = 'MODERATE';

      this.results.push({
        time: t,
        rainfall: rainfall,
        totalFlow: totalFlow,
        peakFlow: totalFlow,
        overflowNodes: overflowNodes,
        overflowCount: overflowNodes.length,
        totalOverflow: totalOverflow,
        maxDepthRatio: maxDepthRatio,
        riskLevel: riskLevel,
        nodes: nodeResults,
        drains: drainResults
      });
    }

    return this.results;
  }

  // Get water spread polygons around overflow nodes (simplified flood fill)
  getWaterSpread(overflowNode, volume, dem) {
    // Generate concentric circles expanding from overflow point
    // Size proportional to overflow volume
    const center = overflowNode.coords;
    const radiusDeg = Math.min(0.002 + Math.sqrt(volume) * 0.0003, 0.008);
    const points = 24;
    const coords = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = radiusDeg * (0.7 + 0.3 * Math.sin(angle * 3)); // irregular shape
      coords.push([
        center[0] + Math.cos(angle) * r,
        center[1] + Math.sin(angle) * r
      ]);
    }
    return coords;
  }
}
