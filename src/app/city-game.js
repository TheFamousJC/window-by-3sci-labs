import { Cartesian3, Math as CesiumMath } from 'cesium';
import { flyToPoint } from './exploreGeometry.js';
import { utcDay, dailyRandom, expeditionShare } from './dailyExpedition.js';
import { cityGuessFeedback } from './cityGuessFeedback.js';
import { places, dealCities } from './gamePlaces.js';
import {
  DIFFICULTIES,
  MAX_SCORE,
  answerPoints,
  answerKey,
  matchesAnswer,
  cityView,
} from './gameRules.js';
export { dealCities, cityView, DIFFICULTIES };
const SCORE_KEY = 'window-city-game-score-v6-levels';

function readRecord(key) {
  try {
    const record = JSON.parse(localStorage.getItem(key) || 'null');
    return record &&
      [record.last, record.best].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= MAX_SCORE,
      )
      ? record
      : null;
  } catch {
    return null;
  }
}
export function mountCityGame(content, viewer) {
  content.innerHTML = `
    <section class="window-city-game" aria-label="Where on Earth?">
      <div class="window-game-summary"><span data-city-progress>10 locations · Ready</span></div>
      <div data-city-score class="window-game-score">0 / 100</div>
      <p data-city-streak>Clean-location streak: 0</p>
      <details data-round-settings open><summary>Round settings</summary>
        <label for="window-game-mode">Round</label>
        <select id="window-game-mode"><option value="practice">Quick Game · 10 locations</option><option value="daily">Daily Expedition · 10 locations</option></select>
        <label for="window-difficulty">Difficulty</label>
        <select id="window-difficulty"><option value="easy">Easy · country</option><option value="medium">Medium · country + city</option><option value="hard">Hard · country + city + landmark</option></select>
        <p data-daily-info></p>
      </details>
      <p data-level-rules></p>
      <details><summary>How to play & scoring</summary>
        <p>Easy: country only. Zoom-out clicks reduce available points: 10 → 8 → 6 → 4 → 2. Zooming in does not recover points.</p>
        <p>Medium: country 2 + city 8. Hard: country 2 + city 3 + landmark 5. No zoom penalties in Medium or Hard.</p>
        <p>Use the zoom buttons to explore; mouse-wheel and pinch zoom are off during a round. Each hint costs 1 point from that answer. City and landmark answers have four attempts; retries do not change the level's point values. Unknown or repeated city names cost no attempt. Banked points stay protected. Streaks track progress without changing scores.</p>
      </details>
      <button data-city-start type="button">Start round</button>
      <datalist id="window-offline-cities">${places.map((p) => `<option value="${p.city}"></option>`).join('')}</datalist>
      <form data-city-round hidden>
        <div class="window-tool-actions" aria-label="Game zoom controls">
          <button data-zoom-in type="button">Zoom in</button><button data-zoom-out type="button">Zoom out</button>
        </div><p data-zoom-status></p>
        <label for="window-game-answer" data-answer-label>Country</label>
        <input id="window-game-answer" type="text" maxlength="100" autocomplete="off" spellcheck="false">
        <div class="window-tool-actions"><button data-answer-submit type="submit">Lock in country</button><button data-answer-skip type="button">Skip country</button><button data-city-next type="button" hidden>Next location</button></div>
        <div class="window-tool-actions"><button data-answer-hint type="button">Initial hint −1</button></div>
        <p data-answer-clue></p>
      </form>
      <div class="window-tool-actions"><button data-city-save type="button" hidden>Save score</button><button data-daily-share type="button" hidden>Copy daily result</button></div>
      <p data-city-feedback role="status" aria-live="polite"></p><p data-city-saved></p>
      <textarea data-share-fallback aria-label="Daily result to copy" readonly hidden></textarea>
    </section>`;
  const el = (selector) => content.querySelector(selector);
  const mode = el('#window-game-mode'),
    difficulty = el('#window-difficulty');
  const start = el('[data-city-start]'),
    form = el('form'),
    answer = el('#window-game-answer');
  const submit = el('[data-answer-submit]'),
    skip = el('[data-answer-skip]'),
    next = el('[data-city-next]');
  const hint = el('[data-answer-hint]'),
    zoomIn = el('[data-zoom-in]'),
    zoomOut = el('[data-zoom-out]');
  const feedback = el('[data-city-feedback]'),
    scoreboard = el('[data-city-score]');
  const save = el('[data-city-save]'),
    share = el('[data-daily-share]');
  const controller = viewer.scene.screenSpaceCameraController;
  const mapActions = ['reset-globe-view', 'tilt-map-view']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const originalDisabled = new Map();
  let previousZoom = null,
    phase = 'ready',
    active = true,
    flight = 0,
    zoomFlight = false;
  let roundMode = 'practice',
    roundDifficulty = 'easy',
    roundDay = '',
    deck = [],
    index = 0,
    stageIndex = 0;
  let total = 0,
    bank = 0,
    streak = 0,
    clean = true,
    hintUsed = false,
    stageHints = new Set(),
    tried = new Set(),
    attempts = 0;
  let zoomLevel = 0,
    widestZoom = 0,
    results = [];
  const rule = () => DIFFICULTIES[roundDifficulty];
  const stage = () => rule().stages[stageIndex];
  const label = () => stage()[0].toUpperCase() + stage().slice(1);
  const key = (m, d, day = utcDay()) =>
    SCORE_KEY + ':' + (m === 'daily' ? 'daily:' + day : 'practice') + ':' + d;
  const roundKey = () => key(roundMode, roundDifficulty, roundDay);
  function recordLabel() {
    const record = readRecord(key(mode.value, difficulty.value));
    el('[data-city-saved]').textContent = record
      ? 'Last saved: ' + record.last + ' · Best: ' + record.best
      : '';
  }
  function levelRules(value) {
    return value === 'easy'
      ? 'Country only · 10 points; each new zoom-out level costs 2 (minimum 2).'
      : value === 'medium'
        ? 'Country 2 + city 8 · Zoom freely without point penalties.'
        : 'Country 2 + city 3 + landmark 5 · Zoom freely without point penalties.';
  }
  function settingsChanged() {
    el('[data-daily-info]').textContent =
      mode.value === 'daily'
        ? 'Daily Expedition · ' +
          utcDay() +
          ' UTC · Same 10 locations worldwide; compare within the same difficulty.'
        : 'Quick Game · 10 random locations.';
    recordLabel();
    if (phase === 'ready' || phase === 'complete')
      el('[data-level-rules]').textContent = levelRules(difficulty.value);
    start.hidden = false;
    start.textContent = ['ready', 'complete'].includes(phase)
      ? 'Start round'
      : 'Start new round';
    if (!['ready', 'complete'].includes(phase))
      feedback.textContent =
        'Settings changed. Start new round to apply; the current round keeps its existing rules.';
  }
  mode.addEventListener('change', settingsChanged);
  difficulty.addEventListener('change', settingsChanged);
  settingsChanged();
  function setMapZoom(enabled) {
    for (const button of mapActions) {
      if (!enabled) {
        if (!originalDisabled.has(button))
          originalDisabled.set(button, button.disabled);
        button.disabled = true;
      } else if (originalDisabled.has(button)) {
        button.disabled = originalDisabled.get(button);
        originalDisabled.delete(button);
      }
    }
    if (!controller) return;
    if (!enabled) {
      if (previousZoom === null) previousZoom = controller.enableZoom;
      controller.enableZoom = false;
    } else if (previousZoom !== null) {
      controller.enableZoom = previousZoom;
      previousZoom = null;
    }
  }
  function setCluesHidden(hidden) {
    document.body.classList.toggle('window-city-guessing', hidden);
  }
  function zoomLabel() {
    zoomIn.disabled = phase !== 'answer' || zoomFlight || zoomLevel === 0;
    zoomOut.disabled = phase !== 'answer' || zoomFlight || zoomLevel === 4;
    el('[data-zoom-status]').textContent =
      roundDifficulty === 'easy'
        ? 'Zoom level ' +
          zoomLevel +
          '/4 · Widest reached ' +
          widestZoom +
          '/4 · Country ' +
          answerPoints('easy', 'country', widestZoom) +
          ' points before hints'
        : 'Zoom level ' + zoomLevel + '/4 · No zoom penalty';
  }
  function stageControls() {
    answer.value = '';
    answer.disabled = false;
    const value = answerPoints(
      roundDifficulty,
      stage(),
      widestZoom,
      stageHints.has(stage()),
    );
    el('[data-answer-label]').textContent = label() + ' · ' + value + ' points';
    if (stage() === 'city')
      answer.setAttribute('list', 'window-offline-cities');
    else answer.removeAttribute('list');
    submit.textContent = 'Lock in ' + stage();
    skip.textContent = 'Skip ' + stage();
    submit.hidden = skip.hidden = false;
    submit.disabled = skip.disabled = false;
    hint.disabled = stageHints.has(stage());
    hint.textContent = label() + ' initial −1';
    el('[data-answer-clue]').textContent = '';
    next.hidden = true;
    attempts = 0;
    tried = new Set();
    zoomLabel();
    answer.focus();
  }
  function showLocation() {
    phase = 'flying';
    const token = ++flight;
    stageIndex = 0;
    bank = 0;
    clean = true;
    hintUsed = false;
    stageHints = new Set();
    zoomLevel = widestZoom = 0;
    zoomFlight = false;
    form.hidden = false;
    answer.disabled = submit.disabled = skip.disabled = hint.disabled = true;
    submit.hidden = skip.hidden = false;
    next.hidden = true;
    answer.value = '';
    el('[data-answer-clue]').textContent = '';
    el('[data-city-progress]').textContent =
      'Location ' + (index + 1) + ' of 10';
    feedback.textContent = 'Flying to the mystery location…';
    zoomLabel();
    flyToPoint(viewer, cityView(deck[index], roundDifficulty), {
      orientation: {
        heading: (rule().heading * Math.PI) / 180,
        pitch: -Math.PI / 2,
        roll: 0,
      },
      complete: () => {
        if (!active || token !== flight || phase !== 'flying') return;
        phase = 'answer';
        stageControls();
        feedback.textContent = 'Name the ' + stage() + '.';
      },
      cancel: () => {
        if (!active || token !== flight || phase !== 'flying') return;
        phase = 'retry';
        next.hidden = false;
        next.textContent = 'Return to location';
        feedback.textContent =
          'Flight interrupted. Return to the location to continue.';
      },
    });
  }
  function begin() {
    ++flight;
    phase = 'ready';
    viewer.camera.cancelFlight();
    roundMode = mode.value;
    roundDifficulty = difficulty.value;
    roundDay = utcDay();
    deck = dealCities(
      roundMode === 'daily' ? dailyRandom(roundDay) : Math.random,
    );
    total = 0;
    index = 0;
    streak = 0;
    results = [];
    el('[data-city-streak]').textContent = 'Clean-location streak: 0';
    scoreboard.textContent = '0 / 100';
    el('[data-level-rules]').textContent = levelRules(roundDifficulty);
    el('[data-round-settings]').open = false;
    el('[data-daily-info]').textContent =
      (roundMode === 'daily'
        ? 'Daily Expedition · ' + roundDay + ' UTC'
        : 'Quick Game') +
      ' · ' +
      rule().label +
      ' · 10 locations';
    start.hidden = save.hidden = share.hidden = true;
    save.disabled = false;
    el('[data-share-fallback]').hidden = true;
    setMapZoom(false);
    setCluesHidden(true);
    showLocation();
  }
  start.addEventListener('click', begin);
  function finishLocation() {
    phase = 'review';
    streak = clean ? (hintUsed ? streak : streak + 1) : 0;
    el('[data-city-streak]').textContent = 'Clean-location streak: ' + streak;
    results.push(bank);
    submit.hidden = skip.hidden = true;
    answer.disabled = hint.disabled = true;
    zoomLabel();
    const place = deck[index];
    feedback.textContent =
      place.country +
      (roundDifficulty !== 'easy' ? ' · ' + place.city : '') +
      (roundDifficulty === 'hard' ? ' · ' + place.landmark : '') +
      ' · Location +' +
      bank +
      ' / 10';
    if (index === 9) {
      phase = 'complete';
      form.hidden = true;
      el('[data-city-progress]').textContent = 'Round complete';
      start.hidden = save.hidden = false;
      start.textContent = 'Play again';
      share.hidden = roundMode !== 'daily';
      setMapZoom(true);
      setCluesHidden(false);
      save.focus();
    } else {
      next.hidden = false;
      next.textContent = 'Next location';
      next.focus();
    }
  }
  function resolveAnswer(skipped = false) {
    if (phase !== 'answer' || zoomFlight) return;
    if (!skipped && !answer.value.trim()) {
      feedback.textContent = 'Enter an answer or choose Skip.';
      answer.focus();
      return;
    }
    const place = deck[index],
      kind = stage();
    const aliases =
      kind === 'country'
        ? place.countryAliases
        : kind === 'city'
          ? place.cityAliases
          : place.landmarkAliases;
    const correct =
      !skipped && matchesAnswer(answer.value, [place[kind], ...aliases]);
    if (!correct && !skipped && kind !== 'country') {
      const guessKey = answerKey(answer.value);
      if (tried.has(guessKey)) {
        feedback.textContent = 'Already tried that answer; no attempt charged.';
        return;
      }
      let match = null;
      if (kind === 'city') {
        match = places.find((p) =>
          matchesAnswer(answer.value, [p.city, ...p.cityAliases]),
        );
        if (!match) {
          feedback.textContent =
            'City not in the offline list. Choose a suggested city; no attempt charged.';
          return;
        }
        if (tried.has(match.city)) {
          feedback.textContent = 'Already tried that city; no attempt charged.';
          return;
        }
        tried.add(match.city);
      }
      tried.add(guessKey);
      attempts++;
      clean = false;
      streak = 0;
      el('[data-city-streak]').textContent = 'Clean-location streak: 0';
      if (attempts < 4) {
        const clue = match ? cityGuessFeedback(match, place) : null;
        feedback.textContent =
          (clue
            ? clue.temperature +
              ' · About ' +
              Math.max(1, Math.round(clue.km / 10) * 10).toLocaleString() +
              ' km ' +
              clue.direction +
              ' from ' +
              match.city +
              '. '
            : 'Not that landmark. ') +
          (4 - attempts) +
          ' attempts left · Banked points protected.';
        answer.select();
        return;
      }
    }
    const earned = correct
      ? answerPoints(roundDifficulty, kind, widestZoom, stageHints.has(kind))
      : 0;
    if (!correct) {
      clean = false;
      streak = 0;
      el('[data-city-streak]').textContent = 'Clean-location streak: 0';
    }
    bank += earned;
    total += earned;
    scoreboard.textContent = total + ' / 100';
    if (stageIndex + 1 < rule().stages.length) {
      stageIndex++;
      stageControls();
      feedback.textContent =
        kind[0].toUpperCase() +
        kind.slice(1) +
        ' locked · +' +
        earned +
        ' points banked. Now name the ' +
        stage() +
        '.';
    } else finishLocation();
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    resolveAnswer();
  });
  skip.addEventListener('click', () => resolveAnswer(true));
  hint.addEventListener('click', () => {
    if (phase !== 'answer' || stageHints.has(stage())) return;
    stageHints.add(stage());
    hintUsed = true;
    hint.disabled = true;
    const value = answerPoints(roundDifficulty, stage(), widestZoom, true);
    el('[data-answer-label]').textContent = label() + ' · ' + value + ' points';
    el('[data-answer-clue]').textContent =
      label() +
      ' starts with ' +
      deck[index][stage()][0] +
      '. Hint cost: 1 point from this answer.';
  });
  function changeZoom(delta) {
    if (phase !== 'answer' || zoomFlight) return;
    const level = Math.min(4, Math.max(0, zoomLevel + delta));
    if (level === zoomLevel) return;
    zoomLevel = level;
    widestZoom = Math.max(widestZoom, level);
    zoomFlight = true;
    el('[data-answer-label]').textContent =
      label() +
      ' · ' +
      answerPoints(
        roundDifficulty,
        stage(),
        widestZoom,
        stageHints.has(stage()),
      ) +
      ' points';
    zoomLabel();
    const token = flight;
    const position = viewer.camera.positionCartographic;
    const height = Math.min(
      20_000_000,
      cityView(deck[index], roundDifficulty).height * Math.pow(6, level),
    );
    const finished = () => {
      if (!active || token !== flight) return;
      zoomFlight = false;
      zoomLabel();
    };
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        CesiumMath.toDegrees(position.longitude),
        CesiumMath.toDegrees(position.latitude),
        height,
      ),
      duration: 0.35,
      complete: finished,
      cancel: finished,
    });
  }
  zoomIn.addEventListener('click', () => changeZoom(-1));
  zoomOut.addEventListener('click', () => changeZoom(1));
  next.addEventListener('click', () => {
    if (phase === 'review') index++;
    else if (phase !== 'retry') return;
    showLocation();
  });
  save.addEventListener('click', () => {
    if (phase !== 'complete' || save.disabled) return;
    try {
      const previous = readRecord(roundKey());
      localStorage.setItem(
        roundKey(),
        JSON.stringify({
          last: total,
          best: Math.max(total, previous?.best ?? 0),
        }),
      );
      mode.value = roundMode;
      difficulty.value = roundDifficulty;
      recordLabel();
      save.disabled = true;
      feedback.textContent = 'Score saved on this browser.';
    } catch {
      feedback.textContent = 'This browser could not save the score.';
    }
  });
  share.addEventListener('click', async () => {
    if (phase !== 'complete' || roundMode !== 'daily') return;
    const text = expeditionShare({
      day: roundDay,
      total,
      results,
      difficulty: rule().label,
      maxScore: 100,
      locationMax: 10,
    });
    try {
      await navigator.clipboard.writeText(text);
      if (active) feedback.textContent = 'Spoiler-free daily result copied.';
    } catch {
      if (!active) return;
      const fallback = el('[data-share-fallback]');
      fallback.value = text;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      feedback.textContent = 'Copy the selected daily result.';
    }
  });
  return () => {
    active = false;
    ++flight;
    if (phase === 'flying' || zoomFlight) viewer.camera.cancelFlight();
    setMapZoom(true);
    setCluesHidden(false);
  };
}
