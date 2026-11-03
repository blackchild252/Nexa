import { useEffect, useSyncExternalStore } from 'react';
import { getDamiAvatar, getDamiVoicePreferences, saveDamiAvatar, updateDamiVoicePreferences } from './api';

/** Dami avatar: catalogue, tier rules, languages, and the persisted store. Replaces the old robot everywhere. */
export type Gender = 'female' | 'male';
export type Pose = 'stand' | 'move' | 'sit' | 'lie' | 'computer';
export type Scene = 'plain' | 'neighborhood' | 'office' | 'kitchen' | 'livingroom';
export type Tier = 'free' | 'regular' | 'premium' | 'vip';
export type Opt = { id: string; label: string; color?: string };

export const SKINS: Opt[] = [{ id: 's1', label: 'Light', color: '#F7D7BD' }, { id: 's2', label: 'Tan', color: '#E3B58C' }, { id: 's3', label: 'Brown', color: '#B87A4B' }, { id: 's4', label: 'Deep', color: '#6B4226' }];
export const FACES: Opt[] = [{ id: 'smile', label: 'Smile' }, { id: 'grin', label: 'Grin' }, { id: 'calm', label: 'Calm' }, { id: 'wow', label: 'Wow' }];
export const HAIR: Opt[] = [{ id: 'short', label: 'Short' }, { id: 'curly', label: 'Curly' }, { id: 'long', label: 'Long' }, { id: 'bun', label: 'Bun' }, { id: 'bald', label: 'Bald' }];
export const HAIR_COLORS: Opt[] = [{ id: 'h1', label: 'Black', color: '#1b1410' }, { id: 'h2', label: 'Brown', color: '#5a3a22' }, { id: 'h3', label: 'Gold', color: '#d9a441' }, { id: 'h4', label: 'Red', color: '#a6361e' }, { id: 'h5', label: 'Grey', color: '#9a9a9a' }];
export const GLASSES: Opt[] = [{ id: 'none', label: 'None' }, { id: 'round', label: 'Round' }, { id: 'square', label: 'Square' }, { id: 'shades', label: 'Shades' }];
export const MUSTACHES: Opt[] = [{ id: 'none', label: 'None' }, { id: 'classic', label: 'Classic' }, { id: 'thick', label: 'Thick' }];
export const TOPS: Opt[] = [{ id: 'tee', label: 'T-shirt', color: '#2f7de1' }, { id: 'hoodie', label: 'Hoodie', color: '#7a4fd1' }, { id: 'shirt', label: 'Shirt', color: '#f2f2f2' }, { id: 'gold', label: 'Royal gold', color: '#d4a62a' }, { id: 'green', label: 'Green', color: '#2f7d4f' }];
export const BOTTOMS: Opt[] = [{ id: 'trousers', label: 'Trousers', color: '#2b3a67' }, { id: 'shorts', label: 'Shorts', color: '#3d3d3d' }, { id: 'skirt', label: 'Skirt', color: '#b4375a' }, { id: 'jeans', label: 'Jeans', color: '#4b6fa5' }];
export const SHOES: Opt[] = [{ id: 'sneakers', label: 'Sneakers', color: '#f5f5f5' }, { id: 'boots', label: 'Boots', color: '#4a3020' }, { id: 'sandals', label: 'Sandals', color: '#c9a26a' }];
export const BAGS: Opt[] = [{ id: 'none', label: 'None' }, { id: 'back', label: 'Back bag', color: '#c0392b' }, { id: 'side', label: 'Side bag', color: '#8e5a2b' }];
export const SCENES: Opt[] = [{ id: 'plain', label: 'Plain' }, { id: 'neighborhood', label: 'Neighborhood' }, { id: 'office', label: 'Office' }, { id: 'kitchen', label: 'Kitchen' }, { id: 'livingroom', label: 'Living room' }];

/** Pose rules: Standing = free, moving = regular, computer = premium, sitting/couch/lying = VIP. */
export const POSES: Array<{ id: Pose; label: string; min: Tier }> = [
  { id: 'stand', label: 'Standing', min: 'free' }, { id: 'move', label: 'Moving', min: 'regular' },
  { id: 'computer', label: 'Computer', min: 'premium' }, { id: 'sit', label: 'Sitting', min: 'vip' }, { id: 'lie', label: 'Lying on couch', min: 'vip' },
];
const RANK: Record<Tier, number> = { free: 0, regular: 1, premium: 2, vip: 3 };
/** Owner preview: every tier ability is unlocked while true. Set to false before release to enforce plans. */
export const AVATAR_UNLOCK_ALL_PREVIEW = typeof __DEV__ !== 'undefined' && __DEV__;
export const tierAllows = (tier: Tier, min: Tier) => AVATAR_UNLOCK_ALL_PREVIEW || RANK[tier] >= RANK[min];

