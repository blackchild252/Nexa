"use strict";
const PROFILES=new Set(["consumer_dami","admin_operations"]);
const SENSITIVE=new Set(["password","passcode","token","access_token","refresh_token","apiKey","api_key","secret","authorization","cookie","email","phone","address","balance","amount","orderId","paymentId","providerReference","accountNumber","cardNumber"]);
const SECRET_PATTERNS=[/\b(sk-[A-Za-z0-9_-]{10,})\b/i,/\b(?:token|password|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/i];
function clean(v,max=10000){return String(v??"").trim().slice(0,max)}
function scrub(value,key=""){if(Array.isArray(value))return value.slice(0,20).map(v=>scrub(v,""));if(!value||typeof value!=="object")return typeof value==="string"?clean(value):value;const out={};for(const [k,v] of Object.entries(value)){if(SENSITIVE.has(k)||SENSITIVE.has(k.replace(/[-_]/g,"")))continue;out[k]=scrub(v,k)}return out}
function hasSecret(value){const s=typeof value==="string"?value:JSON.stringify(value);return SECRET_PATTERNS.some(re=>re.test(s));}
function sanitizeTrainingExample(example={}){if(!PROFILES.has(example.profileId))throw new Error("Unknown training profile.");const provenance=clean(example.provenance,240);if(!provenance)throw new Error("Training example provenance is required.");const input=scrub(example.input);const output=clean(example.output,12000);if(hasSecret(input)||hasSecret(output))throw new Error("Training example contains a secret pattern.");return Object.freeze({profileId:example.profileId,provenance,version:clean(example.version||"1",80),input,output});}
function validateTrainingDataset(dataset){if(!Array.isArray(dataset)||!dataset.length)throw new Error("Training dataset must be a non-empty array.");const sanitized=dataset.map(sanitizeTrainingExample);const profiles=new Set(sanitized.map(x=>x.profileId));if(profiles.size>1)throw new Error("Training dataset must contain one AI profile at a time.");return Object.freeze(sanitized)}
module.exports={PROFILES,SENSITIVE,sanitizeTrainingExample,validateTrainingDataset};
