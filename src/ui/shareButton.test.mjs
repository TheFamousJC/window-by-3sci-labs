// The share button copies by default; a host's `services.shareLink` shares the
// link its own way and reports how it went.
import test from 'node:test';
import assert from 'node:assert/strict';
import { StyleManager } from './applicationShell.js';
import { ShareLinkManager } from '../sharelink.js';
import { parseSharePath } from '../share/shareLinkPath.js';
import { decodeShareView } from '../share/viewCodec.js';

/** The decoded view of a `/share/<code>` link. */
const sharedState = (href) =>
  decodeShareView(parseSharePath(new URL(href).pathname).code).state;
const SHARE_LINK = /^https:\/\/gev\.example\/share\/[A-Za-z0-9_-]+$/;

function makeManager(href, { positioned = true } = {}) {
  globalThis.window = { location: { href, hash: new URL(href).hash } };
  globalThis.history = { replaceState() {} };
  const viewer = {
    camera: {
      changed: { addEventListener() {} },
      positionCartographic: positioned
        ? { latitude: 0, longitude: 0, height: 1000 }
        : undefined,
      heading: 0,
      pitch: -Math.PI / 2,
      roll: 0,
    },
  };
  return new ShareLinkManager(viewer);
}

function installClipboard(writeText) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText } },
  });
}

/** Wire the real share button handler onto a minimal shell; return a click. */
function shell({ manager, services = {} }) {
  const toasts = [];
  let click;
  const owner = {
    services,
    shareLinkManager: manager,
    _shareBtn: {},
    _disposed: false,
    _lifetime: { listen: (_el, _type, handler) => (click = handler) },
    _showToast: (message) => toasts.push(message),
  };
  StyleManager.prototype._initShareButton.call(owner);
  return { toasts, click: () => click() };
}

test('buildLink is a /share link stamped with its creation time, without ?lang', () => {
  const manager = makeManager('https://gev.example/?lang=ru#v=2&lat=10&lon=20');
  const href = manager.buildLink({ nowMs: 5_000_000 });
  assert.match(href, SHARE_LINK);
  const link = new URL(href);
  assert.equal(link.searchParams.get('lang'), null);
  assert.equal(link.hash, '');
  assert.equal(sharedState(href).sharedAtMs, 5_000_000);
  // The camera is the live one, not the address bar's.
  assert.equal(sharedState(href).lat, 0);
  assert.equal(
    makeManager('https://gev.example/', { positioned: false }).buildLink(),
    null,
  );
});

test('copyLink copies exactly what buildLink builds', async () => {
  let copied = null;
  installClipboard(async (url) => {
    copied = url;
  });
  const manager = makeManager('https://gev.example/#v=2');
  assert.equal(await manager.copyLink({ nowMs: 7_000_000 }), true);
  assert.equal(copied, manager.buildLink({ nowMs: 7_000_000 }));
});

test('without a host hook the button copies the link', async () => {
  let copied = null;
  installClipboard(async (url) => {
    copied = url;
  });
  const { toasts, click } = shell({
    manager: makeManager('https://gev.example/#v=2'),
  });
  await click();
  assert.match(copied, SHARE_LINK);
  assert.deepEqual(toasts, ['Link copied!']);

  installClipboard(async () => {
    throw new Error('denied');
  });
  await click();
  assert.deepEqual(toasts, ['Link copied!', 'Copy failed']);
});

test('a host hook receives the link and its result picks the toast', async () => {
  installClipboard(async () => assert.fail('the host shares instead'));
  const shared = [];
  const results = ['shared', 'copied', 'cancelled', false];
  const { toasts, click } = shell({
    manager: makeManager('https://gev.example/#v=2'),
    services: {
      shareLink: async (url) => {
        shared.push(url);
        return results.shift();
      },
    },
  });
  for (let i = 0; i < 4; i++) await click();
  assert.equal(shared.length, 4);
  assert.match(shared[0], SHARE_LINK);
  // 'cancelled' (the user closed the sheet) shows nothing.
  assert.deepEqual(toasts, ['Link shared', 'Link copied!', 'Copy failed']);
});

