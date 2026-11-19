const rows = [
  ['Paris', 'France', 48.8584, 2.2945, 3200],
  [
    'London',
    'United Kingdom',
    51.5007,
    -0.1246,
    3700,
    [],
    ['UK', 'Great Britain', 'Britain'],
  ],
  ['Rome', 'Italy', 41.8902, 12.4922, 3000, ['Roma']],
  ['Athens', 'Greece', 37.9715, 23.7267, 3200, ['Athina']],
  ['Barcelona', 'Spain', 41.4036, 2.1744, 3900, [], ['España']],
  [
    'New York',
    'United States',
    40.758,
    -73.9855,
    5700,
    ['New York City', 'NYC'],
    ['USA', 'US', 'United States of America'],
  ],
  [
    'San Francisco',
    'United States',
    37.8078,
    -122.4691,
    5800,
    ['SF'],
    ['USA', 'US', 'United States of America'],
  ],
  ['Sydney', 'Australia', -33.857, 151.2153, 4000],
  ['Tokyo', 'Japan', 35.6586, 139.7454, 4300],
  [
    'Singapore',
    'Singapore',
    1.283,
    103.8607,
    4000,
    [],
    ['Republic of Singapore'],
  ],
  ['Cape Town', 'South Africa', -33.944, 18.419, 6100, ['Kaapstad']],
  ['Rio de Janeiro', 'Brazil', -22.952, -43.205, 6500, ['Rio'], ['Brasil']],
  ['Lisbon', 'Portugal', 38.7077, -9.1365, 3900, ['Lisboa']],
  ['Istanbul', 'Türkiye', 41.0086, 28.9802, 4000, ['İstanbul'], ['Turkey']],
  [
    'Amsterdam',
    'Netherlands',
    52.371,
    4.893,
    3500,
    [],
    ['The Netherlands', 'Nederland'],
  ],
  ['Prague', 'Czechia', 50.0865, 14.4114, 3500, ['Praha'], ['Czech Republic']],
];
const landmarks = {
  Paris: ['Eiffel Tower', ['Tour Eiffel']],
  London: ['Big Ben', ['Elizabeth Tower', 'Palace of Westminster']],
  Rome: ['Colosseum', ['Coliseum']],
  Athens: ['Acropolis', ['Acropolis of Athens', 'Parthenon']],
  Barcelona: [
    'Sagrada Familia',
    ['La Sagrada Familia', 'Basilica de la Sagrada Familia'],
  ],
  'New York': ['Times Square', []],
  'San Francisco': ['Golden Gate Bridge', []],
  Sydney: ['Sydney Opera House', ['Opera House']],
  Tokyo: ['Tokyo Tower', []],
  Singapore: ['Marina Bay Sands', []],
  'Cape Town': ['Table Mountain', []],
  'Rio de Janeiro': ['Christ the Redeemer', ['Cristo Redentor']],
  Lisbon: [
    'Praca do Comercio',
    ['Praça do Comércio', 'Commerce Square', 'Terreiro do Paco'],
  ],
  Istanbul: ['Hagia Sophia', ['Ayasofya']],
  Amsterdam: ['Dam Square', ['De Dam']],
  Prague: ['Charles Bridge', ['Karluv most', 'Karlův most']],
};
const corrections = {
  'San Francisco': [37.8199, -122.4783],
  'Cape Town': [-33.9628, 18.4098],
  'Rio de Janeiro': [-22.9519, -43.2105],
  Amsterdam: [52.3731, 4.8922],
};
export const places = rows.map(
  ([
    city,
    country,
    lat,
    lon,
    height,
    cityAliases = [],
    countryAliases = [],
  ]) => {
    [lat, lon] = corrections[city] || [lat, lon];
    const [landmark, landmarkAliases] = landmarks[city];
    return {
      city,
      country,
      lat,
      lon,
      height,
      cityAliases,
      countryAliases,
      landmark,
      landmarkAliases,
    };
  },
);
export function dealCities(random = Math.random) {
  const deck = places.map((place) => ({ ...place }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 10);
}
