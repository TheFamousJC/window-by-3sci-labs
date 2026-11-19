import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartographic } from 'cesium';
import { mountCityGame } from './city-game.js';
import { places } from './gamePlaces.js';
import { cityView } from './gameRules.js';
function fixture(t) {
  const oldDoc = globalThis.document,
    oldStorage = globalThis.localStorage,
    oldNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  class Element extends EventTarget {
    value = '';
    textContent = '';
    hidden = false;
    disabled = false;
    dataset = {};
    attrs = new Map();
    focus() {}
    select() {}
    setAttribute(k, v) {
      this.attrs.set(k, v);
    }
    removeAttribute(k) {
      this.attrs.delete(k);
    }
  }
  const nodes = new Map();
  const el = (key) => {
    if (!nodes.has(key)) nodes.set(key, new Element());
    return nodes.get(key);
  };
  el('#window-game-mode').value = 'practice';
  el('#window-difficulty').value = 'easy';
  const content = { innerHTML: '', querySelector: el };
  let copied = '';
  const storage = new Map();
  globalThis.document = {
    body: { classList: { toggle() {} } },
    getElementById: (id) => el('#' + id),
  };
  globalThis.localStorage = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (text) => {
          copied = text;
        },
      },
    },
  });
  let location;
  const controller = { enableZoom: true };
  const viewer = {
    camera: {
      positionCartographic: { latitude: 0, longitude: 0, height: 3000 },
      cancelFlight() {},
      flyTo(options) {
        location = Cartographic.fromCartesian(options.destination);
        viewer.camera.positionCartographic = location;
        options.complete?.();
      },
    },
    scene: { screenSpaceCameraController: controller },
  };
  const dispose = mountCityGame(content, viewer);
  t.after(() => {
    dispose();
    globalThis.document = oldDoc;
    globalThis.localStorage = oldStorage;
    if (oldNav) Object.defineProperty(globalThis, 'navigator', oldNav);
    else delete globalThis.navigator;
  });
  const click = (key) => {
    if (!el(key).disabled) el(key).dispatchEvent(new Event('click'));
  };
  const change = (key, value) => {
    el(key).value = value;
    el(key).dispatchEvent(new Event('change'));
  };
  const submit = (value) => {
    el('#window-game-answer').value = value;
    el('form').dispatchEvent(new Event('submit', { cancelable: true }));
  };
  const target = (difficulty) =>
    places.find((place) => {
      const view = cityView(place, difficulty);
      return (
        Math.abs(view.lat - (location.latitude * 180) / Math.PI) < 0.001 &&
        Math.abs(view.lon - (location.longitude * 180) / Math.PI) < 0.001
      );
    });
  return {
    el,
    click,
    change,
    submit,
    target,
    storage,
    controller,
    dispose,
    get copied() {
      return copied;
    },
  };
}
test('Easy asks country only and four zoom levels cost exactly 10,8,6,4,2 without refunds', (t) => {
  const f = fixture(t);
  f.click('[data-city-start]');
  const place = f.target('easy');
  assert.equal(f.controller.enableZoom, false);
  assert.equal(f.el('#reset-globe-view').disabled, true);
  for (const value of [8, 6, 4, 2]) {
    f.click('[data-zoom-out]');
    assert.ok(
      f.el('[data-answer-label]').textContent.includes(value + ' points'),
    );
  }
  assert.equal(f.el('[data-zoom-out]').disabled, true);
  f.click('[data-zoom-in]');
  assert.ok(f.el('[data-answer-label]').textContent.includes('2 points'));
  f.submit(place.country);
  assert.equal(f.el('[data-city-score]').textContent, '2 / 100');
  assert.equal(f.el('[data-city-next]').hidden, false);
  f.click('[data-city-next]');
  assert.ok(f.el('[data-answer-label]').textContent.includes('10 points'));
  f.dispose();
  assert.equal(f.controller.enableZoom, true);
  assert.equal(f.el('#reset-globe-view').disabled, false);
});
test('Medium banks country 2 and applies zoom deductions without retry deductions', (t) => {
  const f = fixture(t);
  f.change('#window-difficulty', 'medium');
  f.click('[data-city-start]');
  const place = f.target('medium');
  for (let i = 0; i < 4; i++) f.click('[data-zoom-out]');
  f.submit(place.country);
  assert.equal(f.el('[data-city-score]').textContent, '2 / 100');
  const wrong = places.find((p) => p.city !== place.city);
  f.submit(wrong.city);
  assert.ok(f.el('[data-city-feedback]').textContent.includes('km'));
  f.submit(wrong.city);
  assert.ok(f.el('[data-city-feedback]').textContent.includes('Already tried'));
  f.submit('Unknownville');
  assert.ok(f.el('[data-city-feedback]').textContent.includes('offline list'));
  f.submit(place.city);
  assert.equal(f.el('[data-city-score]').textContent, '2 / 100');
});
test('Hard completes all ten daily country/city/landmark stages, saves and shares 100 points', async (t) => {
  const f = fixture(t);
  f.change('#window-game-mode', 'daily');
  f.change('#window-difficulty', 'hard');
  f.click('[data-city-start]');
  for (let i = 0; i < 10; i++) {
    const place = f.target('hard');
    assert.ok(place);
    f.submit(place.country);
    f.submit(place.city);
    assert.ok(f.el('[data-answer-label]').textContent.includes('Landmark · 5'));
    f.submit(place.landmark);
    if (i < 9) f.click('[data-city-next]');
  }
  assert.equal(f.el('[data-city-score]').textContent, '100 / 100');
  assert.equal(f.el('[data-city-progress]').textContent, 'Round complete');
  assert.equal(f.controller.enableZoom, true);
  f.click('[data-city-save]');
  const [key, value] = [...f.storage][0];
  assert.ok(key.includes(':daily:') && key.endsWith(':hard'));
  assert.deepEqual(JSON.parse(value), { last: 100, best: 100 });
  f.click('[data-daily-share]');
  await Promise.resolve();
  assert.ok(f.copied.includes('100 / 100') && f.copied.includes('Hard'));
});
test('settings are applied only on restart, hints affect one answer and Skip permits every stage', (t) => {
  const f = fixture(t);
  f.change('#window-difficulty', 'hard');
  f.click('[data-city-start]');
  let place = f.target('hard');
  f.change('#window-difficulty', 'easy');
  f.submit(place.country);
  f.submit(place.city);
  assert.ok(f.el('[data-answer-label]').textContent.includes('Landmark'));
  f.click('[data-answer-hint]');
  f.submit(place.landmark);
  assert.equal(f.el('[data-city-score]').textContent, '9 / 100');
  f.click('[data-city-start]');
  place = f.target('easy');
  assert.ok(place);
  assert.equal(f.el('[data-city-score]').textContent, '0 / 100');
  f.click('[data-answer-skip]');
  assert.equal(f.el('[data-city-next]').hidden, false);
});
test('four wrong landmark guesses end a Hard location without losing banked country/city points', (t) => {
  const f = fixture(t);
  f.change('#window-difficulty', 'hard');
  f.click('[data-city-start]');
  const place = f.target('hard');
  f.submit(place.country);
  f.submit(place.city);
  for (const value of ['Wrong one', 'Wrong two', 'Wrong three', 'Wrong four'])
    f.submit(value);
  assert.equal(f.el('[data-city-score]').textContent, '5 / 100');
  assert.equal(f.el('[data-city-next]').hidden, false);
});