/** Local languages first, then universal. Codes match the server's Dami language list. */
export const LANGUAGES: Array<{ code: string; label: string; group: 'local' | 'universal' }> = [
  { code: 'yo', label: 'Yorùbá', group: 'local' }, { code: 'ha', label: 'Hausa', group: 'local' }, { code: 'ig', label: 'Igbo', group: 'local' }, { code: 'pcm', label: 'Naijá Pidgin', group: 'local' },
  { code: 'en', label: 'English', group: 'universal' }, { code: 'fr', label: 'Français', group: 'universal' }, { code: 'es', label: 'Español', group: 'universal' }, { code: 'pt', label: 'Português', group: 'universal' },
  { code: 'ar', label: 'العربية', group: 'universal' }, { code: 'hi', label: 'हिन्दी', group: 'universal' }, { code: 'zh', label: '中文', group: 'universal' }, { code: 'de', label: 'Deutsch', group: 'universal' },
];
const TXT: Record<string, Record<string, string>> = {
  en: { hello: 'Hello! How can I help you today?  ·  Tap to speak', edit: 'Customize', save: 'Save', language: 'Language', local: 'Local languages', universal: 'Universal', locked: 'Upgrade to unlock', ttlVoice: 'Avatar & voice', ttlPose: 'Pose', ttlFace: 'Face', ttlExpression: 'Expression', ttlHair: 'Hair', ttlHairColor: 'Hair colour', ttlGlasses: 'Glasses', ttlMustache: 'Mustache', ttlTop: 'Top', ttlBottom: 'Trouser / skirt', ttlShoes: 'Shoes', ttlBag: 'Bag', ttlBackground: 'Background' },
  yo: { hello: 'Ẹ n lẹ́! Báwo ni mo ṣe lè ràn yín lọ́wọ́?  ·  Tẹ̀ láti sọ̀rọ̀', edit: 'Ṣe àtúnṣe', save: 'Fipamọ́', language: 'Èdè', local: 'Àwọn èdè ìbílẹ̀', universal: 'Àgbáyé' },
  ha: { hello: 'Sannu! Yaya zan taimake ka yau?  ·  Taɓa don magana', edit: 'Keɓanta', save: 'Ajiye', language: 'Harshe', local: 'Harsunan gida', universal: 'Na duniya' },
  ig: { hello: 'Ndewo! Kedu ka m ga-esi nyere gị aka taa?  ·  Pịa ka ị kwuo okwu', edit: 'Hazie', save: 'Chekwaa', language: 'Asụsụ', local: 'Asụsụ obodo', universal: 'Nke ụwa niile' },
  pcm: { hello: 'How far! Wetin I fit do for you today?  ·  Tap make you talk', edit: 'Customize am', save: 'Save', language: 'Language', local: 'Our local languages', universal: 'Universal', locked: 'Upgrade to unlock am' },
  fr: { hello: 'Bonjour ! Comment puis-je vous aider ?  ·  Touchez pour parler', edit: 'Personnaliser', save: 'Enregistrer', language: 'Langue', local: 'Langues locales', universal: 'Universelles', ttlVoice: 'Avatar et voix', ttlPose: 'Pose', ttlFace: 'Visage', ttlExpression: 'Expression', ttlHair: 'Cheveux', ttlHairColor: 'Couleur des cheveux', ttlGlasses: 'Lunettes', ttlMustache: 'Moustache', ttlTop: 'Haut', ttlBottom: 'Pantalon / jupe', ttlShoes: 'Chaussures', ttlBag: 'Sac', ttlBackground: 'Arrière-plan', locked: 'Passez à l\'offre supérieure pour débloquer' },
  es: { hello: '¡Hola! ¿En qué puedo ayudarte hoy?  ·  Toca para hablar', edit: 'Personalizar', save: 'Guardar', language: 'Idioma', local: 'Idiomas locales', universal: 'Universales', ttlVoice: 'Avatar y voz', ttlPose: 'Postura', ttlFace: 'Rostro', ttlExpression: 'Expresión', ttlHair: 'Cabello', ttlHairColor: 'Color de cabello', ttlGlasses: 'Gafas', ttlMustache: 'Bigote', ttlTop: 'Parte superior', ttlBottom: 'Pantalón / falda', ttlShoes: 'Zapatos', ttlBag: 'Bolso', ttlBackground: 'Fondo', locked: 'Mejora tu plan para desbloquear' },
  pt: { hello: 'Olá! Como posso ajudar hoje?  ·  Toque para falar', edit: 'Personalizar', save: 'Salvar', language: 'Idioma', local: 'Idiomas locais', universal: 'Universais', ttlVoice: 'Avatar e voz', ttlPose: 'Pose', ttlFace: 'Rosto', ttlExpression: 'Expressão', ttlHair: 'Cabelo', ttlHairColor: 'Cor do cabelo', ttlGlasses: 'Óculos', ttlMustache: 'Bigode', ttlTop: 'Parte de cima', ttlBottom: 'Calça / saia', ttlShoes: 'Sapatos', ttlBag: 'Bolsa', ttlBackground: 'Fundo', locked: 'Faça upgrade para desbloquear' },
  ar: { hello: 'مرحباً! كيف أساعدك اليوم؟  ·  المس للتحدث', edit: 'تخصيص', save: 'حفظ', language: 'اللغة', local: 'اللغات المحلية', universal: 'عالمية', ttlVoice: 'الصورة الرمزية والصوت', ttlPose: 'الوضعية', ttlFace: 'الوجه', ttlExpression: 'التعبير', ttlHair: 'الشعر', ttlHairColor: 'لون الشعر', ttlGlasses: 'النظارات', ttlMustache: 'الشارب', ttlTop: 'القميص', ttlBottom: 'البنطال / التنورة', ttlShoes: 'الحذاء', ttlBag: 'الحقيبة', ttlBackground: 'الخلفية', locked: 'قم بالترقية لإلغاء القفل' },
  hi: { hello: 'नमस्ते! आज मैं कैसे मदद करूँ?  ·  बोलने के लिए टैप करें', edit: 'अनुकूलित करें', save: 'सहेजें', language: 'भाषा', local: 'स्थानीय भाषाएँ', universal: 'सार्वभौमिक', ttlVoice: 'अवतार और आवाज़', ttlPose: 'मुद्रा', ttlFace: 'चेहरा', ttlExpression: 'भाव', ttlHair: 'बाल', ttlHairColor: 'बालों का रंग', ttlGlasses: 'चश्मा', ttlMustache: 'मूँछ', ttlTop: 'ऊपरी वस्त्र', ttlBottom: 'पतलून / स्कर्ट', ttlShoes: 'जूते', ttlBag: 'बैग', ttlBackground: 'पृष्ठभूमि', locked: 'अनलॉक करने के लिए अपग्रेड करें' },
  zh: { hello: '你好！今天需要什么帮助？  ·  点按说话', edit: '自定义', save: '保存', language: '语言', local: '本地语言', universal: '通用', ttlVoice: '头像与声音', ttlPose: '姿势', ttlFace: '脸部', ttlExpression: '表情', ttlHair: '发型', ttlHairColor: '发色', ttlGlasses: '眼镜', ttlMustache: '胡子', ttlTop: '上衣', ttlBottom: '裤子 / 裙子', ttlShoes: '鞋子', ttlBag: '包', ttlBackground: '背景', locked: '升级后解锁' },
  de: { hello: 'Hallo! Wie kann ich helfen?  ·  Zum Sprechen tippen', edit: 'Anpassen', save: 'Speichern', language: 'Sprache', local: 'Lokale Sprachen', universal: 'Universell', ttlVoice: 'Avatar & Stimme', ttlPose: 'Pose', ttlFace: 'Gesicht', ttlExpression: 'Ausdruck', ttlHair: 'Haare', ttlHairColor: 'Haarfarbe', ttlGlasses: 'Brille', ttlMustache: 'Schnurrbart', ttlTop: 'Oberteil', ttlBottom: 'Hose / Rock', ttlShoes: 'Schuhe', ttlBag: 'Tasche', ttlBackground: 'Hintergrund', locked: 'Upgrade zum Freischalten' },
};
export const tr = (lang: string, key: string) => TXT[lang]?.[key] || TXT.en[key] || key;

