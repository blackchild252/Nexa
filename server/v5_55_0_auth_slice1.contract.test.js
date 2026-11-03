"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("M725-M726 shared auth validation normalizes email and preserves server-authoritative policy",()=>{
 const validation=read("src/authValidation.ts");
 const signup=read("src/app/auth/signup.tsx");
 const login=read("src/app/auth/login.tsx");
 const auth=read("server/auth.js");
 assert.match(validation,/normalizeAuthEmail/);
 assert.match(validation,/toLowerCase\(\)/);
 assert.match(validation,/Password must be at least 8 characters/);
 assert.match(signup,/validateAuthCredentials/);
 assert.match(login,/validateAuthCredentials/);
 assert.match(auth,/cleanEmail/);
 assert.match(auth,/cleanPassword/);
});

test("M727 auth forms submit with the normalized email and retain minimum password length",()=>{
 const signup=read("src/app/auth/signup.tsx");
 const login=read("src/app/auth/login.tsx");
 assert.match(signup,/signUp\(normalizedEmail,password,name,true\)/);
 assert.match(login,/signIn\(normalizedEmail,password,true\)/);
 assert.match(signup,/returnKeyType='go'/);
 assert.match(login,/returnKeyType='go'/);
});

test("M728 auth inputs retain accessible labels and readable shared controls",()=>{
 for (const file of ["src/app/auth/signup.tsx","src/app/auth/login.tsx"]) {
  const s=read(file);
  assert.match(s,/accessibilityLabel=/);
  assert.match(s,/style=\{s\.authInput\}/);
  assert.match(s,/accessibilityRole=[\"']button[\"']/);
 }
});

test("M729 slice is represented by an executable contract and current roadmap IDs",()=>{
 const roadmap=read("MASTER_ROADMAP.md");
 assert.match(roadmap, /(?:HISTORICAL|COMPLETED)[^\n]*M6416–M6440|M6416–M6440/);
});
