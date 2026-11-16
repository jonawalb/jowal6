// Country lookup raster: draws two countries onto an offscreen equirectangular canvas at 1/8 degree
// (about 14 km at the equator) and answers "is this point in country A / country B" by pixel lookup.
// Much faster than point-in-polygon on 1:50m borders while the chip is being dragged.
const PX = 8;                                  // pixels per degree
const CW = 360 * PX, CH = 180 * PX;

export function createClassifier(d3) {
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const proj = d3.geoEquirectangular().scale(CW / (2 * Math.PI)).translate([CW / 2, CH / 2]).precision(0.1);
  const path = d3.geoPath(proj, ctx);
  let data = null;

  function set(featR, featK) {
    ctx.clearRect(0, 0, CW, CH);
    ctx.globalCompositeOperation = 'lighter';
    for (const [f, col] of [[featR, '#ff0000'], [featK, '#00ff00']]) {
      if (!f) continue;
      ctx.beginPath(); path(f); ctx.fillStyle = col; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    data = ctx.getImageData(0, 0, CW, CH).data;
  }

  function classify(lon, lat) {
    if (!data) return { r: false, k: false };
    const x = Math.min(CW - 1, Math.max(0, Math.floor((lon + 180) * PX)));
    const y = Math.min(CH - 1, Math.max(0, Math.floor((90 - lat) * PX)));
    const i = (y * CW + x) * 4;
    return { r: data[i] > 127, k: data[i + 1] > 127 };
  }

  return { set, classify };
}
