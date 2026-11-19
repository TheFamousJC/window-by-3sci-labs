export function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
export function dailyRandom(day) {
  let state = 2166136261;
  for (const character of 'window-daily-v1:' + day) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
export function expeditionShare({
  day,
  total,
  results,
  difficulty = 'Easy',
  maxScore = 100,
  locationMax = 10,
}) {
  return [
    'Where on Earth? · Daily Expedition',
    day + ' (UTC) · ' + difficulty,
    total + ' / ' + maxScore + ' · ' + results.length + '/10 locations',
    results
      .map((score) =>
        score >= locationMax ? '🟩' : score >= locationMax / 2 ? '🟨' : '⬜',
      )
      .join(''),
    'https://window-by-3sci-labs.onrender.com/',
  ].join('\n');
}
