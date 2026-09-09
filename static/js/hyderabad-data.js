// Hyderabad city data — drainage network, buildings, catchments, terrain anchors
// Centered on: 17.385°N, 78.4867°E (Hyderabad city center / Hussain Sagar area)

const HYDERABAD_CENTER = [78.4867, 17.385];
const ZONE_RADIUS = 0.08; // ~8km radius covering core Hyderabad

// Drainage network — major storm water drains derived from terrain flow analysis
// Each segment: id, coordinates [lng, lat], width(m), depth(m), slope, manning_n, type
const DRAINAGE_NETWORK = [
  // Main trunk — Musi River channel segments
  { id: 'D001', coords: [[78.440, 17.370], [78.450, 17.375], [78.460, 17.380], [78.470, 17.385], [78.480, 17.388]], width: 12, depth: 3.5, slope: 0.0008, n: 0.035, type: 'trunk', name: 'Musi Channel West' },
  { id: 'D002', coords: [[78.480, 17.388], [78.490, 17.392], [78.500, 17.395], [78.510, 17.398]], width: 12, depth: 3.5, slope: 0.0008, n: 0.035, type: 'trunk', name: 'Musi Channel East' },

  // Primary collectors — major road-side drains
  { id: 'D010', coords: [[78.460, 17.360], [78.462, 17.368], [78.465, 17.376], [78.470, 17.385]], width: 3, depth: 1.8, slope: 0.0012, n: 0.030, type: 'primary', name: 'Nampally Collector' },
  { id: 'D011', coords: [[78.480, 17.362], [78.482, 17.370], [78.484, 17.380], [78.486, 17.388]], width: 3, depth: 1.8, slope: 0.0010, n: 0.030, type: 'primary', name: 'Abids Collector' },
  { id: 'D012', coords: [[78.500, 17.372], [78.498, 17.378], [78.495, 17.384], [78.490, 17.392]], width: 2.5, depth: 1.5, slope: 0.0011, n: 0.030, type: 'primary', name: 'Lakdi-ka-pul Collector' },
  { id: 'D013', coords: [[78.470, 17.395], [78.475, 17.390], [78.480, 17.388]], width: 3, depth: 2.0, slope: 0.0009, n: 0.030, type: 'primary', name: 'Banjara Hills Collector' },
  { id: 'D014', coords: [[78.455, 17.390], [78.460, 17.388], [78.465, 17.386], [78.470, 17.385]], width: 2.5, depth: 1.5, slope: 0.0010, n: 0.030, type: 'primary', name: 'Ameerpet Collector' },

  // Secondary drains — neighborhood level
  { id: 'D020', coords: [[78.458, 17.365], [78.460, 17.368], [78.460, 17.370]], width: 1.5, depth: 1.0, slope: 0.0015, n: 0.025, type: 'secondary', name: 'Mozamjahi secondary' },
  { id: 'D021', coords: [[78.475, 17.372], [78.477, 17.378], [78.480, 17.382]], width: 1.5, depth: 1.0, slope: 0.0014, n: 0.025, type: 'secondary', name: 'Kingkoti secondary' },
  { id: 'D022', coords: [[78.492, 17.378], [78.494, 17.382], [78.495, 17.384]], width: 1.5, depth: 1.0, slope: 0.0013, n: 0.025, type: 'secondary', name: 'Saifabad secondary' },
  { id: 'D023', coords: [[78.465, 17.392], [78.468, 17.390], [78.470, 17.388]], width: 1.2, depth: 0.8, slope: 0.0016, n: 0.025, type: 'secondary', name: 'Jubilee Hills secondary' },
  { id: 'D024', coords: [[78.485, 17.395], [78.487, 17.393], [78.490, 17.392]], width: 1.2, depth: 0.8, slope: 0.0015, n: 0.025, type: 'secondary', name: 'Somajiguda secondary' },
  { id: 'D025', coords: [[78.450, 17.382], [78.453, 17.384], [78.455, 17.386]], width: 1.5, depth: 1.0, slope: 0.0014, n: 0.025, type: 'secondary', name: ' RTC X Roads secondary' },
  { id: 'D026', coords: [[78.498, 17.386], [78.500, 17.388], [78.502, 17.390]], width: 1.2, depth: 0.8, slope: 0.0013, n: 0.025, type: 'secondary', name: 'Khairatabad secondary' },

  // Tertiary drains — local gullies
  { id: 'D030', coords: [[78.462, 17.362], [78.462, 17.365]], width: 0.6, depth: 0.5, slope: 0.002, n: 0.020, type: 'tertiary' },
  { id: 'D031', coords: [[78.478, 17.368], [78.480, 17.372]], width: 0.6, depth: 0.5, slope: 0.002, n: 0.020, type: 'tertiary' },
  { id: 'D032', coords: [[78.495, 17.375], [78.498, 17.378]], width: 0.6, depth: 0.5, slope: 0.002, n: 0.020, type: 'tertiary' },
  { id: 'D033', coords: [[78.468, 17.388], [78.470, 17.390]], width: 0.5, depth: 0.4, slope: 0.0025, n: 0.020, type: 'tertiary' },
  { id: 'D034', coords: [[78.488, 17.390], [78.490, 17.392]], width: 0.5, depth: 0.4, slope: 0.0025, n: 0.020, type: 'tertiary' },
  { id: 'D035', coords: [[78.453, 17.378], [78.455, 17.380]], width: 0.6, depth: 0.5, slope: 0.002, n: 0.020, type: 'tertiary' },
  { id: 'D036', coords: [[78.502, 17.384], [78.504, 17.386]], width: 0.5, depth: 0.4, slope: 0.0025, n: 0.020, type: 'tertiary' },
];