test('a failing host hook, or no camera position, reports a failure', async () => {
  const failing = shell({
    manager: makeManager('https://gev.example/#v=2'),
    services: { shareLink: async () => Promise.reject(new Error('no sheet')) },
  });
  await failing.click();
  assert.deepEqual(failing.toasts, ['Copy failed']);

  let called = false;
  const unpositioned = shell({
    manager: makeManager('https://gev.example/', { positioned: false }),
    services: {
      shareLink: async () => {
        called = true;
        return 'shared';
      },
    },
  });
  await unpositioned.click();
  assert.equal(called, false);
  assert.deepEqual(unpositioned.toasts, ['Copy failed']);
});

test('a host hook that answers without a promise, or throws, still gets a toast', async () => {
  for (const [shareLink, toast] of [
    [() => 'shared', 'Link shared'],
    [
      () => {
        throw new Error('no sheet');
      },
      'Copy failed',
    ],
  ]) {
    const { toasts, click } = shell({
      manager: makeManager('https://gev.example/#v=2'),
      services: { shareLink },
    });
    await click();
    assert.deepEqual(toasts, [toast]);
  }
});

test('clean address keeps defaults internal and only Share serializes the current view', (t) => {
  const prior = { window: globalThis.window, history: globalThis.history };
  t.after(() => Object.assign(globalThis, prior));
  const location = new URL('https://gev.example/?lang=en');
  globalThis.window = { location };
  let writes = 0;
  globalThis.history = {
    replaceState(_a, _b, href) {
      writes++;
      location.href = href;
    },
  };
  let changed;
  const viewer = {
    camera: {
      changed: {
        addEventListener(fn) {
          changed = fn;
          return () => {};
        },
      },
      positionCartographic: { latitude: 0, longitude: 0, height: 600 },
      heading: 0,
      pitch: -1,
      roll: 0,
    },
  };
  const manager = new ShareLinkManager(viewer, {
    cleanAddressBar: true,
    initialShareHash:
      'v=2&lat=30.2672&lon=-97.7431&alt=600&map=esri-imagery&l=f',
  });
  const state = manager.parseInitialHash();
  assert.equal(state.lat, 30.2672);
  assert.equal(state.mapStack, 'esri-imagery');
  manager.completeInitialRestore(state.restoreToken);
  changed();
  manager.onStyleChange('surveillance');
  assert.equal(location.href, 'https://gev.example/?lang=en');
  assert.equal(writes, 0);
  const link = manager.buildLink({ nowMs: 7000000 });
  assert.match(link, SHARE_LINK);
  assert.equal(sharedState(link).style, 'surveillance');
  assert.equal(location.href, 'https://gev.example/?lang=en');
  location.href = link;
  const incoming = new ShareLinkManager(viewer, { cleanAddressBar: true });
  assert.ok(incoming.parseInitialHash());
  assert.equal(location.href, 'https://gev.example/');
  manager.destroy();
  incoming.destroy();
});
test('clean address accepts an old detailed hash before removing it', (t) => {
  const prior = { window: globalThis.window, history: globalThis.history };
  t.after(() => Object.assign(globalThis, prior));
  const location = new URL(
    'https://gev.example/#v=2&lat=48.8584&lon=2.2945&alt=1000',
  );
  globalThis.window = { location };
  globalThis.history = {
    replaceState(_a, _b, url) {
      location.href = url;
    },
  };
  const manager = new ShareLinkManager(
    {
      camera: {
        changed: {
          addEventListener() {
            return () => {};
          },
        },
      },
    },
    { cleanAddressBar: true },
  );
  assert.equal(manager.parseInitialHash().lat, 48.8584);
  assert.equal(location.href, 'https://gev.example/');
  manager.destroy();
});
