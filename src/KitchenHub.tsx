import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NexaPressable } from './motion';
import { authedFetch } from './api';
import { s } from './styles';
import { theme, ds } from './theme';
import { CountryPicker } from './CountryPicker';
import { formatInternationalPhone, addressFieldOrderForCountry } from './regionalization';
import { formatMajorCurrency } from './currencyDisplay';

const money = (n: number, c?: string) => formatMajorCurrency(Number(n || 0), c, 'en');
const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz', 'flat_rate', 'per_item'];
const STOREFRONT_TEMPLATES = [
  { id: 'restaurant', name: 'Restaurant & Takeaway', description: 'Meals, combos, pickup and delivery' },
  { id: 'bakery', name: 'Bakery & Desserts', description: 'Breads, cakes, pastries and pre-orders' },
  { id: 'grocery', name: 'Grocery & Mini-Mart', description: 'Pantry items, produce and household goods' },
  { id: 'butchery', name: 'Butchery & Seafood', description: 'Fresh cuts, seafood and weight-based products' },
  { id: 'drinks', name: 'Drinks & Juice Bar', description: 'Juices, beverages, bundles and add-ons' },
  { id: 'catering', name: 'Catering & Events', description: 'Event menus, quantities and scheduled delivery' },
  { id: 'meal-prep', name: 'Meal Prep & Cloud Kitchen', description: 'Meal plans, weekly menus and scheduled orders' },
];

export function KitchenTabs({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const tabs = [['home', 'Home Kitchen'], ['hub', 'Hub'], ['join', 'Join the hub']];
  return (
    <View style={ds({ flexDirection: 'row', marginTop: 12, marginBottom: 4 })}>
      {tabs.map(([k, label]) => (
        <NexaPressable key={k} accessibilityRole="tab" accessibilityLabel={`${label} tab`} accessibilityState={{ selected: tab === k }}
          style={[s.smallButton, { marginRight: 8, opacity: tab === k ? 1 : 0.55 }]} onPress={() => setTab(k)}>
          <Text style={s.buttonText}>{label}</Text>
        </NexaPressable>
      ))}
    </View>
  );
}

const input = (): any => ({ color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, minHeight: theme.accessibility.minTouchTarget });

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: any) {
  return (
    <View>
      <Text style={s.muted}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={theme.colors.muted}
        multiline={!!multiline} keyboardType={keyboardType} style={[input(), multiline ? { minHeight: 80, textAlignVertical: 'top' } : null]} />
    </View>
  );
}

function Check({ label, on, toggle }: { label: string; on: boolean; toggle: () => void }) {
  return (
    <NexaPressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: on }} style={ds({ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 })} onPress={toggle}>
      <Text style={ds({ color: theme.colors.goldBright, fontSize: 22, marginRight: 10 })}>{on ? '☑' : '☐'}</Text>
      <Text style={[s.muted, { flex: 1 }]}>{label}</Text>
    </NexaPressable>
  );
}

const EMPTY: Record<string, any> = {
  name: '', country: '', city: '', address: '', contactName: '', phone: '', email: '', businessType: 'individual', registrationNumber: '', taxNumber: '',
  idDocumentType: '', idDocumentNumber: '', foodLicenceNumber: '', description: '', currency: 'NGN', payoutDetails: '', weightUnit: 'kg', weightRate: '',
  minimumCharge: '', volumetricNote: '', shipsTo: '', houseRules: '', courierName: '', courierRules: '', handlingDays: '', restrictedItems: '', returnsPolicy: '', customsNote: '',
};

function JoinForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState<Record<string, any>>(EMPTY);
  const [storefrontTemplate, setStorefrontTemplate] = useState('restaurant');
  const [rules, setRules] = useState(false);
  const [disc, setDisc] = useState(false);
  const [req, setReq] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => {
    const c = String(f.country || '').trim().toUpperCase();
    if (c.length !== 2) { setReq(null); return; }
    let live = true;
    authedFetch(`/api/leisure/kitchen/hub/requirements/${c}`).then((r: any) => { if (live) setReq(r.requirements); }).catch(() => {});
    return () => { live = false; };
  }, [f.country]);
  const submit = async () => {
    setBusy(true);
    try {
      const body = { ...f, storefrontTemplate, phone: formatInternationalPhone(String(f.phone || ''), String(f.country || '')), shipsToCountries: String(f.shipsTo || '').split(/[\s,]+/).filter(Boolean), acceptsHubRules: rules, acceptsCountryDisclaimer: disc };
      const r = await authedFetch('/api/leisure/kitchen/hub/apply', { method: 'POST', body: JSON.stringify(body) });
      Alert.alert('Application received', r.message || 'Your shop is PENDING until the owner approves it.');
      onDone();
    } catch (e: any) { Alert.alert('Join the hub', e?.message || 'Could not send your application.'); } finally { setBusy(false); }
  };
  return (
    <View style={[s.card, { marginTop: 12 }]}>
      <Text style={s.section}>Join the hub</Text>
      <Text style={s.muted}>New shops stay PENDING until the owner approves them. Buyers pay you directly for now.</Text>
      <Text style={[s.section, { marginTop: 14 }]}>Choose a free storefront template</Text>
      <Text style={s.muted}>Choose one of seven free starting designs. After approval, upload products and ask Admin AAMI about a separate paid custom Blockly build.</Text>
      {STOREFRONT_TEMPLATES.map((template) => (
        <NexaPressable key={template.id} accessibilityRole="radio" accessibilityLabel={`${template.name} free template`} accessibilityState={{ checked: storefrontTemplate === template.id }}
          style={[s.card, { marginTop: 6, borderWidth: 1, borderColor: storefrontTemplate === template.id ? theme.colors.goldBright : theme.colors.border }]}
          onPress={() => setStorefrontTemplate(template.id)}>
          <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>{storefrontTemplate === template.id ? '● ' : '○ '}{template.name} · FREE</Text>
          <Text style={s.muted}>{template.description}</Text>
        </NexaPressable>
      ))}
      <Text style={[s.section, { marginTop: 14 }]}>Shop</Text>
      <Field label="Shop name" value={f.name} onChange={set('name')} />
      <CountryPicker label="Country" value={f.country} valueMode="code" onSelect={country => setF(p => ({ ...p, country: country.code }))} />
      <Field label="City" value={f.city} onChange={set('city')} />
      <Field label="Address" value={f.address} onChange={set('address')} />
      <Text style={s.muted}>Suggested address order: {addressFieldOrderForCountry(f.country).join(" → ")}</Text>
      <Field label="What you sell" value={f.description} onChange={set('description')} multiline />
      <Text style={[s.section, { marginTop: 10 }]}>Contact</Text>
      <Field label="Contact person" value={f.contactName} onChange={set('contactName')} />
      <Field label="Phone" value={f.phone} onChange={set('phone')} keyboardType="phone-pad" />
      <Field label="Email (optional)" value={f.email} onChange={set('email')} keyboardType="email-address" />
      <Text style={[s.section, { marginTop: 10 }]}>Business and ID</Text>
      <Field label="Business type (individual, company, restaurant)" value={f.businessType} onChange={set('businessType')} />
      <Field label="Registration number (if any)" value={f.registrationNumber} onChange={set('registrationNumber')} />
      <Field label="Tax or VAT number (if any)" value={f.taxNumber} onChange={set('taxNumber')} />
      <Field label="ID type (passport, national ID, licence)" value={f.idDocumentType} onChange={set('idDocumentType')} />
      <Field label="ID number" value={f.idDocumentNumber} onChange={set('idDocumentNumber')} />
      <Field label="Food licence number (if any)" value={f.foodLicenceNumber} onChange={set('foodLicenceNumber')} />
      {req && (
        <View style={ds({ marginVertical: 8 })}>
          <Text style={[s.section, { fontSize: 17 }]}>Needed in {req.name}</Text>
          {req.needs.map((n: string) => <Text key={n} style={s.muted}>• {n}</Text>)}
          <Text style={[s.muted, { marginTop: 6 }]}>{req.disclaimer}</Text>
        </View>
      )}
      <Text style={[s.section, { marginTop: 10 }]}>Money and weight billing</Text>
      <Field label="Currency (supported codes: NGN, USD, GBP, EUR, GHS, KES, ZAR, UGX, TZS, RWF, XOF, XAF, CAD, AUD, NZD, INR, JPY, CNY, AED, SAR, CHF, SEK, NOK, DKK, BRL, MXN, SGD, HKD, BHD, KWD)" value={f.currency} onChange={set('currency')} />
      <Field label="How buyers pay you (bank, mobile money, other)" value={f.payoutDetails} onChange={set('payoutDetails')} multiline />
      <Field label={`Weight billing unit: ${WEIGHT_UNITS.join(', ')}`} value={f.weightUnit} onChange={set('weightUnit')} />
      <Field label="Rate per unit" value={f.weightRate} onChange={set('weightRate')} keyboardType="numeric" />
      <Field label="Minimum delivery charge" value={f.minimumCharge} onChange={set('minimumCharge')} keyboardType="numeric" />
      <Field label="Volume or size rules (optional)" value={f.volumetricNote} onChange={set('volumetricNote')} />
      <Text style={[s.section, { marginTop: 10 }]}>Shipping, courier and house rules</Text>
      <Field label="Countries you ship to (2-letter codes, comma separated)" value={f.shipsTo} onChange={set('shipsTo')} />
      <Field label="Courier or rider name" value={f.courierName} onChange={set('courierName')} />
      <Field label="Courier rules" value={f.courierRules} onChange={set('courierRules')} multiline />
      <Field label="Handling time (days)" value={f.handlingDays} onChange={set('handlingDays')} />
      <Field label="Items you will not ship" value={f.restrictedItems} onChange={set('restrictedItems')} />
      <Field label="Customs and duties note (international)" value={f.customsNote} onChange={set('customsNote')} />
      <Field label="Returns and refunds" value={f.returnsPolicy} onChange={set('returnsPolicy')} multiline />
      <Field label="House rules" value={f.houseRules} onChange={set('houseRules')} multiline />
      <Check label="I accept the hub rules. I will describe food honestly and ship what I sell." on={rules} toggle={() => setRules(!rules)} />
      <Check label="I accept the disclaimer for my country and I follow local law where I sell and ship." on={disc} toggle={() => setDisc(!disc)} />
      <NexaPressable accessibilityRole="button" accessibilityLabel="Send hub application" accessibilityState={{ disabled: busy }} disabled={busy} style={[s.smallButton, { marginTop: 10 }]} onPress={submit}>
        <Text style={s.buttonText}>Send application</Text>
      </NexaPressable>
    </View>
  );
}