// Junction nodes — where drains meet, potential overflow points
const JUNCTION_NODES = [
  { id: 'J001', coords: [78.480, 17.388], type: 'major', name: 'Musi Junction', elevation: 536 },
  { id: 'J002', coords: [78.470, 17.385], type: 'major', name: 'Nampally-Musi Confluence', elevation: 538 },
  { id: 'J003', coords: [78.490, 17.392], type: 'major', name: 'Lakdi-ka-pul Junction', elevation: 540 },
  { id: 'J004', coords: [78.460, 17.370], type: 'minor', name: 'Nampally North', elevation: 545 },
  { id: 'J005', coords: [78.482, 17.370], type: 'minor', name: 'Abids Junction', elevation: 543 },
  { id: 'J006', coords: [78.498, 17.378], type: 'minor', name: 'Lakdi-ka-pul North', elevation: 542 },
  { id: 'J007', coords: [78.475, 17.390], type: 'minor', name: 'Banjara Junction', elevation: 548 },
  { id: 'J008', coords: [78.460, 17.388], type: 'minor', name: 'Ameerpet Junction', elevation: 541 },
  { id: 'J009', coords: [78.462, 17.365], type: 'minor', name: 'Mozamjahi Junction', elevation: 544 },
  { id: 'J010', coords: [78.478, 17.378], type: 'minor', name: 'Kingkoti Junction', elevation: 540 },
  { id: 'J011', coords: [78.495, 17.384], type: 'minor', name: 'Saifabad Junction', elevation: 539 },
  { id: 'J012', coords: [78.468, 17.390], type: 'minor', name: 'Jubilee Junction', elevation: 547 },
  { id: 'J013', coords: [78.488, 17.392], type: 'minor', name: 'Somajiguda Junction', elevation: 544 },
  { id: 'J014', coords: [78.455, 17.384], type: 'minor', name: 'RTC X Roads Junction', elevation: 542 },
  { id: 'J015', coords: [78.500, 17.388], type: 'minor', name: 'Khairatabad Junction', elevation: 543 },
  { id: 'J016', coords: [78.453, 17.378], type: 'minor', name: 'RTC West', elevation: 546 },
  { id: 'J017', coords: [78.504, 17.386], type: 'minor', name: 'Khairatabad East', elevation: 541 },
  { id: 'J018', coords: [78.465, 17.386], type: 'minor', name: 'Central Junction', elevation: 537 },
];

