const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      dark: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        maxzoom: 16,
        attribution: 'ESRI Dark Gray • CMWSSB'
      },
      ref: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        maxzoom: 16
      },
      esri: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        maxzoom: 19
      }
    },
    layers: [
      { id: 'dark', type: 'raster', source: 'dark', paint: { 'raster-opacity': 1 } },
      { id: 'esri', type: 'raster', source: 'esri', paint: { 'raster-opacity': 0.14 } },
      { id: 'ref', type: 'raster', source: 'ref', paint: { 'raster-opacity': 0.9 } }
    ]
  },
  center: typeof CHENNAI_CENTER !== 'undefined' ? CHENNAI_CENTER : [80.24, 13.06],
  zoom: 14.2,
  pitch: 52,
  bearing: 0,
  maxPitch: 85,
  minPitch: 0,
  minZoom: 2,
  maxZoom: 17,
  antialias: true,
  dragRotate: true,
  touchZoomRotate: true,
  touchPitch: true,
  renderWorldCopies: true
});

map.addControl(
  new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
  'bottom-right'
);

const simulator = new FloodSimulator({
  drains: DRAINAGE_NETWORK,
  manholes: MANHOLES,
  inlets: JUNCTION_NODES,
  rainfallProfile: RAINFALL_PROFILE
});
const simulationResults = simulator.runSimulation({
  rainfallIntensity: 100,
  stormDuration: 180,
  timeStep: 5
});

const FLOOD_LAYER_IDS = ['flood-depth-heat', 'flood-depth-cells'];
const GRAPH_LAYER_IDS = [
  'topology-links',
  'graph-edges-glow',
  'graph-edges-core',
  'graph-flow',
  'graph-nodes-glow',
  'graph-nodes-core'
];
const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };

let activeView = 'flood';
let currentStep = 0;
let selectedNodeId = null;
let isDark = true;
let isFlipping = false;
let playbackTimer = null;
let pointerStart = null;
let hoverPopup = null;
let flowAnimationFrame = null;
let lastPulseUpdate = 0;

function featureCollection(features) {
  return { type: 'FeatureCollection', features };
}

function getCurrentState() {
  return simulationResults[currentStep];
}

function nodeFeature(node) {
  return {
    type: 'Feature',
    properties: {
      id: node.id,
      assetType: node.assetType,
      inflow: node.inflow,
      capacity: node.capacity,
      capacityUtilization: node.capacityUtilization,
      status: node.status,
      depthCm: node.depthCm,
      upstreamDrainId: node.upstreamDrainId || ''
    },
    geometry: { type: 'Point', coordinates: node.coords }
  };
}

function drainFeature(drain) {
  return {
    type: 'Feature',
    properties: {
      id: drain.id,
      type: drain.type,
      flow: drain.flow,
      capacity: drain.capacity,
      utilization: drain.utilization,
      status: drain.status
    },
    geometry: { type: 'LineString', coordinates: drain.coords }
  };
}

function topologyLinkFeatures() {
  return simulator.topology.nodes
    .filter(
      (node) =>
        node.nearestDrainId &&
        (node.coords[0] !== node.snapCoords[0] || node.coords[1] !== node.snapCoords[1])
    )
    .map((node) => ({
      type: 'Feature',
      properties: {
        nodeId: node.id,
        drainId: node.nearestDrainId,
        assetType: node.assetType
      },
      geometry: {
        type: 'LineString',
        coordinates: [node.coords, node.snapCoords]
      }
    }));
}

function statusColorExpression(propertyName) {
  return [
    'match',
    ['get', propertyName],
    'surcharging',
    '#ef4444',
    'near_capacity',
    '#f59e0b',
    '#22c55e'
  ];
}

function setLayerVisibility(layerIds, visible) {
  layerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  });
}

function formatFlow(value) {
  return `${Number(value || 0).toFixed(3)} m³/s`;
}

function formatStatus(status) {
  return String(status || 'normal').replace('_', ' ');
}

function nodePopupHtml(node) {
  return `
    <div class="network-popup">
      <div class="network-popup__eyebrow">${node.assetType}</div>
      <strong>${node.id}</strong>
      <dl>
        <div><dt>Inflow</dt><dd>${formatFlow(node.inflow)}</dd></div>
        <div><dt>Capacity</dt><dd>${formatFlow(node.capacity)}</dd></div>
        <div><dt>Utilization</dt><dd>${Math.round(node.capacityUtilization * 100)}%</dd></div>
        <div><dt>Status</dt><dd data-status="${node.status}">${formatStatus(node.status)}</dd></div>
      </dl>
    </div>
  `;
}

