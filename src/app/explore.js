import { mountCityGame } from './city-game.js';
import { Cartesian2 } from 'cesium';
import {
  LAYER_FEED_STATE_LABELS,
  layerSnapshot,
} from '../data/layerSnapshot.js';
import { pointOnGlobe } from './exploreGeometry.js';

const activityNames = ['Where on Earth?', 'Data Detective'];
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

export function installExplore(viewer, dataManager) {
  const dock = document.getElementById('top-center-actions');
  if (!dock) return () => {};
  const choices = activityNames.map((name) => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'window-tool-toggle window-activity-toggle';
    choice.textContent = name;
    choice.setAttribute('aria-expanded', 'false');
    choice.setAttribute('aria-controls', 'window-explore');
    dock.append(choice);
    return choice;
  });
  const panel = document.createElement('section');
  panel.id = 'window-explore';
  panel.className = 'window-tool-panel';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'window-activity-title');
  panel.innerHTML =
    '<h2 id="window-activity-title"></h2><div class="window-activity"></div>';
  document.body.append(panel);
  const title = panel.querySelector('h2');
  const content = panel.querySelector('.window-activity');
  let activeActivity = null;
  function placePanels() {
    document.body.style.setProperty(
      '--window-toolbar-bottom',
      Math.ceil(dock.getBoundingClientRect().bottom) + 8 + 'px',
    );
  }
  const observer = new ResizeObserver(placePanels);
  observer.observe(dock);
  placePanels();
  let cleanup = () => {};
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

  const activities = [
    (autoStart) => mountCityGame(content, viewer, { autoStart }),
    detective,
  ];
  function close() {
    const index = activeActivity;
    cleanup();
    cleanup = () => {};
    activeActivity = null;
    panel.hidden = true;
    content.replaceChildren();
    if (index !== null) choices[index].setAttribute('aria-expanded', 'false');
  }
  choices.forEach((choice, index) => {
    choice.addEventListener('click', () => {
      const wasOpen = activeActivity === index;
      close();
      if (wasOpen) return;
      activeActivity = index;
      title.textContent = activityNames[index];
      panel.hidden = false;
      placePanels();
      choice.setAttribute('aria-expanded', 'true');
      cleanup = activities[index](index === 0) || (() => {});
    });
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const focus = choices[activeActivity];
      close();
      focus?.focus();
    }
  });
  if (document.documentElement.dataset.windowGameHome === 'true') {
    activeActivity = 0;
    title.textContent = activityNames[0];
    panel.hidden = false;
    choices[0].setAttribute('aria-expanded', 'true');
    cleanup = mountCityGame(content, viewer);
  }
  return () => {
    close();
    observer.disconnect();
    document.body.style.removeProperty('--window-toolbar-bottom');
    panel.remove();
    choices.forEach((choice) => choice.remove());
  };
}
