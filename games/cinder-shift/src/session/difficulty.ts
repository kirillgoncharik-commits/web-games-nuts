export const difficulties = ['easy', 'hard', 'nightmare'] as const;
export type Difficulty = typeof difficulties[number];

const settings = {
  easy: { hpPenalty: 0, damage: 1, aggression: 1 },
  hard: { hpPenalty: 1, damage: 2, aggression: 1.20 },
  nightmare: { hpPenalty: 2, damage: 3, aggression: 1.42 },
} as const;

export function isDifficulty(value: unknown): value is Difficulty {
  return difficulties.some(difficulty => difficulty === value);
}

export function campaignHp(base: number, difficulty: Difficulty = 'easy') {
  return base - settings[difficulty].hpPenalty;
}

export function combatBalance(mission: string, difficulty: Difficulty = 'easy') {
  const tier = settings[difficulty];
  const worldPace = mission.startsWith('YU') ? 1.27 : mission.startsWith('SW') ? 1.12 : 1;
  return { damage: tier.damage, aggression: tier.aggression * worldPace };
}
