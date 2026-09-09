class FloodSimulator {
  constructor({ drains = [], manholes = [], inlets = [], rainfallProfile = [] } = {}) {
    this.drains = drains;
    this.nodes = [
      ...manholes.map((node, index) => ({
        ...node,
        assetType: 'manhole',
        elevation: node.elevation ?? 6 + this.hash(index + 31) * 4
      })),
      ...inlets.map((node, index) => ({
        ...node,
        assetType: 'inlet',
        elevation: node.elevation ?? 6 + this.hash(index + 1301) * 4
      }))
    ];
    this.rainfallProfile = rainfallProfile;
    this.params = {
      rainfallIntensity: 100,
      stormDuration: 180,
      runoffCoeff: 0.72,
      timeStep: 5
    };
    this.topology = this.buildTopology();
    this.results = [];
  }

  hash(seed) {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  manningCapacity(drain) {
    const width = Math.max(Number(drain.width) || 0.6, 0.1);
    const depth = Math.max(Number(drain.depth) || 0.5, 0.1);
    const slope = Math.max(Number(drain.slope) || 0.001, 0.00001);
    const roughness = Math.max(Number(drain.n) || 0.015, 0.001);
    const area = width * depth;
    const hydraulicRadius = area / (width + 2 * depth);
    return (1 / roughness) * area * Math.pow(hydraulicRadius, 2 / 3) * Math.sqrt(slope);
  }

  rationalFlow(runoffCoeff, intensityMmHr, areaHa) {
    const intensityMetresPerSecond = intensityMmHr / 1000 / 3600;
    return runoffCoeff * intensityMetresPerSecond * areaHa * 10000;
  }

  nearestPointOnSegment(point, start, end) {
    const latitudeScale = Math.cos((point[1] * Math.PI) / 180);
    const dx = (end[0] - start[0]) * latitudeScale;
    const dy = end[1] - start[1];
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
      return { coords: start, distanceSquared: Infinity };
    }
    const px = (point[0] - start[0]) * latitudeScale;
    const py = point[1] - start[1];
    const fraction = Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared));
    const coords = [
      start[0] + (end[0] - start[0]) * fraction,
      start[1] + (end[1] - start[1]) * fraction
    ];
    const offsetX = (point[0] - coords[0]) * latitudeScale;
    const offsetY = point[1] - coords[1];
    return { coords, distanceSquared: offsetX * offsetX + offsetY * offsetY };
  }

  nearestDrain(point) {
    let nearest = null;
    this.drains.forEach((drain) => {
      for (let index = 0; index < drain.coords.length - 1; index += 1) {
        const candidate = this.nearestPointOnSegment(
          point,
          drain.coords[index],
          drain.coords[index + 1]
        );
        if (!nearest || candidate.distanceSquared < nearest.distanceSquared) {
          nearest = {
            drainId: drain.id,
            snapCoords: candidate.coords,
            distanceSquared: candidate.distanceSquared
          };
        }
      }
    });
    return nearest;
  }

  buildTopology() {
    const drains = new Map();
    this.drains.forEach((drain, index) => {
      drains.set(drain.id, {
        ...drain,
        index,
        capacity: this.manningCapacity(drain),
        attachedNodeIds: []
      });
    });

    const nodes = this.nodes.map((node, index) => {
      const nearest = this.nearestDrain(node.coords);
      const topologyNode = {
        ...node,
        index,
        nearestDrainId: nearest?.drainId ?? null,
        snapCoords: nearest?.snapCoords ?? node.coords,
        catchmentAreaHa:
          node.assetType === 'manhole'
            ? 0.45 + this.hash(index + 701) * 0.5
            : 0.25 + this.hash(index + 1701) * 0.4,
        vulnerability: 0.72 + this.hash(index + 2701) * 0.62
      };
      if (nearest?.drainId) {
        drains.get(nearest.drainId).attachedNodeIds.push(node.id);
      }
      return topologyNode;
    });

    return { nodes, drains };
  }

  getRainfallAt(timeMinutes, durationMinutes) {
    if (!this.rainfallProfile.length) return 0;
    const profileEnd = this.rainfallProfile[this.rainfallProfile.length - 1].t;
    const scaledTime = (timeMinutes / durationMinutes) * profileEnd;
    for (let index = 0; index < this.rainfallProfile.length - 1; index += 1) {
      const start = this.rainfallProfile[index];
      const end = this.rainfallProfile[index + 1];
      if (scaledTime >= start.t && scaledTime <= end.t) {
        const fraction = (scaledTime - start.t) / (end.t - start.t);
        return start.intensity + fraction * (end.intensity - start.intensity);
      }
    }
    return this.rainfallProfile[this.rainfallProfile.length - 1].intensity;
  }

  statusFor(utilization) {
    if (utilization >= 1) return 'surcharging';
    if (utilization >= 0.7) return 'near_capacity';
    return 'normal';
  }

  runSimulation(params = {}) {
    this.params = { ...this.params, ...params };
    const {
      rainfallIntensity,
      stormDuration,
      runoffCoeff,
      timeStep
    } = this.params;
    const profilePeak = Math.max(...this.rainfallProfile.map((point) => point.intensity), 1);
    this.results = [];

    for (let time = 0; time <= stormDuration; time += timeStep) {
      const profileRainfall = this.getRainfallAt(time, stormDuration);
      const rainfall = profileRainfall * (rainfallIntensity / profilePeak);
      const drainInflows = new Map(this.drains.map((drain) => [drain.id, 0]));

      const nodes = this.topology.nodes.map((node) => {
        const drain = this.topology.drains.get(node.nearestDrainId);
        const accessibleCapacity = drain ? drain.capacity * 0.7 : 0;
        const inflow = this.rationalFlow(
          runoffCoeff,
          rainfall,
          node.catchmentAreaHa
        ) * node.vulnerability;
        const capacityUtilization =
          accessibleCapacity > 0 ? Math.min(inflow / accessibleCapacity, 2.4) : 2.4;
        const status = this.statusFor(capacityUtilization);
        const depthCm = Math.min(
          90,
          Math.max(0, capacityUtilization - 0.56) * 54 * node.vulnerability
        );
        if (node.nearestDrainId) {
          drainInflows.set(
            node.nearestDrainId,
            drainInflows.get(node.nearestDrainId) + inflow
          );
        }
        return {
          id: node.id,
          coords: node.coords,
          snapCoords: node.snapCoords,
          assetType: node.assetType,
          elevation: node.elevation,
          upstreamDrainId: node.nearestDrainId,
          inflow,
          capacity: accessibleCapacity,
          capacityUtilization,
          status,
          depthCm
        };
      });

      const drains = this.drains.map((drain, index) => {
        const loadMultiplier = 4.5 + this.hash(index + 3701) * 5.5;
        const flow = (drainInflows.get(drain.id) || 0) * loadMultiplier;
        const capacity = this.topology.drains.get(drain.id).capacity;
        const utilization = capacity > 0 ? Math.min(flow / capacity, 2.4) : 2.4;
        return {
          id: drain.id,
          coords: drain.coords,
          type: drain.type,
          capacity,
          flow,
          utilization,
          status: this.statusFor(utilization)
        };
      });

      const floodedNodes = nodes.filter((node) => node.depthCm >= 2);
      const surchargingNodes = nodes.filter((node) => node.status === 'surcharging');
      this.results.push({
        time,
        rainfall,
        nodes,
        drains,
        floodedCount: floodedNodes.length,
        surchargingCount: surchargingNodes.length,
        maxDepthCm: Math.max(...nodes.map((node) => node.depthCm), 0),
        maxUtilization: Math.max(
          ...nodes.map((node) => node.capacityUtilization),
          ...drains.map((drain) => drain.utilization),
          0
        )
      });
    }

    return this.results;
  }
}

if (typeof window !== 'undefined') {
  window.FloodSimulator = FloodSimulator;
}

if (typeof module !== 'undefined') {
  module.exports = { FloodSimulator };
}