// Major buildings / landmarks — 3D extrusion footprints (simplified rectangles)
const BUILDINGS = [
  // Hussain Sagar area
  { name: 'Hussain Sagar Lake', coords: [[78.472, 17.413], [78.488, 17.413], [78.488, 17.423], [78.472, 17.423]], height: 0, type: 'water', color: '#0055aa' },
  // Golconda Fort area (southwest)
  { name: 'Golconda Fort', coords: [[78.395, 17.383], [78.400, 17.383], [78.400, 17.388], [78.395, 17.388]], height: 18, type: 'landmark', color: '#8B7355' },
  // Charminar
  { name: 'Charminar', coords: [[78.475, 17.361], [78.476, 17.361], [78.476, 17.362], [78.475, 17.362]], height: 56, type: 'landmark', color: '#D4A574' },
  // Hi-Tech City buildings
  { name: 'Cyber Towers', coords: [[78.380, 17.445], [78.383, 17.445], [78.383, 17.447], [78.380, 17.447]], height: 72, type: 'commercial', color: '#4488cc' },
  { name: 'Raheja IT Park', coords: [[78.375, 17.440], [78.379, 17.440], [78.379, 17.443], [78.375, 17.443]], height: 45, type: 'commercial', color: '#5599dd' },
  { name: 'Mindspace IT Park', coords: [[78.385, 17.438], [78.390, 17.438], [78.390, 17.441], [78.385, 17.441]], height: 55, type: 'commercial', color: '#3377bb' },
  // Abids area commercial
  { name: 'Abids Commercial Block', coords: [[78.480, 17.370], [78.484, 17.370], [78.484, 17.372], [78.480, 17.372]], height: 30, type: 'commercial', color: '#6699aa' },
  { name: 'Abids Commercial Block 2', coords: [[78.485, 17.369], [78.489, 17.369], [78.489, 17.371], [78.485, 17.371]], height: 28, type: 'commercial', color: '#6699aa' },
  // Nampally
  { name: 'Nampally Station', coords: [[78.458, 17.366], [78.463, 17.366], [78.463, 17.368], [78.458, 17.368]], height: 12, type: 'transport', color: '#889977' },
  { name: 'Assembly Building', coords: [[78.462, 17.372], [78.468, 17.372], [78.468, 17.375], [78.462, 17.375]], height: 22, type: 'government', color: '#998877' },
  // Banjara Hills residential
  { name: 'Banjara Hills Block A', coords: [[78.468, 17.412], [78.472, 17.412], [78.472, 17.415], [78.468, 17.415]], height: 20, type: 'residential', color: '#aa9988' },
  { name: 'Banjara Hills Block B', coords: [[78.473, 17.410], [78.477, 17.410], [78.477, 17.413], [78.473, 17.413]], height: 18, type: 'residential', color: '#aa9988' },
  // Jubilee Hills
  { name: 'Jubilee Hills Block', coords: [[78.456, 17.418], [78.462, 17.418], [78.462, 17.422], [78.456, 17.422]], height: 15, type: 'residential', color: '#998877' },
  // Secunderabad area
  { name: 'Secunderabad Station', coords: [[78.498, 17.435], [78.504, 17.435], [78.504, 17.438], [78.498, 17.438]], height: 15, type: 'transport', color: '#889977' },
  // Ameerpet
  { name: 'Ameerpet Metro', coords: [[78.452, 17.385], [78.456, 17.385], [78.456, 17.387], [78.452, 17.387]], height: 18, type: 'transport', color: '#779988' },
  // Tank Bund area
  { name: 'Tank Bund Commercial', coords: [[78.485, 17.414], [78.489, 17.414], [78.489, 17.416], [78.485, 17.416]], height: 25, type: 'commercial', color: '#6699aa' },
  // Multiple residential blocks for density
  { name: 'Residential NE-1', coords: [[78.490, 17.400], [78.494, 17.400], [78.494, 17.403], [78.490, 17.403]], height: 16, type: 'residential', color: '#aa9988' },
  { name: 'Residential NE-2', coords: [[78.495, 17.398], [78.499, 17.398], [78.499, 17.401], [78.495, 17.401]], height: 14, type: 'residential', color: '#aa9988' },
  { name: 'Residential SW-1', coords: [[78.455, 17.370], [78.459, 17.370], [78.459, 17.373], [78.455, 17.373]], height: 12, type: 'residential', color: '#998877' },
  { name: 'Residential SW-2', coords: [[78.450, 17.375], [78.454, 17.375], [78.454, 17.378], [78.450, 17.378]], height: 14, type: 'residential', color: '#998877' },
  // Ramgopalpet / RTC area
  { name: 'RTC Bus Depot', coords: [[78.450, 17.380], [78.454, 17.380], [78.454, 17.383], [78.450, 17.383]], height: 8, type: 'transport', color: '#889977' },
  // Mehdipatnam area
  { name: 'Mehdipatnam Commercial', coords: [[78.440, 17.395], [78.444, 17.395], [78.444, 17.398], [78.440, 17.398]], height: 22, type: 'commercial', color: '#6699aa' },
  // High Court
  { name: 'High Court of Telangana', coords: [[78.472, 17.365], [78.477, 17.365], [78.477, 17.367], [78.472, 17.367]], height: 28, type: 'government', color: '#998877' },
  // Osmania General Hospital
  { name: 'Osmania Hospital', coords: [[78.478, 17.360], [78.482, 17.360], [78.482, 17.362], [78.478, 17.362]], height: 20, type: 'government', color: '#998877' },
];

