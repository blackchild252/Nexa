import { Alert, Linking } from 'react-native';

const MAX_URL_LENGTH = 2048;
const PAYMENT_HOSTS = new Set(['checkout.paystack.com','paystack.com','www.paystack.com']);
const GOOGLE_HOSTS = new Set(['accounts.google.com','oauth2.googleapis.com','www.googleapis.com']);
const PRIVATE_HOSTS = new Set(['localhost','127.0.0.1','::1','0.0.0.0']);
const BLOCKED_PROTOCOLS = new Set(['javascript:','data:','file:','blob:','vbscript:','about:']);

function parse(url:string){
  const raw=String(url||'').trim();
  if(!raw||raw.length>MAX_URL_LENGTH)return null;
  let u:URL; try{u=new URL(raw);}catch{return null;}
  const host=u.hostname.toLowerCase().replace(/\.$/,'');
  if(BLOCKED_PROTOCOLS.has(u.protocol.toLowerCase())||u.protocol!=='https:'||u.username||u.password)return null;
  if(PRIVATE_HOSTS.has(host)||/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^169\.254\./.test(host))return null;
  u.hash='';
  return {url:u.toString(),host};
}
export function validateExternalUrl(url:string, allowedHosts?:Set<string>){
  const parsed=parse(url); if(!parsed)return {ok:false as const};
  if(allowedHosts&&!allowedHosts.has(parsed.host))return {ok:false as const};
  return {ok:true as const,url:parsed.url};
}
export async function openExternalUrl(url:string, allowedHosts?:Set<string>){
  const checked=validateExternalUrl(url,allowedHosts);
  if(!checked.ok){Alert.alert('Link blocked','This external link could not be opened safely.');return false;}
  try{if(!(await Linking.canOpenURL(checked.url)))throw new Error('unsupported');await Linking.openURL(checked.url);return true;}catch{Alert.alert('Link','Could not open the secure external page.');return false;}
}
export async function openPaymentUrl(url:string){return openExternalUrl(url,PAYMENT_HOSTS);}
export async function openGoogleUrl(url:string){return openExternalUrl(url,GOOGLE_HOSTS);}
export { PAYMENT_HOSTS, GOOGLE_HOSTS };
