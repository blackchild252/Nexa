const test=require('node:test');
const assert=require('node:assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/auth.tsx'),'utf8');

test('web auth token survives same-tab reload through guarded sessionStorage',()=>{
  assert.match(src,/WEB_TOKEN_STORAGE_KEY='nexa\.auth\.web\.token\.v1'/);
  assert.match(src,/window\.sessionStorage\.getItem\(WEB_TOKEN_STORAGE_KEY\)/);
  assert.match(src,/window\.sessionStorage\.setItem\(WEB_TOKEN_STORAGE_KEY,token\)/);
  assert.match(src,/window\.sessionStorage\.removeItem\(WEB_TOKEN_STORAGE_KEY\)/);
  assert.doesNotMatch(src,/localStorage\.getItem|localStorage\.setItem|localStorage\.removeItem/);
});

test('native auth token storage remains SecureStore-backed',()=>{
  assert.match(src,/SecureStore\.getItemAsync\(TOKEN_KEY\)/);
  assert.match(src,/SecureStore\.setItemAsync\(TOKEN_KEY,token\)/);
  assert.match(src,/SecureStore\.deleteItemAsync\(TOKEN_KEY\)/);
});