function selectedFeaturesFor(nodeId) {
  if (!nodeId) return EMPTY_COLLECTION;
  const state = getCurrentState();
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) return EMPTY_COLLECTION;
  const drain = state.drains.find((item) => item.id === node.upstreamDrainId);
  const features = [nodeFeature(node)];
  if (drain) features.push(drainFeature(drain));
  return featureCollection(features);
}

function selectNetworkCause(nodeId, showPopup = false) {
  selectedNodeId = nodeId;
  const source = map.getSource('selected-network');
  if (source) source.setData(selectedFeaturesFor(nodeId));

  if (showPopup) {
    const node = getCurrentState().nodes.find((item) => item.id === nodeId);
    if (node) {
      new maplibregl.Popup({ closeButton: false, offset: 12 })
        .setLngLat(node.coords)
        .setHTML(nodePopupHtml(node))
        .addTo(map);
    }
  }
}

function updateMetrics(state) {
  document.getElementById('timeValue').textContent = `${state.time} min`;
  document.getElementById('rainfallValue').textContent = `${state.rainfall.toFixed(0)} mm/h`;
  document.getElementById('depthValue').textContent = `${state.maxDepthCm.toFixed(1)} cm`;
  document.getElementById('surchargeValue').textContent = state.surchargingCount.toLocaleString();
  document.getElementById('timeSlider').value = state.time;
}

function renderSimulationStep(step) {
  currentStep = Math.max(0, Math.min(step, simulationResults.length - 1));
  const state = getCurrentState();
  const graphNodeSource = map.getSource('graph-nodes');
  const graphEdgeSource = map.getSource('graph-edges');
  const floodSource = map.getSource('flood-depth');

  if (graphNodeSource) {
    graphNodeSource.setData(featureCollection(state.nodes.map(nodeFeature)));
  }
  if (graphEdgeSource) {
    graphEdgeSource.setData(featureCollection(state.drains.map(drainFeature)));
  }
  if (floodSource) {
    floodSource.setData(featureCollection(state.nodes.map(nodeFeature)));
  }
  if (selectedNodeId) {
    selectNetworkCause(selectedNodeId);
  }
  updateMetrics(state);
}

function updateViewChrome() {
  const graphActive = activeView === 'graph';
  const toggle = document.getElementById('viewToggle');
  const viewName = document.getElementById('viewName');
  const viewDetail = document.getElementById('viewDetail');
  const legend = document.getElementById('legendContent');

  toggle.setAttribute('aria-pressed', String(graphActive));
  toggle.innerHTML = graphActive
    ? '<i class="ph ph-waves"></i><span>Show flood depth</span>'
    : '<i class="ph ph-git-branch"></i><span>Show drainage network</span>';
  viewName.textContent = graphActive ? 'Drainage graph' : 'Flood depth proxy';
  viewDetail.textContent = graphActive
    ? '1,100 connected assets • flow + surcharge'
    : '800 manholes • shared hydraulic timestep';
  legend.innerHTML = graphActive
    ? `
      <div><span class="legend-dot legend-dot--normal"></span>Normal</div>
      <div><span class="legend-dot legend-dot--watch"></span>Near capacity</div>
      <div><span class="legend-dot legend-dot--danger"></span>Surcharging</div>
      <div><span class="legend-line"></span>Drain flow / utilization</div>
    `
    : `
      <div><span class="depth-swatch depth-swatch--low"></span>2–15 cm</div>
      <div><span class="depth-swatch depth-swatch--medium"></span>15–40 cm</div>
      <div><span class="depth-swatch depth-swatch--high"></span>40+ cm</div>
      <div><i class="ph ph-cursor-click"></i> Select cell for upstream cause</div>
    `;
}

function applyViewLayers() {
  const graphActive = activeView === 'graph';
  setLayerVisibility(FLOOD_LAYER_IDS, !graphActive);
  setLayerVisibility(GRAPH_LAYER_IDS, graphActive);
  updateViewChrome();
}

function toggleView() {
  if (isFlipping) return;
  isFlipping = true;
  const mapCard = document.getElementById('mapCard');
  const toggle = document.getElementById('viewToggle');
  mapCard.classList.add('is-flipping');
  toggle.disabled = true;

  window.setTimeout(() => {
    activeView = activeView === 'flood' ? 'graph' : 'flood';
    mapCard.dataset.view = activeView;
    applyViewLayers();
  }, 320);

  window.setTimeout(() => {
    mapCard.classList.remove('is-flipping');
    toggle.disabled = false;
    isFlipping = false;
    map.resize();
  }, 680);
}

