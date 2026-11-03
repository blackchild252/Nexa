// Pure helpers for the Dream Marketplace storefront (no React / React Native imports, so they are unit-testable in Node).

export type StoreProductLike = {
  id: string; name?: string; price: number; currency?: string; regularPrice?: number; saleEndsAt?: string | null;
  stock?: number; vendorId?: string; vendorName?: string; ratingAvg?: number | null; ratingCount?: number; soldCount?: number;
};

export const DEPARTMENT_ICONS: Record<string, string> = {
  electronics: '🎧', 'phones & tablets': '📱', computers: '💻', fashion: '👗', 'jewelry & accessories': '💍', beauty: '💄',
  'home & living': '🛋️', groceries: '🛒', 'health & wellness': '🩺', 'baby & kids': '🧸', 'sports & fitness': '💪',
  automotive: '🚗', 'books & media': '📚', services: '🛠️', other: '📦',
};
export const departmentIcon = (category: string) => DEPARTMENT_ICONS[category] || '📦';
export const departmentLabel = (category: string) => category.replace(/\b\w/g, c => c.toUpperCase());

/** Whole-number percent saved, 0 when the product is not on a (still running) sale. */
export function discountPercent(p: StoreProductLike, now = Date.now()): number {
  if (!p.regularPrice || !(p.regularPrice > p.price)) return 0;
  if (p.saleEndsAt && Date.parse(p.saleEndsAt) <= now) return 0;
  return Math.max(1, Math.min(99, Math.round(((p.regularPrice - p.price) / p.regularPrice) * 100)));
}

/** "1.2k+ sold" style social proof; empty string when nothing has sold. */
export function soldLabel(n?: number | null): string {
  const v = Math.floor(Number(n) || 0);
  if (v <= 0) return '';
  if (v < 10) return `${v} sold`;
  if (v < 100) return `${Math.floor(v / 10) * 10}+ sold`;
  if (v < 1000) return `${Math.floor(v / 100) * 100}+ sold`;
  if (v < 10000) return `${(Math.floor(v / 100) / 10).toFixed(1).replace(/\.0$/, '')}k+ sold`;
  return `${Math.floor(v / 1000)}k+ sold`;
}

export function ratingLabel(avg?: number | null, count?: number | null): string {
  const c = Number(count) || 0;
  if (avg == null || c <= 0) return 'New';
  return `${Number(avg).toFixed(1)} (${c >= 1000 ? `${(c / 1000).toFixed(1).replace(/\.0$/, '')}k` : c})`;
}

