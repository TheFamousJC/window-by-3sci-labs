import {
  Cartesian3,
  DirectionalLight,
  JulianDate,
  Matrix3,
  Simon1994PlanetaryPositions,
  Transforms,
} from 'cesium';

export function sunlightDirection(date) {
  const time = JulianDate.fromDate(date);
  const sun =
    Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(time);
  const fixed = Transforms.computeTemeToPseudoFixedMatrix(time);
  Matrix3.multiplyByVector(fixed, sun, sun);
  return Cartesian3.normalize(Cartesian3.negate(sun, sun), sun);
}

export function installSunlight(viewer, { startOn = false } = {}) {
  const dock = document.getElementById('top-center-actions');
  if (!dock) return () => {};
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'window-tool-toggle';
  button.textContent = 'Sunlight';
  button.setAttribute('aria-pressed', 'false');
  button.title = 'Toggle current sunlight';
  dock.append(button);

  const { scene } = viewer;
  const { globe } = scene;
  const light = new DirectionalLight({
    direction: new Cartesian3(-1, 0, 0),
    intensity: 1,
  });
  let restore;
  let timer;
  function render() {
    if (!restore) return;
    light.direction = sunlightDirection(new Date());
    scene.requestRender();
  }
  function disable() {
    if (!restore) return;
    restore();
    restore = undefined;
    clearInterval(timer);
    button.setAttribute('aria-pressed', 'false');
    scene.requestRender();
  }
  function enable() {
    const { light: previousLight } = scene;
    const { enableLighting, lightingFadeOutDistance, lightingFadeInDistance } =
      globe;
    restore = () => {
      scene.light = previousLight;
      Object.assign(globe, {
        enableLighting,
        lightingFadeOutDistance,
        lightingFadeInDistance,
      });
    };
    scene.light = light;
    globe.enableLighting = true;
    globe.lightingFadeOutDistance = 0;
    globe.lightingFadeInDistance = 1;
    button.setAttribute('aria-pressed', 'true');
    render();
    timer = setInterval(render, 30000);
  }
  button.addEventListener('click', () => {
    if (restore) disable();
    else enable();
  });
  if (startOn) enable();
  return () => {
    disable();
    button.remove();
  };
}
