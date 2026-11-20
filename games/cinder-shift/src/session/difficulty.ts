export const difficulties = ['easy', 'hard', 'nightmare'] as const;
export type Difficulty = typeof difficulties[number];

const settings = {
  easy: { hpPenalty: 0, shot: 1, heavy: 1, aggression: 1 },
  hard: { hpPenalty: 1, shot: 2, heavy: 2, aggression: 1.20 },
  nightmare: { hpPenalty: 2, shot: 2, heavy: 3, aggression: 1.42 },
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
  return { shot: tier.shot, heavy: tier.heavy, aggression: tier.aggression * worldPace };
}

const heavyAttacks = new Set([
  'turret-shot', 'lidar-guardian-shot', 'signal-watcher-shot', 'security-aimed-shot',
  'regulator-beam', 'regulator-contact',
]);

export function incomingDamage(balance: ReturnType<typeof combatBalance>, source: string) {
  if (heavyAttacks.has(source)) return balance.heavy;
  if (source.endsWith('-shot')) return balance.shot;
  return 1;
}