function togglePlayback() {
  const button = document.getElementById('playToggle');
  if (playbackTimer) {
    window.clearInterval(playbackTimer);
    playbackTimer = null;
    button.innerHTML = '<i class="ph-fill ph-play"></i>';
    button.setAttribute('aria-label', 'Play nowcast');
    return;
  }

  button.innerHTML = '<i class="ph-fill ph-pause"></i>';
  button.setAttribute('aria-label', 'Pause nowcast');
  playbackTimer = window.setInterval(() => {
    const nextStep = currentStep + 1;
    if (nextStep >= simulationResults.length) {
      renderSimulationStep(0);
      return;
    }
    renderSimulationStep(nextStep);
  }, 550);
}

function toggleTheme() {
  isDark = !isDark;
  const button = document.getElementById('darkToggle');
  if (isDark) {
    map.setPaintProperty('dark', 'raster-opacity', 1);
    map.setPaintProperty('esri', 'raster-opacity', 0.14);
    map.setPaintProperty('ref', 'raster-opacity', 0.9);
    button.innerHTML = '<i class="ph ph-moon"></i> DARK';
    button.className = 'theme-button theme-button--dark';
  } else {
    map.setPaintProperty('dark', 'raster-opacity', 0);
    map.setPaintProperty('esri', 'raster-opacity', 0.98);
    map.setPaintProperty('ref', 'raster-opacity', 0);
    button.innerHTML = '<i class="ph ph-sun"></i> REAL';
    button.className = 'theme-button theme-button--light';
  }
}

function animateFlow(timestamp) {
  if (
    activeView === 'graph' &&
    map.getLayer('graph-flow') &&
    timestamp - lastPulseUpdate > 90
  ) {
    const pulse = 0.42 + (Math.sin(timestamp / 280) + 1) * 0.18;
    map.setPaintProperty('graph-flow', 'line-opacity', pulse);
    lastPulseUpdate = timestamp;
  }
  flowAnimationFrame = window.requestAnimationFrame(animateFlow);
}