// Elevation profile anchors — synthetic DEM control points for terrain generation
// lng, lat, elevation_meters
const ELEVATION_ANCHORS = [
  // Low areas — Musi riverbed
  [78.470, 17.385, 534], [78.480, 17.388, 533], [78.490, 17.392, 534], [78.500, 17.395, 535],
  [78.460, 17.380, 536], [78.450, 17.375, 537],
  // Moderate elevation — city center
  [78.480, 17.370, 543], [78.475, 17.365, 544], [78.465, 17.368, 545],
  [78.485, 17.395, 542], [78.495, 17.385, 541], [78.490, 17.380, 540],
  // Higher areas — Banjara Hills, Jubilee Hills
  [78.468, 17.415, 558], [78.473, 17.412, 560], [78.458, 17.420, 556],
  [78.478, 17.420, 555], [78.462, 17.418, 557],
  // Eastern higher ground
  [78.505, 17.385, 546], [78.500, 17.390, 544], [78.498, 17.380, 543],
  // Western higher ground
  [78.445, 17.380, 548], [78.440, 17.390, 550], [78.445, 17.395, 552],
  // Hi-Tech City area (northwest, higher)
  [78.380, 17.445, 608], [78.385, 17.440, 605], [78.375, 17.443, 610],
  // Secunderabad (northeast)
  [78.500, 17.435, 555], [78.505, 17.440, 558], [78.495, 17.438, 553],
  // Peripheral high points
  [78.400, 17.385, 580], [78.420, 17.400, 570], [78.510, 17.375, 548],
  [78.510, 17.400, 547], [78.440, 17.410, 555], [78.430, 17.405, 560],
];

// Road network — major roads (simplified polylines)
const ROADS = [
  { name: 'MG Road', coords: [[78.470, 17.365], [78.475, 17.368], [78.480, 17.370], [78.485, 17.372], [78.490, 17.375]] },
  { name: 'Abids Road', coords: [[78.475, 17.368], [78.478, 17.372], [78.482, 17.370]] },
  { name: 'Nampally Road', coords: [[78.455, 17.368], [78.458, 17.368], [78.462, 17.368], [78.465, 17.370]] },
  { name: 'Banjara Hills Road', coords: [[78.462, 17.412], [78.465, 17.413], [78.468, 17.415], [78.472, 17.414]] },
  { name: 'Jubilee Hills Road', coords: [[78.452, 17.418], [78.456, 17.419], [78.460, 17.420]] },
  { name: 'Inner Ring Road South', coords: [[78.440, 17.370], [78.450, 17.365], [78.460, 17.360], [78.470, 17.358]] },
  { name: 'Outer Ring Road NW', coords: [[78.360, 17.460], [78.370, 17.455], [78.380, 17.448], [78.390, 17.440]] },
  { name: 'PV Exp expressway', coords: [[78.370, 17.460], [78.380, 17.455], [78.400, 17.445], [78.420, 17.435]] },
];

// Hyderabad IMD rainfall data — typical monsoon storm profile (mm/hr over 60 min)
// Based on real IMD heavy rainfall event characteristics
const RAINFALL_PROFILE = [
  { t: 0, intensity: 5 }, { t: 2, intensity: 8 }, { t: 4, intensity: 15 },
  { t: 6, intensity: 25 }, { t: 8, intensity: 40 }, { t: 10, intensity: 55 },
  { t: 12, intensity: 70 }, { t: 14, intensity: 85 }, { t: 16, intensity: 95 },
  { t: 18, intensity: 100 }, { t: 20, intensity: 110 }, { t: 22, intensity: 105 },
  { t: 24, intensity: 90 }, { t: 26, intensity: 75 }, { t: 28, intensity: 60 },
  { t: 30, intensity: 50 }, { t: 32, intensity: 42 }, { t: 34, intensity: 35 },
  { t: 36, intensity: 30 }, { t: 38, intensity: 28 }, { t: 40, intensity: 25 },
  { t: 42, intensity: 22 }, { t: 44, intensity: 18 }, { t: 46, intensity: 15 },
  { t: 48, intensity: 12 }, { t: 50, intensity: 10 }, { t: 52, intensity: 8 },
  { t: 54, intensity: 6 }, { t: 56, intensity: 5 }, { t: 58, intensity: 4 },
  { t: 60, intensity: 3 },
];
