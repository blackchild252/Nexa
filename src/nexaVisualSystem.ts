/**
 * NEXA Royal Fusion visual system.
 *
 * One visual contract for the three existing layers:
 * 1) environmental AI/world art
 * 2) runtime depth/3D-like material layers
 * 3) tier-aware motion
 *
 * This is deliberately dependency-free and mobile-safe. It does not change
 * product semantics, navigation, subscription authority or data behavior.
 */
export const NEXA_VISUAL_SYSTEM_VERSION = '2.2';

export type NexaVisualLayer = 'environment' | 'depth' | 'motion';

export const NEXA_VISUAL_LAYERS = Object.freeze({
  environment: { role: 'AI/contextual world art', required: true },
  depth: { role: '3D-like runtime depth, glass, rings and light', required: true },
  motion: { role: 'subscription-aware interaction and ambient motion', required: true },
});

export const NEXA_VISUAL_TIERS = Object.freeze({
  free: { environment: true, depth: true, motion: false, ambient: false },
  regular: { environment: true, depth: true, motion: true, ambient: false },
  premium: { environment: true, depth: true, motion: true, ambient: true },
  vip: { environment: true, depth: true, motion: true, ambient: true },
});

export const NEXA_SURFACE_MATERIALS = Object.freeze({
  base: 'deep-black',
  surface: 'graphite',
  elevated: 'charcoal-glass',
  highlight: 'royal-gold-glow',
  content: 'warm-ivory',
});

export const NEXA_LAYER_ORDER = Object.freeze(['environment', 'depth', 'readability', 'content'] as const);

export const NEXA_INTERACTION_RULES = Object.freeze({
  decorativeLayersPointerEvents: 'none',
  contentAlwaysAboveVisualLayers: true,
  reducedMotionWins: true,
  freeTierStaysStatic: true,
  freeTierStatic: true,
});

export const NEXA_GRADIENT_ROLES = Object.freeze({
  app: ['#000000', '#1A1A1A'] as const,
  gold: ['#FFD700', '#D4AF37'] as const,
  goldSoft: ['rgba(255,215,0,0.16)', 'rgba(212,175,55,0.03)'] as const,
  readability: ['rgba(0,0,0,0.46)', 'rgba(0,0,0,0.84)'] as const,
});
