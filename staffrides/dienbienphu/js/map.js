// MapLibre map: period / AMS / imagery base layers, 3D terrain, strongpoint markers,
// attack arrows, viewsheds and the regional logistics layers.
import { esc, fmtDate, srcText, addDays } from './util.js';

const BASE = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
const VALLEY_BOUNDS = [102.9, 21.25, 103.2197, 21.53];
const REGION_BOUNDS = [101.0, 19.0, 108.0, 24.0];
export const HOME = { center: [103.012, 21.379], zoom: 12.15, pitch: 0, bearing: 0 };

const ATTR = {
  period: 'Relief drawn from Copernicus DEM GLO-30/GLO-90 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA',
  ams: 'US Army Map Service, L7014 sheet 5651 IV (public domain)',
  modern: '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless 2016</a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0',
};

export class BattleMap {
  constructor(el, data, handlers) {
    this.D = data;
    this.h = handlers;
    this.markers = new Map();
    this.wpMarkers = [];
    this.style = 'period';
    this.dim = '2d';
    this.map = new maplibregl.Map({
      container: el,
      style: this.styleSpec(),
      ...HOME,
      minZoom: 5.5,
      maxZoom: 16.5,
      maxPitch: 78,
      attributionControl: false,
      dragRotate: true,
    });
    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    this.map.once('idle', () => this.map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
    this.ready = new Promise((res) => this.map.on('load', res));
    this.ready.then(() => this.afterLoad());
    this.map.on('zoom', () => this.zoomClass());
  }

  styleSpec() {
    const t = (p) => `${BASE}tiles/${p}`;
    return {
      version: 8,
      sources: {
        region: { type: 'raster', tiles: [t('region/{z}/{x}/{y}.webp')], tileSize: 256, minzoom: 6, maxzoom: 10, bounds: REGION_BOUNDS, attribution: ATTR.period },
        period: { type: 'raster', tiles: [t('period/{z}/{x}/{y}.webp')], tileSize: 256, minzoom: 11, maxzoom: 15, bounds: VALLEY_BOUNDS },
        ams: { type: 'raster', tiles: [t('ams/{z}/{x}/{y}.webp')], tileSize: 256, minzoom: 11, maxzoom: 15, bounds: [102.9, 21.25, 103.25, 21.5], attribution: ATTR.ams },
        modern: { type: 'raster', tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'], tileSize: 256, maxzoom: 15, attribution: ATTR.modern },
        dem: { type: 'raster-dem', tiles: [t('dem/{z}/{x}/{y}.png')], tileSize: 256, minzoom: 11, maxzoom: 13, encoding: 'terrarium', bounds: VALLEY_BOUNDS },
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#ebe2ca' } },
        { id: 'region', type: 'raster', source: 'region', paint: { 'raster-fade-duration': 150 } },
        { id: 'period', type: 'raster', source: 'period', minzoom: 10, paint: { 'raster-fade-duration': 150, 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 10.8, 1] } },
        { id: 'ams', type: 'raster', source: 'ams', minzoom: 10, layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 150 } },
        { id: 'modern', type: 'raster', source: 'modern', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 150 } },
      ],
    };
  }

  afterLoad() {
    const m = this.map;
    const fc = (features = []) => ({ type: 'FeatureCollection', features });
    // viewshed overlay (image swapped per observer)
    const vs = this.D.viewsheds;
    if (vs?.corners) {
      m.addSource('vs', { type: 'image', url: `${BASE}data/viewsheds/blank.png`, coordinates: vs.corners });
      m.addLayer({ id: 'vs', type: 'raster', source: 'vs', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.75, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } });
    }
    // regional context
    m.addSource('ne', { type: 'geojson', data: `${BASE}data/region.geojson` });
    m.addLayer({ id: 'ne-border', type: 'line', source: 'ne', filter: ['==', ['get', 'k'], 'border'], paint: { 'line-color': '#7a5a3a', 'line-width': 1.2, 'line-dasharray': [3, 2], 'line-opacity': 0.8 } });
    m.addLayer({ id: 'ne-river', type: 'line', source: 'ne', filter: ['==', ['get', 'k'], 'river'], maxzoom: 11.5, paint: { 'line-color': '#7d9db0', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 10, 1.6] } });
    // logistics routes
    m.addSource('routes', { type: 'geojson', data: fc(this.routeFeatures()) });
    m.addLayer({ id: 'routes-casing', type: 'line', source: 'routes', layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fbf8f1', 'line-width': 6, 'line-opacity': 0.8 } });
    const rpaint = (dash) => ({ 'line-color': ['match', ['get', 'side'], 'FR', '#2f5d8a', '#b23a2b'], 'line-width': dash ? 2.2 : 3, ...(dash ? { 'line-dasharray': [2, 2] } : {}) });
    m.addLayer({ id: 'routes', type: 'line', source: 'routes', filter: ['!=', ['get', 'kind'], 'air'], layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: rpaint(false) });
    m.addLayer({ id: 'routes-air', type: 'line', source: 'routes', filter: ['==', ['get', 'kind'], 'air'], layout: { visibility: 'none' }, paint: rpaint(true) });
    // attack arrows
    m.addSource('arrows', { type: 'geojson', data: fc() });
    m.addLayer({ id: 'arrows', type: 'line', source: 'arrows', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' },
      paint: { 'line-color': ['match', ['get', 'side'], 'FR', '#2f5d8a', '#b23a2b'], 'line-width': 3.2, 'line-opacity': 0.9 } });
    m.addLayer({ id: 'arrowheads', type: 'fill', source: 'arrows', filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': ['match', ['get', 'side'], 'FR', '#2f5d8a', '#b23a2b'], 'fill-opacity': 0.95 } });
    // observer ring
    m.addSource('obs', { type: 'geojson', data: fc() });
    m.addLayer({ id: 'obs', type: 'circle', source: 'obs', paint: { 'circle-radius': 9, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#a8661c', 'circle-stroke-width': 3 } });

    this.buildMarkers();
    this.zoomClass();
    this.h.onReady?.();
  }

  routeFeatures() {
    const L = this.D.logistics || {};
    const out = [];
    for (const r of L.routes || []) {
      if (!r.coords || r.coords.length < 2) continue;
      out.push({ type: 'Feature', properties: { id: r.id, side: r.side || 'VM', kind: r.kind || 'road', name: r.name }, geometry: { type: 'LineString', coordinates: r.coords } });
    }
    return out;
  }

  place(id) { return this.D.placeIndex[id]; }

  buildMarkers() {
    for (const p of this.D.places) {
      if (p.lat == null || p.lon == null) continue;
      const el = document.createElement('div');
      const side = p.kind === 'vm_terrain' ? 'vm' : ['strongpoint', 'cp', 'airstrip'].includes(p.kind) ? 'fr' : 'other';
      el.className = `sp ${side}${p.minor || p.small ? ' minor' : ''}`;
      el.innerHTML = `<span class="dot"></span><span class="lbl">${esc(p.label || p.name)}</span>`;
      el.title = p.name;
      el.addEventListener('click', (e) => { e.stopPropagation(); this.popup(p); });
      const mk = new maplibregl.Marker({ element: el, anchor: 'left', offset: [-6, 0] }).setLngLat([p.lon, p.lat]).addTo(this.map);
      this.markers.set(p.id, { mk, el, p });
    }
    // one label per centre of resistance (Huguette, Dominique, Éliane...) shown when zoomed out
    const groups = {};
    for (const p of this.D.places) {
      if (!p.minor || p.lat == null) continue;
      const g = (p.label || p.name).replace(/\s*\d+$/, '');
      (groups[g] ||= []).push(p);
    }
    this.groupMarkers = [];
    for (const [g, ps] of Object.entries(groups)) {
      if (this.D.places.some((p) => !p.minor && (p.label || p.name) === g)) continue;
      const lon = ps.reduce((a, p) => a + p.lon, 0) / ps.length, lat = ps.reduce((a, p) => a + p.lat, 0) / ps.length;
      const el = document.createElement('div');
      el.className = 'grp' + (lon < 103.0105 ? ' w' : ' e');
      el.innerHTML = `<span>${esc(g)}</span>`;
      const mk = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lon, lat]).addTo(this.map);
      this.groupMarkers.push(mk);
    }
    const L = this.D.logistics || {};
    for (const w of [...(L.waypoints || []), ...(L.bases || [])]) {
      if (w.lat == null) continue;
      const el = document.createElement('div');
      el.className = `wp ${w.side === 'FR' ? 'fr' : 'vm'}`;
      el.innerHTML = `<i></i>${esc(w.name)}`;
      el.title = w.role || '';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        new maplibregl.Popup({ offset: 8 }).setLngLat([w.lon, w.lat]).setHTML(`<h4>${esc(w.name)}</h4>${esc(w.role || '')}${w.src ? `<div class="muted">${(w.src || []).map(srcText).join('; ')}</div>` : ''}${w.coordNote ? `<div class="muted">Location: ${esc(w.coordNote)}</div>` : ''}`).addTo(this.map);
      });
      const mk = new maplibregl.Marker({ element: el, anchor: 'left', offset: [-4, 0] }).setLngLat([w.lon, w.lat]);
      this.wpMarkers.push(mk);
    }
  }

  popup(p) {
    const st = this.status?.[p.id];
    const lost = p.lost ? `<div><b>${p.kind === 'airstrip' ? 'Closed / lost' : 'Fell'}:</b> ${fmtDate(p.lost)}${p.lostNote ? ` <span class="muted">(${esc(p.lostNote)})</span>` : ''}</div>` : '';
    const html = `<h4>${esc(p.name)}${p.vn ? ` <span class="muted">${esc(p.vn)}</span>` : ''}</h4>
      ${p.garrison ? `<div><b>Garrison 13 Mar:</b> ${esc(p.garrison)}</div>` : ''}${lost}
      ${st === 'lost' ? '<div class="muted">Lost by the date shown.</div>' : ''}
      ${p.notes ? `<div style="margin-top:4px">${esc(p.notes)}</div>` : ''}
      <div class="muted" style="margin-top:6px">Position: ${esc(p.coordConf || 'approximate')}${p.coordSrc ? ` (${esc(p.coordSrc)})` : ''}</div>
      ${p.src?.length ? `<div class="muted">${p.src.slice(0, 3).map(srcText).join('; ')}</div>` : ''}`;
    new maplibregl.Popup({ offset: 10, maxWidth: '320px' }).setLngLat([p.lon, p.lat]).setHTML(html).addTo(this.map);
  }

  zoomClass() {
    const z = this.map.getZoom();
    const root = this.map.getContainer();
    root.classList.toggle('zoom-low', z < 13.1);
    const valley = z >= 10.5;
    for (const { el } of this.markers.values()) el.style.display = valley ? '' : 'none';
    for (const mk of this.groupMarkers || []) mk.getElement().style.display = valley && z < 13.1 ? '' : 'none';
    for (const mk of this.wpMarkers) mk.getElement().style.display = this.logistics ? '' : 'none';
  }

  /** Update strongpoint states and arrows for date d. */
  setDate(d) {
    this.date = d;
    this.status = {};
    const hotTargets = new Set();
    const arrows = [];
    for (const e of this.D.events) {
      const end = e.end || e.d;
      if (!(e.d <= d && d <= end) && !(e.d === d)) continue;
      if (['attack', 'bombard', 'counterattack'].includes(e.action) && e.target) {
        hotTargets.add(e.target);
        const from = e.from && this.place(e.from);
        const to = this.place(e.target);
        if (from && to && from.lat != null && to.lat != null) arrows.push(...arrow([from.lon, from.lat], [to.lon, to.lat], e.side, e.id));
      }
    }
    for (const [id, { el, p }] of this.markers) {
      const lost = p.lost && p.lost <= d;
      const before = p.built && d < p.built;
      this.status[id] = lost ? 'lost' : 'held';
      el.classList.toggle('lost', !!lost);
      el.classList.toggle('hot', hotTargets.has(id) && !lost);
      el.style.opacity = before ? 0.35 : '';
    }
    this.map.getSource('arrows')?.setData({ type: 'FeatureCollection', features: arrows });
  }

  setActive(id) {
    for (const [pid, { el }] of this.markers) el.classList.toggle('active', pid === id);
  }

  setStyle(s) {
    this.style = s;
    const m = this.map;
    m.setLayoutProperty('period', 'visibility', s === 'period' ? 'visible' : 'none');
    m.setLayoutProperty('ams', 'visibility', s === 'ams' ? 'visible' : 'none');
    m.setLayoutProperty('modern', 'visibility', s === 'modern' ? 'visible' : 'none');
    const root = m.getContainer();
    root.classList.toggle('style-modern', s === 'modern');
    root.classList.toggle('style-ams', s === 'ams');
  }

  setDim(dim, cam) {
    this.dim = dim;
    const m = this.map;
    if (dim === '3d') {
      m.setTerrain({ source: 'dem', exaggeration: 1.5 });
      m.easeTo({ pitch: cam?.pitch ?? 62, bearing: cam?.bearing ?? m.getBearing(), duration: 900 });
    } else {
      m.easeTo({ pitch: 0, bearing: 0, duration: 700 });
      setTimeout(() => { if (this.dim === '2d') m.setTerrain(null); }, 720);
    }
  }

  fly(cam, opts = {}) {
    const c = { ...cam };
    if (this.dim === '2d') { c.pitch = 0; c.bearing = 0; }
    this.map.flyTo({ ...c, duration: opts.duration ?? 1600, essential: true });
  }

  showViewshed(obsId) {
    const m = this.map;
    if (!m.getSource('vs')) return;
    if (!obsId) {
      m.setLayoutProperty('vs', 'visibility', 'none');
      m.getSource('obs').setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    m.getSource('vs').updateImage({ url: `${BASE}data/viewsheds/${obsId}.png`, coordinates: this.D.viewsheds.corners });
    m.setLayoutProperty('vs', 'visibility', 'visible');
    const o = this.D.viewsheds.observers.find((x) => x.id === obsId);
    if (o) m.getSource('obs').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [o.lon, o.lat] } }] });
  }

  setLogistics(on) {
    this.logistics = on;
    const vis = on ? 'visible' : 'none';
    this.map.setLayoutProperty('routes', 'visibility', vis);
    this.map.setLayoutProperty('routes-casing', 'visibility', vis);
    this.map.setLayoutProperty('routes-air', 'visibility', vis);
    for (const mk of this.wpMarkers) { if (on) mk.addTo(this.map); else mk.remove(); }
    if (on) this.map.fitBounds([[102.6, 19.6], [107.2, 22.9]], { padding: 40, pitch: 0, bearing: 0, duration: 1500 });
    else this.fly(HOME);
    this.zoomClass();
  }
}

// Arrow geometry: a shortened line plus a triangular head, in lon/lat (fine at valley scale).
function arrow(a, b, side, id) {
  const k = Math.cos((a[1] * Math.PI) / 180);
  const dx = (b[0] - a[0]) * k, dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-5) return [];
  const ux = dx / len, uy = dy / len;
  const trim = Math.min(0.0016, len * 0.18);
  const s = [a[0] + (ux * trim) / k, a[1] + uy * trim];
  const tip = [b[0] - (ux * trim * 0.6) / k, b[1] - uy * trim * 0.6];
  const hl = Math.min(0.0018, len * 0.3), hw = hl * 0.55;
  const base = [tip[0] - (ux * hl) / k, tip[1] - uy * hl];
  const l = [base[0] - (uy * hw) / k, base[1] + ux * hw];
  const r = [base[0] + (uy * hw) / k, base[1] - ux * hw];
  return [
    { type: 'Feature', properties: { side, id }, geometry: { type: 'LineString', coordinates: [s, base] } },
    { type: 'Feature', properties: { side, id }, geometry: { type: 'Polygon', coordinates: [[tip, l, r, tip]] } },
  ];
}

export { addDays };
