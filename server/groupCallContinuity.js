"use strict";
function participantContinuity(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({userId:String(r.userId||''),status:String(r.status||'invited'),joinedAt:r.joinedAt||null,leftAt:r.leftAt||null,reconnectCount:Number(r.reconnectCount||0),lastSeenAt:r.lastSeenAt||null}));}
function callHistory(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({id:String(r.id||''),roomId:String(r.roomId||''),hostId:String(r.hostId||''),media:String(r.media||'audio'),status:String(r.status||'unknown'),createdAt:r.createdAt||null,startedAt:r.startedAt||null,endedAt:r.endedAt||null}));}
function reconnectState(row,now){return {status:String(row?.status||'joined'),reconnectCount:Number(row?.reconnectCount||0)+1,lastSeenAt:now};}
module.exports={participantContinuity,callHistory,reconnectState};
