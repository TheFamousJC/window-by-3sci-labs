export const ROUND_LENGTH = 10;
export const MAX_SCORE = 100;
export const DIFFICULTIES = {
  easy: {
    label: 'Easy',
    zoom: 1,
    shift: 0,
    heading: 0,
    stages: ['country'],
    points: { country: 10 },
  },
  medium: {
    label: 'Medium',
    zoom: 0.65,
    shift: 0.014,
    heading: 40,
    stages: ['country', 'city'],
    points: { country: 2, city: 8 },
  },
  hard: {
    label: 'Hard',
    zoom: 0.4,
    shift: 0,
    heading: 115,
    stages: ['country', 'city', 'landmark'],
    points: { country: 2, city: 3, landmark: 5 },
  },
};
export function easyCountryPoints(zoomOuts) {
  return 10 - 2 * Math.min(4, Math.max(0, zoomOuts));
}
export function answerPoints(difficulty, stage, zoomOuts, hinted = false) {
  const base =
    difficulty === 'easy'
      ? easyCountryPoints(zoomOuts)
      : difficulty === 'medium' && stage === 'city'
        ? Math.max(0, 8 - 2 * Math.min(4, Math.max(0, zoomOuts)))
        : DIFFICULTIES[difficulty].points[stage];
  return Math.max(0, base - (hinted ? 1 : 0));
}
export function answerKey(input) {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}
export function matchesAnswer(value, choices) {
  const key = answerKey(value);
  return Boolean(key) && choices.some((choice) => answerKey(choice) === key);
}
export function cityView(place, difficulty) {
  const rule = DIFFICULTIES[difficulty] || DIFFICULTIES.easy;
  return {
    ...place,
    lat: place.lat + rule.shift,
    lon: place.lon + rule.shift,
    height: place.height * rule.zoom,
  };
}
