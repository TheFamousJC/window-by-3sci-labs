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
  button.setAttribute('aria-controls', 'window-sunlight');
  dock.append(button);

  const panel = document.createElement('section');
  panel.id = 'window-sunlight';
  panel.className = 'window-tool-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Sunlight preview');
  panel.innerHTML = `
    <h2>Sunlight</h2>
    <label for="window-sun-time">Preview time (UTC)</label>
    <input id="window-sun-time" type="range" min="0" max="1439" step="1">
    <output for="window-sun-time"></output>
    <div class="window-tool-actions"><button type="button">Now</button></div>
    <p>Shading follows the Sun. The basemap is captured imagery.</p>`;
  document.body.append(panel);

  const { scene } = viewer;
  const { globe } = scene;
  const slider = panel.querySelector('input');
  const output = panel.querySelector('output');
  const light = new DirectionalLight({
    direction: new Cartesian3(-1, 0, 0),
    intensity: 1,
  });
  let restore;
  let isNow = true;
  let previewDay;
  let timer;
  function render() {
    if (!restore) return;
    const now = new Date();
    if (isNow) {
      previewDay = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      );
      slider.value = String(now.getUTCHours() * 60 + now.getUTCMinutes());
    }
    const instant = isNow
      ? now
      : new Date(previewDay + Number(slider.value) * 60000);
    light.direction = sunlightDirection(instant);
    const label = instant.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    slider.setAttribute('aria-valuetext', label);
    output.textContent = label + (isNow ? ' · Now' : ' · Preview');
    scene.requestRender();
  }
  function disable() {
    if (!restore) return;
    restore();
    restore = undefined;
    clearInterval(timer);
    panel.hidden = true;
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
    isNow = true;
    panel.hidden = false;
    button.setAttribute('aria-pressed', 'true');
    render();
    timer = setInterval(render, 30000);
  }
  button.addEventListener('click', () => {
    if (restore) disable();
    else enable();
  });
  if (startOn) enable();
  slider.addEventListener('input', () => {
    isNow = false;
    render();
  });
  panel.querySelector('button').addEventListener('click', () => {
    isNow = true;
    render();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      disable();
      button.focus();
    }
  });
  return () => {
    disable();
    panel.remove();
    button.remove();
  };
}
