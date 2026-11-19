import { DIFFICULTIES, MAX_SCORE, easyCountryPoints } from './gameRules.js';

export const scoreSummary = (difficulty) => {
  const rule = DIFFICULTIES[difficulty];
  return rule.stages
    .map(
      (stage) =>
        stage[0].toUpperCase() + stage.slice(1) + ' ' + rule.points[stage],
    )
    .join(' + ');
};
export const helpInstructions = `
  <h3>Start a round</h3>
  <ol><li>Open <strong>Where on Earth?</strong> at the top.</li><li>Expand <strong>Round settings</strong>. Choose <strong>Quick Game</strong> for ten random locations, or <strong>Daily Expedition</strong> for the shared daily route.</li><li>Select Easy, Medium, or Hard, then press <strong>Start round</strong>. Wait for the flight to finish.</li></ol>
  <h3>Choose your challenge</h3>
  <table><caption>Points per location before optional hints</caption><thead><tr><th>Level</th><th>Questions and points</th></tr></thead><tbody>${Object.entries(
    DIFFICULTIES,
  )
    .map(
      ([key, rule]) =>
        `<tr><th scope="row">${rule.label}</th><td>${scoreSummary(key)}</td></tr>`,
    )
    .join('')}</tbody></table>
  <p>Each round has ten locations and a maximum of <strong>${MAX_SCORE} points</strong>. Medium and Hard have no zoom penalties. Streaks track clean locations without multiplying scores.</p>
  <h3>Explore and zoom</h3>
  <p>Drag the map to look around. Use the game's <strong>Zoom in</strong> and <strong>Zoom out</strong> buttons. Mouse-wheel and pinch zoom, globe reset, and tilt shortcuts are disabled during a round to keep the scoring consistent.</p>
  <p>On Easy, the widest zoom-out level reached sets the country value: <strong>${[0, 1, 2, 3, 4].map(easyCountryPoints).join(' → ')}</strong>. There are four zoom-out levels. Zooming back in never restores points; moving back to an already visited level does not charge again. Each new location resets the allowance.</p>
  <h3>Answer, bank points, and continue</h3>
  <ol><li>Enter the country and press <strong>Lock in country</strong>. Easy then finishes that location.</li><li>On Medium or Hard, identify the city next. Country points are banked and remain protected.</li><li>On Hard, identify the landmark last.</li><li>Press <strong>Next location</strong> after the result. Complete all ten to finish the round.</li></ol>
  <p>Country has one submission. City and landmark each allow four attempts. A wrong city guess from the built-in city list shows approximate distance and direction <strong>from your guessed city toward the target</strong>, plus a hot/warm/cool/cold clue. Retry attempts do not lower the level's point values. Unknown or repeated city guesses cost no attempt. Common aliases, accents, capitalization, and punctuation are handled where supported.</p>
  <p><strong>Initial hint −1</strong> reveals the current answer's first letter and subtracts one point from that answer only. Hints can be used once per answer. <strong>Skip</strong> awards zero for that answer and advances; it does not remove already banked points. Wrong answers and skips reset the clean-location streak. Hints preserve the streak but pause its growth for that location.</p>
  <h3>Change settings or hide the game</h3>
  <p>You can open Round settings during play. New selections apply only when you press <strong>Start new round</strong>; that starts over at location one with zero points. Hiding and reopening the game with its top button preserves the current round. Reloading the page does not preserve an unfinished round. Opening Help does not reset it.</p>
  <h3>Save and share</h3>
  <p>After the last location, press <strong>Save score</strong>. Last and best scores are saved in this browser, separately by difficulty and Quick Game/Daily mode. Daily records are also separated by date. They do not sync across devices and may be lost if browser data is cleared.</p>
  <p>After a Daily Expedition, <strong>Copy daily result</strong> copies the date, difficulty, score, ten result tiles, and the clean site link without revealing answers. Green tiles mean a full-score location, yellow at least half, and white less than half. Paste the result wherever you want to share it. If clipboard access fails, a selectable text box appears. Daily routes reset at midnight <strong>UTC</strong>; a round already started keeps its starting date. Replays are allowed.</p>
  <h3>Use the map tools</h3>
  <p>The far-left buttons open <strong>Data Layers</strong>, <strong>Display</strong>, <strong>CCTV</strong>, <strong>Street Level</strong>, and <strong>Context</strong>. Click a button again or its panel's close arrow to minimize it. On narrow screens these buttons form a row, and an open tool temporarily covers the game.</p>
  <p>Data Layers lets you choose aircraft and other overlays. Display changes map presentation; CCTV and Street Level expose their available imagery controls; Context shows information about selected contacts and supported objects. The Sunlight button changes globe lighting using the current time. Source availability varies, so an empty or delayed feed does not mean your game score is broken.</p>`;

