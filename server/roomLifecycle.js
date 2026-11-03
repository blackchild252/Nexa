"use strict";
function summarizeRooms(rows=[]){const counts={total:rows.length,discoverable:0,private:0,owned:0,member:0}; for(const r of rows){if(Number(r.discoverable)===1)counts.discoverable++;else counts.private++; if(String(r.role)==="owner")counts.owned++;else counts.member++;} return counts;}
function normalizeRoomPatch(body={}){const out={}; if(body.name!==undefined){const name=String(body.name).trim(); if(name)out.name=name.slice(0,80);} if(body.discoverable!==undefined)out.discoverable=Boolean(body.discoverable)?1:0; return out;}
module.exports={summarizeRooms,normalizeRoomPatch};
