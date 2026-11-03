const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
function extractJson(source, expression) { const match=source.match(expression); assert.ok(match,'Expected canonical JSON source'); return JSON.parse(match[1]); }

test('Main country dataset contains unique ISO-style codes and canonical names for countries and territories',()=>{
  const source=read('src/countries.ts'); const list=extractJson(source,/export const NEXA_COUNTRIES: NexaCountry\[\] = (\[[\s\S]*?\]);/);
  const codes=list.map(x=>x.code); assert.ok(list.length>=240); assert.equal(new Set(codes).size,codes.length);
  for(const item of list){assert.match(item.code,/^[A-Z]{2}$/);assert.ok(item.name.trim().length>1);}
});

test('regional metadata covers every canonical country and leaves unknown metadata explicit',()=>{
  const list=extractJson(read('src/countries.ts'),/export const NEXA_COUNTRIES: NexaCountry\[\] = (\[[\s\S]*?\]);/);
  const metadata=extractJson(read('src/regionalization.ts'),/const COUNTRY_METADATA: Record<string, Omit<NexaCountryMetadata, 'availability'>> = (\{[\s\S]*?\});\nexport const NEXA_LOCALES/);
  assert.deepEqual(Object.keys(metadata).sort(),list.map(x=>x.code).sort());
  assert.equal(metadata.NG.callingCode,'234'); assert.equal(metadata.GB.currency,'GBP'); assert.equal(metadata.NG.timeZone,'Africa/Lagos');
  assert.ok(Object.values(metadata).every(item => typeof item.callingCode === 'string' && item.callingCode.length > 0));
  assert.ok(Object.values(metadata).every(item => typeof item.region === 'string' && item.region.length > 0));
  assert.ok(Object.values(metadata).every(item => typeof item.timeZone === 'string' && item.timeZone.length > 0));
  assert.ok(Object.entries(metadata).every(([code,item]) => code === 'AQ' ? item.localCurrency === null : typeof item.localCurrency === 'string')); 
  assert.equal(metadata.AQ.currency,null); assert.equal(metadata.AQ.localCurrency,null); assert.equal(metadata.AQ.timeZone,'Antarctica/Casey');
});

test('country picker has alphabetical browsing, numeric calling-code search, flags and safe no-match handling',()=>{
  const picker=read('src/CountryPicker.tsx'); const regional=read('src/regionalization.ts');
  assert.match(picker,/sortedCountries/); assert.match(picker,/digits.length > 0/); assert.match(picker,/countryFlag/); assert.match(picker,/No country matches/);
  assert.match(regional,/DisplayNames/); assert.match(regional,/countryFlag/); assert.match(regional,/availability: 'listed'/);
});

test('regional utility foundation handles address order, optional postal codes, measurements and explicit restrictions',()=>{
  const regional=read('src/regionalization.ts');
  assert.match(regional,/addressFieldOrderForCountry/); assert.match(regional,/postalCodeHintForCountry/); assert.match(regional,/normalizePostalCode/);
  assert.match(regional,/measurementSystemForCountry/); assert.match(regional,/NEXA_RESTRICTED_COUNTRY_RULES: ReadonlyArray.*= \[\]/);
  assert.match(regional,/formatInternationalPhone/); assert.match(regional,/formatRegionalDateTime/);
});

test('Main numeric counters no longer force Nigerian locale formatting',()=>{
  for(const file of ['src/Subscription.tsx','src/MoneyDashboard.tsx','src/YaayzSocialFeed.tsx','src/LeisureKitchenScreen.tsx']) assert.doesNotMatch(read(file),/toLocaleString\(['"]en-NG['"]\)/,file);
});

test('Main serves canonical country metadata with local currency and display-currency authority clearly separated',()=>{
  const route=read('server/index.js'); const rows=JSON.parse(require('node:fs').readFileSync(path.join(root,'server/countryRegionalization.json'),'utf8'));
  assert.match(route,/app\.get\("\/api\/regional\/countries", auth\.authMiddleware/);
  assert.equal(rows.length,249); assert.ok(rows.every(item=>item.directoryStatus==='listed'&&item.code&&item.name&&item.callingCode&&item.region&&item.timeZone));
  assert.equal(rows.find(item=>item.code==='NG').localCurrency,'NGN'); assert.equal(rows.find(item=>item.code==='NG').supportedDisplayCurrency,'NGN');
  assert.equal(rows.find(item=>item.code==='AQ').localCurrency,null);
});
