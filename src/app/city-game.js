import { flyToPoint } from './exploreGeometry.js';
import { retainCountryPoints } from './countryZoomScore.js';
import { cityAttemptPoints, cityGuessFeedback } from './cityGuessFeedback.js';

export const ROUND_LENGTH = 10;
const MAX_SCORE = ROUND_LENGTH * 25;
const SCORE_KEY = 'window-city-game-score-v4-retries';
export const DIFFICULTIES = {
  easy: { label: 'Easy', zoom: 1, shift: 0, heading: 0 },
  medium: { label: 'Medium', zoom: 0.65, shift: 0.014, heading: 40 },
  hard: { label: 'Hard', zoom: 0.4, shift: 0.025, heading: 115 },
};
export function cityView(place, difficulty) {
  const rule = DIFFICULTIES[difficulty] || DIFFICULTIES.easy;
  return {
    ...place,
    lat: place.lat + rule.shift,
    lon: place.lon + rule.shift,
    height: place.height * rule.zoom,
  };
}
export function hintScore(points, cost) {
  return Math.max(0, points - cost);
}

const cities = [
  ['Paris', 'France', 48.8584, 2.2945, 3200],
  [
    'London',
    'United Kingdom',
    51.5007,
    -0.1246,
    3700,
    [],
    ['UK', 'Great Britain', 'Britain'],
  ],
  ['Rome', 'Italy', 41.8902, 12.4922, 3000, ['Roma']],
  ['Athens', 'Greece', 37.9715, 23.7267, 3200, ['Athina']],
  ['Barcelona', 'Spain', 41.4036, 2.1744, 3900, [], ['España']],
  [
    'New York',
    'United States',
    40.758,
    -73.9855,
    5700,
    ['New York City', 'NYC'],
    ['USA', 'US', 'United States of America'],
  ],
  [
    'San Francisco',
    'United States',
    37.8078,
    -122.4691,
    5800,
    ['SF'],
    ['USA', 'US', 'United States of America'],
  ],
  ['Sydney', 'Australia', -33.857, 151.2153, 4000],
  ['Tokyo', 'Japan', 35.6586, 139.7454, 4300],
  [
    'Singapore',
    'Singapore',
    1.283,
    103.8607,
    4000,
    [],
    ['Republic of Singapore'],
  ],
  ['Cape Town', 'South Africa', -33.944, 18.419, 6100, ['Kaapstad']],
  ['Rio de Janeiro', 'Brazil', -22.952, -43.205, 6500, ['Rio'], ['Brasil']],
  ['Lisbon', 'Portugal', 38.7077, -9.1365, 3900, ['Lisboa']],
  ['Istanbul', 'Türkiye', 41.0086, 28.9802, 4000, ['İstanbul'], ['Turkey']],
  [
    'Amsterdam',
    'Netherlands',
    52.371,
    4.893,
    3500,
    [],
    ['The Netherlands', 'Nederland'],
  ],
  ['Prague', 'Czechia', 50.0865, 14.4114, 3500, ['Praha'], ['Czech Republic']],
];

export function dealCities(random = Math.random) {
  const deck = cities.map(
    ([
      city,
      country,
      lat,
      lon,
      height,
      cityAliases = [],
      countryAliases = [],
    ]) => ({ city, country, lat, lon, height, cityAliases, countryAliases }),
  );
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, ROUND_LENGTH);
}

export function answerKey(input) {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function scoreCity(place, city, country, countryValue = 15) {
  const matches = (value, choices) => {
    const key = answerKey(value);
    return Boolean(key) && choices.some((choice) => answerKey(choice) === key);
  };
  const cityPoints = matches(city, [place.city, ...place.cityAliases]) ? 10 : 0;
  const countryPoints = matches(country, [
    place.country,
    ...place.countryAliases,
  ])
    ? countryValue
    : 0;
  return { cityPoints, countryPoints, points: cityPoints + countryPoints };
}

function savedScore(difficulty) {
  try {
    const value = JSON.parse(
      localStorage.getItem(SCORE_KEY + ':' + difficulty) ||
        (difficulty === 'easy' ? localStorage.getItem(SCORE_KEY) : null) ||
        'null',
    );
    return value &&
      [value.last, value.best].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= MAX_SCORE,
      )
      ? value
      : null;
  } catch {
    return null;
  }
}

