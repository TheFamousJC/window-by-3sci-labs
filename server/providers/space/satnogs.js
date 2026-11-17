import { admitSameSiteKeyless } from '../common/same-site.js';
import { readResponseTextCapped } from '../common/http.js';

const URL = 'https://db.satnogs.org/api/tle/';
const TTL = 6 * 3600_000;
const MAX_EPOCH_AGE = 14 * 86400_000;

function recentOrbit(row, now) {
  if (!/^1 [0-9A-Z]{5}/.test(row?.tle1) ||
      !/^2 [0-9A-Z]{5}/.test(row?.tle2) ||
      row.tle1.slice(2, 7) !== row.tle2.slice(2, 7)) return false;
  const epoch = row.tle1.slice(18, 32);
  if (!/^\d{5}\.\d{8}$/.test(epoch)) return false;
  const yy = Number(epoch.slice(0, 2));
  const day = Number(epoch.slice(2));
  if (day < 1 || day >= 367) return false;
  const time = Date.UTC((yy >= 57 ? 1900 : 2000) + yy, 0, 1) +
    (day - 1) * 86400_000;
  return time >= now - MAX_EPOCH_AGE && time <= now + 86400_000;
}

export function installSatnogsEndpoint(middlewares) {
  let cache;
  let pending;
  let retryAt = 0;
  async function refresh() {
    const signal = AbortSignal.timeout(15000);
    const response = await fetch(URL, {
      headers: { 'User-Agent': 'Window/1.0 (+https://github.com/TheFamousJC/window-by-3sci-labs)' },
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('SatNOGS HTTP ' + response.status);
    }
    const rows = JSON.parse(await readResponseTextCapped(response, 4 * 1024 * 1024, signal));
    if (!Array.isArray(rows)) throw new Error('Unexpected SatNOGS payload');
    const now = Date.now();
    const records = new Map();
    for (const row of rows) {
      if (!recentOrbit(row, now)) continue;
      const id = row.tle1.slice(2, 7);
      const previous = records.get(id);
      if (!previous || Date.parse(row.updated) > Date.parse(previous.updated)) records.set(id, row);
    }
    if (!records.size) throw new Error('No recent SatNOGS orbital elements');
    const body = [...records.values()].map(({tle0, tle1, tle2}) =>
      [String(tle0 ?? '').replace(/^0 /, '').replace(/[\r\n]/g, ' ').trim() || 'NORAD ' + tle1.slice(2, 7), tle1, tle2].join('\n')
    ).join('\n') + '\n';
    cache = { at: now, body };
  }

  middlewares.use('/api/satnogs', async (req, res) => {
    if (admitSameSiteKeyless(req, res)) return;
    if (req.method !== 'GET' || (req.url && req.url !== '/')) {
      res.writeHead(404).end();
      return;
    }
    if ((!cache || Date.now() - cache.at >= TTL) && Date.now() >= retryAt) {
      pending ??= refresh().catch((error) => {
        retryAt = Date.now() + 5 * 60_000;
        console.warn('[satnogs]', error.message);
      }).finally(() => { pending = null; });
      await pending;
    }
    const stale = cache && Date.now() - cache.at >= TTL;
    res.writeHead(cache ? 200 : 502, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-TLE-Source': 'SatNOGS',
      'X-TLE-Cache': stale ? 'STALE-ERROR' : cache ? 'HIT' : 'NONE',
    }).end(cache?.body ?? 'SatNOGS catalog unavailable');
  });
}
