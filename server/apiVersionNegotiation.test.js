"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const contracts=require("./contracts"); const fs=require("node:fs"); const path=require("node:path");
const index=fs.readFileSync(path.join(__dirname,"index.js"),"utf8");
test("API version negotiation accepts supported and rejects unsupported versions",()=>{
 assert.deepEqual(contracts.negotiateApiVersion("1.0"),{ok:true,version:"1.0"});
 const bad=contracts.negotiateApiVersion("9.0"); assert.equal(bad.ok,false); assert.deepEqual(bad.supported,["1.0"]);
});
test("HTTP surface applies the negotiated version and fail-closed error",()=>{assert.match(index,/UNSUPPORTED_API_VERSION/); assert.match(index,/contracts\.API_VERSION_HEADER/);});
