import test from 'node:test';
import assert from 'node:assert/strict';
import { utcDay, dailyRandom, expeditionShare } from './dailyExpedition.js';
const sequence = (day) => {
  const random = dailyRandom(day);
  return Array.from({ length: 16 }, () => random());
};
test('daily randomness is repeatable, distinct by date, and bounded', () => {
  assert.deepEqual(sequence('2026-11-18'), sequence('2026-11-18'));
  assert.notDeepEqual(sequence('2026-11-18'), sequence('2026-11-19'));
  assert.ok(sequence('2026-11-18').every((n) => n >= 0 && n < 1));
});
test('day boundaries use UTC regardless of the local offset', () => {
  assert.equal(utcDay(new Date('2026-11-19T01:00:00+03:00')), '2026-11-18');
  assert.equal(utcDay(new Date('2026-11-19T00:00:00Z')), '2026-11-19');
});
test('share text has date, score, ten spoiler-free tiles, and a clean link', () => {
  const text = expeditionShare({
    day: '2026-11-18',
    total: 80,
    results: Array(10).fill(6),
  });
  assert.ok(text.includes('80 / 100'));
  assert.ok(text.includes('2026-11-18 (UTC)'));
  assert.equal((text.match(/🟨/gu) || []).length, 10);
  assert.ok(text.endsWith('https://window-by-3sci-labs.onrender.com/'));
  assert.ok(!text.includes('lat=') && !text.includes('Paris'));
});
