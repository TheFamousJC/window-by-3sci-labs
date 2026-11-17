import { decodeRing } from '../data/adminBoundaries.js';
import { loadBundledJson } from '../data/bundledJson.js';

const countriesUrl = new URL(
  '../data/local_data/natural_earth/countries.json',
  import.meta.url,
);
const TAU = Math.PI * 2;

export async function downloadPostcard(point, caption) {
  const pack = await loadBundledJson(countriesUrl);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  const radians = (d) => (d * Math.PI) / 180;
  const lat0 = radians(point.lat);
  const lon0 = radians(point.lon);
  const scale = 245;
  function project([lon, lat]) {
    const phi = radians(lat);
    const lambda = radians(lon) - lon0;
    return {
      x: 600 + scale * Math.cos(phi) * Math.sin(lambda),
      y:
        306 -
        scale *
          (Math.cos(lat0) * Math.sin(phi) -
            Math.sin(lat0) * Math.cos(phi) * Math.cos(lambda)),
      visible:
        Math.sin(lat0) * Math.sin(phi) +
          Math.cos(lat0) * Math.cos(phi) * Math.cos(lambda) >=
        0,
    };
  }
  ctx.fillStyle = '#081725';
  ctx.fillRect(0, 0, 1200, 720);
  ctx.fillStyle = '#112e44';
  ctx.beginPath();
  ctx.arc(600, 306, scale, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#2d536a';
  ctx.lineWidth = 1.2;
  function trace(points) {
    ctx.beginPath();
    let pen = false;
    for (const p of points) {
      const projected = project(p);
      if (!projected.visible) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(projected.x, projected.y);
      else ctx.moveTo(projected.x, projected.y);
      pen = true;
    }
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    trace(Array.from({ length: 181 }, (_, i) => [2 * i - 180, lat]));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    trace(Array.from({ length: 91 }, (_, i) => [lon, 2 * i - 90]));
  }
  ctx.strokeStyle = '#78b9c9';
  ctx.lineWidth = 1.4;
  for (const feature of pack.features) {
    for (const polygon of feature.polygons) {
      if (polygon[0])
        trace(decodeRing(polygon[0], feature.d ?? pack.meta.decimals ?? 3));
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(600, 306, 7, 0, TAU);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#edf8ff';
  ctx.font = '600 38px sans-serif';
  ctx.fillText(caption || 'Postcard from Earth', 600, 600, 1060);
  ctx.fillStyle = '#8dcbdc';
  ctx.font = '21px sans-serif';
  ctx.fillText(
    point.lat.toFixed(4) + '°, ' + point.lon.toFixed(4) + '°',
    600,
    639,
  );
  ctx.fillStyle = '#dce6eb';
  ctx.font = '16px sans-serif';
  ctx.fillText('WINDOW  /  Made with Natural Earth', 600, 685);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('PNG could not be created');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'window-postcard.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
