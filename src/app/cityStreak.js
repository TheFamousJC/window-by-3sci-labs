export function streakMultiplier(streak) {
  return streak >= 4 ? 2 : streak >= 2 ? 1.5 : 1;
}
export function settleStreak(streak, { countryCorrect, cityCorrect, wrongAttempts, hinted, cityPoints }) {
  if (!countryCorrect || !cityCorrect || wrongAttempts > 0) return { streak: 0, bonus: 0 };
  if (hinted) return { streak, bonus: 0 };
  return { streak: streak + 1, bonus: Math.floor(cityPoints * (streakMultiplier(streak) - 1)) };
}
