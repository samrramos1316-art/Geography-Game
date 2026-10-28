// Builds the static data bundled with the game:
//   data/world.js      – TopoJSON of the world (Natural Earth 1:50m, Tuvalu from 1:10m)
//   data/countries.js  – the 198 quiz countries with capital, population, government…
//   flags/*.svg        – flag images
//   vendor/*.js        – d3 + topojson-client
// Run with `npm install && npm run build:data`.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as topojson from 'topojson-client';
import { FACTS, GOVERNMENTS, NAME_OVERRIDES, CAPITAL_OVERRIDES } from './country-facts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgFile = (pkg, file) => join(root, 'node_modules', pkg, file);
const readJSON = (path) => JSON.parse(readFileSync(path, 'utf8'));

const worldCountries = readJSON(pkgFile('world-countries', 'countries.json'));
const topo50 = readJSON(pkgFile('world-atlas', 'countries-50m.json'));
const topo10 = readJSON(pkgFile('world-atlas', 'countries-10m.json'));

const quiz = worldCountries.filter((c) => FACTS[c.cca3]);
if (quiz.length !== 198) throw new Error(`Expected 198 countries, got ${quiz.length}`);
const byNumeric = new Map(quiz.filter((c) => c.ccn3).map((c) => [c.ccn3, c]));

// ---- Geometry ----------------------------------------------------------
delete topo50.objects.land;
const geoms = topo50.objects.countries.geometries;
const keep = [];
const mergeInto = { Somaliland: 'SOM', 'N. Cyprus': 'CYP' };
const pendingMerges = {};
for (const g of geoms) {
  const name = g.properties.name;
  if (name === 'Antarctica') continue;
  if (mergeInto[name]) {
    (pendingMerges[mergeInto[name]] ||= []).push(g);
    continue;
  }
  const c = name === 'Kosovo' ? quiz.find((q) => q.cca3 === 'UNK') : byNumeric.get(g.id);
  keep.push({ type: g.type, arcs: g.arcs, id: c ? c.cca3 : undefined, properties: { name } });
}
for (const [id, extra] of Object.entries(pendingMerges)) {
  const i = keep.findIndex((g) => g.id === id);
  const merged = topojson.mergeArcs(topo50, [keep[i], ...extra]);
  keep[i] = { ...merged, id, properties: keep[i].properties };
}

// Tuvalu is missing from the 1:50m set – quantize its 1:10m outline into this topology.
const tuv10 = topo10.objects.countries.geometries.find((g) => g.id === '798');
const tuvFeature = topojson.feature(topo10, tuv10);
const [sx, sy] = topo50.transform.scale;
const [tx, ty] = topo50.transform.translate;
const polys = [];
for (const poly of tuvFeature.geometry.coordinates) {
  const ring = poly[0];
  const q = [];
  for (const [lon, lat] of ring) {
    const p = [Math.round((lon - tx) / sx), Math.round((lat - ty) / sy)];
    const last = q[q.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) q.push(p);
  }
  if (q.length < 4) continue;
  const delta = q.map((p, i) => (i ? [p[0] - q[i - 1][0], p[1] - q[i - 1][1]] : p));
  topo50.arcs.push(delta);
  polys.push([[topo50.arcs.length - 1]]);
}
keep.push({ type: 'MultiPolygon', arcs: polys, id: 'TUV', properties: { name: 'Tuvalu' } });

const missing = quiz.filter((c) => !keep.some((g) => g.id === c.cca3));
if (missing.length) throw new Error('No geometry for ' + missing.map((c) => c.cca3));
topo50.objects.countries.geometries = keep;

// ---- Facts ---------------------------------------------------------------
const countries = quiz
  .map((c) => ({
    id: c.cca3,
    iso2: c.cca2.toLowerCase(),
    name: NAME_OVERRIDES[c.cca3] || c.name.common,
    official: c.name.official,
    capital: CAPITAL_OVERRIDES[c.cca3] || c.capital[0],
    population: FACTS[c.cca3][0],
    government: GOVERNMENTS[FACTS[c.cca3][1]],
    region: c.region,
    subregion: c.subregion,
    latlng: c.latlng,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

for (const dir of ['data', 'flags', 'vendor']) mkdirSync(join(root, dir), { recursive: true });
writeFileSync(join(root, 'data/world.js'), `window.WORLD_TOPO = ${JSON.stringify(topo50)};\n`);
writeFileSync(
  join(root, 'data/countries.js'),
  `window.GOVERNMENTS = ${JSON.stringify(Object.values(GOVERNMENTS), null, 2)};\n` +
    `window.COUNTRIES = ${JSON.stringify(countries, null, 2)};\n`
);
for (const c of countries) {
  copyFileSync(pkgFile('flag-icons', `flags/4x3/${c.iso2}.svg`), join(root, `flags/${c.iso2}.svg`));
}
copyFileSync(pkgFile('d3', 'dist/d3.min.js'), join(root, 'vendor/d3.min.js'));
copyFileSync(pkgFile('topojson-client', 'dist/topojson-client.min.js'), join(root, 'vendor/topojson-client.min.js'));
console.log(`Wrote ${countries.length} countries, ${keep.length} map shapes, Tuvalu polygons: ${polys.length}`);