export type AvatarConfig = { gender: Gender; skin: string; face: string; hair: string; hairColor: string; glasses: string; mustache: string; top: string; bottom: string; shoes: string; bag: string; pose: Pose; scene: Scene; lang: string };
export const DEFAULT_AVATAR: AvatarConfig = { gender: 'female', skin: 's3', face: 'smile', hair: 'curly', hairColor: 'h1', glasses: 'none', mustache: 'none', top: 'gold', bottom: 'skirt', shoes: 'sneakers', bag: 'none', pose: 'stand', scene: 'neighborhood', lang: 'en' };

const KEY = 'nexa.dami.avatar';
const PENDING_KEY = 'nexa.dami.avatar.voicePending';
let state: AvatarConfig = DEFAULT_AVATAR; let loaded = false;
/** The plan the server confirmed (active subscription only). Null until the server has answered; the saved plan is used until then. */
let serverTier: Tier | null = null;
const readServerTier = (r: any): Tier | null => (r && typeof r.tier === 'string' && r.tier in RANK ? (r.tier as Tier) : null);
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => { try { f(); } catch { /* keep going */ } });
const sanitize = (v: any): AvatarConfig => ({ ...DEFAULT_AVATAR, ...(v && typeof v === 'object' ? v : {}), gender: v?.gender === 'male' ? 'male' : 'female' });