test('wrong countries reveal the correct country on every difficulty before proceeding', (t) => {
  const f = fixture(t);
  for (const difficulty of ['easy', 'medium', 'hard']) {
    f.change('#window-difficulty', difficulty);
    f.click('[data-city-start]');
    const place = f.target(difficulty);
    f.submit('Definitely not a country');
    assert.ok(
      f
        .el('[data-answer-review]')
        .textContent.includes('Incorrect — Correct country: ' + place.country),
    );
    assert.equal(f.el('[data-city-score]').textContent, '0 / 100');
    if (difficulty === 'easy') {
      assert.ok(
        f
          .el('[data-city-feedback]')
          .textContent.includes('Correct answers — Country: ' + place.country),
      );
      assert.equal(f.el('[data-city-next]').hidden, false);
      f.click('[data-city-next]');
      assert.equal(f.el('[data-answer-review]').hidden, true);
    } else {
      assert.ok(
        f
          .el('[data-city-feedback]')
          .textContent.includes('Incorrect. Correct country: ' + place.country),
      );
      assert.ok(f.el('[data-answer-label]').textContent.includes('City'));
    }
  }
});
test('exhausted city and landmark attempts reveal answers and preserve the per-location review', (t) => {
  const f = fixture(t);
  f.change('#window-difficulty', 'hard');
  f.click('[data-city-start]');
  const place = f.target('hard');
  f.submit(place.country);
  for (const wrong of places.filter((p) => p.city !== place.city).slice(0, 4))
    f.submit(wrong.city);
  assert.ok(
    f
      .el('[data-answer-review]')
      .textContent.includes('Incorrect — Correct city: ' + place.city),
  );
  assert.ok(
    f
      .el('[data-city-feedback]')
      .textContent.includes('Correct city: ' + place.city),
  );
  for (const wrong of [
    'Wrong landmark one',
    'Wrong landmark two',
    'Wrong landmark three',
    'Wrong landmark four',
  ])
    f.submit(wrong);
  assert.ok(
    f
      .el('[data-answer-review]')
      .textContent.includes('Incorrect — Correct landmark: ' + place.landmark),
  );
  assert.ok(
    f
      .el('[data-city-feedback]')
      .textContent.includes('Landmark: ' + place.landmark),
  );
  assert.equal(f.el('[data-city-score]').textContent, '2 / 100');
});
test('skipping an answer also reveals the correct answer', (t) => {
  const f = fixture(t);
  f.click('[data-city-start]');
  const place = f.target('easy');
  f.click('[data-answer-skip]');
  assert.ok(
    f
      .el('[data-answer-review]')
      .textContent.includes('Skipped — Correct country: ' + place.country),
  );
});

