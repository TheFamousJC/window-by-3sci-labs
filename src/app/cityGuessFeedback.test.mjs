import test from 'node:test';
import assert from 'node:assert/strict';
import { cityGuessFeedback } from './cityGuessFeedback.js';
test('distance and direction point from the guessed city toward the target', () => {
  const east = cityGuessFeedback({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
  assert.ok(Math.abs(east.km - 111.195) < 0.1);
  assert.equal(east.direction, 'E');
  assert.equal(east.temperature, 'Warm');
  assert.equal(
    cityGuessFeedback({ lat: 0, lon: 1 }, { lat: 0, lon: 0 }).direction,
    'W',
  );
});
test('shortest direction across the date line and temperature bands', () => {
  const clue = cityGuessFeedback({ lat: 0, lon: 179 }, { lat: 0, lon: -179 });
  assert.ok(clue.km < 223);
  assert.equal(clue.direction, 'E');
  assert.equal(
    cityGuessFeedback({ lat: 0, lon: 0 }, { lat: 0.1, lon: 0 }).temperature,
    'Hot',
  );
  assert.equal(
    cityGuessFeedback({ lat: 0, lon: 0 }, { lat: 10, lon: 0 }).temperature,
    'Cool',
  );
  assert.equal(
    cityGuessFeedback({ lat: 0, lon: 0 }, { lat: 50, lon: 0 }).temperature,
    'Cold',
  );
});
