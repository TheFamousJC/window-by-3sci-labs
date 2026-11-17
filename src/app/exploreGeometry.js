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

export function flyToPoint(viewer, { lon, lat, height = 25000 }, options = {}) {
  if (viewer.trackedEntity) viewer.trackedEntity = undefined;
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(lon, lat, height),
    orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
    duration: 1.4,
    ...options,
  });
}

export function compareDistance(first, second) {
  const km = greatCircleKm(first, second);
  return {
    km,
    marathons: km / 42.195,
    moonPercent: (km / 384400) * 100,
  };
}
