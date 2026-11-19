import test from 'node:test';
import assert from 'node:assert/strict';
import { createEsriTileImagery } from './imagery.js';
test('metadata-free satellite backup uses World Imagery and retains attribution', () => {
  const provider = createEsriTileImagery();
  assert.ok(provider.url.includes('World_Imagery/MapServer/tile/{z}/{y}/{x}'));
  assert.equal(provider.maximumLevel, 19);
  assert.ok(provider.credit.html.includes('Esri'));
});