const STATUS_TEXT: Record<string, string> = {
  awaiting_seller_payment: 'Waiting for payment to the shop', buyer_marked_paid: 'Buyer says they paid', paid: 'Payment confirmed', shipped: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled',
};

async function setOrderStatus(id: string, status: string, done: () => void) {
  try { await authedFetch(`/api/leisure/kitchen/hub/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); done(); }
  catch (e: any) { Alert.alert('Hub order', e?.message || 'Could not update the order.'); }
}

function Btn({ label, onPress, a11y }: { label: string; onPress: () => void; a11y?: string }) {
  return <NexaPressable accessibilityRole="button" accessibilityLabel={a11y || label} style={[s.smallButton, { marginTop: 8, marginRight: 8 }]} onPress={onPress}><Text style={s.buttonText}>{label}</Text></NexaPressable>;
}

function SellerOrders({ shopApproved }: { shopApproved: boolean }) {
  const [orders, setOrders] = useState<any[]>([]);
  const load = useCallback(() => { authedFetch('/api/leisure/kitchen/hub/my-shop/orders').then((r: any) => setOrders(r.orders || [])).catch(() => {}); }, []);
  useEffect(() => { if (shopApproved) load(); }, [shopApproved, load]);
  if (!shopApproved) return null;
  return (
    <View style={ds({ marginTop: 14 })}>
      <Text style={s.section}>Seller orders</Text>
      {orders.length === 0 ? <Text style={s.muted}>No orders yet.</Text> : orders.map((o) => (
        <View key={o.id} style={ds({ paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border })}>
          <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>{money(o.total, o.currency)} · {STATUS_TEXT[o.status] || o.status}</Text>
          <Text style={s.muted}>{o.items.map((x: any) => `${x.quantity} ${x.name}`).join(', ')}</Text>
          <Text style={s.muted}>Delivery {money(o.deliveryCharge, o.currency)} · to {o.deliveryAddress}, {o.deliveryCountry}</Text>
          <View style={ds({ flexDirection: 'row', flexWrap: 'wrap' })}>
            {o.status === 'buyer_marked_paid' && <Btn label="Confirm payment received" onPress={() => setOrderStatus(o.id, 'paid', load)} />}
            {o.status === 'buyer_marked_paid' && <Btn label="Not received" onPress={() => setOrderStatus(o.id, 'awaiting_seller_payment', load)} />}
            {o.status === 'paid' && <Btn label="Mark shipped" onPress={() => setOrderStatus(o.id, 'shipped', load)} />}
            {o.status === 'shipped' && <Btn label="Mark delivered" onPress={() => setOrderStatus(o.id, 'delivered', load)} />}
            {['awaiting_seller_payment', 'buyer_marked_paid'].includes(o.status) && <Btn label="Cancel order" onPress={() => setOrderStatus(o.id, 'cancelled', load)} />}
          </View>
        </View>
      ))}
    </View>
  );
}

function ItemManager() {
  const [items, setItems] = useState<any[]>([]); const [name, setName] = useState(''); const [price, setPrice] = useState(''); const [weight, setWeight] = useState('');
  const load = useCallback(() => { authedFetch('/api/leisure/kitchen/hub/my-shop/items').then((r: any) => setItems(r.items || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    try { await authedFetch('/api/leisure/kitchen/hub/my-shop/items', { method: 'POST', body: JSON.stringify({ name, price: Number(price), weightGrams: weight.trim() ? Number(weight) : null }) }); setName(''); setPrice(''); setWeight(''); load(); }
    catch (e: any) { Alert.alert("Business Hub", e?.message || 'Could not add the item.'); }
  };
  const toggle = async (i: any) => { try { await authedFetch(`/api/leisure/kitchen/hub/my-shop/items/${i.id}`, { method: 'PUT', body: JSON.stringify({ active: !i.active }) }); load(); } catch (e: any) { Alert.alert("Business Hub", e?.message || 'Could not update.'); } };
  const photo = async (i: any) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Photos', 'Allow photo access to add a picture.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true });
    const a = r.assets?.[0]; if (r.canceled || !a?.base64) return;
    try { await authedFetch(`/api/leisure/kitchen/hub/my-shop/items/${i.id}/image`, { method: 'POST', body: JSON.stringify({ dataUrl: `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}` }) }); load(); }
    catch (e: any) { Alert.alert('Photo', e?.message || 'Could not upload the photo.'); }
  };
  return (
    <View style={ds({ marginTop: 10 })}>
      <Text style={s.section}>My items</Text>
      {items.map((i) => (
        <View key={i.id} style={ds({ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 })}>
          {i.imageUrl ? <Image accessible accessibilityLabel={`Photo of ${i.name}`} source={{ uri: i.imageUrl }} style={ds({ width: 44, height: 44, borderRadius: 8, marginRight: 10 })} /> : null}
          <View style={ds({ flex: 1 })}><Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>{i.name}{i.active ? '' : ' (hidden)'}</Text><Text style={s.muted}>{money(i.price, i.currency)}{i.weightGrams != null ? ` · ${i.weightGrams} g` : ''}</Text></View>
          <Btn label="Photo" a11y={`Add photo to ${i.name}`} onPress={() => photo(i)} />
          <Btn label={i.active ? 'Hide' : 'Show'} a11y={`${i.active ? 'Hide' : 'Show'} ${i.name}`} onPress={() => toggle(i)} />
        </View>
      ))}
      <Field label="New item name" value={name} onChange={setName} />
      <Field label="Price" value={price} onChange={setPrice} keyboardType="numeric" />
      <Field label="Weight in grams (for weight billing)" value={weight} onChange={setWeight} keyboardType="numeric" />
      <Btn label="Add item" a11y="Add item to my shop" onPress={add} />
    </View>
  );
}

function MyShop({ shop }: { shop: any }) {
  const label: Record<string, string> = { pending: 'PENDING: waiting for the owner to approve', approved: 'APPROVED: your shop is live in the hub', rejected: 'NOT APPROVED', suspended: 'SUSPENDED' };
  return (
    <View style={[s.card, { marginTop: 12 }]}>
      <Text style={s.section}>Business Hub: {shop.name}</Text>
      <Text style={s.muted}>{label[shop.status] || shop.status}</Text>
      {!!shop.reviewNote && <Text style={s.muted}>Owner note: {shop.reviewNote}</Text>}
      {shop.status === 'approved' && <ItemManager />}
      <SellerOrders shopApproved={shop.status === 'approved'} />
    </View>
  );
}

function AdminQueue() {
  const [apps, setApps] = useState<any[]>([]); const [counts, setCounts] = useState<any>({}); const [note, setNote] = useState<Record<string, string>>({});
  const load = useCallback(() => { authedFetch('/api/leisure/kitchen/hub/admin/applications?status=pending').then((r: any) => { setApps(r.applications || []); setCounts(r.counts || {}); }).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const decide = async (id: string, decision: string) => {
    try { await authedFetch(`/api/leisure/kitchen/hub/admin/shops/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, note: note[id] || '' }) }); load(); }
    catch (e: any) { Alert.alert('Hub approval', e?.message || 'Could not save the decision.'); }
  };
  return (
    <View style={[s.card, { marginTop: 12 }]}>
      <Text style={s.section}>Hub approvals</Text>
      <Text style={s.muted}>Pending {counts.pending || 0} · Approved {counts.approved || 0} · Rejected {counts.rejected || 0} · Suspended {counts.suspended || 0}</Text>
      {apps.length === 0 ? <Text style={[s.muted, { marginTop: 8 }]}>No shops are waiting.</Text> : apps.map((a) => {
        const d = a.details || {};
        return (
          <View key={a.id} style={ds({ paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8 })}>
            <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>{a.name} · {a.city}, {a.country}</Text>
            <Text style={s.muted}>{d.contactName} · {d.phone}{d.email ? ` · ${d.email}` : ''}</Text>
            <Text style={s.muted}>{d.businessType} · Reg {d.registrationNumber || '—'} · Tax {d.taxNumber || '—'} · Food licence {d.foodLicenceNumber || '—'}</Text>
            <Text style={s.muted}>ID: {d.idDocumentType || '—'} {d.idDocumentNumber || ''}</Text>
            <Text style={s.muted}>Weight billing: {d.weight?.unit} {d.weight?.rate ?? '—'} (min {d.weight?.minimumCharge || 0}) · Ships to: {(d.shipsToCountries || []).join(', ') || 'not limited'}</Text>
            <Text style={s.muted}>Courier: {d.courier?.name || '—'} — {d.courier?.rules || '—'}</Text>
            <Text style={s.muted}>House rules: {d.houseRules || '—'}</Text>
            <Text style={s.muted}>Pay: {d.payoutDetails}</Text>
            <Field label="Reason (required to reject)" value={note[a.id] || ''} onChange={(v: string) => setNote((p) => ({ ...p, [a.id]: v }))} />
            <View style={ds({ flexDirection: 'row' })}>
              <Btn label="Approve shop" a11y={`Approve ${a.name}`} onPress={() => decide(a.id, 'approve')} />
              <Btn label="Reject shop" a11y={`Reject ${a.name}`} onPress={() => decide(a.id, 'reject')} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function BuyerOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const load = useCallback(() => { authedFetch('/api/leisure/kitchen/hub/orders').then((r: any) => setOrders(r.orders || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  if (!orders.length) return null;
  return (
    <View style={[s.card, { marginTop: 4 }]}>
      <Text style={s.section}>My hub orders</Text>
      {orders.map((o) => (
        <View key={o.id} style={ds({ paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border })}>
          <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>{o.shopName} · {money(o.total, o.currency)} · {STATUS_TEXT[o.status] || o.status}</Text>
          <Text style={s.muted}>{o.items.map((x: any) => `${x.quantity} ${x.name}`).join(', ')} · delivery {money(o.deliveryCharge, o.currency)}</Text>
          {o.status === 'awaiting_seller_payment' && <Text style={s.muted} selectable>Pay the shop: {o.payTo}</Text>}
          <View style={ds({ flexDirection: 'row', flexWrap: 'wrap' })}>
            {o.status === 'awaiting_seller_payment' && <Btn label="I have paid" a11y="I have paid the shop" onPress={() => setOrderStatus(o.id, 'buyer_marked_paid', load)} />}
            {o.status === 'awaiting_seller_payment' && <Btn label="Cancel order" onPress={() => setOrderStatus(o.id, 'cancelled', load)} />}
            {o.status === 'shipped' && <Btn label="I received it" onPress={() => setOrderStatus(o.id, 'delivered', load)} />}
          </View>
        </View>
      ))}
    </View>
  );
}

function ShopView({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null); const [cart, setCart] = useState<Record<string, number>>({}); const [paid, setPaid] = useState<any>(null);
  const [country, setCountry] = useState(''); const [address, setAddress] = useState(''); const [note, setNote] = useState('');
  useEffect(() => { authedFetch(`/api/leisure/kitchen/hub/shops/${slug}`).then(setData).catch((e: any) => Alert.alert('Hub', e?.message || 'Could not open the shop.')); }, [slug]);
  if (!data) return <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading Kitchen" color={theme.colors.goldBright} />;
  const items = data.items || [];
  const total = items.reduce((t: number, i: any) => t + i.price * (cart[i.id] || 0), 0);
  const order = async () => {
    const lines = items.filter((i: any) => (cart[i.id] || 0) > 0).map((i: any) => ({ id: i.id, quantity: cart[i.id] }));
    if (!lines.length) return Alert.alert('Hub', 'Add at least one item.');
    try { setPaid(await authedFetch(`/api/leisure/kitchen/hub/shops/${slug}/orders`, { method: 'POST', body: JSON.stringify({ items: lines, deliveryCountry: country.trim(), deliveryAddress: address.trim(), note: note.trim() }) })); setCart({}); }
    catch (e: any) { Alert.alert('Hub', e?.message || 'Could not place the order.'); }
  };
  const sh = data.shop;
  return (
    <View style={[s.card, { marginTop: 12 }]}>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Back to hub shops" onPress={onBack}><Text style={s.muted}>‹ Back to shops</Text></NexaPressable>
      <Text style={s.section}>{sh.name}</Text>
      <Text style={s.muted}>{sh.city}, {sh.country}</Text>
      {!!sh.description && <Text style={s.muted}>{sh.description}</Text>}
      {!!sh.houseRules && <Text style={s.muted}>House rules: {sh.houseRules}</Text>}
      {!!sh.customsNote && <Text style={s.muted}>Customs: {sh.customsNote}</Text>}
      {!!sh.returnsPolicy && <Text style={s.muted}>Returns: {sh.returnsPolicy}</Text>}
      {sh.weight?.rate ? <Text style={s.muted}>Delivery is billed by {String(sh.weight.unit).replace('_', ' ')} at {sh.weight.rate}{sh.weight.minimumCharge ? ` (minimum ${sh.weight.minimumCharge})` : ''}.</Text> : null}
      {items.length === 0 ? <Text style={[s.muted, { marginTop: 8 }]}>This shop has no items yet.</Text> : items.map((i: any) => (
        <View key={i.id} style={ds({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 })}>
          {i.imageUrl ? <Image accessible accessibilityLabel={`Photo of ${i.name}`} source={{ uri: i.imageUrl }} style={ds({ width: 48, height: 48, borderRadius: 8, marginRight: 10 })} /> : null}
          <View style={ds({ flex: 1 })}><Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>{i.name}</Text><Text style={s.muted}>{money(i.price, i.currency)}</Text></View>
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Remove one ${i.name}`} style={s.smallButton} onPress={() => setCart((c) => ({ ...c, [i.id]: Math.max(0, (c[i.id] || 0) - 1) }))}><Text style={s.buttonText}>−</Text></NexaPressable>
          <Text style={ds({ color: theme.colors.text, marginHorizontal: 10 })}>{cart[i.id] || 0}</Text>
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Add one ${i.name}`} style={s.smallButton} onPress={() => setCart((c) => ({ ...c, [i.id]: (c[i.id] || 0) + 1 }))}><Text style={s.buttonText}>+</Text></NexaPressable>
        </View>
      ))}
      {items.length > 0 && (
        <View style={ds({ marginTop: 8 })}>
          <CountryPicker label="Delivery country" value={country} valueMode="code" onSelect={selected => setCountry(selected.code)} />
          <Field label="Delivery address (deliveryAddress)" value={address} onChange={setAddress} multiline />
          <Field label="Note to the shop (optional)" value={note} onChange={setNote} />
          <Text style={s.muted}>Items {money(total, items[0]?.currency)} + delivery charge added when you order.</Text>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Place order" style={[s.smallButton, { marginTop: 10 }]} onPress={order}><Text style={s.buttonText}>Place order</Text></NexaPressable>
        </View>
      )}
      {paid && (
        <View style={ds({ marginTop: 12 })}>
          <Text style={s.section}>Order placed</Text>
          <Text style={s.muted}>Items {money(paid.itemsTotal, paid.currency)} + delivery {money(paid.deliveryCharge, paid.currency)} = {money(paid.total, paid.currency)}</Text>
          <Text style={s.muted}>Pay the shop directly:</Text>
          <Text style={ds({ color: theme.colors.text, marginTop: 4 })} selectable>{paid.payTo}</Text>
          <Text style={[s.muted, { marginTop: 6 }]}>{paid.notice} Then open "My hub orders" and tap "I have paid".</Text>
        </View>
      )}
    </View>
  );
}

export function KitchenHub({ tab = 'hub', setTab }: { tab?: string; setTab?: (t: string) => void } = {}) {
  const [shops, setShops] = useState<any[]>([]); const [mine, setMine] = useState<any>(null); const [open, setOpen] = useState(''); const [err, setErr] = useState('');
  const [filter, setFilter] = useState(''); const [isAdmin, setIsAdmin] = useState(false);
  const load = useCallback(async () => {
    try {
      const q = /^[A-Za-z]{2}$/.test(filter.trim()) ? `?country=${filter.trim().toUpperCase()}` : '';
      const [a, b] = await Promise.all([authedFetch(`/api/leisure/kitchen/hub/shops${q}`), authedFetch('/api/leisure/kitchen/hub/my-shop')]);
      setShops(a.shops || []); setMine(b.shop || null); setErr('');
    } catch (e: any) { setErr(e?.message || 'Could not load the hub.'); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { authedFetch('/api/mall/admin/status').then((r: any) => setIsAdmin(Boolean(r?.isAdmin))).catch(() => setIsAdmin(false)); }, []);
  if (open) return <ShopView slug={open} onBack={() => setOpen('')} />;
  const canJoin = !mine || mine.status === 'rejected';
  if (tab === 'join') {
    return (
      <View>
        {canJoin ? <JoinForm onDone={() => { load(); setTab?.('hub'); }} /> : (
          <View style={[s.card, { marginTop: 12 }]}>
            <Text style={s.section}>Join the hub</Text>
            <Text style={s.muted}>You already have a shop in the hub. Open the Hub tab to manage it.</Text>
          </View>
        )}
        {err ? <Text style={s.muted}>{err}</Text> : null}
      </View>
    );
  }
  return (
    <View>
      {isAdmin && <AdminQueue />}
      <View style={[s.card, { marginTop: 12 }]}>
        <Text style={s.section}>Shops in the hub</Text>
        <Field label="Filter by country (2 letters, leave empty for all)" value={filter} onChange={setFilter} />
        {shops.length === 0 ? <Text style={s.muted}>No shops yet.</Text> : shops.map((sh) => (
          <NexaPressable key={sh.id} accessibilityRole="button" accessibilityLabel={`Open ${sh.name}`} style={ds({ paddingVertical: 10 })} onPress={() => setOpen(sh.slug)}>
            <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>{sh.name}</Text>
            <Text style={s.muted}>{sh.city}, {sh.country}</Text>
          </NexaPressable>
        ))}
      </View>
      <BuyerOrders />
      {mine && <MyShop shop={mine} />}
      {err ? <Text style={s.muted}>{err}</Text> : null}
    </View>
  );
}
