export function countryZoomScore(height) {
  if (!Number.isFinite(height) || height < 0) return 15;
  if (height >= 2_000_000) return 3;
  if (height >= 200_000) return 8;
  if (height >= 20_000) return 12;
  return 15;
}
export function retainCountryPoints(previous, height) {
  return Math.min(previous, countryZoomScore(height));
}
