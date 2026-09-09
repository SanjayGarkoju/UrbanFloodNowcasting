---
name: fullstack-webapp
description: Use when building complete web applications from scratch. Triggers on words like build app, create website, full stack, web app, dashboard, frontend backend, deploy, Flask, FastAPI, Node.
---

# Fullstack Webapp Skill

Build complete, production-ready web applications with proper architecture.

## Architecture Pattern

```
project/
├── app.py                  # Flask/FastAPI server
├── requirements.txt        # Python deps
├── static/
│   ├── index.html          # Single entry point
│   ├── css/
│   │   └── style.css       # All styles
│   └── js/
│       ├── app.js          # Main app logic
│       ├── api.js          # API client
│       └── utils.js        # Shared utilities
└── data/                   # Static data files (JSON, CSV)
```

## Tech Stack

### Backend
- **Python 3.11+** with Flask or FastAPI
- Flask for simple apps, FastAPI for async/API-heavy
- No database — use JSON files or SQLite for small projects
- Static file serving from `static/`

### Frontend
- Vanilla JS (no framework unless complexity demands it)
- MapLibre GL JS for maps (no token needed)
- Chart.js for graphs
- CSS Grid/Flexbox for layout
- CSS variables for theming

### CDN Libraries (no build step)
```html
<!-- Maps -->
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet">

<!-- Charts -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- Icons -->
<link href="https://cdn.jsdelivr.net/npm/remixicon@4.1.0/fonts/remixicon.css" rel="stylesheet">
```

## API Design

### Flask Pattern
```python
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='static')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({"key": "value"})

@app.route('/api/process', methods=['POST'])
def process():
    data = request.json
    result = do_something(data)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

### Frontend API Client
```javascript
const API = {
  async get(url) {
    const res = await fetch(`/api${url}`);
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(`/api${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
```

## Dark Theme Template

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-card: rgba(12, 14, 20, 0.94);
  --border: rgba(0, 200, 255, 0.12);
  --text-primary: #e0e0e0;
  --text-secondary: #78909c;
  --accent: #00c8ff;
  --success: #00ff88;
  --warning: #ffaa00;
  --danger: #ff3333;
  --blur: blur(16px);
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.panel {
  background: var(--bg-card);
  backdrop-filter: var(--blur);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
}
```

## File Structure Rules

1. **One HTML file** — No multi-page apps unless required
2. **Separate JS files** — Keep logic organized by concern
3. **CSS in one file** — Use variables for consistency
4. **Data as JSON** — Embed or fetch from `/static/data/`
5. **No build step** — CDN + vanilla JS = instant startup

## Launch Checklist

1. `pip install -r requirements.txt`
2. `python app.py`
3. Open `http://localhost:5000`
4. Verify no console errors
5. Test all interactive features
6. Check responsive on small screens
