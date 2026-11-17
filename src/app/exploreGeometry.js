import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Math as CesiumMath,
} from 'cesium';
import { greatCircleKm } from '../geoDistance.js';

export function pointOnGlobe(viewer, screenPoint) {
  const { scene, camera } = viewer;
  const ray = camera.getPickRay(screenPoint);
  const hit = ray && scene.globe.show && scene.globe.pick(ray, scene);
  const world = hit || camera.pickEllipsoid(screenPoint, scene.globe.ellipsoid);
  if (!world) return null;
  const cartographic = Cartographic.fromCartesian(world);
  return {
    lat: CesiumMath.toDegrees(cartographic.latitude),
    lon: CesiumMath.toDegrees(cartographic.longitude),
  };
}

export function centerOfView(viewer) {
  const canvas = viewer.scene.canvas;
  return pointOnGlobe(
    viewer,
    new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2),
  );
}

export const places = [
  { name: 'Mount Fuji, Japan', lat: 35.36, lon: 138.73, height: 22000 },
  {
    name: 'Grand Canyon, United States',
    lat: 36.1,
    lon: -112.12,
    height: 40000,
  },
  {
    name: 'Cape of Good Hope, South Africa',
    lat: -34.36,
    lon: 18.47,
    height: 25000,
  },
  { name: 'Venice, Italy', lat: 45.44, lon: 12.33, height: 12500 },
  { name: 'Uluru, Australia', lat: -25.345, lon: 131.036, height: 12500 },
  {
    name: 'Iguazú Falls, Argentina and Brazil',
    lat: -25.695,
    lon: -54.436,
    height: 20000,
  },
];

export function flyToPoint(viewer, { lon, lat, height = 25000 }, options = {}) {
  if (viewer.trackedEntity) viewer.trackedEntity = undefined;
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(lon, lat, height),
    orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
    duration: 1.4,
    ...options,
  });
}

export function guessScore(guess, answer) {
  const km = greatCircleKm(guess, answer);
  return { km, score: Math.round(1000 * Math.exp(-km / 1750)) };
}

export function compareDistance(first, second) {
  const km = greatCircleKm(first, second);
  return {
    km,
    marathons: km / 42.195,
    moonPercent: (km / 384400) * 100,
  };
}
