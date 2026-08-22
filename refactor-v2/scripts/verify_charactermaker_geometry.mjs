#!/usr/bin/env node

import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function argValue(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const pkgDir = resolve(argValue('--pkg', join(here, '../../.vendor/oxihuman/crates/oxihuman-wasm/pkg-node')));
const packPath = resolve(argValue('--pack', join(here, '../../.vendor/oxihuman/assets/packs/oxihuman-core-v1.ohpk')));

const gluePath = join(pkgDir, 'oxihuman_wasm.js');
if (!existsSync(gluePath)) throw new Error(`WASM node package not found: ${gluePath}`);
if (!existsSync(packPath)) throw new Error(`CharacterBody OHPK not found: ${packPath}`);

const require = createRequire(import.meta.url);
const wasm = require(gluePath);
const pack = new Uint8Array(readFileSync(packPath));
const engine = wasm.OxiHumanEngine.from_core_pack_bytes(pack);
const memory = wasm.wasm_memory();

function setCommonState() {
  engine.set_param('gender', 1.0);
  engine.set_param('age', 0.5);
  engine.set_param('height', 0.5);
  engine.set_param('weight', 0.5);
  engine.set_param('muscle', 0.5);
  engine.set_param('breast_firmness', 0.5);
}

function snapshotPositions() {
  engine.refresh_geometry();
  const ptr = engine.positions_ptr();
  const len = engine.positions_len();
  return new Float32Array(memory.buffer, ptr, len).slice();
}

function displacementStats(a, b) {
  if (a.length !== b.length) throw new Error(`Geometry topology changed unexpectedly: ${a.length} -> ${b.length}`);
  if (a.length % 3 !== 0) throw new Error(`Position buffer is not xyz-packed: ${a.length}`);

  let changedVertices = 0;
  let maxDelta = 0;
  let sumSq = 0;
  let sumAbs = 0;

  for (let i = 0; i < a.length; i += 3) {
    const dx = b[i] - a[i];
    const dy = b[i + 1] - a[i + 1];
    const dz = b[i + 2] - a[i + 2];
    const distance = Math.hypot(dx, dy, dz);
    if (distance > 1e-7) changedVertices += 1;
    if (distance > maxDelta) maxDelta = distance;
    sumSq += distance * distance;
    sumAbs += distance;
  }

  const vertexCount = a.length / 3;
  return {
    vertexCount,
    changedVertices,
    changedRatio: changedVertices / vertexCount,
    maxDelta,
    meanDelta: sumAbs / vertexCount,
    rmsDelta: Math.sqrt(sumSq / vertexCount),
  };
}

setCommonState();
engine.set_param('cupsize', 0.5); // CharacterMaker: medium / MakeHuman average cup
const medium = snapshotPositions();

setCommonState();
engine.set_param('cupsize', 1.0); // CharacterMaker: very_large / MakeHuman max cup
const veryLarge = snapshotPositions();

const stats = displacementStats(medium, veryLarge);
const reportedVertexCount = typeof engine.vertex_count === 'function' ? engine.vertex_count() : null;
const sourceIndexCount = engine.indices_len();

console.log(JSON.stringify({
  check: 'CharacterBody medium -> very_large cup geometry deformation',
  reportedVertexCount,
  sourceIndexCount,
  ...stats,
}, null, 2));

if (reportedVertexCount != null && reportedVertexCount !== stats.vertexCount) {
  throw new Error(`vertex_count mismatch: wasm=${reportedVertexCount}, positions=${stats.vertexCount}`);
}
if (sourceIndexCount <= 0) throw new Error('OxiHuman returned an empty index buffer');
if (stats.changedVertices < 100) {
  throw new Error(`Cup-size morph changed too few real mesh vertices: ${stats.changedVertices}`);
}
if (stats.maxDelta <= 1e-4) {
  throw new Error(`Cup-size morph maximum displacement is too small: ${stats.maxDelta}`);
}

console.log('CHARACTERBODY_GEOMETRY_DEFORMATION_OK=1');