export const helpFaq = [
  [
    'Why is Zoom out disabled?',
    'Wait for the flight or a zoom animation to finish. The button also disables after the fourth zoom-out level and while reviewing an answer. Use Next location to continue.',
  ],
  [
    'Why did Easy points stay low after zooming in?',
    'Easy remembers the widest zoom-out level you reached for that location. Zooming in does not refund points. The next location starts at 10 again, before hints.',
  ],
  [
    'Can I zoom without penalties on Medium and Hard?',
    'Yes. The same four zoom levels are available, but they never deduct points on Medium or Hard. Optional hints still cost one point from their answer.',
  ],
  [
    'Why does the mouse wheel not zoom the map?',
    'Use the game zoom buttons during a round. Mouse-wheel and pinch zoom are intentionally disabled for consistent scoring. Normal map zoom is restored when the round ends.',
  ],
  [
    'My difficulty selection did not change the current location. Why?',
    'During a round, changes are staged. Press Start new round to apply them. This resets the score and begins a new ten-location round; it does not retroactively change your current round.',
  ],
  [
    'My city is not accepted. What can I do?',
    'City guesses use a limited offline list. Choose a suggested city and try its common name. Unknown names and repeated city guesses do not use an attempt. Landmark answers also support selected common aliases; broader place coverage is still limited.',
  ],
  [
    'What do hot, warm, cool, and cold mean?',
    'They describe distance from your guessed city to the target: hot is under 100 km, warm under 500 km, cool under 2,000 km, and cold is farther. The compass direction tells you where to travel from the guess toward the target. Distances are approximate.',
  ],
  [
    'Is this live satellite video?',
    'No. The base map uses captured imagery and mapped geometry, not continuous satellite video. Some overlays update separately. Sunlight is a lighting simulation, not a new satellite image.',
  ],
  [
    'Why are aircraft, CCTV, or Street Level empty?',
    'Check that the relevant layer or source is enabled. Coverage, source availability, rate limits, and map position can affect results. Give the feed time to load and try another area. Opening a tool panel does not guarantee a live camera or aircraft feed.',
  ],
  [
    'Do I need API keys or an account to play?',
    'No. Game questions, scoring, hints, the daily route, and this Help wizard run without API keys or a player account. Some optional external map/data integrations have their own setup requirements.',
  ],
  [
    'Where are my saved scores?',
    'Finish the round and press Save score, then select the same mode and difficulty. Daily records belong to that UTC date. Scores stay in this browser; another browser, private session, cleared storage, or a different scoring version can show different records.',
  ],
  [
    'Is there a global leaderboard?',
    'No. Records are local to your browser. Daily results can be copied and shared, but they are not a verified global ranking.',
  ],
  [
    'How do I close Help?',
    'Press Close help or Escape. Your round remains intact. On desktop, keyboard focus returns to the Help button.',
  ],
];

