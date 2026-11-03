import { SUBSCRIPTION_CENTRE_CANONICAL_TARGET } from './subscriptionCentre';
import { isKnownNexaRoute } from './nexaRouteInventory';
/**
 * Canonical cross-module navigation contract.
 *
 * This module only resolves destinations. It does not authorize actions or mutate
 * server state; destination modules remain responsible for their own permissions.
 */
export type NavigationTarget = {
  pathname: string;
  params?: Record<string, string>;
};

export type NotificationNavigationData = Record<string, any> | undefined | null;

export type SearchNavigationResult = {
  type: string;
  id: string;
  title?: string;
};

const DIRECTORY_ROUTES: Record<string, NavigationTarget> = {
  home: { pathname: '/(tabs)' },
  dami: { pathname: '/dami' },
  zeeza: { pathname: '/(tabs)/zeeza' },
  money: { pathname: '/(tabs)/money' },
  marketplace: { pathname: '/(tabs)/marketplace' },
  yaayz: { pathname: '/(tabs)/yaayz' },
  leisure: { pathname: '/(tabs)/leisure' },
  notifications: { pathname: '/(tabs)', params: { panel: 'notifications' } },
  search: { pathname: '/(tabs)/search' },
  subscription: { ...SUBSCRIPTION_CENTRE_CANONICAL_TARGET, params: { ...SUBSCRIPTION_CENTRE_CANONICAL_TARGET.params } },
  profile: { pathname: '/(tabs)/profile' },
  extensions: { pathname: '/extensions' },
  developer: { pathname: '/developer' },
  vendor: { pathname: '/marketplace/vendor' },
  'central-reports': { pathname: '/central-reports' },
};

/** The four L.A. activities. They live inside L.A., not in the sidebar, but stay reachable by link, push tap and search. */
const LEISURE_ACTIVITY_ROUTES: Record<string, NavigationTarget> = {
  ball: { pathname: '/leisure/ball-house' },
  kitchen: { pathname: '/leisure/kitchen' },
  game: { pathname: '/leisure/game-house' },
  fitness: { pathname: '/leisure/fitness' },
};

export function navigationForLeisureActivity(id: string): NavigationTarget | null {
  return LEISURE_ACTIVITY_ROUTES[id] ? validateNavigationTarget({ ...LEISURE_ACTIVITY_ROUTES[id] }) : null;
}

export function validateNavigationTarget(target: NavigationTarget | null | undefined): NavigationTarget | null {
  if (!target || !isKnownNexaRoute(target.pathname)) return null;
  return { pathname: target.pathname, ...(target.params ? { params: { ...target.params } } : {}) };
}

export function navigationForDirectoryItem(id: string): NavigationTarget | null {
  if (id === 'subscription') return navigationForSubscription();
  return DIRECTORY_ROUTES[id] ? validateNavigationTarget({ ...DIRECTORY_ROUTES[id] }) : null;
}

/** Canonical user-facing Subscription Centre destination. The /subscription route remains
 * a compatibility bridge for legacy/deep links, while directory navigation lands directly
 * in the Sky Money presentation that owns the live subscription state. */
export function navigationForSubscription(): NavigationTarget {
  return validateNavigationTarget({ ...SUBSCRIPTION_CENTRE_CANONICAL_TARGET, params: { ...SUBSCRIPTION_CENTRE_CANONICAL_TARGET.params } }) as NavigationTarget;
}

export type AddNavigationAction = 'friend' | 'money' | 'group' | 'product';

export function navigationForAddAction(action: AddNavigationAction): NavigationTarget | null {
  switch (action) {
    case 'friend': return validateNavigationTarget({ pathname: '/(tabs)/zeeza', params: { section: 'friends' } });
    case 'money': return validateNavigationTarget({ pathname: '/wallet', params: { view: 'deposit' } });
    case 'group': return validateNavigationTarget({ pathname: '/(tabs)/money', params: { view: 'groups' } });
    case 'product': return validateNavigationTarget({ pathname: '/marketplace/vendor' });
    default: return null;
  }
}

export function navigationForDamiDestination(destination: string): NavigationTarget | null {
  const value = String(destination || '').trim();
  if (!value || value === 'none') return null;
  if (value === 'home') return navigationForDirectoryItem('home');
  if (value === 'dami') return navigationForDirectoryItem('dami');
  if (value === 'zeeza') return navigationForDirectoryItem('zeeza');
  if (value === 'inbox') return validateNavigationTarget({ pathname: '/(tabs)/zeeza', params: { section: 'inbox' } });
  if (value === 'marketplace') return navigationForDirectoryItem('marketplace');
  if (value === 'vendor') return navigationForDirectoryItem('vendor');
  if (value === 'yaayz') return navigationForDirectoryItem('yaayz');
  if (value === 'leisure') return navigationForDirectoryItem('leisure');
  if (value === 'money' || value.startsWith('money_')) {
    const view = value.replace(/^money_/, '');
    if (view === 'wallet') return validateNavigationTarget({ pathname: '/wallet' });
    const viewMap: Record<string, string> = { store_savings: 'ajo', group_savings: 'groups', planning: 'planning', market: 'market', insights: 'insights' };
    const mappedView = viewMap[view];
    return mappedView ? validateNavigationTarget({ pathname: '/(tabs)/money', params: { view: mappedView } }) : navigationForDirectoryItem('money');
  }
  return null;
}

