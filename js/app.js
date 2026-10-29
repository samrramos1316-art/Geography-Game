(() => {
  'use strict';

  const COUNTRIES = window.COUNTRIES;
  const GOVERNMENTS = window.GOVERNMENTS;
  const byId = new Map(COUNTRIES.map((c) => [c.id, c]));

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  const ICONS = {
    location: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.6" fill="currentColor"/></svg>',
    capital: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 20h16M6 20V10m4 10V10m4 10V10m4 10V10M3 10l9-6 9 6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    flag: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 21V4m0 0h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    shape: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M7 4l5 2 6-1 1 6-2 3 2 5-6 1-3-2-5 1-1-6 2-4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    population: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="9.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15 14.2c3.3-.6 6 1.2 6 4.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    language: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 5h16v11H11l-5 4v-4H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 9h8M8 12h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    currency: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 9.5v5M17.5 9.5v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    government: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 3l8 4H4zM5 9h14M6 9v8m4-8v8m4-8v8m4-8v8M4 20h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  };

  // Listed in the order the setup screen shows them.
  const CATEGORIES = [
    { key: 'location', title: 'Location', desc: 'Find the country on the world map' },
    { key: 'capital', title: 'Capital', desc: 'Name its capital city' },
    { key: 'flag', title: 'Flag', desc: 'Pick its flag from a line-up' },
    { key: 'shape', title: 'Country shape', desc: 'Recognise a country by its outline' },
    { key: 'population', title: 'Population', desc: 'Rounded to 2 significant figures' },
    { key: 'government', title: 'System of government', desc: 'Republic, monarchy, and more' },
    { key: 'language', title: 'Official language', desc: 'Name a language it officially uses' },
    { key: 'currency', title: 'Currency', desc: 'Name the money it uses' },
  ];
  // The order questions are asked in for each country. Shape comes first because the
  // country's name is only revealed once the shape question has been answered.
  const QUESTION_ORDER = ['shape', 'location', 'capital', 'flag', 'population', 'government', 'language', 'currency'];
  const COUNTS = [10, 25, 50, 75, 100, 150];
  // Regions a player can focus on, built from the dataset's UN subregions.
  // view: [[west, south], [east, north]] in degrees, the part of the map to frame.
  const sub = (...names) => (c) => names.includes(c.subregion);
  const REGIONS = [
    { key: 'Africa', match: (c) => c.region === 'Africa', view: [[-26, -36], [60, 38]] },
    { key: 'Central America & Caribbean', match: sub('Central America', 'Caribbean'), view: [[-93, 6], [-59, 27]] },
    { key: 'Central Asia', match: sub('Central Asia'), view: [[45, 35], [88, 56]] },
    { key: 'East Asia', match: sub('Eastern Asia'), view: [[72, 18], [146, 54]] },
    { key: 'Europe', match: (c) => c.region === 'Europe', view: [[-25, 34], [45, 71]] },
    // Iran is usually thought of as Middle Eastern, though the UN lists it under Southern Asia.
    { key: 'Middle East / West Asia', match: (c) => c.subregion === 'Western Asia' || c.id === 'IRN', view: [[25, 11], [64, 43]] },
    { key: 'North America', match: sub('North America'), view: [[-140, 14], [-52, 70]] },
    // Oceania straddles the antimeridian, so it gets the whole-world view.
    { key: 'Oceania', match: (c) => c.region === 'Oceania', view: null },
    { key: 'South America', match: sub('South America'), view: [[-82, -56], [-34, 13]] },
    { key: 'South Asia', match: (c) => c.subregion === 'Southern Asia' && c.id !== 'IRN', view: [[58, -2], [98, 38]] },
    { key: 'Southeast Asia', match: sub('South-Eastern Asia'), view: [[92, -11], [142, 29]] },
  ];
  for (const c of COUNTRIES) c.continent = REGIONS.find((r) => r.match(c)).key;
  const catTitle = (key) => CATEGORIES.find((c) => c.key === key).title;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const round2sf = (n) => Number(Number(n).toPrecision(2));
  const formatPopulation = (n) => {
    const r = round2sf(n);
    if (r >= 1e9) return `${+(r / 1e9).toPrecision(2)} billion`;
    if (r >= 1e6) return `${+(r / 1e6).toPrecision(2)} million`;
    return r.toLocaleString('en-US');
  };
  const flagUrl = (c) => `flags/${c.iso2}.svg`;
  const IS_TOUCH = window.matchMedia('(hover: none)').matches;

  // Countries "similar" to c (same subregion first, then region, then anywhere) whose
  // key value differs from c's and from each other — used for plausible distractors.
  function pickSimilar(c, n, key) {
    const used = new Set([key(c)]);
    const picked = [];
    const pools = [
      COUNTRIES.filter((o) => o.subregion === c.subregion),
      COUNTRIES.filter((o) => o.region === c.region),
      COUNTRIES,
    ];
    for (const pool of pools) {
      for (const o of shuffle(pool)) {
        if (picked.length >= n) return picked;
        const k = key(o);
        if (o.id === c.id || used.has(k)) continue;
        used.add(k);
        picked.push(o);
      }
    }
    return picked;
  }

  function populationOptions(c) {
    const answer = round2sf(c.population);
    const logA = Math.log10(answer);
    const values = [answer];
    const farEnough = (v) => values.every((x) => Math.abs(Math.log10(v) - Math.log10(x)) >= 0.09);
    const pool = shuffle([...new Set(COUNTRIES.map((o) => round2sf(o.population)))]);
    for (const v of pool) {
      if (values.length >= 4) break;
      const d = Math.abs(Math.log10(v) - logA);
      if (d >= 0.12 && d <= 0.85 && farEnough(v)) values.push(v);
    }
    for (const f of shuffle([0.3, 0.5, 2, 3.5, 6, 0.18, 0.12])) {
      if (values.length >= 4) break;
      const v = round2sf(answer * f);
      if (v >= 100 && v <= 1.6e9 && farEnough(v)) values.push(v);
    }
    return shuffle(values).map((v) => ({ value: v, label: formatPopulation(v), correct: v === answer }));
  }

  function buildQuestion(c, kind) {
    switch (kind) {
      case 'shape':
        return {
          kind,
          answer: c.name,
          options: shuffle([c, ...pickSimilar(c, 3, (o) => o.name)]).map((o) => ({ label: o.name, correct: o.id === c.id })),
        };
      case 'capital':
        return {
          kind,
          answer: c.capital,
          options: shuffle([c, ...pickSimilar(c, 3, (o) => o.capital)]).map((o) => ({ label: o.capital, correct: o.id === c.id })),
        };
      case 'flag':
        return {
          kind,
          answer: c.name,
          options: shuffle([c, ...pickSimilar(c, 3, (o) => o.iso2)]).map((o) => ({ label: o.name, country: o, correct: o.id === c.id })),
        };
      case 'population': {
        const options = populationOptions(c);
        return { kind, answer: formatPopulation(c.population), options };
      }
      case 'government':
        return {
          kind,
          answer: c.government,
          options: shuffle([c.government, ...shuffle(GOVERNMENTS.filter((g) => g !== c.government)).slice(0, 3)]).map((g) => ({ label: g, correct: g === c.government })),
        };
      case 'language':
        return {
          kind,
          answer: c.languages[0],
          options: shuffle([c.languages[0], ...languageDistractors(c)]).map((l) => ({ label: l, correct: l === c.languages[0] })),
        };
      case 'currency': {
        const own = new Set(c.currencies.map((m) => m.unit));
        const main = c.currencies[0].unit;
        const others = [];
        for (const pool of [COUNTRIES.filter((o) => o.subregion === c.subregion), COUNTRIES.filter((o) => o.region === c.region), COUNTRIES]) {
          for (const o of shuffle(pool)) {
            const u = o.currencies[0].unit;
            if (others.length < 3 && !own.has(u)) {
              own.add(u);
              others.push(u);
            }
          }
        }
        return {
          kind,
          answer: main,
          options: shuffle([main, ...others]).map((u) => ({ label: u, correct: u === main })),
        };
      }
      case 'location':
        return { kind, answer: c.name };
    }
  }

  const describeCurrency = (m) => `${m.name} (${m.code}${m.symbol && m.symbol !== m.code ? `, ${m.symbol}` : ''})`;

  // Main languages of nearby countries that are not official anywhere in c.
  function languageDistractors(c) {
    const used = new Set(c.languages);
    const picked = [];
    const pools = [
      COUNTRIES.filter((o) => o.subregion === c.subregion),
      COUNTRIES.filter((o) => o.region === c.region),
      COUNTRIES,
    ];
    for (const pool of pools) {
      for (const o of shuffle(pool)) {
        if (picked.length >= 3) return picked;
        const l = o.languages[0];
        if (used.has(l)) continue;
        used.add(l);
        picked.push(l);
      }
    }
    return picked;
  }

  const listLanguages = (c, max = c.languages.length) =>
    c.languages.slice(0, max).join(', ') + (c.languages.length > max ? ` +${c.languages.length - max} more` : '');

  // ---------------------------------------------------------------------------
  // Map
  // ---------------------------------------------------------------------------
  const svg = d3.select('#map');
  const defs = svg.append('defs');
  const ocean = defs.append('radialGradient').attr('id', 'ocean-grad').attr('cx', '50%').attr('cy', '45%').attr('r', '65%');
  ocean.append('stop').attr('offset', '0%').attr('stop-color', '#123456');
  ocean.append('stop').attr('offset', '100%').attr('stop-color', '#0a1d33');
  const shapeGrad = defs.append('linearGradient').attr('id', 'shape-grad').attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 1);
  shapeGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f6c56b');
  shapeGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f39a6b');
  const ringGrad = defs.append('linearGradient').attr('id', 'ring-grad');
  ringGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f6c56b');
  ringGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f39a6b');

  const zoomLayer = svg.append('g');
  const spherePath = zoomLayer.append('path').datum({ type: 'Sphere' }).attr('class', 'sphere');
  const graticulePath = zoomLayer.append('path').datum(d3.geoGraticule10()).attr('class', 'graticule');
  const countryLayer = zoomLayer.append('g');
  const markerLayer = zoomLayer.append('g');
  const pulseLayer = zoomLayer.append('g');
  const labelLayer = zoomLayer.append('g');

  const projection = d3.geoEqualEarth();
  const path = d3.geoPath(projection);

  // Keep only the "main" body of a country (drops far-flung overseas territories) so that
  // silhouettes look right and zooming frames the part people recognise.
  function mainGeometry(feature) {
    const g = feature.geometry;
    if (g.type !== 'MultiPolygon') return feature;
    const polys = g.coordinates.map((coords) => {
      const p = { type: 'Polygon', coordinates: coords };
      return { coords, area: d3.geoArea(p), centroid: d3.geoCentroid(p) };
    });
    const largest = polys.reduce((a, b) => (b.area > a.area ? b : a));
    const kept = polys.filter((p) => d3.geoDistance(p.centroid, largest.centroid) < 0.27).map((p) => p.coords);
    return { type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: kept } };
  }

  const features = topojson.feature(window.WORLD_TOPO, window.WORLD_TOPO.objects.countries).features;
  for (const f of features) {
    f.country = byId.get(f.id) || null;
    f.displayName = f.country ? f.country.name : f.properties.name;
    f.main = mainGeometry(f);
  }
  const featureById = new Map(features.filter((f) => f.country).map((f) => [f.id, f]));

  // What is being studied: regions (empty = whole world) or, in custom mode, a hand-picked
  // set of country ids. Countries outside the focus are dimmed.
  let focusRegions = new Set();
  let focusIds = null;
  const inFocus = (f) =>
    !!f.country && (focusIds ? focusIds.has(f.id) : !focusRegions.size || focusRegions.has(f.country.continent));
  function baseClass(f) {
    return 'country' + (inFocus(f) ? '' : ' inactive');
  }

  const countryPaths = countryLayer
    .selectAll('path')
    .data(features)
    .join('path')
    .attr('class', baseClass);

  let markerData = [];
  let markers = markerLayer.selectAll('circle');
  let currentK = 1;
  let markerRadius = 5.5;

  function renderMap() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    projection.fitExtent([[12, 64], [W - 12, H - 12]], { type: 'Sphere' });
    spherePath.attr('d', path);
    graticulePath.attr('d', path);
    countryPaths.attr('d', path);

    // Tiny countries get a clickable dot so they can be found and tapped.
    const [[sx0, sy0], [sx1, sy1]] = path.bounds({ type: 'Sphere' });
    const mapW = sx1 - sx0;
    const threshold = mapW * (sy1 - sy0) * 3.2e-5;
    markerRadius = Math.max(3, Math.min(5.5, mapW / 240));
    markerData = features
      .filter((f) => f.country)
      .map((f) => ({ f, area: path.area(f.main), xy: projection(d3.geoCentroid(f.main)) }))
      .filter((d) => d.area < threshold && d.xy);
    markers = markerLayer
      .selectAll('circle')
      .data(markerData, (d) => d.f.id)
      .join('circle')
      .attr('class', 'marker')
      .attr('cx', (d) => d.xy[0])
      .attr('cy', (d) => d.xy[1]);
    bindHover(markers, (d) => d.f);
    syncMarkerClasses();
    updateScaled();
  }

  function updateScaled() {
    const k = currentK;
    markers.attr('r', (IS_TOUCH ? markerRadius * 1.3 : markerRadius) / Math.max(k, 1)).classed('hidden', (d) => d.area * k * k > 260);
    pulseLayer.selectAll('circle').attr('r', 12 / k);
    labelLayer
      .selectAll('text')
      .attr('font-size', 13 / k)
      .attr('stroke-width', 3.5 / k)
      .attr('dy', -12 / k);
  }

  const zoom = d3
    .zoom()
    .scaleExtent([0.4, 90])
    .clickDistance(5)
    .on('zoom', (event) => {
      zoomLayer.attr('transform', event.transform);
      currentK = event.transform.k;
      updateScaled();
    });
  svg.call(zoom).on('dblclick.zoom', null);

  function setTranslateExtent() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    zoom.translateExtent([[-W * 0.6, -H * 0.6], [W * 1.6, H * 1.6]]);
  }

  // The part of the screen not covered by the question panel.
  function freeRect() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const top = 70;
    const panel = $('#panel');
    if (panel.hidden) return { x: 0, y: top, w: W, h: H - top };
    const r = panel.getBoundingClientRect();
    const bottomSheet = r.width > W * 0.7;
    if (!bottomSheet) return { x: r.right + 12, y: top, w: Math.max(160, W - r.right - 24), h: H - top - 12 };
    return { x: 0, y: top, w: W, h: Math.max(140, r.top - top - 8) };
  }

  function zoomToBounds([[x0, y0], [x1, y1]], { maxK = 22, padding = 0.78, duration = 900 } = {}) {
    const fr = freeRect();
    const dx = Math.max(x1 - x0, 1);
    const dy = Math.max(y1 - y0, 1);
    const k = Math.max(0.4, Math.min(maxK, padding / Math.max(dx / fr.w, dy / fr.h)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const t = d3.zoomIdentity.translate(fr.x + fr.w / 2 - k * cx, fr.y + fr.h / 2 - k * cy).scale(k);
    svg.transition().duration(duration).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }

  function zoomWorld(duration = 900) {
    const [[x0, y0], [x1, y1]] = path.bounds({ type: 'Sphere' });
    if (focusIds && focusIds.size) {
      // Frame the hand-picked countries, unless they are spread across the whole map.
      const boxes = [...focusIds].map((id) => path.bounds(featureById.get(id).main));
      const b = [[d3.min(boxes, (q) => q[0][0]), d3.min(boxes, (q) => q[0][1])], [d3.max(boxes, (q) => q[1][0]), d3.max(boxes, (q) => q[1][1])]];
      if (b[1][0] - b[0][0] < (x1 - x0) * 0.75) {
        zoomToBounds(b, { duration, maxK: 8, padding: 0.85 });
        return;
      }
    }
    const views = focusIds ? [] : REGIONS.filter((r) => focusRegions.has(r.key)).map((r) => r.view);
    if (views.length && views.every(Boolean)) {
      // Frame the studied regions: project points along each box's edges.
      const pts = views.flatMap(([[w, so], [e, n]]) =>
        d3.range(0, 1.0001, 0.125).flatMap((t) => [[w + (e - w) * t, so], [w + (e - w) * t, n], [w, so + (n - so) * t], [e, so + (n - so) * t]])
      ).map((p) => projection(p));
      const b = [[d3.min(pts, (p) => p[0]), d3.min(pts, (p) => p[1])], [d3.max(pts, (p) => p[0]), d3.max(pts, (p) => p[1])]];
      zoomToBounds(b, { duration, maxK: 8, padding: 1 });
      return;
    }
    const fr = freeRect();
    // On tall, narrow screens a width-fitted world is a thin strip: zoom in (up to 1.7×)
    // towards filling the available height, cropping the far east and west.
    const fitW = fr.w / (x1 - x0);
    const fitH = fr.h / (y1 - y0);
    const boost = fr.w < 600 ? Math.min(1.7, Math.max(1, fitH / fitW)) : 1;
    const k = Math.max(0.4, Math.min(fitW * 0.98, fitH * 0.98, 1) * boost);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const t = d3.zoomIdentity.translate(fr.x + fr.w / 2 - k * cx, fr.y + fr.h / 2 - k * cy).scale(k);
    svg.transition().duration(duration).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }

  function zoomToCountry(id, duration) {
    const f = featureById.get(id);
    zoomToBounds(path.bounds(f.main), { duration, maxK: 14 });
  }

  function zoomToFeatures(fs) {
    const boxes = fs.map((f) => path.bounds(f.main));
    const x0 = d3.min(boxes, (b) => b[0][0]);
    const y0 = d3.min(boxes, (b) => b[0][1]);
    const x1 = d3.max(boxes, (b) => b[1][0]);
    const y1 = d3.max(boxes, (b) => b[1][1]);
    zoomToBounds([[x0, y0], [x1, y1]], { maxK: 10, padding: 0.7 });
  }

  // Map highlight state: id -> 'target' | 'correct' | 'wrong'
  const mapState = new Map();
  function setMapState(f, cls) {
    mapState.set(f, cls);
    countryPaths.filter((d) => d === f).attr('class', `country ${cls}`);
    syncMarkerClasses();
  }
  function syncMarkerClasses() {
    markers.attr('class', (d) => 'marker ' + (mapState.get(d.f) || (inFocus(d.f) ? '' : 'off')));
  }
  // Pulses and labels, kept as data so they can be re-projected on resize.
  let pulses = [];
  let labels = [];
  function clearMap() {
    mapState.clear();
    countryPaths.attr('class', baseClass);
    syncMarkerClasses();
    pulses = [];
    labels = [];
    renderOverlays();
  }
  function renderOverlays() {
    const at = (d) => projection(d3.geoCentroid(d.f.main)) || [-999, -999];
    pulseLayer
      .selectAll('circle')
      .data(pulses)
      .join('circle')
      .attr('class', (d) => `pulse ${d.cls}`)
      .attr('cx', (d) => at(d)[0])
      .attr('cy', (d) => at(d)[1]);
    labelLayer
      .selectAll('text')
      .data(labels)
      .join('text')
      .attr('class', (d) => `map-label ${d.cls}`)
      .attr('x', (d) => at(d)[0])
      .attr('y', (d) => at(d)[1])
      .text((d) => d.text);
    updateScaled();
  }
  function addPulse(f, cls = '') {
    pulses.push({ f, cls });
    renderOverlays();
  }
  function addLabel(f, text, cls = '') {
    labels.push({ f, text, cls });
    renderOverlays();
  }

  // Hover tooltip + clicks
  const tooltip = $('#tooltip');
  let mapClickHandler = null;
  let namesHidden = false;
  function bindHover(sel, featureOf) {
    sel
      .on('mousemove', (event, d) => {
        if (IS_TOUCH || namesHidden || !$('#setup').hidden) return (tooltip.hidden = true);
        tooltip.textContent = featureOf(d).displayName;
        tooltip.style.left = event.clientX + 'px';
        tooltip.style.top = event.clientY + 'px';
        tooltip.hidden = false;
      })
      .on('mouseleave', () => (tooltip.hidden = true))
      .on('click', (event, d) => {
        if (mapClickHandler) mapClickHandler(featureOf(d), event);
      });
  }
  bindHover(countryPaths, (d) => d);
  // A tap on open water just next to a tiny country (a dot on the map) counts as that
  // country — fingers are much bigger than Tuvalu.
  spherePath.on('click', (event) => {
    if (!mapClickHandler) return;
    const t = d3.zoomTransform(svg.node());
    const [px, py] = d3.pointer(event, svg.node());
    let best = null;
    let bestDist = IS_TOUCH ? 22 : 12;
    for (const d of markerData) {
      const dist = Math.hypot(t.applyX(d.xy[0]) - px, t.applyY(d.xy[1]) - py);
      if (dist < bestDist) [best, bestDist] = [d, dist];
    }
    if (best) mapClickHandler(best.f, event);
  });

  $('#zoom-in').addEventListener('click', () => svg.transition().duration(350).call(zoom.scaleBy, 1.6));
  $('#zoom-out').addEventListener('click', () => svg.transition().duration(350).call(zoom.scaleBy, 1 / 1.6));
  $('#zoom-reset').addEventListener('click', () => zoomWorld(700));

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderMap();
      renderOverlays();
      setTranslateExtent();
      if (game) refocus(0);
      else zoomWorld(0);
    }, 180);
  });

  // ---------------------------------------------------------------------------
  // Setup screen
  // ---------------------------------------------------------------------------
  const setup = {
    cats: new Set(['location', 'capital', 'flag']),
    count: 25,
    regions: new Set(),
    custom: false,
    picked: loadPicked(),
    search: '',
    onlyPicked: false,
  };

  // The custom checklist is remembered in this browser, so a test list survives a reload.
  function loadPicked() {
    try {
      const ids = JSON.parse(localStorage.getItem('globelet.custom') || '[]');
      return new Set(ids.filter((id) => byId.has(id)));
    } catch (e) {
      return new Set();
    }
  }
  function savePicked() {
    try {
      localStorage.setItem('globelet.custom', JSON.stringify([...setup.picked]));
    } catch (e) {
      // Storage can be unavailable (private mode); the list then lasts for this visit only.
    }
  }

  const setupPool = () =>
    setup.custom
      ? COUNTRIES.filter((c) => setup.picked.has(c.id))
      : COUNTRIES.filter((c) => !setup.regions.size || setup.regions.has(c.continent));

  const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Countries matching the search box: by name, official name, capital or region.
  function customMatches() {
    const q = norm(setup.search.trim());
    return COUNTRIES.filter((c) => {
      if (setup.onlyPicked && !setup.picked.has(c.id)) return false;
      if (!q) return true;
      return [c.name, c.official, c.capital, c.continent, c.subregion].some((t) => norm(t).includes(q));
    });
  }

  function renderCustomList() {
    const list = customMatches();
    const allShownPicked = list.length > 0 && list.every((c) => setup.picked.has(c.id));
    $('#custom-count').textContent = `${setup.picked.size} selected`;
    $('#custom-toggle-shown').textContent = allShownPicked ? `Untick shown (${list.length})` : `Tick shown (${list.length})`;
    $('#custom-toggle-shown').disabled = !list.length;
    $('#custom-only').setAttribute('aria-pressed', setup.onlyPicked);
    $('#custom-clear').disabled = !setup.picked.size;
    $('#custom-list').innerHTML = list.length
      ? list
          .map(
            (c) => `<label class="pick">
              <input type="checkbox" id="pick-${c.id}" data-id="${c.id}" ${setup.picked.has(c.id) ? 'checked' : ''} />
              <img src="${flagUrl(c)}" alt="" loading="lazy" />
              <span class="pick-name">${esc(c.name)}</span>
              <span class="pick-region">${esc(c.continent)}</span>
            </label>`
          )
          .join('')
      : `<p class="pick-empty">${setup.onlyPicked && !setup.search ? 'No countries ticked yet.' : `No country matches “${esc(setup.search)}”.`}</p>`;
  }

  function renderSetup() {
    const pool = setupPool();
    const regionCount = (key) => COUNTRIES.filter((c) => c.continent === key).length;
    $('#region-row').innerHTML =
      `<button class="count region" data-region="" aria-pressed="${!setup.custom && !setup.regions.size}">Whole world<small>${COUNTRIES.length}</small></button>` +
      REGIONS.map(
        (r) => `<button class="count region" data-region="${r.key}" aria-pressed="${!setup.custom && setup.regions.has(r.key)}">${r.key}<small>${regionCount(r.key)}</small></button>`
      ).join('') +
      `<button class="count region custom" data-region="__custom" aria-pressed="${setup.custom}">Custom<small>${setup.picked.size}</small></button>`;
    $('#custom-panel').hidden = !setup.custom;
    const total = Math.min(setup.count, pool.length);
    const order = QUESTION_ORDER.filter((k) => setup.cats.has(k));
    $('#category-grid').innerHTML = CATEGORIES.map((c) => {
      const on = setup.cats.has(c.key);
      const n = order.indexOf(c.key) + 1;
      return `<button class="cat" data-cat="${c.key}" aria-pressed="${on}">
        <span class="cat-icon">${ICONS[c.key]}</span>
        <span class="cat-title">${c.title}</span>
        <span class="cat-desc">${c.desc}</span>
        <span class="check">✓</span>
        <span class="order">${on ? 'Q' + n : ''}</span>
      </button>`;
    }).join('');
    $('#count-row').innerHTML = !pool.length
      ? '<p class="count-empty">Tick some countries above first.</p>'
      : COUNTS.filter((n) => n < pool.length)
        .map((n) => `<button class="count" data-count="${n}" aria-pressed="${setup.count === n}">${n}</button>`)
        .join('') +
      `<button class="count" data-count="all" aria-pressed="${setup.count >= pool.length}">All<small>${pool.length}</small></button>`;
    $('#select-all').textContent = setup.cats.size === CATEGORIES.length ? 'Clear' : 'Select all';
    const q = setup.cats.size * total;
    $('#setup-summary').innerHTML = setup.cats.size
      ? !pool.length
        ? 'Tick at least one country in your custom list.'
        : setup.custom
        ? `<strong>${total}</strong> of your countries × <strong>${setup.cats.size}</strong> topic${setup.cats.size > 1 ? 's' : ''} = <strong>${q}</strong> questions`
        : `<strong>${total}</strong> ${setup.regions.size === 1 ? [...setup.regions][0] + ' ' : ''}countries${setup.regions.size > 1 ? ` from <strong>${setup.regions.size}</strong> regions` : ''} × <strong>${setup.cats.size}</strong> topic${setup.cats.size > 1 ? 's' : ''} = <strong>${q}</strong> questions`
      : 'Pick at least one topic to begin.';
    $('#start-btn').disabled = setup.cats.size === 0 || !pool.length;
    // Preview the chosen regions on the map behind the setup card.
    applyFocus();
    if (!game) {
      countryPaths.attr('class', baseClass);
      syncMarkerClasses();
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => zoomWorld(600), 200);
    }
  }
  let previewTimer;

  function applyFocus() {
    focusRegions = new Set(setup.custom ? [] : setup.regions);
    focusIds = setup.custom ? new Set(setup.picked) : null;
  }

  $('#custom-search').addEventListener('input', (e) => {
    setup.search = e.target.value;
    renderCustomList();
  });
  $('#custom-list').addEventListener('change', (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    e.target.checked ? setup.picked.add(id) : setup.picked.delete(id);
    savePicked();
    renderCustomList();
    renderSetup();
  });
  $('#custom-toggle-shown').addEventListener('click', () => {
    const list = customMatches();
    const allPicked = list.every((c) => setup.picked.has(c.id));
    list.forEach((c) => (allPicked ? setup.picked.delete(c.id) : setup.picked.add(c.id)));
    savePicked();
    renderCustomList();
    renderSetup();
  });
  $('#custom-only').addEventListener('click', () => {
    setup.onlyPicked = !setup.onlyPicked;
    renderCustomList();
  });
  $('#custom-clear').addEventListener('click', () => {
    setup.picked.clear();
    setup.onlyPicked = false;
    savePicked();
    renderCustomList();
    renderSetup();
  });

  $('#region-row').addEventListener('click', (e) => {
    const b = e.target.closest('[data-region]');
    if (!b) return;
    const k = b.dataset.region;
    if (k === '__custom') {
      setup.custom = !setup.custom;
      if (setup.custom) {
        renderCustomList();
        requestAnimationFrame(() => $('#custom-panel').scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
      }
      renderSetup();
      return;
    }
    setup.custom = false;
    if (!k) setup.regions.clear();
    else if (setup.regions.has(k)) setup.regions.delete(k);
    else setup.regions.add(k);
    if (setup.regions.size === REGIONS.length) setup.regions.clear();
    renderSetup();
  });

  $('#category-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    const k = b.dataset.cat;
    setup.cats.has(k) ? setup.cats.delete(k) : setup.cats.add(k);
    renderSetup();
  });
  $('#count-row').addEventListener('click', (e) => {
    const b = e.target.closest('[data-count]');
    if (!b) return;
    setup.count = b.dataset.count === 'all' ? Infinity : Number(b.dataset.count);
    renderSetup();
  });
  $('#select-all').addEventListener('click', () => {
    if (setup.cats.size === CATEGORIES.length) setup.cats.clear();
    else CATEGORIES.forEach((c) => setup.cats.add(c.key));
    renderSetup();
  });
  $('#start-btn').addEventListener('click', () => startGame(shuffle(setupPool()).slice(0, setup.count)));

  // ---------------------------------------------------------------------------
  // Game
  // ---------------------------------------------------------------------------
  let game = null;

  function startGame(countries) {
    applyFocus();
    game = {
      countries,
      steps: QUESTION_ORDER.filter((k) => setup.cats.has(k)),
      ci: 0,
      qi: 0,
      results: [],
      score: 0,
      streak: 0,
      bestStreak: 0,
      question: null,
      answered: false,
      timer: null,
    };
    $('#setup').hidden = true;
    $('#results').hidden = true;
    $('#hud').hidden = false;
    $('#panel').hidden = false;
    showCountry();
  }

  const current = () => game.countries[game.ci];

  function showCountry() {
    game.qi = 0;
    askQuestion();
  }

  function nameRevealed() {
    const shapeIdx = game.steps.indexOf('shape');
    return shapeIdx === -1 || game.qi > shapeIdx || (game.qi === shapeIdx && game.answered);
  }

  function updateHud() {
    const total = game.countries.length * game.steps.length;
    const done = game.results.length;
    $('#hud-country').innerHTML = `<span class="hud-word">Country </span>${Math.min(game.ci + 1, game.countries.length)} / ${game.countries.length}`;
    $('#progress-fill').style.width = `${(done / total) * 100}%`;
    $('#hud-score').textContent = game.score;
    $('#hud-streak').textContent = game.streak;

    const c = current();
    const chip = $('#country-chip');
    const revealed = nameRevealed();
    chip.classList.toggle('mystery', !revealed);
    $('#country-title').textContent = revealed ? c.name : 'Mystery country';

    const own = game.results.filter((r) => r.country === c);
    $('#q-steps').innerHTML = game.steps
      .map((k, i) => {
        const r = own.find((x) => x.kind === k);
        const cls = r ? (r.correct ? 'good' : 'bad') : i === game.qi ? 'now' : '';
        return `<i class="${cls}" title="${catTitle(k)}"></i>`;
      })
      .join('');
  }

  function questionHeader(kind, text, hint = '') {
    return `<p class="q-kind">${ICONS[kind]} ${catTitle(kind)}</p>
      <h2 class="q-text">${text}</h2>${hint ? `<p class="q-hint">${hint}</p>` : ''}`;
  }

  function optionsHtml(q) {
    if (q.kind === 'flag') {
      return `<div class="options flag-options">${q.options
        .map(
          (o, i) => `<button class="option flag-option" data-i="${i}">
            <img src="${flagUrl(o.country)}" alt="Flag option ${i + 1}" draggable="false" />
            <span class="flag-foot"><span class="key">${i + 1}</span><span class="flag-name"></span></span>
          </button>`
        )
        .join('')}</div>`;
    }
    return `<div class="options">${q.options
      .map((o, i) => `<button class="option" data-i="${i}"><span class="key">${i + 1}</span><span>${esc(o.label)}</span></button>`)
      .join('')}</div>`;
  }

  function shapeSvg(c) {
    const f = featureById.get(c.id).main;
    const w = 360;
    const h = 190;
    const [lon, lat] = d3.geoCentroid(f);
    const proj = d3.geoAzimuthalEqualArea().rotate([-lon, -lat]).fitExtent([[18, 18], [w - 18, h - 18]], f);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><path class="shape-path" d="${d3.geoPath(proj)(f)}"/></svg>`;
  }

  function askQuestion() {
    clearTimeout(game.timer);
    const c = current();
    const kind = game.steps[game.qi];
    const q = buildQuestion(c, kind);
    game.question = q;
    game.answered = false;
    mapClickHandler = null;
    namesHidden = kind === 'shape' || kind === 'location';
    tooltip.hidden = true;

    const panel = $('#panel');
    panel.classList.toggle('compact', kind === 'location');
    const body = $('#panel-body');
    const foot = $('#panel-foot');
    foot.innerHTML = '';
    svg.classed('map-interactive', kind === 'location');

    const name = `<strong>${esc(c.name)}</strong>`;
    switch (kind) {
      case 'shape':
        body.innerHTML = questionHeader(kind, 'Which country has this shape?') + `<div class="shape-box">${shapeSvg(c)}</div>` + optionsHtml(q);
        break;
      case 'location':
        body.innerHTML = questionHeader(kind, `Where is ${name}?`, `${IS_TOUCH ? 'Tap' : 'Click'} the country on the map. Tiny countries are shown as dots.`);
        foot.innerHTML = `<div class="locate-actions"><p class="locate-tip">${IS_TOUCH ? 'Pinch to zoom · drag to pan' : 'Scroll to zoom · drag to pan'}</p><button class="ghost-btn" id="skip-btn">I don't know</button></div>`;
        $('#skip-btn').addEventListener('click', () => answerLocation(null));
        mapClickHandler = (f) => answerLocation(f);
        break;
      case 'capital':
        body.innerHTML = questionHeader(kind, `What is the capital of ${name}?`) + optionsHtml(q);
        break;
      case 'flag':
        body.innerHTML = questionHeader(kind, `Which is the flag of ${name}?`) + optionsHtml(q);
        break;
      case 'population':
        body.innerHTML = questionHeader(kind, `What is the population of ${name}?`, 'Rounded to 2 significant figures.') + optionsHtml(q);
        break;
      case 'government':
        body.innerHTML = questionHeader(kind, `What is ${name}’s system of government?`) + optionsHtml(q);
        break;
      case 'language':
        body.innerHTML = questionHeader(kind, `Which of these is an official language of ${name}?`) + optionsHtml(q);
        break;
      case 'currency':
        body.innerHTML = questionHeader(kind, `What is the currency of ${name}?`) + optionsHtml(q);
        break;
    }
    body.scrollTop = 0;
    body.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => answerOption(Number(b.dataset.i))));
    // Start every question from a clean map; once the name is known, mark the country.
    clearMap();
    if (kind !== 'shape' && kind !== 'location') {
      setMapState(featureById.get(c.id), 'target');
      addLabel(featureById.get(c.id), c.name);
    }
    updateHud();
    refocus();
  }

  // Positions the map for the current question.
  function refocus(duration) {
    if (!game) return;
    const kind = game.steps[game.qi];
    const c = current();
    const f = featureById.get(c.id);
    if (!game.answered && (kind === 'shape' || kind === 'location')) {
      zoomWorld(duration);
      return;
    }
    zoomToCountry(c.id, duration);
  }

  function record(correct, given) {
    const q = game.question;
    game.results.push({ country: current(), kind: q.kind, correct, given, answer: q.answer });
    game.answered = true;
    if (correct) {
      game.score++;
      game.streak++;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
    } else {
      game.streak = 0;
    }
    updateHud();
  }

  function answerOption(i) {
    if (!game || game.answered) return;
    const q = game.question;
    const chosen = q.options[i];
    record(chosen.correct, chosen.label);
    const buttons = [...document.querySelectorAll('#panel-body .option')];
    buttons.forEach((b, j) => {
      const o = q.options[j];
      b.disabled = true;
      if (o.correct) b.classList.add('correct');
      else if (j === i) b.classList.add('wrong');
      else b.classList.add('faded');
      if (q.kind === 'flag') b.querySelector('.flag-name').textContent = o.label;
    });

    const c = current();
    let msg;
    if (chosen.correct) {
      msg = q.kind === 'shape' ? `Yes — that’s <strong>${esc(c.name)}</strong>.` : 'Correct!';
    } else if (q.kind === 'flag') {
      msg = `That’s the flag of <strong>${esc(chosen.label)}</strong>.`;
    } else {
      msg = `The answer is <strong>${esc(q.answer)}</strong>.`;
    }
    if (q.kind === 'currency') {
      const [first, ...rest] = c.currencies;
      msg += ` <br />${esc(describeCurrency(first))}${rest.length ? `; also used: ${esc(rest.map(describeCurrency).join(', '))}` : ''}.`;
    }
    if (q.kind === 'language' && c.languages.length > 1) {
      msg += ` <br />Official languages: ${esc(listLanguages(c, 6))}.`;
    }
    finishQuestion(chosen.correct, msg);
    if (q.kind === 'shape') {
      // The name is now revealed: show where it is.
      setMapState(featureById.get(c.id), chosen.correct ? 'correct' : 'target');
      zoomToCountry(c.id);
    }
  }

  function answerLocation(f) {
    if (!game || game.answered) return;
    const c = current();
    const target = featureById.get(c.id);
    const correct = f === target;
    record(correct, f ? f.displayName : 'No answer');
    mapClickHandler = null;
    namesHidden = false;
    svg.classed('map-interactive', false);
    $('#panel').classList.remove('compact');

    let msg;
    if (correct) {
      setMapState(target, 'correct');
      addPulse(target);
      addLabel(target, c.name, 'good');
      msg = `Spot on — that’s <strong>${esc(c.name)}</strong>.`;
      zoomToCountry(c.id);
    } else {
      setMapState(target, 'correct');
      addPulse(target);
      addLabel(target, c.name, 'good');
      if (f) {
        setMapState(f, 'wrong');
        addLabel(f, f.displayName, 'bad');
        msg = `You picked <strong>${esc(f.displayName)}</strong>. ${esc(c.name)} is highlighted in green.`;
        zoomToFeatures([target, f]);
      } else {
        msg = `${esc(c.name)} is highlighted in green.`;
        zoomToCountry(c.id);
      }
    }
    finishQuestion(correct, msg);
  }

  function recapHtml(c) {
    return `<div class="recap">
      <img src="${flagUrl(c)}" alt="Flag of ${esc(c.name)}" />
      <dl>
        <dt>Capital</dt><dd>${esc(c.capital)}</dd>
        <dt>Population</dt><dd>${formatPopulation(c.population)}</dd>
        <dt>Government</dt><dd>${esc(c.government)}</dd>
        <dt>Language${c.languages.length > 1 ? 's' : ''}</dt><dd>${esc(listLanguages(c, 3))}</dd>
        <dt>Currency</dt><dd>${esc(c.currencies[0].name)}</dd>
      </dl>
    </div>`;
  }

  function finishQuestion(correct, msg) {
    const body = $('#panel-body');
    const lastOfCountry = game.qi === game.steps.length - 1;
    const lastOverall = lastOfCountry && game.ci === game.countries.length - 1;
    body.insertAdjacentHTML(
      'beforeend',
      `<div class="feedback ${correct ? 'good' : 'bad'}"><span class="fb-icon">${correct ? '✓' : '✕'}</span><span>${msg}</span></div>` +
        (lastOfCountry ? recapHtml(current()) : '')
    );
    const label = lastOverall ? 'See results' : lastOfCountry ? 'Next country' : 'Continue';
    $('#panel-foot').innerHTML = `<button class="primary-btn continue-btn" id="next-btn">${label} <span aria-hidden="true">→</span><span class="kbd">Enter</span></button>`;
    $('#next-btn').addEventListener('click', next);
    $('#next-btn').focus({ preventScroll: true });
    updateHud();
    body.scrollTop = body.scrollHeight;
    // Keep momentum on correct answers, but give time to read the country recap.
    if (correct && !lastOfCountry) game.timer = setTimeout(next, game.question.kind === 'location' ? 1700 : 1200);
  }

  function next() {
    if (!game || !game.answered) return;
    clearTimeout(game.timer);
    if (game.qi < game.steps.length - 1) {
      game.qi++;
      askQuestion();
    } else if (game.ci < game.countries.length - 1) {
      game.ci++;
      showCountry();
    } else {
      showResults();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (!game || $('#panel').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!game.answered && game.question.options && /^[1-4]$/.test(e.key)) {
      answerOption(Number(e.key) - 1);
    } else if (game.answered && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      next();
    }
  });

  $('#quit-btn').addEventListener('click', () => {
    if (!game) return;
    clearTimeout(game.timer);
    if (game.results.length) showResults();
    else backToSetup();
  });

  // ---------------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------------
  function showResults() {
    clearTimeout(game.timer);
    mapClickHandler = null;
    namesHidden = false;
    svg.classed('map-interactive', false);
    $('#panel').hidden = true;
    $('#hud').hidden = true;
    clearMap();

    const res = game.results;
    const total = res.length;
    const correct = res.filter((r) => r.correct).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const missed = res.filter((r) => !r.correct);
    const missedCountries = [...new Set(missed.map((r) => r.country))];
    missedCountries.forEach((c) => setMapState(featureById.get(c.id), 'wrong'));
    res.filter((r) => !missedCountries.includes(r.country)).forEach((r) => setMapState(featureById.get(r.country.id), 'correct'));
    zoomWorld();

    const title = pct === 100 ? 'Flawless!' : pct >= 85 ? 'Superb work' : pct >= 65 ? 'Well travelled' : pct >= 40 ? 'Good progress' : 'Keep exploring';
    const circ = 2 * Math.PI * 54;
    const rows = game.steps
      .map((k) => {
        const rs = res.filter((r) => r.kind === k);
        if (!rs.length) return '';
        const ok = rs.filter((r) => r.correct).length;
        return `<div class="bd-row"><span class="bd-name">${catTitle(k)}</span><div class="bd-bar"><div data-w="${(ok / rs.length) * 100}"></div></div><span class="bd-val">${ok} / ${rs.length}</span></div>`;
      })
      .join('');
    const missedHtml = missed.length
      ? `<div class="missed"><h3>To review (${missed.length})</h3><div class="missed-list">${missed
          .map(
            (r) => `<div class="missed-item"><img src="${flagUrl(r.country)}" alt="" />
            <div><strong>${esc(r.country.name)}</strong> <span class="mi-kind">· ${catTitle(r.kind)}</span><br />
            ${r.kind === 'location' ? `You chose ${esc(r.given)}` : `Answer: <strong>${esc(r.answer)}</strong> <span class="mi-kind">(you said ${esc(r.given)})</span>`}</div></div>`
          )
          .join('')}</div></div>`
      : `<div class="perfect">Every answer correct — the world is your oyster. 🌍</div>`;

    $('#results-card').innerHTML = `
      <div class="results-head">
        <div class="ring">
          <svg viewBox="0 0 132 132"><circle class="ring-track" cx="66" cy="66" r="54"/><circle class="ring-fill" cx="66" cy="66" r="54" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/></svg>
          <div class="ring-label"><div><b>${pct}%</b><span>${correct} / ${total}</span></div></div>
        </div>
        <div>
          <p class="eyebrow">Journey complete</p>
          <h1>${title}</h1>
          <p>${new Set(res.map((r) => r.country)).size} countries visited · best streak ${game.bestStreak}</p>
        </div>
      </div>
      <div class="breakdown">${rows}</div>
      ${missedHtml}
      <div class="results-actions">
        ${missedCountries.length ? '<button class="secondary-btn" id="retry-btn">Retry missed countries</button>' : ''}
        <button class="secondary-btn" id="setup-btn">Change settings</button>
        <button class="primary-btn" id="again-btn">Play again →</button>
      </div>`;
    $('#results').hidden = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.querySelector('.ring-fill').style.strokeDashoffset = circ * (1 - pct / 100);
        document.querySelectorAll('.bd-bar div').forEach((d) => (d.style.width = d.dataset.w + '%'));
      })
    );
    const steps = game.steps;
    $('#again-btn').addEventListener('click', () => startGame(shuffle(setupPool()).slice(0, setup.count)));
    $('#setup-btn').addEventListener('click', backToSetup);
    if (missedCountries.length) {
      $('#retry-btn').addEventListener('click', () => {
        setup.cats = new Set(steps);
        renderSetup();
        startGame(shuffle(missedCountries));
      });
    }
    game = null;
  }

  function backToSetup() {
    if (game) clearTimeout(game.timer);
    game = null;
    mapClickHandler = null;
    namesHidden = false;
    clearMap();
    $('#panel').hidden = true;
    $('#hud').hidden = true;
    $('#results').hidden = true;
    $('#setup').hidden = false;
    renderSetup();
    zoomWorld();
  }

  // ---------------------------------------------------------------------------
  renderMap();
  setTranslateExtent();
  renderSetup();
  zoomWorld(0);

  // Expose a tiny hook for automated tests.
  window.__atlas = { get game() { return game; }, featureById, buildQuestion };
})();
