import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIFFICULTIES,
  answerPoints,
  easyCountryPoints,
  matchesAnswer,
} from './gameRules.js';
import { places, dealCities } from './gamePlaces.js';
import { dailyRandom } from './dailyExpedition.js';
test('level stages and totals match the requested rules', () => {
  assert.deepEqual(DIFFICULTIES.easy.stages, ['country']);
  assert.deepEqual(DIFFICULTIES.medium.points, { country: 2, city: 8 });
  assert.deepEqual(DIFFICULTIES.hard.points, {
    country: 2,
    city: 3,
    landmark: 5,
  });
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map(easyCountryPoints),
    [10, 8, 6, 4, 2, 2],
  );
  for (const difficulty of ['hard'])
    for (const stage of DIFFICULTIES[difficulty].stages)
      assert.equal(
        answerPoints(difficulty, stage, 0),
        answerPoints(difficulty, stage, 4),
      );
});
test('Medium keeps country points and applies the four city deductions', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((z) => answerPoints('medium', 'city', z)),
    [8, 6, 4, 2, 0],
  );
  assert.equal(answerPoints('medium', 'country', 4), 2);
  assert.equal(answerPoints('medium', 'city', 4, true), 0);
});

test('every location has landmark answers and daily deals contain ten unique places', () => {
  assert.ok(
    places.every((p) => p.landmark && Array.isArray(p.landmarkAliases)),
  );
  const a = dealCities(dailyRandom('2026-11-19')),
    b = dealCities(dailyRandom('2026-11-19'));
  assert.equal(new Set(a.map((p) => p.city)).size, 10);
  assert.deepEqual(a, b);
  assert.ok(matchesAnswer('  Tour Eiffel ', ['Eiffel Tower', 'Tour Eiffel']));
  assert.ok(matchesAnswer('Praca do Comercio', ['Praça do Comércio']));
});