export function navigationForNotification(data: NotificationNavigationData): NavigationTarget | null {
  if (!data) return null;
  const screen = String(data.screen || data.action || '').trim();
  const id = data.id == null ? '' : String(data.id);
  // B323: a Lifestyle alert with a post id opens that exact post.
  if (screen === 'leisure_lifestyle' && /^[A-Za-z0-9._:-]{1,160}$/.test(String(data.postId || id))) return validateNavigationTarget({ pathname: '/lifestyle', params: { postId: String(data.postId || id) } });
  switch (screen) {
    case 'home': return navigationForDirectoryItem('home');
    case 'dami':
    case 'ai': return navigationForDirectoryItem('dami');
    case 'money': return navigationForDirectoryItem('money');
    case 'money_group': return validateNavigationTarget({ pathname: '/(tabs)/money', params: { view: 'groups', groupId: id } });
    case 'zeeza':
    case 'friends':
    case 'friend_requests': return validateNavigationTarget({ pathname: '/(tabs)/zeeza', params: { section: 'friends' } });
    case 'chat': return validateNavigationTarget({ pathname: '/(tabs)/zeeza', params: { section: 'inbox' } });
    case 'dm_thread': return validateNavigationTarget({ pathname: '/(tabs)/zeeza', params: { section: 'inbox', threadId: id } });
    case 'chat_room': return validateNavigationTarget({ pathname: '/(tabs)/zeeza', params: { section: 'inbox', roomId: id } });
    case 'call':
      return data.callId ? validateNavigationTarget({ pathname: '/zeeza/call', params: { callId: String(data.callId), media: data.media === 'video' ? 'video' : 'audio' } }) : null;
    case 'marketplace': return navigationForDirectoryItem('marketplace');
    case 'vendor_staff': return validateNavigationTarget({ pathname: '/marketplace/vendor', params: { tab: 'staff' } });
    case 'mall_vendor': return validateNavigationTarget({ pathname: '/marketplace/vendor', params: { orderId: id, tab: 'orders' } });
    case 'mall_orders': return validateNavigationTarget({ pathname: '/(tabs)/marketplace', params: { orderId: id, tab: 'orders' } });
    case 'yaayz': return navigationForDirectoryItem('yaayz');
    case 'ticket': return validateNavigationTarget({ pathname: '/(tabs)/yaayz', params: { type: 'tickets', ticketOrderId: id } });
    case 'leisure': return navigationForDirectoryItem('leisure');
    case 'leisure_kitchen': return navigationForLeisureActivity('kitchen');
    case 'leisure_lifestyle': return validateNavigationTarget({ pathname: '/lifestyle' });
    case 'verification': return validateNavigationTarget({ pathname: '/verification' });
    case 'extensions': return navigationForDirectoryItem('extensions');
    case 'developer': return navigationForDirectoryItem('developer');
    case 'profile': return navigationForDirectoryItem('profile');
    case 'search': return navigationForDirectoryItem('search');
    default: return null;
  }
}

export function navigationForSearchResult(result: SearchNavigationResult): NavigationTarget | null {
  const id = String(result?.id || '').trim();
  if (!id || id === 'undefined' || id === 'null') return null;
  const type = String(result?.type || '').trim();
  switch (type) {
    case 'people':
    case 'friends':
    case 'social': return validateNavigationTarget({ pathname: '/(tabs)/zeeza', params: { section: 'friends', resultId: id } });
    case 'groups': return validateNavigationTarget({ pathname: '/(tabs)/money', params: { view: 'groups', groupId: id } });
    case 'marketplace': return validateNavigationTarget({ pathname: '/(tabs)/marketplace', params: { search: String(result.title || id) } });
    case 'yaayz': return validateNavigationTarget({ pathname: '/(tabs)/yaayz', params: { search: String(result.title || id) } });
    case 'money': return validateNavigationTarget({ pathname: '/(tabs)/money', params: { view: 'activity', search: String(result.title || id) } });
    case 'ai': return validateNavigationTarget({ pathname: '/dami', params: { resultId: id } });
    case 'dami': return validateNavigationTarget({ pathname: '/dami', params: { resultId: id } });
    case 'help': return validateNavigationTarget({ pathname: '/help', params: { topic: id } });
    case 'section': return navigationForLeisureActivity(id) || navigationForDirectoryItem(id);
    default: return null;
  }
}
