/**
 * NEXA Home Design Contract — canonical root definition.
 *
 * This is the single source of truth for the Home command-center composition.
 * Visual tokens still come from `theme.ts`; this file defines Home structure,
 * naming, and navigation intent so future batches do not reintroduce retired UI.
 */
export const HOME_DESIGN_VERSION = '1.3';
export const HOME_DESIGN_RELEASE = '6.2.54';

export const subscriptionEntryPolicy = {
  route: '/(tabs)/money?view=subscription',
  canonicalPresentation: '/(tabs)/money?view=subscription',
  compatibilityRoute: '/subscription',
  compatibilityBridge: true,
  label: 'NEXA Membership',
} as const;

export const HOME_DESIGN = {
  id: 'home-command-center',
  version: HOME_DESIGN_VERSION,
  release: HOME_DESIGN_RELEASE,
  composition: {
    header: 'nexa-header',
    rails: ['market-watch', 'nexa-updates'] as const,
    centerpiece: 'dami-ai',
    bottomAnchors: ['zeeza-friends', 'calls'] as const,
    directory: 'nexa-sidebar',
    environment: 'home-cinematic-v1',
  },
  excludedHomeDestinations: [
    'Sky Money',
    'Dream Marketplace',
    'Yaayz',
    'L.A.',
    'Ball House',
    'Kitchen',
    'Game House',
    'Fitness',
    'Notifications',
    'Search',
    'Profile',
    'Extensions',
    'Developer Console',
  ] as const,
  naming: {
    ai: 'Dami',
    people: 'Zeeza',
    messages: 'Inbox',
  },
  visual: {
    background: 'NEXA_HOME_CINEMATIC_BACKGROUND_V1.png',
    animatedOverlay: 'NexaDarkHome',
    heroDepth: 'NexaDamiRobot + NexaGlossyOrb',
  },
  motion: {
    marketWatch: 'live-update',
    dami: 'dami',
    directory: 'navigation',
  },
} as const;



export const HOME_DIRECTORY = [
  ['home','Home','home-outline','/(tabs)'], ['dami','Dami','sparkles-outline','/dami'], ['zeeza','Zeeza','people-outline','/(tabs)/zeeza'],
  ['money','Sky Money','wallet-outline','/(tabs)/money'], ['marketplace','Dream Marketplace','cart-outline','/(tabs)/marketplace'], ['vendor','Business Hub','storefront-outline','/marketplace/vendor'], ['yaayz','Yaayz','ticket-outline','/(tabs)/yaayz'],
  ['leisure','L.A.','fitness-outline','/(tabs)/leisure'], ['notifications','Notifications','notifications-outline','/(tabs)'], ['central-reports','Report to AAMI Central','alert-circle-outline','/central-reports'],
  ['search','Search','search-outline','/(tabs)/search'], ['subscription','NEXA Membership','card-outline','/(tabs)/money?view=subscription'], ['profile','Profile','person-outline','/(tabs)/profile'], ['extensions','Extensions','extension-puzzle-outline','/extensions'], ['developer','Developer Console','code-slash-outline','/developer'],
] as const;

export type HomeDesignComposition = typeof HOME_DESIGN;
export type HomeDirectoryItem = typeof HOME_DIRECTORY[number];
