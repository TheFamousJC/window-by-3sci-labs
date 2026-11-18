import test from 'node:test';
import assert from 'node:assert/strict';
import { countryZoomScore, retainCountryPoints } from './countryZoomScore.js';
test('country points decrease at documented zoom boundaries', () => {
  for (const [height, expected] of [[3200,15],[19999,15],[20000,12],[199999,12],[200000,8],[1999999,8],[2000000,3],[20000000,3]]) {
    assert.equal(countryZoomScore(height), expected);
  }
});
test('zooming in never recovers points and a new city starts at full value', () => {
  let points = 15;
  for (const height of [3000,20000,5000,200000,3000,2000000,3000]) points = retainCountryPoints(points,height);
  assert.equal(points,3);
  assert.equal(retainCountryPoints(15,3000),15);
});
