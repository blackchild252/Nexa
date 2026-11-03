const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function load(){const src=fs.readFileSync(path.join(__dirname,'..','src','formAccessibility.ts'),'utf8').replace(/^export function /gm,'function ').replace(/: string/g,'').replace(/: any/g,'').replace(/: boolean/g,'').replace(/\?: unknown/g,'').replace(/: unknown/g,'');const ctx={module:{exports:{}},exports:{}};vm.runInNewContext(`${src}\nmodule.exports={fieldA11y,errorA11y,formSubmitA11y};`,ctx);return ctx.module.exports;}
test('B77 field semantics expose labels and invalid state',()=>{const a=load().fieldA11y('Email address','Invalid email');assert.equal(a.accessibilityLabel,'Email address');assert.equal(a.accessibilityState.invalid,true);assert.equal(a['aria-invalid'],true);assert.equal(a['aria-describedby'],'email-address-error');});
test('B77 valid fields remain neutral',()=>{const a=load().fieldA11y('Name');assert.equal(a.accessibilityLabel,'Name');assert.equal(a.accessibilityState,undefined);assert.equal(a['aria-invalid'],undefined);});
test('B77 errors are announced and addressable',()=>{const a=load().errorA11y('Group form','Name is required');assert.equal(a.accessibilityRole,'alert');assert.equal(a.accessibilityLiveRegion,'assertive');assert.equal(a.nativeID,'group-form-error');});
test('B77 submit semantics expose busy state',()=>{const a=load().formSubmitA11y('Create account',true);assert.equal(a.accessibilityRole,'button');assert.equal(a.accessibilityLabel,'Create account, submitting');assert.equal(a.accessibilityState.busy,true);assert.equal(a['aria-busy'],true);});
test('B77 key forms use shared validation semantics',()=>{const groups=fs.readFileSync(path.join(__dirname,'..','src','GroupsTab.tsx'),'utf8');const admin=fs.readFileSync(path.join(__dirname,'..','src','AdminDisputesScreen.tsx'),'utf8');for(const s of [groups,admin]) assert.match(s,/formAccessibility/);assert.match(groups,/errorA11y\("Group form"/);assert.match(admin,/fieldA11y\(`Resolution for dispute/);});
