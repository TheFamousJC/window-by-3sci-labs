export function cityAttemptPoints(wrongAttempts) {
  return Math.max(0, 10 - Math.max(0, wrongAttempts) * 3);
}
export function cityGuessFeedback(from, target) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const lat1 = radians(from.lat), lat2 = radians(target.lat);
  const deltaLat = lat2 - lat1, deltaLon = radians(target.lon - from.lon);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const km = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  const bearing = (Math.atan2(Math.sin(deltaLon) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)) * 180 / Math.PI + 360) % 360;
  const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];
  const temperature = km < 100 ? 'Hot' : km < 500 ? 'Warm' : km < 2000 ? 'Cool' : 'Cold';
  return { km, direction, temperature };
}