export const helpWizard = {
  start: {
    title: 'What would you like help with?',
    text: 'Choose a topic for a short, guided answer.',
    choices: [
      ['Start or change a round', 'setup'],
      ['Understand my points', 'score'],
      ['I am stuck on an answer', 'answer'],
      ['A map or layer is not working', 'map'],
      ['Save or share my result', 'records'],
    ],
  },
  setup: {
    title: 'Where are you in the game?',
    text: 'Settings are available before and during a round.',
    choices: [
      ['I have not started yet', 'begin'],
      ['I want to change difficulty mid-round', 'change'],
      ['The camera flight stopped', 'flight'],
    ],
  },
  begin: {
    title: 'Start your ten-location challenge',
    text: 'Open Round settings, select Quick Game or Daily Expedition, choose a difficulty, then press Start round. Easy asks country only; Medium adds city; Hard adds landmark.',
    action: 'settings',
  },
  change: {
    title: 'Apply the new settings explicitly',
    text: 'Open Round settings and select your new mode or difficulty. Press Start new round to apply them. This starts at location one with zero points. Until then, the current round keeps its old rules.',
    action: 'settings',
  },
  flight: {
    title: 'Return to the mystery location',
    text: 'If the flight was interrupted, press Return to location. Wait for arrival before answering or using the zoom buttons.',
    action: 'game',
  },
  score: {
    title: 'Which difficulty are you playing?',
    text: 'All levels offer 10 points per location before optional hints.',
    choices: [
      ['Easy', 'easy'],
      ['Medium', 'medium'],
      ['Hard', 'hard'],
      ['I used a hint or skipped', 'deductions'],
    ],
  },
  easy: {
    title: 'Easy: country and button zoom costs',
    text: 'Country starts at 10. The four new zoom-out levels offer 8, 6, 4, and 2 points. Zooming in does not recover points. A new location resets to 10. A hint costs one additional point from that answer.',
    action: 'game',
  },
  medium: {
    title: 'Medium: country 2 + city 8',
    text: 'Lock in country first, then city. Zoom buttons have no score penalty. Banked country points are protected. Hints cost one point from their answer.',
    action: 'game',
  },
  hard: {
    title: 'Hard: country 2 + city 3 + landmark 5',
    text: 'Answer country, city, then landmark. Zoom buttons have no score penalty. City and landmark allow four attempts. Optional hints cost one point from their answer.',
    action: 'game',
  },
  deductions: {
    title: 'Only the current answer is affected',
    text: 'Each initial hint costs one point from that answer. Skip awards zero for that answer. Neither can take away points already banked from earlier answers. Streaks do not multiply or reduce scores.',
    action: 'game',
  },
  answer: {
    title: 'What is blocking your answer?',
    text: 'You can ask for an initial hint or skip an answer without losing banked points.',
    choices: [
      ['Country or landmark is difficult', 'hint'],
      ['City name is rejected', 'city'],
      ['I received a distance clue', 'direction'],
    ],
  },
  hint: {
    title: 'Use a hint or move on',
    text: 'Press the initial-hint button to reveal the current answer’s first letter at a cost of one point. If you are still stuck, Skip awards zero for that answer and advances. City and landmark have four attempts; country has one submission.',
    action: 'game',
  },
  city: {
    title: 'Use a city from the offline list',
    text: 'Choose a suggestion in the city answer field. The list is limited; unknown city names and repeated guesses do not use an attempt. Accepted wrong city guesses produce distance and direction clues.',
    action: 'game',
  },
  direction: {
    title: 'Travel from your guess toward the target',
    text: 'For a clue such as “340 km NW from Paris,” imagine moving northwest from Paris by about that distance. The clue describes the target’s direction from your guess, not from your current camera position.',
    action: 'game',
  },
  map: {
    title: 'Which map control is the problem?',
    text: 'Map presentation and external data feeds are separate from game scoring.',
    choices: [
      ['Mouse zoom or Zoom out is disabled', 'zoom'],
      ['Aircraft, cameras or layers are empty', 'layers'],
      ['The map is dark', 'sun'],
    ],
  },
  zoom: {
    title: 'Use the game zoom buttons',
    text: 'Mouse-wheel and pinch zoom are disabled during a round. Zoom out also disables at level four, during flights/animations, or after submitting an answer. Return to the location or advance to the next one as appropriate.',
    action: 'game',
  },
  layers: {
    title: 'Check layer selection and coverage',
    text: 'Open Data Layers and enable the overlay you want. Aircraft and cameras depend on external coverage and provider availability; rate limits or outages can leave them empty. An open CCTV panel alone does not enable its feed.',
    action: 'layers',
  },
  sun: {
    title: 'Check the Sunlight toggle',
    text: 'Sunlight applies current-time globe lighting, so nighttime areas can look dark. Toggle Sunlight at the top if you prefer a uniformly lit map. The imagery itself is captured imagery, not live satellite video.',
    action: 'game',
  },
  records: {
    title: 'Are you saving or sharing?',
    text: 'Both actions become available after finishing all ten locations.',
    choices: [
      ['Save my score', 'save'],
      ['Share my daily result', 'share'],
      ['Find an older score', 'history'],
    ],
  },
  save: {
    title: 'Save at the end of the round',
    text: 'After location ten, press Save score. Last and best are stored in this browser for that mode and difficulty. Daily scores are also separated by UTC date.',
    action: 'game',
  },
  share: {
    title: 'Copy a spoiler-free daily result',
    text: 'Finish a Daily Expedition and press Copy daily result. Paste the copied text into your preferred app. If copying is blocked, use the selectable text box that appears. Quick Game has local scores but no daily-share button.',
    action: 'game',
  },
  history: {
    title: 'Match the browser, mode, difficulty and date',
    text: 'Select the same mode and difficulty in the same browser. Daily records use the UTC date. Clearing storage, private sessions, other devices, or older scoring versions may explain a missing record.',
    action: 'settings',
  },
};
