import { Cartesian2 } from 'cesium';
import {
  LAYER_FEED_STATE_LABELS,
  layerSnapshot,
} from '../data/layerSnapshot.js';
import {
  centerOfView,
  compareDistance,
  flyToPoint,
  guessScore,
  places,
  pointOnGlobe,
} from './exploreGeometry.js';

const activityNames = ["Where on Earth?","Postcards from Earth","Globe Tours","Scale Explorer","Data Detective"];
const categories = {
  flights: 'Observed',
  satellites: 'Calculated',
  earthquakes: 'Observed',
  wind: 'Forecast',
  'weather-radar': 'Observed',
  'weather-satellite': 'Observed',
  'weather-lightning': 'Observed',
  'weather-cyclones': 'Observations and forecasts',
  transit: 'Observed',
  bikeshare: 'Observed',
  'recent-imagery': 'Captured imagery',
  cctv: 'Live streams or recent stills',
  traffic: 'Simulated vehicles',
  'fire-perimeters': 'Reported perimeters',
  'air-quality': 'Observed',
};
const tours = {
  'Around the Equator': [
    { name: 'Quito, Ecuador', lat: -0.18, lon: -78.47, height: 65000 },
    { name: 'Kisangani, DR Congo', lat: 0.52, lon: 25.2, height: 65000 },
    { name: 'Pontianak, Indonesia', lat: 0, lon: 109.34, height: 65000 },
  ],
  'Volcanic Islands': [
    { name: 'Iceland', lat: 64.96, lon: -19.0, height: 510000 },
    { name: 'Hawaiʻi', lat: 19.6, lon: -155.48, height: 245000 },
    { name: 'Réunion', lat: -21.12, lon: 55.53, height: 160000 },
  ],
};