test('Easy can zoom closer immediately, return and then use its four outward levels', (t) => {
  const f = fixture(t);
  f.click('[data-city-start]');
  assert.equal(f.el('[data-zoom-in]').disabled, false);
  f.click('[data-zoom-in]');
  f.click('[data-zoom-in]');
  assert.equal(f.el('[data-zoom-in]').disabled, true);
  assert.ok(f.el('[data-answer-label]').textContent.includes('10 points'));
  for (let i = 0; i < 2; i++) f.click('[data-zoom-out]');
  assert.ok(f.el('[data-answer-label]').textContent.includes('10 points'));
  f.click('[data-zoom-out]');
  assert.ok(f.el('[data-answer-label]').textContent.includes('8 points'));
});
test('Medium offers 10,8,6,4,2 total points and never refunds zoom deductions', (t) => {
  const f = fixture(t);
  f.change('#window-difficulty', 'medium');
  f.click('[data-city-start]');
  const place = f.target('medium');
  f.submit(place.country);
  for (const cityPoints of [6, 4, 2, 0]) {
    f.click('[data-zoom-out]');
    assert.ok(
      f.el('[data-answer-label]').textContent.includes(cityPoints + ' points'),
    );
  }
  f.click('[data-zoom-in]');
  assert.ok(f.el('[data-answer-label]').textContent.includes('0 points'));
  f.submit(place.city);
  assert.equal(f.el('[data-city-score]').textContent, '2 / 100');
});