/** Remaining time for a sale: "2d 04h 10m" or "03:12:09"; 'Ended' once over; '' when there is no end time. */
export function countdownText(endsAt: string | null | undefined, now = Date.now()): string {
  if (!endsAt) return '';
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return '';
  const ms = end - now;
  if (!(ms > 0)) return 'Ended';
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** Product-grid column count for the available width (phone 2, large phone/tablet 3, desktop 4-5). */
export function gridColumns(width: number): 2 | 3 | 4 | 5 {
  if (width >= 1180) return 5;
  if (width >= 900) return 4;
  if (width >= 600) return 3;
  return 2;
}
export const CARD_WIDTH: Record<number, string> = { 2: '48.5%', 3: '32%', 4: '23.6%', 5: '18.6%' };

/** Group cart lines by seller so checkout reads like a multi-seller marketplace cart. */
export function groupCartByShop<T extends { product: StoreProductLike; quantity: number }>(cart: T[]) {
  const groups = new Map<string, { key: string; shopName: string; lines: T[]; subtotal: number }>();
  for (const line of cart) {
    const key = line.product.vendorId || line.product.vendorName || 'shop';
    const g = groups.get(key) || { key, shopName: line.product.vendorName || 'Shop', lines: [], subtotal: 0 };
    g.lines.push(line); g.subtotal += line.product.price * line.quantity; groups.set(key, g);
  }
  return [...groups.values()];
}

export type Banner = { id: string; title: string; subtitle: string; action: 'deals' | 'new' | 'top' | 'sold' | 'category'; category?: string; emoji: string };
/** Hero banners are built only from what the catalogue really contains, so a banner never promises an empty page. */
export function buildBanners(sf: { deals?: any[]; bestSellers?: any[]; topRated?: any[]; newArrivals?: any[] } | null, now = Date.now()): Banner[] {
  const out: Banner[] = [];
  const deals = (sf?.deals || []).filter(p => discountPercent(p, now) > 0);
  if (deals.length) { const best = Math.max(...deals.map(p => discountPercent(p, now))); out.push({ id: 'deals', title: `Flash deals up to ${best}% off`, subtitle: `${deals.length} limited-time offer${deals.length === 1 ? '' : 's'} from NEXA sellers`, action: 'deals', emoji: '⚡' }); }
  if (sf?.bestSellers?.length) out.push({ id: 'sold', title: 'Best sellers', subtitle: 'What shoppers are buying most', action: 'sold', emoji: '🔥' });
  if (sf?.topRated?.length) out.push({ id: 'top', title: 'Top rated by buyers', subtitle: 'Real reviews from verified orders', action: 'top', emoji: '⭐' });
  if (sf?.newArrivals?.length) out.push({ id: 'new', title: 'New arrivals', subtitle: 'Fresh listings added today', action: 'new', emoji: '🆕' });
  return out;
}

export const SORT_LABELS: Record<string, string> = { newest: 'Newest', price_asc: 'Price: low to high', price_desc: 'Price: high to low' };


// ---- Size / colour variants and the cart (B144 WIP9) -------------------------------------------------
// Pure so they can be unit-tested in Node; useMarketplace and the product page call these.

export type VariantLike = { id: string; size?: string; colour?: string; stock: number };

/** "M / Black", "M" or "Black". */
export function variantLabel(v?: { size?: string; colour?: string } | null): string {
  return [v?.size, v?.colour].map((x) => String(x || '').trim()).filter(Boolean).join(' / ');
}

/** A cart line is one product, or one size/colour of a product. */
export const cartLineKey = (productId: string, variantId?: string | null) => `${productId}::${variantId || ''}`;

/** Most a shopper can add for this line: the option's stock when a variant is chosen, else the product's. Never above 99. */
export function lineStockCap(product: { stock?: number }, variant?: { stock: number } | null): number {
  const raw = variant ? variant.stock : product.stock;
  return Math.max(0, Math.min(99, Number.isFinite(raw as number) ? Math.floor(raw as number) : 99));
}

/** Distinct sizes and colours in the order the vendor listed them. */
export function variantAxes(variants: VariantLike[]) {
  const sizes: string[] = []; const colours: string[] = [];
  for (const v of variants) {
    if (v.size && !sizes.includes(v.size)) sizes.push(v.size);
    if (v.colour && !colours.includes(v.colour)) colours.push(v.colour);
  }
  return { sizes, colours };
}

/** The option matching the chosen size and colour (an axis the product does not use is ignored). */
export function findVariant(variants: VariantLike[], size?: string, colour?: string): VariantLike | null {
  const { sizes, colours } = variantAxes(variants);
  if (sizes.length && !size) return null;
  if (colours.length && !colour) return null;
  return variants.find((v) => (v.size || '') === (sizes.length ? size : '') && (v.colour || '') === (colours.length ? colour : '')) || null;
}

/** Is `value` on `axis` worth offering, given what is already chosen on the other axis? Greyed out when every matching option is sold out. */
export function axisValueInStock(variants: VariantLike[], axis: 'size' | 'colour', value: string, other?: string): boolean {
  const otherAxis = axis === 'size' ? 'colour' : 'size';
  return variants.some((v) => (v[axis] || '') === value && (!other || (v[otherAxis] || '') === other) && v.stock > 0);
}

export type CartLineLike<P extends { id: string; stock?: number }, V extends VariantLike = VariantLike> = { product: P; variant?: V | null; quantity: number };

const MARKETPLACE_CURRENCY_CODES = new Set(['NGN','USD','GBP','EUR','GHS','KES','ZAR','UGX','TZS','RWF','XOF','XAF','CAD','AUD','NZD','INR','JPY','CNY','AED','SAR','CHF','SEK','NOK','DKK','BRL','MXN','SGD','HKD','BHD','KWD']);

/** Marketplace cart totals/fees are only meaningful when every line has one supported source currency. */
export function cartCurrencyCompatibility<T extends { product: StoreProductLike }>(cart: T[], product: StoreProductLike) {
  const candidate = String(product?.currency || '').trim().toUpperCase();
  if (!MARKETPLACE_CURRENCY_CODES.has(candidate)) return { ok: false as const, currency: null, reason: 'This listing has no supported currency. It cannot be added until the seller currency is confirmed.' };
  const existing = new Set<string>();
  for (const line of cart) {
    const code = String(line?.product?.currency || '').trim().toUpperCase();
    if (!MARKETPLACE_CURRENCY_CODES.has(code)) return { ok: false as const, currency: null, reason: 'Your cart contains a listing with an unknown currency. Remove it and refresh the listing before continuing.' };
    existing.add(code);
  }
  if (existing.size > 1) return { ok: false as const, currency: null, reason: 'Your cart contains mixed currencies. Remove items and use one currency per order.' };
  if (existing.size === 1 && !existing.has(candidate)) return { ok: false as const, currency: null, reason: `Your cart is in ${[...existing][0]}. Remove the existing items before adding a ${candidate} listing; NEXA will not convert currencies automatically.` };
  return { ok: true as const, currency: candidate, reason: '' };
}

export function cartAdd<P extends { id: string; stock?: number }, V extends VariantLike>(cart: CartLineLike<P, V>[], product: P, qty = 1, variant: V | null = null): CartLineLike<P, V>[] {
  const cap = lineStockCap(product, variant);
  if (cap <= 0) return cart;
  const key = cartLineKey(product.id, variant?.id);
  const found = cart.find((l) => cartLineKey(l.product.id, l.variant?.id) === key);
  if (!found) return [...cart, { product, variant, quantity: Math.min(cap, Math.max(1, qty)) }];
  return cart.map((l) => (l === found ? { ...l, product, variant, quantity: Math.min(cap, l.quantity + qty) } : l));
}

export function cartChange<P extends { id: string; stock?: number }, V extends VariantLike>(cart: CartLineLike<P, V>[], key: string, delta: number): CartLineLike<P, V>[] {
  return cart
    .map((l) => (cartLineKey(l.product.id, l.variant?.id) === key ? { ...l, quantity: Math.max(0, Math.min(lineStockCap(l.product, l.variant), l.quantity + delta)) } : l))
    .filter((l) => l.quantity > 0);
}

export function cartRemove<P extends { id: string; stock?: number }, V extends VariantLike>(cart: CartLineLike<P, V>[], key: string): CartLineLike<P, V>[] {
  return cart.filter((l) => cartLineKey(l.product.id, l.variant?.id) !== key);
}
