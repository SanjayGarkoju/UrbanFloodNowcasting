const test = require('node:test');
const assert = require('node:assert/strict');

const { FloodSimulator } = require('../static/js/simulation.js');

const drains = [
  {
    id: 'D1',
    coords: [[80.23, 13.06], [80.24, 13.06]],
    width: 0.6,
    depth: 0.5,
    slope: 0.001,
    n: 0.015,
    type: 'primary'
  }
];
const manholes = [
  { id: 'M1', coords: [80.232, 13.0602] },
  { id: 'M2', coords: [80.238, 13.0598] }
];
const inlets = [{ id: 'I1', coords: [80.235, 13.0601], elevation: 7.2 }];
const rainfallProfile = [
  { t: 0, intensity: 5 },
  { t: 30, intensity: 110 },
  { t: 60, intensity: 3 }
];

test('builds graph topology from all supplied assets', () => {
  const simulator = new FloodSimulator({ drains, manholes, inlets, rainfallProfile });

  assert.equal(simulator.topology.nodes.length, 3);
  assert.equal(simulator.topology.drains.get('D1').attachedNodeIds.length, 3);
  assert.ok(simulator.topology.nodes.every((node) => node.nearestDrainId === 'D1'));
});

test('keeps flood and graph states on the same 0-3 hour timeline', () => {
  const simulator = new FloodSimulator({ drains, manholes, inlets, rainfallProfile });
  const results = simulator.runSimulation({ stormDuration: 180, timeStep: 5 });

  assert.equal(results.length, 37);
  assert.equal(results[0].time, 0);
  assert.equal(results.at(-1).time, 180);
  assert.equal(results[18].nodes.length, 3);
  assert.equal(results[18].drains.length, 1);
  assert.ok(results[18].nodes.every((node) => Number.isFinite(node.depthCm)));
  assert.ok(results[18].drains.every((drain) => Number.isFinite(drain.utilization)));
});