map.on('load', () => {
  const initialState = getCurrentState();

  map.addSource('flood-depth', {
    type: 'geojson',
    data: featureCollection(initialState.nodes.map(nodeFeature))
  });
  map.addSource('graph-edges', {
    type: 'geojson',
    lineMetrics: true,
    data: featureCollection(initialState.drains.map(drainFeature))
  });
  map.addSource('graph-nodes', {
    type: 'geojson',
    data: featureCollection(initialState.nodes.map(nodeFeature))
  });
  map.addSource('topology-links', {
    type: 'geojson',
    data: featureCollection(topologyLinkFeatures())
  });
  map.addSource('selected-network', {
    type: 'geojson',
    data: EMPTY_COLLECTION
  });

  map.addLayer({
    id: 'flood-depth-heat',
    type: 'heatmap',
    source: 'flood-depth',
    maxzoom: 17,
    paint: {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'depthCm'],
        0,
        0,
        10,
        0.25,
        45,
        0.75,
        90,
        1
      ],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 12, 0.65, 16, 1.25],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 28],
      'heatmap-opacity': 0.82,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(14, 165, 233, 0)',
        0.2,
        'rgba(14, 165, 233, 0.5)',
        0.45,
        'rgba(34, 211, 238, 0.72)',
        0.7,
        'rgba(245, 158, 11, 0.82)',
        1,
        'rgba(239, 68, 68, 0.94)'
      ]
    }
  });
  map.addLayer({
    id: 'flood-depth-cells',
    type: 'circle',
    source: 'flood-depth',
    filter: ['>', ['get', 'depthCm'], 1.5],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'depthCm'], 2, 3, 90, 9],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'depthCm'],
        2,
        '#38bdf8',
        15,
        '#22d3ee',
        40,
        '#f59e0b',
        70,
        '#ef4444'
      ],
      'circle-opacity': 0.72,
      'circle-stroke-color': 'rgba(255,255,255,0.52)',
      'circle-stroke-width': 0.7
    }
  });

  map.addLayer({
    id: 'topology-links',
    type: 'line',
    source: 'topology-links',
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#94a3b8',
      'line-width': 0.7,
      'line-opacity': 0.18,
      'line-dasharray': [1.5, 2]
    }
  });
  map.addLayer({
    id: 'graph-edges-glow',
    type: 'line',
    source: 'graph-edges',
    layout: { visibility: 'none' },
    paint: {
      'line-color': statusColorExpression('status'),
      'line-width': ['interpolate', ['linear'], ['get', 'utilization'], 0, 3, 2.4, 13],
      'line-opacity': 0.16,
      'line-blur': 5
    }
  });
  map.addLayer({
    id: 'graph-edges-core',
    type: 'line',
    source: 'graph-edges',
    layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': statusColorExpression('status'),
      'line-width': ['interpolate', ['linear'], ['get', 'utilization'], 0, 1.2, 2.4, 4.5],
      'line-opacity': 0.9
    }
  });
  map.addLayer({
    id: 'graph-flow',
    type: 'line',
    source: 'graph-edges',
    layout: { visibility: 'none', 'line-cap': 'round' },
    paint: {
      'line-color': '#f8fafc',
      'line-width': ['interpolate', ['linear'], ['get', 'flow'], 0, 0.35, 1, 2.5],
      'line-opacity': 0.5,
      'line-dasharray': [0.3, 2.4]
    }
  });
  map.addLayer({
    id: 'graph-nodes-glow',
    type: 'circle',
    source: 'graph-nodes',
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['match', ['get', 'assetType'], 'inlet', 8, 6],
      'circle-color': statusColorExpression('status'),
      'circle-blur': 0.65,
      'circle-opacity': 0.28
    }
  });
  map.addLayer({
    id: 'graph-nodes-core',
    type: 'circle',
    source: 'graph-nodes',
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['match', ['get', 'assetType'], 'inlet', 3.7, 2.8],
      'circle-color': statusColorExpression('status'),
      'circle-stroke-color': '#f8fafc',
      'circle-stroke-width': 0.8,
      'circle-opacity': 0.96
    }
  });

  map.addLayer({
    id: 'selected-drain',
    type: 'line',
    source: 'selected-network',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: {
      'line-color': '#ffffff',
      'line-width': 6,
      'line-opacity': 0.92,
      'line-blur': 1
    }
  });
  map.addLayer({
    id: 'selected-node',
    type: 'circle',
    source: 'selected-network',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 10,
      'circle-color': 'rgba(255,255,255,0.12)',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2.4
    }
  });

  map.on('click', 'graph-nodes-core', (event) => {
    const nodeId = event.features[0].properties.id;
    selectNetworkCause(nodeId, true);
  });
  map.on('mousemove', 'graph-nodes-core', (event) => {
    const node = getCurrentState().nodes.find(
      (item) => item.id === event.features[0].properties.id
    );
    if (!node) return;
    if (!hoverPopup) hoverPopup = new maplibregl.Popup({ closeButton: false, offset: 12 });
    hoverPopup.setLngLat(node.coords).setHTML(nodePopupHtml(node)).addTo(map);
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'graph-nodes-core', () => {
    if (hoverPopup) hoverPopup.remove();
    hoverPopup = null;
    map.getCanvas().style.cursor = '';
  });
  map.on('click', 'flood-depth-cells', (event) => {
    const nodeId = event.features[0].properties.id;
    selectNetworkCause(nodeId, true);
  });
  map.on('mouseenter', 'flood-depth-cells', () => {
    map.getCanvas().style.cursor = 'crosshair';
  });
  map.on('mouseleave', 'flood-depth-cells', () => {
    map.getCanvas().style.cursor = '';
  });

  applyViewLayers();
  renderSimulationStep(0);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    flowAnimationFrame = window.requestAnimationFrame(animateFlow);
  }
});

document.getElementById('viewToggle').addEventListener('click', toggleView);
document.getElementById('playToggle').addEventListener('click', togglePlayback);
document.getElementById('darkToggle').addEventListener('click', toggleTheme);
document.getElementById('timeSlider').addEventListener('input', (event) => {
  const time = Number(event.target.value);
  renderSimulationStep(Math.round(time / simulator.params.timeStep));
});

const mapCard = document.getElementById('mapCard');
mapCard.addEventListener('pointerdown', (event) => {
  const swipeHandle = event.target.closest('.swipe-hint');
  if ((event.target.closest('.map-ui') && !swipeHandle) || (event.pointerType === 'mouse' && !swipeHandle)) {
    return;
  }
  pointerStart = { x: event.clientX, y: event.clientY };
  mapCard.setPointerCapture(event.pointerId);
}, true);
mapCard.addEventListener('pointerup', (event) => {
  if (!pointerStart) return;
  const horizontalDistance = event.clientX - pointerStart.x;
  const verticalDistance = event.clientY - pointerStart.y;
  pointerStart = null;
  if (Math.abs(horizontalDistance) > 80 && Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
    toggleView();
  }
});
mapCard.addEventListener('pointercancel', () => {
  pointerStart = null;
});

window.setInterval(() => {
  const clock = document.getElementById('clock');
  if (clock) {
    clock.textContent = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}, 1000);

window.addEventListener('beforeunload', () => {
  if (flowAnimationFrame) window.cancelAnimationFrame(flowAnimationFrame);
  if (playbackTimer) window.clearInterval(playbackTimer);
});
