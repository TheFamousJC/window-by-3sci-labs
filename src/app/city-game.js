import { flyToPoint } from './exploreGeometry.js';

export const ROUND_LENGTH = 10;
const MAX_SCORE = ROUND_LENGTH * 15;
const SCORE_KEY = 'window-city-game-score-v1';

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

function answerKey(input) {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function scoreCity(place, city, country) {
  const matches = (value, choices) => {
    const key = answerKey(value);
    return Boolean(key) && choices.some((choice) => answerKey(choice) === key);
  };
  const cityPoints = matches(city, [place.city, ...place.cityAliases]) ? 10 : 0;
  const countryPoints = matches(country, [
    place.country,
    ...place.countryAliases,
  ])
    ? 5
    : 0;
  return { cityPoints, countryPoints, points: cityPoints + countryPoints };
}

function savedScore() {
  try {
    const value = JSON.parse(localStorage.getItem(SCORE_KEY) || 'null');
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
      <p data-city-rules>Name the city for 10 points and the country for 5.</p>
      <div data-city-score class="window-game-score">0 / ${MAX_SCORE}</div>
      <button type="button" data-city-start>Start round</button>
      <form data-city-round hidden>
        <label for="window-city-answer">City <span>10 points</span></label>
        <input id="window-city-answer" data-city-answer type="text" maxlength="70" autocomplete="off" spellcheck="false">
        <label for="window-country-answer">Country <span>5 points</span></label>
        <input id="window-country-answer" type="text" maxlength="70" autocomplete="off" spellcheck="false">
        <div class="window-tool-actions"><button type="submit">Guess</button><button data-city-next type="button" hidden>Next city</button></div>
      </form>
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
  let saved = savedScore();
  const savedLabel = () => {
    el('[data-city-saved]').textContent = saved
      ? 'Last saved: ' + saved.last + ' · Best: ' + saved.best
      : '';
  };
  savedLabel();

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
    phase = 'guess';
    city.disabled = country.disabled = guess.disabled = false;
    feedback.textContent = 'Enter the city, the country, or both.';
    city.focus();
  }

  function showCity() {
    phase = 'flying';
    const token = ++flight;
    hideClues(true);
    form.hidden = false;
    form.reset();
    city.disabled = country.disabled = guess.disabled = true;
    next.hidden = true;
    guess.hidden = false;
    feedback.textContent = 'Flying to the mystery city…';
    progress.textContent = 'City ' + (index + 1) + ' of ' + deck.length;
    flyToPoint(viewer, deck[index], {
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
    deck = dealCities();
    index = 0;
    total = 0;
    scoreboard.textContent = '0 / ' + MAX_SCORE;
    start.hidden = true;
    save.hidden = true;
    save.disabled = false;
    showCity();
  }

  start.addEventListener('click', begin);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (phase !== 'guess') return;
    if (!city.value.trim() && !country.value.trim()) {
      feedback.textContent = 'Enter at least one answer.';
      city.focus();
      return;
    }
    const place = deck[index];
    const result = scoreCity(place, city.value, country.value);
    total += result.points;
    scoreboard.textContent = total + ' / ' + MAX_SCORE;
    city.disabled = country.disabled = true;
    guess.hidden = true;
    feedback.textContent =
      place.city +
      ', ' +
      place.country +
      ' · City +' +
      result.cityPoints +
      ' · Country +' +
      result.countryPoints;
    if (index + 1 === deck.length) {
      phase = 'complete';
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
  });
  next.addEventListener('click', () => {
    if (phase === 'review') index++;
    else if (phase !== 'retry') return;
    showCity();
  });
  save.addEventListener('click', () => {
    if (phase !== 'complete' || save.disabled) return;
    const candidate = { last: total, best: Math.max(total, saved?.best ?? 0) };
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify(candidate));
      saved = candidate;
      savedLabel();
      save.disabled = true;
      feedback.textContent = 'Score saved on this browser.';
    } catch {
      feedback.textContent = 'This browser could not save the score.';
    }
  });
  if (autoStart) begin();
  return () => {
    active = false;
    if (phase === 'flying') viewer.camera.cancelFlight();
    hideClues(false);
  };
}
