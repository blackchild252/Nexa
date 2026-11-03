import type { NexaWorld } from './nexaWorlds';

export type NexaSceneAccent = 'gold' | 'blue' | 'green' | 'violet' | 'warm';
export type NexaSceneDensity = 'cinematic' | 'balanced' | 'quiet';

export type NexaSceneContract = Readonly<{
  world: NexaWorld;
  accent: NexaSceneAccent;
  density: NexaSceneDensity;
  environment: 'cosmos' | 'artwork' | 'native';
  depth: 'rings' | 'atmosphere' | 'quiet-orb';
  motion: 'ambient' | 'subtle' | 'static-capable';
}>;

/**
 * B70 visual coverage contract. Every NEXA world gets an explicit visual role
 * so new screens cannot silently fall back to a generic template treatment.
 */
export const NEXA_SCENE_CONTRACTS: Readonly<Record<NexaWorld, NexaSceneContract>> = Object.freeze({
  home: { world: 'home', accent: 'gold', density: 'cinematic', environment: 'cosmos', depth: 'rings', motion: 'ambient' },
  dami: { world: 'dami', accent: 'gold', density: 'cinematic', environment: 'cosmos', depth: 'rings', motion: 'ambient' },
  'sky-money': { world: 'sky-money', accent: 'blue', density: 'cinematic', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  'dream-marketplace': { world: 'dream-marketplace', accent: 'violet', density: 'cinematic', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  kitchen: { world: 'kitchen', accent: 'warm', density: 'cinematic', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  'ball-house': { world: 'ball-house', accent: 'blue', density: 'cinematic', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  leisure: { world: 'leisure', accent: 'green', density: 'balanced', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  fitness: { world: 'fitness', accent: 'green', density: 'balanced', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  'game-house': { world: 'game-house', accent: 'violet', density: 'cinematic', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  zeeza: { world: 'zeeza', accent: 'blue', density: 'cinematic', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  yaayz: { world: 'yaayz', accent: 'blue', density: 'cinematic', environment: 'artwork', depth: 'atmosphere', motion: 'ambient' },
  notifications: { world: 'notifications', accent: 'gold', density: 'quiet', environment: 'native', depth: 'quiet-orb', motion: 'static-capable' },
  search: { world: 'search', accent: 'blue', density: 'quiet', environment: 'artwork', depth: 'quiet-orb', motion: 'static-capable' },
  profile: { world: 'profile', accent: 'gold', density: 'quiet', environment: 'artwork', depth: 'quiet-orb', motion: 'static-capable' },
  extensions: { world: 'extensions', accent: 'violet', density: 'quiet', environment: 'native', depth: 'quiet-orb', motion: 'static-capable' },
  developer: { world: 'developer', accent: 'green', density: 'quiet', environment: 'native', depth: 'quiet-orb', motion: 'static-capable' },
  subscription: { world: 'subscription', accent: 'gold', density: 'quiet', environment: 'native', depth: 'quiet-orb', motion: 'static-capable' },
  auth: { world: 'auth', accent: 'gold', density: 'quiet', environment: 'native', depth: 'quiet-orb', motion: 'static-capable' },
  staff: { world: 'staff', accent: 'gold', density: 'quiet', environment: 'native', depth: 'quiet-orb', motion: 'static-capable' },
  disputes: { world: 'disputes', accent: 'warm', density: 'quiet', environment: 'native', depth: 'quiet-orb', motion: 'static-capable' },
});

export const NEXA_SCENE_ACCENTS: Readonly<Record<NexaSceneAccent, { primary: string; secondary: string; glow: string }>> = Object.freeze({
  gold: { primary: '#FFD700', secondary: '#D4AF37', glow: 'rgba(255,215,0,0.18)' },
  blue: { primary: '#64B5FF', secondary: '#1E78C2', glow: 'rgba(64,160,255,0.16)' },
  green: { primary: '#75D79A', secondary: '#2F7D4F', glow: 'rgba(72,190,120,0.14)' },
  violet: { primary: '#B79CFF', secondary: '#7C5CFF', glow: 'rgba(130,95,255,0.15)' },
  warm: { primary: '#FFC46B', secondary: '#C7772E', glow: 'rgba(255,150,60,0.15)' },
});

export function getNexaSceneContract(world: NexaWorld) { return NEXA_SCENE_CONTRACTS[world]; }
