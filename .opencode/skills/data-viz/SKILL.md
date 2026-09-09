---
name: data-viz
description: Use when building data visualizations, dashboards, maps, charts, or any visual representation of data. Triggers on words like visualize, chart, graph, map, dashboard, plot, 3D, animation, time series, heat map, flood map, terrain.
---

# Data Visualization Skill

Build stunning, interactive visualizations that tell a story with data.

## Visualization Types & Tools

| Type | Tool | Token? | Best For |
|------|------|--------|----------|
| 2D Maps | MapLibre GL JS | No | GeoJSON, markers, choropleth |
| 3D Maps | MapLibre GL JS | No | Terrain, extrusions, flythrough |
| Charts | Chart.js | No | Line, bar, pie, radar |
| Time Series | Chart.js + Streaming | No | Real-time updating graphs |
| Particles | Canvas API | No | Rain, water, flow effects |
| Three.js | Three.js CDN | No | Full 3D scenes, globes |

## MapLibre GL JS Patterns

### Dark Themed Map
```javascript
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256
      }
    },
    layers: [{
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-brightness-max': 0.35,
        'raster-saturation': -0.8,
        'raster-hue-rotate': 180
      }
    }]
  },
  center: [lng, lat],
  zoom: 13,
  pitch: 50,
  bearing: -15
});
```

### 3D Building Extrusions
```javascript
map.addLayer({
  id: 'buildings',
  type: 'fill-extrusion',
  source: 'buildings',
  paint: {
    'fill-extrusion-color': ['get', 'color'],
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-opacity': 0.8
  }
});
```

### Animated Markers
```javascript
// Pulsing overflow marker
const marker = new maplibregl.Marker({
  element: createPulsingMarker(color, size)
}).setLngLat([lng, lat]).addTo(map);

function createPulsingMarker(color, size) {
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${size}px; height: ${size}px;
    background: ${color}; border-radius: 50%;
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 ${size}px ${color};
  `;
  return el;
}
```

### Dynamic GeoJSON Updates
```javascript
// Update source data efficiently
map.getSource('my-source').setData({
  type: 'FeatureCollection',
  features: newFeatures
});

// Or with animation
function animateSource(sourceId, newData, duration = 1000) {
  const start = map.getSource(sourceId).getData();
  const end = newData;
  const startTime = performance.now();
  
  function frame(time) {
    const t = Math.min((time - startTime) / duration, 1);
    const interpolated = interpolateGeoJSON(start, end, t);
    map.getSource(sourceId).setData(interpolated);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

## Chart.js Patterns

### Dark Themed Chart
```javascript
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: timestamps,
    datasets: [{
      label: 'Value',
      data: values,
      borderColor: '#00c8ff',
      backgroundColor: 'rgba(0, 200, 255, 0.1)',
      fill: true,
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#e0e0e0' } }
    },
    scales: {
      x: { ticks: { color: '#78909c' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#78909c' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  }
});
```

### Real-Time Streaming
```javascript
// Add data point and shift window
function addData(chart, label, value) {
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);
  if (chart.data.labels.length > 50) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update('none'); // no animation for smooth streaming
}
```

## Canvas Particle Effects

### Rain Overlay
```javascript
class RainEffect {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.drops = [];
    this.resize();
  }
  
  resize() {
    this.ctx.canvas.width = window.innerWidth;
    this.ctx.canvas.height = window.innerHeight;
  }
  
  addDrop() {
    this.drops.push({
      x: Math.random() * this.ctx.canvas.width,
      y: -10,
      speed: 8 + Math.random() * 12,
      length: 15 + Math.random() * 20,
      opacity: 0.1 + Math.random() * 0.3
    });
  }
  
  update() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drops.forEach((d, i) => {
      d.y += d.speed;
      this.ctx.beginPath();
      this.ctx.moveTo(d.x, d.y);
      this.ctx.lineTo(d.x - 1, d.y + d.length);
      this.ctx.strokeStyle = `rgba(100, 180, 255, ${d.opacity})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      if (d.y > this.ctx.canvas.height) this.drops.splice(i, 1);
    });
  }
}
```

## Animation Patterns

### Time Slider Control
```javascript
let currentTime = 0;
let isPlaying = false;

function togglePlay() {
  isPlaying = !isPlaying;
  if (isPlaying) {
    playInterval = setInterval(() => {
      if (currentTime >= maxTime) { togglePlay(); return; }
      currentTime++;
      updateVisualization(currentTime);
    }, 250);
  } else {
    clearInterval(playInterval);
  }
}

document.getElementById('timeSlider').addEventListener('input', (e) => {
  currentTime = parseInt(e.target.value);
  updateVisualization(currentTime);
});
```

### Smooth Transitions
```javascript
function lerp(a, b, t) { return a + (b - a) * t; }

function animateValue(el, start, end, duration = 500) {
  const startTime = performance.now();
  function frame(time) {
    const t = Math.min((time - startTime) / duration, 1);
    el.textContent = lerp(start, end, t).toFixed(2);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

## Color Scales

### Flood Risk
```javascript
const riskColors = {
  LOW: '#00ff88',
  MODERATE: '#ffaa00',
  HIGH: '#ff3333',
  EXTREME: '#ff00ff'
};
```

### Depth/Intensity Gradient
```javascript
function getIntensityColor(value, max) {
  const t = value / max;
  if (t < 0.33) return `rgba(0, 255, 136, ${0.3 + t})`;
  if (t < 0.66) return `rgba(255, 170, 0, ${0.3 + t})`;
  return `rgba(255, 51, 51, ${0.3 + t})`;
}
```

## Performance Tips

1. **Throttle updates** — Don't re-render every frame, use `requestAnimationFrame`
2. **Batch GeoJSON** — Update sources once per frame, not per feature
3. **Use `update('none')`** — Skip chart animations during real-time updates
4. **Canvas > SVG** — For 1000+ elements, use Canvas API
5. **Web Workers** — Offload heavy computation (simulation, interpolation)
6. **debounce resize** — Don't re-layout on every pixel of window resize
