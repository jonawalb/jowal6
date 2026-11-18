// Fallback map for browsers without WebGL: Leaflet (DOM/canvas), 2D only, same tiles and interface as BattleMap.
import { esc, fmtDate, srcText } from './util.js';
import { arrow } from './map.js';

const BASE = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
const Z = (z) => Math.floor(z + 1); // MapLibre zoom (512 px world) -> Leaflet zoom (256 px world)
export const HOME = { center: [103.012, 21.379], zoom: 12.15 };

const ATTR = {
  period: 'Relief from Copernicus DEM GLO-30/GLO-90 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA',
  ams: 'US Army Map Service, L7014 sheets 5651 IV and 5551 I (public domain)',
  modern: 'Sentinel-2 cloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0',
};

export class FlatMap {
  constructor(el, data, handlers) {
    this.D = data; this.h = handlers; this.markers = new Map(); this.wpMarkers = []; this.groupMarkers = [];
    this.flat = true;
    const m = (this.map = L.map(el, { zoomSnap: 1, zoomDelta: 1, minZoom: 6, maxZoom: 17, attributionControl: true })
      .setView([HOME.center[1], HOME.center[0]], Z(HOME.zoom)));
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(m);
    const tl = (p, o = {}) => L.tileLayer(`${BASE}tiles/${p}`, { tileSize: 256, ...o });
    this.layers = {
      region: tl('region/{z}/{x}/{y}.webp', { minZoom: 6, maxNativeZoom: 10, maxZoom: 17, attribution: ATTR.period }).addTo(m),
      period: tl('period/{z}/{x}/{y}.webp', { minZoom: 11, maxNativeZoom: 15, maxZoom: 17, bounds: [[21.25, 102.9], [21.53, 103.2197]] }).addTo(m),
      ams: tl('ams/{z}/{x}/{y}.webp', { minZoom: 11, maxNativeZoom: 15, maxZoom: 17, bounds: [[21.25, 102.9], [21.5, 103.25]], attribution: ATTR.ams }),
      modern: L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg', { maxNativeZoom: 15, maxZoom: 17, attribution: ATTR.modern }),
    };
    this.arrows = L.layerGroup().addTo(m);
    this.routes = L.layerGroup();
    for (const r of data.logistics?.routes || []) {
      if (!r.coords || r.coords.length < 2) continue;
      const fr = r.side === 'FR';
      L.polyline(r.coords.map(([x, y]) => [y, x]), { color: fr ? '#2f5d8a' : '#b23a2b', weight: fr ? 2.2 : 3, dashArray: fr ? '6 6' : null }).addTo(this.routes);
    }
    fetch(`${BASE}data/region.geojson`).then((r) => r.json()).then((g) => {
      L.geoJSON(g, { style: (f) => (f.properties.k === 'border' ? { color: '#7a5a3a', weight: 1.2, dashArray: '6 4', opacity: 0.8 } : { color: '#7d9db0', weight: 1.2 }) }).addTo(m);
    }).catch(() => {});
    this.vsLayer = null;
    this.obs = null;
    this.buildMarkers();
    m.on('zoomend', () => this.zoomClass());
    this.zoomClass();
    this.ready = Promise.resolve();
    setTimeout(() => handlers.onReady?.(), 0);
  }

  place(id) { return this.D.placeIndex[id]; }

  icon(html, cls) { return L.divIcon({ html, className: `lf ${cls}`, iconSize: [0, 0] }); }

  buildMarkers() {
    for (const p of this.D.places) {
      if (p.lat == null) continue;
      const side = p.kind === 'vm_terrain' ? 'vm' : ['strongpoint', 'cp', 'airstrip'].includes(p.kind) ? 'fr' : 'other';
      const mk = L.marker([p.lat, p.lon], { icon: this.icon(`<div class="sp ${side}${p.minor || p.small ? ' minor' : ''}" title="${esc(p.name)}"><span class="dot"></span><span class="lbl">${esc(p.label || p.name)}</span></div>`, 'lf-sp'), keyboard: false })
        .addTo(this.map).on('click', () => this.popup(p));
      this.markers.set(p.id, { mk, p, el: () => mk.getElement()?.querySelector('.sp') });
    }
    const groups = {};
    for (const p of this.D.places) {
      if (!p.minor || p.lat == null) continue;
      const g = (p.label || p.name).replace(/\s*\d+$/, '');
      (groups[g] ||= []).push(p);
    }
    for (const [g, ps] of Object.entries(groups)) {
      if (this.D.places.some((p) => !p.minor && (p.label || p.name) === g)) continue;
      const lon = ps.reduce((a, p) => a + p.lon, 0) / ps.length, lat = ps.reduce((a, p) => a + p.lat, 0) / ps.length;
      this.groupMarkers.push(L.marker([lat, lon], { icon: this.icon(`<div class="grp ${lon < 103.0105 ? 'w' : 'e'}"><span>${esc(g)}</span></div>`, 'lf-grp'), interactive: false }).addTo(this.map));
    }
    const Lg = this.D.logistics || {};
    for (const w of [...(Lg.waypoints || []), ...(Lg.bases || [])]) {
      if (w.lat == null) continue;
      const mk = L.marker([w.lat, w.lon], { icon: this.icon(`<div class="wp ${w.side === 'FR' ? 'fr' : 'vm'}"><i></i>${esc(w.name)}</div>`, 'lf-wp') })
        .bindPopup(`<h4>${esc(w.name)}</h4>${esc(w.role || '')}${w.src ? `<div class="muted">${(w.src || []).map(srcText).join('; ')}</div>` : ''}`);
      this.wpMarkers.push(mk);
    }
  }