export function mountCityGame(content, viewer, { autoStart = false } = {}) {
  content.innerHTML = `
    <section class="window-city-game" aria-label="Where on Earth?">
      <div class="window-game-summary"><h3>Where on Earth?</h3><span data-city-progress>10 cities</span></div>
      <p data-city-rules>Lock in the country first (up to 15 points), then identify the city (10 points).</p>
      <div data-city-score class="window-game-score">0 / ${MAX_SCORE}</div>
      <label for="window-difficulty">Difficulty</label>
      <select id="window-difficulty"><option value="easy">Easy · landmark</option><option value="medium">Medium · neighborhood</option><option value="hard">Hard · close streets</option></select>
      <p>Country points: below 20 km altitude = 15; 20–200 km = 12; 200–2,000 km = 8; above 2,000 km = 3. Zooming back in never restores points. Hints also cost points.</p>
      <button type="button" data-city-start>Start round</button>
      <datalist id="window-offline-cities">${cities.map(([name]) => '<option value="' + name + '"></option>').join('')}</datalist>
      <form data-city-round hidden>
        <div data-city-stage hidden><label for="window-city-answer">City <span data-city-points>10 points · 4 attempts</span></label>
        <input id="window-city-answer" data-city-answer list="window-offline-cities" type="text" maxlength="70" autocomplete="off" spellcheck="false"></div>
        <div data-country-stage><label for="window-country-answer">Country <span data-country-points>15 points</span></label>
        <input id="window-country-answer" type="text" maxlength="70" autocomplete="off" spellcheck="false"></div>
        <div class="window-tool-actions"><button type="submit">Lock in country</button><button data-answer-skip type="button">Skip country</button><button data-city-next type="button" hidden>Next city</button></div>
        <div class="window-tool-actions">
          <button type="button" data-hint="country">Country initial −2</button>
          <button type="button" data-hint="city">City initial −3</button>
        </div>
        <p data-city-hints></p>
        <p data-city-cost></p>
      </form>
      <p>City guesses use the offline city list. A wrong guess gives distance and direction toward the mystery city. Retry values: 10, 7, 4, 1; hints are deducted separately. Unknown names and repeated guesses cost nothing.</p>
      <div class="window-tool-actions"><button data-city-save type="button" hidden>Save score</button></div>
      <p data-city-feedback role="status" aria-live="polite"></p>
      <p data-city-saved></p>
    </section>`;
  const el = (selector) => content.querySelector(selector);
  const start = el('[data-city-start]');
  const form = el('form');
  const city = el('#window-city-answer');
  const country = el('#window-country-answer');
  const guess = el('button[type="submit"]');
  const next = el('[data-city-next]');
  const save = el('[data-city-save]');
  const progress = el('[data-city-progress]');
  const scoreboard = el('[data-city-score]');
  const feedback = el('[data-city-feedback]');
  const difficulty = el('#window-difficulty');
  const hintButtons = [...content.querySelectorAll('[data-hint]')];
  const skip = el('[data-answer-skip]');
  let wrongAttempts = 0;
  let attemptedCities = new Set();
  let countryBank = 0;
  let countryValue = 15;
  const countryPointsLabel = el('[data-country-points]');
  function trackZoom() {
    if (phase !== 'country') return;
    const remaining = retainCountryPoints(countryValue, viewer.camera.positionCartographic.height);
    if (remaining === countryValue) return;
    countryValue = remaining;
    countryPointsLabel.textContent = countryValue + ' points · zoom cost applied';
  }
  let costs = 0;
  let hints = new Set();
  let saved = savedScore(difficulty.value);
  difficulty.addEventListener('change', () => {
    saved = savedScore(difficulty.value);
    savedLabel();
  });

  const savedLabel = () => {
    el('[data-city-saved]').textContent = saved
      ? 'Last saved: ' + saved.last + ' · Best: ' + saved.best
      : '';
  };
  savedLabel();

  let roundDifficulty = 'easy';
  let deck = [];
  let index = 0;
  let total = 0;
  let phase = 'ready';
  let flight = 0;
  let active = true;
  const hideClues = (hide) =>
    document.body.classList.toggle('window-city-guessing', hide);

  function arrival(token) {
    if (!active || token !== flight || phase !== 'flying') return;
    phase = 'country';
    trackZoom();
    city.disabled = country.disabled = guess.disabled = false;
    hintButtons.forEach((button) => {
      button.disabled = button.dataset.hint !== 'country';
    });
    feedback.textContent = 'Stage 1 of 2: lock in your country before exploring further.';
    country.focus();
    skip.disabled = false;
  }

  function showCity() {
    phase = 'flying';
    const token = ++flight;
    hideClues(true);
    form.hidden = false;
    form.reset();
    costs = 0;
    countryBank = 0;
    wrongAttempts = 0;
    attemptedCities = new Set();
    el('[data-city-points]').textContent = '10 points · 4 attempts';
    el('[data-city-stage]').hidden = true;
    el('[data-country-stage]').hidden = false;
    skip.hidden = false;
    skip.disabled = true;
    skip.textContent = 'Skip country';
    guess.textContent = 'Lock in country';
    countryValue = 15;
    countryPointsLabel.textContent = '15 points';
    hints = new Set();
    el('[data-city-hints]').textContent = '';
    el('[data-city-cost]').textContent = 'Hints used: 0 points';
    hintButtons.forEach((button) => {
      button.disabled = true;
    });
    city.disabled = country.disabled = guess.disabled = true;
    next.hidden = true;
    guess.hidden = false;
    feedback.textContent = 'Flying to the mystery city…';
    progress.textContent = 'City ' + (index + 1) + ' of ' + deck.length;
    flyToPoint(viewer, cityView(deck[index], difficulty.value), {
      orientation: {
        heading: (DIFFICULTIES[difficulty.value].heading * Math.PI) / 180,
        pitch: -Math.PI / 2,
        roll: 0,
      },
      complete: () => arrival(token),
      cancel: () => {
        if (!active || token !== flight || phase !== 'flying') return;
        phase = 'retry';
        next.hidden = false;
        next.textContent = 'Return to city';
        feedback.textContent =
          'The flight was interrupted. Return to the city to continue.';
      },
    });
  }

  function begin() {
    roundDifficulty = difficulty.value;
    difficulty.disabled = true;
    deck = dealCities();
    index = 0;
    total = 0;
    scoreboard.textContent = '0 / ' + MAX_SCORE;
    start.hidden = true;
    save.hidden = true;
    save.disabled = false;
    showCity();
  }

  hintButtons.forEach((button) =>
    button.addEventListener('click', () => {
      const kind = button.dataset.hint;
      if (phase !== kind || hints.has(kind)) return;
      hints.add(kind);
      costs += kind === 'country' ? 2 : 3;
      button.disabled = true;
      const place = deck[index];
      el('[data-city-hints]').textContent = [...hints]
        .map((hint) =>
          hint === 'country'
            ? 'Country starts with ' + place.country[0]
            : 'City starts with ' + place.city[0],
        )
        .join(' · ');
      el('[data-city-cost]').textContent = 'Hints used: ' + costs + ' points';
    }),
  );
  start.addEventListener('click', begin);
  function submitAnswer(skipped = false) {
    if (phase !== 'country' && phase !== 'city') return;
    const input = phase === 'country' ? country : city;
    if (!skipped && !input.value.trim()) {
      feedback.textContent = 'Enter an answer or choose Skip.';
      input.focus();
      return;
    }
    const place = deck[index];
    if (phase === 'country') {
      trackZoom();
      const result = scoreCity(place, '', skipped ? '' : country.value, countryValue);
      countryBank = hintScore(result.countryPoints, costs);
      total += countryBank;
      scoreboard.textContent = total + ' / ' + MAX_SCORE;
      country.disabled = true;
      countryPointsLabel.textContent = countryBank + ' points banked';
      el('[data-country-stage]').hidden = true;
      el('[data-city-stage]').hidden = false;
      phase = 'city';
      costs = 0;
      el('[data-city-cost]').textContent = 'City hints used: 0 points';
      guess.textContent = 'Lock in city';
      skip.textContent = 'Skip city';
      hintButtons.forEach((button) => { button.disabled = button.dataset.hint !== 'city'; });
      feedback.textContent = 'Country locked · ' + countryBank + ' points banked. Now identify the city. Further zooming cannot reduce your banked points.';
      city.focus();
      return;
    }
    const result = scoreCity(place, skipped ? '' : city.value, '', 0);
    if (!skipped && !result.cityPoints) {
      const match = cities.find(([name, , , , , aliases = []]) =>
        [name, ...aliases].some((value) => answerKey(value) === answerKey(city.value)));
      if (!match) {
        feedback.textContent = 'City not in the offline list. Choose a suggested city; no attempt charged.';
        city.focus();
        return;
      }
      if (attemptedCities.has(match[0])) {
        feedback.textContent = 'You already tried ' + match[0] + '. Try another city; no attempt charged.';
        city.focus();
        return;
      }
      attemptedCities.add(match[0]);
      wrongAttempts++;
      const remaining = cityAttemptPoints(wrongAttempts);
      el('[data-city-points]').textContent = remaining + ' points · ' + (4 - wrongAttempts) + ' attempts left';
      if (wrongAttempts < 4) {
        const clue = cityGuessFeedback({lat: match[2], lon: match[3]}, place);
        feedback.textContent = clue.temperature + ' · About ' + Math.max(1, Math.round(clue.km / 10) * 10).toLocaleString() +
          ' km ' + clue.direction + ' from ' + match[0] + '. ' + hintScore(remaining, costs) + ' city points available after hints. Country bank protected.';
        city.select();
        return;
      }
    }
    const cityEarned = result.cityPoints ? hintScore(cityAttemptPoints(wrongAttempts), costs) : 0;
    total += cityEarned;
    hintButtons.forEach((button) => { button.disabled = true; });
    scoreboard.textContent = total + ' / ' + MAX_SCORE;
    city.disabled = country.disabled = true;
    guess.hidden = skip.hidden = true;
    feedback.textContent = place.city + ', ' + place.country +
      ' · Country banked +' + countryBank + ' · City +' + cityEarned +
      ' · Location total ' + (countryBank + cityEarned);
    if (index + 1 === deck.length) {
      phase = 'complete';
      difficulty.disabled = false;
      form.hidden = true;
      progress.textContent = 'Round complete';
      save.hidden = false;
      start.hidden = false;
      start.textContent = 'Play again';
      hideClues(false);
      save.focus();
    } else {
      phase = 'review';
      next.textContent = 'Next city';
      next.hidden = false;
      next.focus();
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitAnswer();
  });
  skip.addEventListener('click', () => submitAnswer(true));
  next.addEventListener('click', () => {
    if (phase === 'review') index++;
    else if (phase !== 'retry') return;
    showCity();
  });
  save.addEventListener('click', () => {
    if (phase !== 'complete' || save.disabled) return;
    const candidate = {
      last: total,
      best: Math.max(total, savedScore(roundDifficulty)?.best ?? 0),
    };
    try {
      localStorage.setItem(
        SCORE_KEY + ':' + roundDifficulty,
        JSON.stringify(candidate),
      );
      difficulty.value = roundDifficulty;
      saved = candidate;
      savedLabel();
      save.disabled = true;
      feedback.textContent = 'Score saved on this browser.';
    } catch {
      feedback.textContent = 'This browser could not save the score.';
    }
  });
  const removeZoomListener = viewer.scene.preRender.addEventListener(trackZoom);
  if (autoStart) begin();
  return () => {
    active = false;
    removeZoomListener();
    if (phase === 'flying') viewer.camera.cancelFlight();
    hideClues(false);
  };
}
