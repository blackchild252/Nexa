import type { ImageSourcePropType } from 'react-native';

export type NexaWorld =
  | 'home'
  | 'dami'
  | 'sky-money'
  | 'dream-marketplace'
  | 'kitchen'
  | 'ball-house'
  | 'fitness'
  | 'game-house'
  | 'leisure'
  | 'zeeza'
  | 'yaayz'
  | 'notifications'
  | 'search'
  | 'profile'
  | 'extensions'
  | 'developer'
  | 'subscription'
  | 'auth'
  | 'staff'
  | 'disputes';

/**
 * Contextual environmental art for NEXA screens.
 * These local assets are deliberately lightweight so the experience remains
 * usable on mobile/Expo without requiring a new image service or runtime fetch.
 */
export const NEXA_WORLDS: Record<NexaWorld, ImageSourcePropType | null> = {
  // V5.20.0: Home and Dami render the native animated cosmos (NexaCosmos), not a poster image.
  home: null,
  dami: null,
  'sky-money': require('../assets/worlds/sky_money_world.jpg'),
  'dream-marketplace': require('../assets/worlds/dream_marketplace_world.jpg'),
  kitchen: require('../assets/worlds/kitchen_world.jpg'),
  'ball-house': require('../assets/worlds/ball_house_world.jpg'),
  // L.A. hub: same poster as Ball House (Royal Dark looks exactly as before) but its own world, so block layers never leak between the two.
  leisure: require('../assets/worlds/ball_house_world.jpg'),
  fitness: require('../assets/worlds/fitness_world.jpg'),
  'game-house': require('../assets/worlds/game_house_world.jpg'),
  zeeza: require('../assets/worlds/zeeza_world.jpg'),
  yaayz: require('../assets/worlds/dream_marketplace_world.jpg'),
  // Notifications: no poster (Royal Dark stays plain black with its own native layer); its own world so nothing leaks to Zeeza / Profile / Search.
  notifications: null,
  // Search: same poster as before (Royal Dark looks the same) but its own world, so Search layers never leak into Profile and vice versa.
  search: require('../assets/worlds/zeeza_world.jpg'),
  profile: require('../assets/worlds/zeeza_world.jpg'),
  // Extensions: no poster (Royal Dark stays plain black with its own native layer, as before); its own world so nothing leaks to Profile / Notifications.
  extensions: null,
  // Developer Console: no poster (Royal Dark stays plain black with its own native layer); its own world so nothing leaks to Extensions / Profile.
  developer: null,
  // Access screens (Subscription, Login/Signup, Staff, Administrative Director disputes): no poster (Royal Dark stays plain black with a light native layer); each has its own world so nothing leaks between them or into other blocks.
  subscription: null,
  auth: null,
  staff: null,
  disputes: null,
};

/** Worlds drawn natively by NexaCosmos instead of a static image. */
export const NEXA_COSMOS_WORLDS: readonly NexaWorld[] = ['home', 'dami'];

export const NEXA_WORLD_PROMPTS: Record<NexaWorld, string> = {
  home: 'Cinematic NEXA command center, royal black and gold, futuristic Nigerian-inspired skyline, subtle cosmic depth, clean central negative space for UI.',
  dami: 'Cinematic futuristic AI sanctuary, friendly glowing AI core with headphones and microphone, royal gold rings, deep space mountains, warm horizon light, large clean negative space for interface.',
  'sky-money': 'Premium futuristic banking interior, black glass, royal gold architectural lines, secure vault atmosphere, subtle Nigerian financial-city cues, calm luxury, clean negative space for mobile UI.',
  'dream-marketplace': 'Luxury futuristic marketplace showroom, premium products and glowing glass displays, royal gold accents, deep black environment, sophisticated retail atmosphere, clean mobile UI space.',
  kitchen: 'Elegant futuristic restaurant interior and open kitchen, warm gold lighting, polished dark surfaces, premium hospitality atmosphere, clean space for NEXA interface.',
  'ball-house': 'Futuristic football stadium at night, royal gold floodlights, dramatic pitch, subtle Nigerian football energy, cinematic but readable mobile background.',
  leisure: 'Futuristic leisure arena hub connecting food, football, gaming and fitness, royal gold floodlights, dark premium atmosphere, clear mobile UI space.',
  fitness: 'Premium futuristic gym interior, black metal and gold lighting, modern equipment, energetic but uncluttered, cinematic mobile UI background.',
  'game-house': 'Immersive futuristic gaming lounge, dark neon architecture with royal gold accents, premium consoles and screens, cinematic depth, clear mobile UI space.',
  zeeza: 'Sophisticated futuristic social lounge, warm gold lighting, elegant seating, subtle human connection cues without identifiable people, royal black palette, mobile UI negative space.',
  yaayz: 'Futuristic travel and events hub, premium ticketing environment, glowing route lines and event lights, royal gold and black, clean interface space.',
  notifications: 'Calm premium alerts hall, royal black with a single gold bell and soft gold badge lights, very quiet background, maximum readability for a scrolling list of notification cards.',
  search: 'Quiet premium search room, royal black with a thin gold magnifying glass and a few soft gold result lights, calm and uncluttered, maximum readability for a search box, filter pills and a scrolling list of result cards.',
  profile: 'Elegant futuristic personal command room, royal black and gold, secure private atmosphere, subtle identity and settings motifs, clean mobile UI space.',
  extensions: 'Quiet premium extensions bay, royal black with a few thin gold module outlines joined by gold links and small gold permission switches, calm and uncluttered, maximum readability for extension cards, permission pills and audit lists.',
  developer: 'Quiet premium developer bay, royal black with a thin gold code window, a thin gold key outline and a few small gold request lights, calm and uncluttered, maximum readability for manifest text, capability lists and API key rows.',
  subscription: 'Quiet premium membership hall, royal black with four thin gold tier steps and one thin gold ring, calm and uncluttered, maximum readability for plan cards, spend bars and fee rows.',
  auth: 'Quiet premium entrance, royal black with a thin gold padlock outline and a few small gold lights, calm and uncluttered, maximum readability for sign-in and sign-up forms.',
  staff: 'Quiet premium team room, royal black with three thin gold person outlines, calm and uncluttered, maximum readability for invite forms, codes and team rows.',
  disputes: 'Quiet premium review chamber, royal black with a thin gold balance scale, calm and uncluttered, maximum readability for dispute cards and resolution notes.',
};