/** Browser storage first (the web app has no secure store), then the phone's secure store. */
async function readStored(key: string): Promise<string | null> {
  try { if (typeof localStorage !== 'undefined') return localStorage.getItem(key); } catch { /* native path below */ }
  try { const S = await import('expo-secure-store'); return await S.getItemAsync(key); } catch { return null; }
}
async function writeStored(key: string, value: string): Promise<void> {
  try { if (typeof localStorage !== 'undefined') { localStorage.setItem(key, value); return; } } catch { /* native path below */ }
  try { const S = await import('expo-secure-store'); await S.setItemAsync(key, value); } catch { /* still applied this session */ }
}
async function commit(next: AvatarConfig) { state = sanitize(next); emit(); await writeStored(KEY, JSON.stringify(state)); }

const sameCfg = (a: AvatarConfig, b: AvatarConfig) => (Object.keys(DEFAULT_AVATAR) as Array<keyof AvatarConfig>).every(k => a[k] === b[k]);

/** The server keeps the appearance and the voice, so a new phone or browser restores Dami and the avatar never disagrees with the voice. */
async function reconcileServer() {
  try {
    if ((await readStored(PENDING_KEY)) === '1') { // a save never reached the server: push it now instead of overwriting it
      await saveDamiAvatar(state as any);
      await updateDamiVoicePreferences({ voiceStyle: state.gender, languageCode: state.lang });
      await writeStored(PENDING_KEY, '0'); return;
    }
    const got = await getDamiAvatar() as any; const t = readServerTier(got); if (t && t !== serverTier) { serverTier = t; emit(); }
    const saved = got?.avatar;
    if (saved && typeof saved === 'object') { const next = sanitize(saved); if (!sameCfg(next, state)) await commit(next); }
    else if (!sameCfg(state, DEFAULT_AVATAR)) await saveDamiAvatar(state as any); // one-time upload of an avatar saved before server storage existed
    const p = (await getDamiVoicePreferences() as any)?.preferences; if (!p) return;
    const gender: Gender = p.voiceStyle === 'male' ? 'male' : 'female';
    const lang = LANGUAGES.some(l => l.code === p.languageCode) ? p.languageCode : state.lang; // 'auto' keeps the avatar's language
    if (gender !== state.gender || lang !== state.lang) await commit({ ...state, gender, lang });
  } catch { /* signed out or offline: keep what is stored on this device */ }
}
async function load() {
  if (loaded) return; loaded = true;
  try { const raw = await readStored(KEY); if (raw) { state = sanitize(JSON.parse(raw)); emit(); } } catch { /* defaults stay */ }
  await reconcileServer();
}
export async function saveAvatar(next: AvatarConfig) {
  await commit(next);
  // Voice follows the avatar: male avatar = male voice, female = female voice; language follows the selection.
  try {
    const res = await saveDamiAvatar(state as any) as any; const t = readServerTier(res); if (t && t !== serverTier) { serverTier = t; emit(); }
    const saved = res?.avatar; // the server drops a pose the plan does not include
    if (saved && typeof saved === 'object') { const kept = sanitize(saved); if (!sameCfg(kept, state)) await commit(kept); }
    await updateDamiVoicePreferences({ voiceStyle: state.gender, languageCode: state.lang });
    await writeStored(PENDING_KEY, '0');
  } catch { await writeStored(PENDING_KEY, '1'); /* offline: retried the next time the avatar loads */ }
}
/** Called when the Dami screen changes or resets the voice, so the avatar follows it. */
export function applyDamiVoiceToAvatar(voiceStyle: string, languageCode?: string) {
  const gender: Gender = voiceStyle === 'male' ? 'male' : 'female';
  const lang = LANGUAGES.some(l => l.code === languageCode) ? (languageCode as string) : state.lang;
  if (gender === state.gender && lang === state.lang) return;
  void commit({ ...state, gender, lang }).then(() => saveDamiAvatar(state as any)).catch(() => { /* the voice setting fixes gender and language on the next load */ });
}
/** The plan to show in the avatar studio: what the server confirmed, else the saved plan passed in. */
export function useAvatarTier(saved: Tier): Tier {
  useEffect(() => { void load(); }, []);
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => serverTier ?? saved, () => serverTier ?? saved);
}
export function useAvatar(): AvatarConfig {
  useEffect(() => { void load(); }, []);
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => state, () => state);
}
