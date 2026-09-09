---
name: hackathon-sprint
description: Use when building projects under time pressure (hackathons, sprints, demos). Triggers on words like hackathon, sprint, prototype, demo, SIH, rapid build, quick prototype, time-limited.
---

# Hackathon Sprint Skill

Maximize output in minimum time. Ship a working demo, not a perfect product.

## Core Principles

1. **Working > Perfect** — A rough demo that runs beats a polished one that crashes
2. **Frontend first** — Judges see the UI. Make it visually impressive immediately
3. **Mock the backend** — Hardcode realistic data. Build the real engine only if time permits
4. **One file > many** — Fewer files = fewer integration bugs. Merge aggressively
5. **CDN > npm** — No build step. Use `<script>` tags. Zero config wins

## Tech Stack (Zero Setup)

- **Frontend**: Single HTML file + CDN libraries (MapLibre GL JS, Chart.js, D3, Three.js)
- **Backend**: Python Flask/FastAPI only if needed, otherwise pure frontend
- **Data**: Embedded JSON in JS files, no database
- **Styling**: Tailwind CDN or inline CSS, dark themes look impressive

## Time Budget (36-hour hackathon)

| Phase | Hours | Deliverable |
|-------|-------|-------------|
| Setup + core UI | 4 | Working map/interface with real data |
| Main feature | 10 | The primary demo functionality |
| Polish + animations | 4 | Visual wow factor |
| Secondary features | 6 | Backup features if primary works |
| Testing + fixes | 4 | Bug fixes, edge cases |
| Presentation prep | 4 | Slides, demo script, backup plan |
| Buffer | 4 | Unexpected issues |

## Delivery Checklist

- [ ] App runs with zero setup (single command or open HTML)
- [ ] Visual impact in first 5 seconds
- [ ] Core feature works end-to-end
- [ ] Data looks realistic (real coordinates, real names, real numbers)
- [ ] No console errors
- [ ] Works on Chrome (judge's browser)
- [ ] Dark theme (looks professional)
- [ ] Responsive (works on projector)

## Common Patterns

### Quick 3D Map
```html
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<!-- No API token needed -->
```

### Quick Chart
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

### Quick Server
```python
from flask import Flask, send_from_directory
app = Flask(__name__, static_folder='static')
@app.route('/')
def index(): return send_from_directory('static', 'index.html')
app.run(port=5000)
```

## Anti-Patterns to Avoid

- Don't set up Webpack/Vite/React — too much config time
- Don't implement auth — mock it
- Don't use a database — embed data
- Don't write tests — manual testing only
- Don't refactor mid-sprint — finish first, clean later
- Don't argue about tools — pick one and go

## Presentation Tips

- Start with the problem, not the solution
- Show the demo working live (have a backup video)
- Mention the tech stack briefly (judges care about impact)
- Know your "future roadmap" answers (they always ask)