export function installExplore(viewer, dataManager) {
  const dock = document.getElementById('top-center-actions');
  if (!dock) return () => {};
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'window-tool-toggle';
  button.textContent = 'Explore';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'window-explore');
  dock.append(button);
  const panel = document.createElement('section');
  panel.id = 'window-explore';
  panel.className = 'window-tool-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Explore activities');
  panel.innerHTML = `
    <h2>Explore</h2>
    <label for="window-activity">Activity</label>
    <select id="window-activity">${activityNames.map((name, index) => '<option value="' + index + '">' + name + '</option>').join('')}</select>
    <div class="window-activity"></div>`;
  document.body.append(panel);
  const menu = panel.querySelector('select');
  const content = panel.querySelector('.window-activity');
  let cleanup = () => {};
  const storageKey = 'window-explore-tour-v1';
  let customStops = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved))
      customStops = saved
        .filter(
          (p) =>
            Number.isFinite(p?.lat) &&
            Number.isFinite(p.lon) &&
            Number.isFinite(p.height) &&
            typeof p.name === 'string',
        )
        .slice(0, 15);
  } catch {
    /* storage may be disabled */
  }
  const saveStops = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(customStops));
    } catch {
      /* session-only */
    }
  };
  let lastPlace = -1;

  function show(markup) {
    content.innerHTML = markup + '<p role="status" aria-live="polite"></p>';
    const status = content.querySelector('[role="status"]');
    return (message) => {
      status.textContent = message;
    };
  }
  function on(control, callback) {
    content
      .querySelector('[data-action="' + control + '"]')
      .addEventListener('click', callback);
  }
  const action = (name, label) =>
    '<button type="button" data-action="' + name + '">' + label + '</button>';

  function globePick(handler) {
    const canvas = viewer.scene.canvas;
    let start;
    function down(event) {
      start = [event.clientX, event.clientY];
    }
    function up(event) {
      if (
        event.button !== 0 ||
        !start ||
        Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 5
      )
        return;
      const r = canvas.getBoundingClientRect();
      const pixels = new Cartesian2(
        event.clientX - r.left,
        event.clientY - r.top,
      );
      handler(pointOnGlobe(viewer, pixels), pixels);
    }
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
    };
  }

  function game() {
    const report = show(
      '<p>Study a mystery location. Then return to the globe and click your guess.</p><div class="window-tool-actions">' +
        action('round', 'New round') +
        action('guess', 'Make a guess') +
        action('center', 'Guess at view center') +
        '</div>',
    );
    let answer;
    let guessing = false;
    let ready = false;
    on('round', () => {
      const jump = 1 + Math.floor(Math.random() * (places.length - 1));
      lastPlace = (lastPlace + jump) % places.length;
      answer = places[lastPlace];
      guessing = false;
      ready = false;
      report('Study the landscape, then choose Make a guess.');
      flyToPoint(viewer, answer, {
        complete: () => {
          ready = true;
        },
      });
    });
    on('guess', () => {
      if (!answer || !ready)
        return report('Start a round and wait for the camera to arrive.');
      guessing = false;
      flyToPoint(
        viewer,
        { lat: 10, lon: 12, height: 19000000 },
        {
          complete: () => {
            guessing = true;
            report('Click Earth to place your guess. Drag to rotate.');
          },
        },
      );
    });
    function scorePoint(point) {
      if (!guessing || !point || !answer) return;
      guessing = false;
      const { km, score } = guessScore(point, answer);
      report(
        answer.name +
          ' · ' +
          Math.round(km).toLocaleString() +
          ' km away · ' +
          score +
          '/1000',
      );
      flyToPoint(viewer, answer);
      answer = null;
    }
    on('center', () => scorePoint(centerOfView(viewer)));
    const unpick = globePick(scorePoint);
    return () => {
      unpick();
      viewer.camera.cancelFlight();
    };
  }

  function postcard() {
    const report = show(
      '<p>Pan to a location and export a globe illustration centered on the view.</p>' +
        '<label for="window-postcard-caption">Caption</label><input id="window-postcard-caption" type="text" maxlength="70" placeholder="Postcard from Earth">' +
        '<div class="window-tool-actions">' +
        action('export', 'Download PNG') +
        '</div>',
    );
    on('export', async (event) => {
      const point = centerOfView(viewer);
      if (!point) return report('Point the center of the view at Earth.');
      const exportButton = event.currentTarget;
      exportButton.disabled = true;
      try {
        const { downloadPostcard } = await import('./postcard.js');
        await downloadPostcard(
          point,
          content.querySelector('input')?.value.trim() || '',
        );
        report('Postcard downloaded.');
      } catch {
        report('Could not create the postcard. Try again.');
      } finally {
        exportButton.disabled = false;
      }
    });
  }

  function tour() {
    const report = show(
      '<label for="window-tour">Route</label><select id="window-tour">' +
        '<option>Around the Equator</option><option>Volcanic Islands</option><option>My stops</option></select>' +
        '<div class="window-tool-actions">' +
        action('play', 'Play') +
        action('stop', 'Stop') +
        action('save', 'Add current view') +
        action('clear', 'Clear my stops') +
        '</div>',
    );
    const route = content.querySelector('select');
    let timer;
    let playing = false;
    function stop() {
      const wasPlaying = playing;
      playing = false;
      clearTimeout(timer);
      if (wasPlaying) viewer.camera.cancelFlight();
    }
    on('play', () => {
      stop();
      const list =
        route.value === 'My stops' ? [...customStops] : tours[route.value];
      if (!list.length) return report('Add a current view to make a tour.');
      playing = true;
      let index = 0;
      function advance() {
        if (!playing) return;
        if (index === list.length) {
          playing = false;
          report('Tour complete.');
          return;
        }
        const place = list[index++];
        report(place.name + ' · ' + index + '/' + list.length);
        flyToPoint(viewer, place, {
          complete: () => {
            timer = setTimeout(advance, 1300);
          },
          cancel: stop,
        });
      }
      advance();
    });
    on('stop', () => {
      stop();
      report('Tour stopped.');
    });
    on('save', () => {
      const point = centerOfView(viewer);
      if (!point) return report('Point the center of the view at Earth.');
      if (customStops.length >= 15)
        return report('My stops holds up to 15 locations.');
      const name = 'Stop ' + (customStops.length + 1);
      const height = Math.max(1500, viewer.camera.positionCartographic.height);
      customStops.push({ ...point, name, height });
      saveStops();
      route.value = 'My stops';
      report(name + ' added.');
    });
    on('clear', () => {
      stop();
      customStops = [];
      saveStops();
      report('My stops cleared.');
    });
    return stop;
  }

  function scale() {
    const report = show(
      '<p>Click two places on Earth to compare the shortest surface distance.</p>' +
        '<div class="window-tool-actions">' +
        action('center', 'Use view center') +
        action('reset', 'Reset points') +
        '</div>',
    );
    let first;
    let done = false;
    on('reset', () => {
      first = null;
      done = false;
      report('Click the first point.');
    });
    function measure(point) {
      if (!point) return;
      if (!first || done) {
        first = point;
        done = false;
        report('First point set. Click the second point.');
        return;
      }
      const { km, marathons, moonPercent } = compareDistance(first, point);
      done = true;
      report(
        km.toLocaleString(undefined, { maximumFractionDigits: 1 }) +
          ' km · ' +
          marathons.toFixed(1) +
          ' marathons · ' +
          moonPercent.toFixed(2) +
          '% of the average distance to the Moon',
      );
    }
    on('center', () => measure(centerOfView(viewer)));
    return globePick(measure);
  }

  function detective() {
    const report = show(
      '<p>Select a layer to inspect its source, status, and update age.</p>' +
        '<label for="window-detective-layer">Layer</label><select id="window-detective-layer"></select>' +
        '<div class="window-inspection"></div><div class="window-tool-actions">' +
        action('challenge', 'Start challenge') +
        '</div>' +
        '<div class="window-tool-actions window-answers" hidden>' +
        action('observed', 'Observed') +
        action('forecast', 'Forecast') +
        action('calculated', 'Calculated') +
        '</div>',
    );
    const picker = content.querySelector('select');
    const detail = content.querySelector('.window-inspection');
    const answers = content.querySelector('.window-answers');
    let answer;
    let challengeLayer;
    const layers = () =>
      dataManager.getAll().filter((l) => l.showInTogglePanel || l.enabled);
    function inspect() {
      if (challengeLayer) return;
      const layer = layers().find((l) => l.id === picker.value);
      if (!layer) return;
      const { source, feedState, ageLabel } = layerSnapshot(layer);
      detail.textContent =
        (categories[layer.id] || 'Reference or derived data') +
        ' · ' +
        (source || 'Source not listed') +
        ' · ' +
        (LAYER_FEED_STATE_LABELS[feedState] || 'OFF') +
        ' · Last update: ' +
        (ageLabel || 'unknown');
    }
    for (const layer of layers()) picker.add(new Option(layer.name, layer.id));
    picker.value = 'earthquakes';
    picker.addEventListener('change', () => {
      challengeLayer = null;
      answers.hidden = true;
      inspect();
    });
    on('challenge', () => {
      const ids = [
        'earthquakes',
        'satellites',
        'wind',
        'weather-radar',
        'weather-lightning',
        'flights',
      ];
      challengeLayer = ids[Math.floor(Math.random() * ids.length)];
      const layer = layers().find((l) => l.id === challengeLayer);
      answer = categories[challengeLayer].toLowerCase();
      picker.value = challengeLayer;
      detail.textContent = '';
      answers.hidden = false;
      report((layer?.name || challengeLayer) + ': what kind of data is this?');
    });
    for (const kind of ['observed', 'forecast', 'calculated'])
      on(kind, () => {
        if (!challengeLayer) return;
        report(
          kind === answer
            ? 'Correct.'
            : 'Answer: ' + categories[challengeLayer] + '.',
        );
        challengeLayer = null;
        answers.hidden = true;
        inspect();
      });
    const unpick = globePick((_, pixels) => {
      const marker = viewer.scene.pick(pixels)?.id;
      const layerId =
        marker?.layerId ??
        marker?.properties?.layerId?.getValue?.() ??
        (typeof marker === 'string' && marker.startsWith('earthquake:')
          ? 'earthquakes'
          : null);
      if (
        typeof layerId === 'string' &&
        [...picker.options].some((option) => option.value === layerId)
      ) {
        challengeLayer = null;
        answers.hidden = true;
        picker.value = layerId;
        inspect();
      }
    });
    inspect();
    const timer = setInterval(inspect, 5000);
    return () => {
      clearInterval(timer);
      unpick();
    };
  }

  const activities = [game, postcard, tour, scale, detective];
  function mount() {
    cleanup();
    cleanup = activities[Number(menu.value)]?.() || (() => {});
  }
  function close() {
    cleanup();
    cleanup = () => {};
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    content.replaceChildren();
  }
  menu.addEventListener('change', mount);
  button.addEventListener('click', () => {
    if (!panel.hidden) return close();
    button.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    mount();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close();
      button.focus();
    }
  });
  return () => {
    close();
    panel.remove();
    button.remove();
  };
}