  popup(p) {
    const html = `<h4>${esc(p.name)}${p.vn ? ` <span class="muted">${esc(p.vn)}</span>` : ''}</h4>
      ${p.garrison ? `<div><b>Garrison 13 Mar:</b> ${esc(p.garrison)}</div>` : ''}
      ${p.lost ? `<div><b>${p.kind === 'airstrip' ? 'Closed / lost' : 'Fell'}:</b> ${fmtDate(p.lost)}</div>` : ''}
      ${p.notes ? `<div style="margin-top:4px">${esc(p.notes)}</div>` : ''}
      <div class="muted" style="margin-top:6px">Position: ${esc(p.coordConf || 'approximate')}</div>
      ${p.src?.length ? `<div class="muted">${p.src.slice(0, 3).map(srcText).join('; ')}</div>` : ''}`;
    L.popup({ maxWidth: 320 }).setLatLng([p.lat, p.lon]).setContent(html).openOn(this.map);
  }

  zoomClass() {
    const z = this.map.getZoom() - 1;
    const c = this.map.getContainer();
    c.classList.toggle('zoom-low', z < 13.1);
    const valley = z >= 10.5;
    for (const { mk } of this.markers.values()) mk.setOpacity(valley ? 1 : 0);
    for (const mk of this.groupMarkers) mk.setOpacity(valley && z < 13.1 ? 1 : 0);
  }

  setDate(d) {
    this.date = d;
    const hot = new Set();
    this.arrows.clearLayers();
    for (const e of this.D.events) {
      const end = e.end || e.d;
      if (!(e.d <= d && d <= end)) continue;
      if (['attack', 'bombard', 'counterattack'].includes(e.action) && e.target) {
        hot.add(e.target);
        const a = e.from && this.place(e.from), b = this.place(e.target);
        if (a && b && a.lat != null && b.lat != null) {
          const col = e.side === 'FR' ? '#2f5d8a' : '#b23a2b';
          for (const f of arrow([a.lon, a.lat], [b.lon, b.lat], e.side, e.id)) {
            const ll = (f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates).map(([x, y]) => [y, x]);
            (f.geometry.type === 'Polygon' ? L.polygon(ll, { color: col, fillColor: col, fillOpacity: 0.95, weight: 0 }) : L.polyline(ll, { color: col, weight: 3.2 })).addTo(this.arrows);
          }
        }
      }
    }
    for (const [id, { p, el }] of this.markers) {
      const n = el(); if (!n) continue;
      const lost = p.lost && p.lost <= d;
      n.classList.toggle('lost', !!lost);
      n.classList.toggle('hot', hot.has(id) && !lost);
    }
  }

  setActive(id) { for (const [pid, { el }] of this.markers) el()?.classList.toggle('active', pid === id); }

  setStyle(s) {
    for (const k of ['period', 'ams', 'modern']) {
      if (k === s) this.layers[k].addTo(this.map); else this.layers[k].remove();
    }
    this.layers.region.bringToBack();
    const c = this.map.getContainer();
    c.classList.toggle('style-modern', s === 'modern');
    c.classList.toggle('style-ams', s === 'ams');
  }

  setDim() { this.h.noWebGL?.(); }

  fly(cam) { this.map.flyTo([cam.center[1], cam.center[0]], Z(cam.zoom ?? HOME.zoom), { duration: 1.2 }); }

  showViewshed(obsId) {
    if (this.vsLayer) { this.vsLayer.remove(); this.vsLayer = null; }
    if (this.obs) { this.obs.remove(); this.obs = null; }
    if (!obsId) return;
    const c = this.D.viewsheds.corners; // [[W,N],[E,N],[E,S],[W,S]]
    this.vsLayer = L.imageOverlay(`${BASE}data/viewsheds/${obsId}.png`, [[c[2][1], c[0][0]], [c[0][1], c[1][0]]], { opacity: 0.75 }).addTo(this.map);
    const o = this.D.viewsheds.observers.find((x) => x.id === obsId);
    if (o) this.obs = L.circleMarker([o.lat, o.lon], { radius: 9, color: '#a8661c', weight: 3, fill: false }).addTo(this.map);
  }

  setLogistics(on) {
    this.logistics = on;
    if (on) {
      this.routes.addTo(this.map);
      for (const mk of this.wpMarkers) mk.addTo(this.map);
      this.map.flyToBounds([[19.6, 102.6], [22.9, 107.2]], { padding: [40, 40], duration: 1.2 });
    } else {
      this.routes.remove();
      for (const mk of this.wpMarkers) mk.remove();
      this.map.flyTo([HOME.center[1], HOME.center[0]], Z(HOME.zoom), { duration: 1.2 });
    }
  }
}
