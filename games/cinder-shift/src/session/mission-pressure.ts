import type {Difficulty} from './difficulty';
import type {PlayableMissionId} from './missions';

export const pressurePresets = {
 easy: { lives: 3, drain: 1, volley: 0.5, charge: 0.35 },
 hard: { lives: 2, drain: 1.12, volley: 0.55, charge: 0.30 },
 nightmare: { lives: 1, drain: 1.25, volley: 0.65, charge: 0.25 }
} as const;

export const pressureStations: Partial<Record<string, {group: string; x: number; y: number}>> = {
 M1A: {group: 'airlock-service', x: 282, y: 256},
 E: {group: 'cargo-shelf', x: 300, y: 256},
 M2D: {group: 'cargo-conveyor', x: 300, y: 256},
 M3F: {group: 'foundry-isolation', x: 80, y: 320},
 M3G: {group: 'foundry-fork', x: 100, y: 320},
 M3I: {group: 'foundry-fork', x: 100, y: 320},
 M4B: {group: 'archive-scout', x: 90, y: 320},
 M4H: {group: 'archive-security', x: 100, y: 320},
 M5B: {group: 'reactor-heat', x: 86, y: 320},
 M5C: {group: 'reactor-core', x: 90, y: 320},
 'SW01-B': {group: 'SW01', x: 64, y: 320},
 'SW02-B': {group: 'SW02', x: 64, y: 320},
 'SW03-B': {group: 'SW03', x: 64, y: 320},
 'SW04-B': {group: 'SW04', x: 64, y: 320},
 'SW05-B': {group: 'SW05', x: 64, y: 320},
 'YU01-B': {group: 'YU01', x: 64, y: 320},
 'YU02-B': {group: 'YU02', x: 64, y: 320},
 'YU03-B': {group: 'YU03', x: 64, y: 320},
 'YU04-B': {group: 'YU04', x: 64, y: 320},
 'YU05-B': {group: 'YU05', x: 64, y: 320}
};

export const pressureCapacity = {
 airlock: 95, cargo: 115, foundry: 100, archive: 110, reactor: 155,
 SW01: 100, SW02: 95, SW03: 105, SW04: 130, SW05: 135,
 YU01: 115, YU02: 105, YU03: 130, YU04: 140, YU05: 140
} satisfies Record<PlayableMissionId, number>;

export class MissionPressure {
 energy: number;
 lives: number;
 deaths = 0;
 timeSpent = 0;
 fireSpent = 0;
 volleyCount = 0;
 chargedVolleyCount = 0;
 chargeGained = 0;
 chargeClipped = 0;
 charges = new Set<string>();
 waitingForRetry = false;
 readonly preset: typeof pressurePresets[Difficulty];

 constructor(readonly capacity: number, difficulty: Difficulty = 'easy', lives?: number) {
  this.preset = pressurePresets[difficulty];
  this.lives = lives ?? this.preset.lives;
  this.energy = capacity;
 }

 spendTime(ms: number) { this.timeSpent += this.spend(this.preset.drain * ms / 1000); }
 spendVolley(charged = false) {
  this.volleyCount++;
  if(charged)this.chargedVolleyCount++;
  this.fireSpent += this.spend(this.preset.volley * (charged ? 3 : 1));
 }
 private spend(amount: number) {
  const spent = Math.min(this.energy, amount);
  this.energy -= spent;
  return spent;
 }

 charge(group: string) {
  if (this.charges.has(group) || this.energy <= 0 || this.energy >= this.capacity || this.waitingForRetry) return 0;
  const gained = Math.min(this.capacity - this.energy, this.capacity * this.preset.charge);
  this.energy += gained;
  this.chargeGained += gained;
  this.chargeClipped += this.capacity * this.preset.charge - gained;
  this.charges.add(group);
  return gained;
 }

 loseLife() {
  if (this.waitingForRetry || this.lives === 0) return;
  this.deaths++;
  this.lives--;
  this.waitingForRetry = this.lives > 0;
 }

 retry() {
  if (!this.waitingForRetry) return false;
  this.waitingForRetry = false;
  return true;
 }
}
