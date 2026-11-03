"use strict";
const CALL_TTL_MS = 2 * 60 * 60 * 1000;
const { reconnectState, participantContinuity, callHistory } = require("./groupCallContinuity");
const SIGNAL_LIMIT = 300;
const VALID_TYPES = new Set(["offer", "answer", "candidate"]);
const VALID_MEDIA = new Set(["audio", "video"]);

function createGroupCallSignaling({ db, auth, genRowId, sendPush }) {
  const now = () => new Date().toISOString();
  const A = auth.authMiddleware;
  const member = (callId, userId) => db.prepare("SELECT * FROM group_call_participants WHERE callId=? AND userId=?").get(callId, userId);
  const call = (id) => db.prepare("SELECT * FROM group_call_sessions WHERE id=?").get(id);
  function iceServers() {
    const servers = [{ urls: "stun:stun.l.google.com:19302" }];
    const url = String(process.env.NEXA_TURN_URL || "").trim();
    const username = String(process.env.NEXA_TURN_USERNAME || "").trim();
    const credential = String(process.env.NEXA_TURN_CREDENTIAL || "").trim();
    if (url && username && credential) servers.push({ urls:url, username, credential });
    return servers;
  }
  function expire(c) {
    if (!c || ["ended","expired"].includes(c.status)) return c;
    if (Date.now() - Date.parse(c.createdAt) > CALL_TTL_MS) {
      db.prepare("UPDATE group_call_sessions SET status='expired',endedAt=? WHERE id=? AND status NOT IN ('ended','expired')").run(now(), c.id);
      return call(c.id);
    }
    return c;
  }
  function output(c, userId) {
    const participants = db.prepare("SELECT userId,role,status,joinedAt,leftAt,reconnectCount,lastSeenAt FROM group_call_participants WHERE callId=? ORDER BY joinedAt ASC").all(c.id);
    return { id:c.id, roomId:c.roomId, hostId:c.hostId, media:c.media, status:c.status, createdAt:c.createdAt, startedAt:c.startedAt||null, endedAt:c.endedAt||null, participants, me:participants.find(p=>p.userId===userId)||null };
  }
  function register(app) {
    app.post("/api/zeeza/group-calls", A, (req,res) => {
      const roomId=String(req.body?.roomId||"");
      const media=VALID_MEDIA.has(String(req.body?.media))?String(req.body.media):"audio";
      if(!roomId) return res.status(400).json({error:"Room is required."});
      const me=db.prepare("SELECT * FROM chat_room_members WHERE roomId=? AND userId=?").get(roomId,req.user.id);
      if(!me) return res.status(403).json({error:"You must be a room member to start a group call."});
      const room=db.prepare("SELECT id,name FROM chat_rooms WHERE id=?").get(roomId);
      if(!room) return res.status(404).json({error:"Room not found."});
      const active=db.prepare("SELECT id FROM group_call_sessions WHERE roomId=? AND status IN ('ringing','active') ORDER BY createdAt DESC LIMIT 1").get(roomId);
      if(active) return res.status(409).json({error:"A group call is already active in this room."});
      const id=genRowId("gcall"), t=now();
      const members=db.prepare("SELECT userId,role,joinedAt FROM chat_room_members WHERE roomId=? ORDER BY joinedAt ASC").all(roomId);
      db.transaction(()=>{
        db.prepare("INSERT INTO group_call_sessions (id,roomId,hostId,media,status,createdAt) VALUES (?,?,?,?,?,?)").run(id,roomId,req.user.id,media,"ringing",t);
        for(const m of members) db.prepare("INSERT INTO group_call_participants (id,callId,userId,role,status,joinedAt) VALUES (?,?,?,?,?,?)").run(genRowId("gcallp"),id,m.userId,m.userId===req.user.id?"host":"member",m.userId===req.user.id?"joined":"invited",t);
      })();
      if(typeof sendPush==="function"){
        const host=db.prepare("SELECT name,username FROM users WHERE id=?").get(req.user.id);
        const hostName=(host&&(host.name||host.username))||"A member";
        for(const m of members){ if(m.userId===req.user.id) continue;
          try{ Promise.resolve(sendPush(m.userId,"Incoming group call",`${hostName} started a ${media==="video"?"video":"voice"} call in ${room.name||"your group"}`,{screen:"chat_room",roomId,type:"group_call",media,callId:id,dedupeKey:`group-call:${id}`})).catch(()=>{}); }catch(_){ /* never block the call on a push */ }
        }
      }
      res.status(201).json({call:output(call(id),req.user.id),iceServers:iceServers()});
    });
    app.get("/api/zeeza/group-calls/room/:roomId/active", A, (req,res) => {
      const roomId=String(req.params.roomId||"");
      const me=db.prepare("SELECT id FROM chat_room_members WHERE roomId=? AND userId=?").get(roomId,req.user.id);
      if(!me) return res.status(403).json({error:"You must be a room member to view group-call state."});
      const c=db.prepare("SELECT * FROM group_call_sessions WHERE roomId=? AND status IN ('ringing','active') ORDER BY createdAt DESC LIMIT 1").get(roomId);
      if(!c) return res.json({active:false});
      const fresh=expire(c); if(["ended","expired"].includes(fresh.status)) return res.json({active:false});
      res.json({active:true,call:output(fresh,req.user.id),iceServers:iceServers()});
    });
    app.get("/api/zeeza/group-calls/:callId", A, (req,res) => {
      const c=call(req.params.callId); if(!c) return res.status(404).json({error:"Group call not found."});
      if(!member(c.id,req.user.id)) return res.status(403).json({error:"You are not a participant in this group call."});
      const fresh=expire(c); res.json({call:output(fresh,req.user.id),iceServers:iceServers()});
    });
    app.post("/api/zeeza/group-calls/:callId/join", A, (req,res) => {
      const c=call(req.params.callId); if(!c) return res.status(404).json({error:"Group call not found."});
      const p=member(c.id,req.user.id); if(!p) return res.status(403).json({error:"You are not a participant in this group call."});
      if(["ended","expired"].includes(c.status)) return res.status(409).json({error:"This group call has ended."});
      const t=now(); db.transaction(()=>{ db.prepare("UPDATE group_call_participants SET status='joined',joinedAt=COALESCE(joinedAt,?),leftAt=NULL,lastSeenAt=? WHERE callId=? AND userId=?").run(t,t,c.id,req.user.id); db.prepare("UPDATE group_call_sessions SET status='active',startedAt=COALESCE(startedAt,?) WHERE id=? AND status='ringing'").run(t,c.id); })();
      res.json({call:output(call(c.id),req.user.id),iceServers:iceServers()});
    });
    app.post("/api/zeeza/group-calls/:callId/leave", A, (req,res) => {
      const c=call(req.params.callId); if(!c) return res.status(404).json({error:"Group call not found."});
      if(!member(c.id,req.user.id)) return res.status(403).json({error:"You are not a participant in this group call."});
      db.transaction(()=>{ const t=now(); db.prepare("UPDATE group_call_participants SET status='left',leftAt=?,lastSeenAt=? WHERE callId=? AND userId=?").run(t,t,c.id,req.user.id); const remaining=db.prepare("SELECT COUNT(*) AS n FROM group_call_participants WHERE callId=? AND status='joined'").get(c.id).n; if(!remaining) db.prepare("UPDATE group_call_sessions SET status='ended',endedAt=? WHERE id=? AND status NOT IN ('ended','expired')").run(t,c.id); })();
      res.json({call:output(call(c.id),req.user.id)});
    });
    app.post("/api/zeeza/group-calls/:callId/reconnect", A, (req,res) => {
      const c=call(req.params.callId); if(!c) return res.status(404).json({error:"Group call not found."});
      const p=member(c.id,req.user.id); if(!p) return res.status(403).json({error:"You are not a participant in this group call."});
      if(["ended","expired"].includes(c.status)) return res.status(409).json({error:"This group call has ended."});
      const next=reconnectState(p,now());
      db.transaction(()=>{ db.prepare("UPDATE group_call_participants SET status='joined',reconnectCount=?,lastSeenAt=?,leftAt=NULL WHERE callId=? AND userId=?").run(next.reconnectCount,next.lastSeenAt,c.id,req.user.id); db.prepare("UPDATE group_call_sessions SET status='active',startedAt=COALESCE(startedAt,?) WHERE id=?").run(next.lastSeenAt,c.id); })();
      res.json({call:output(call(c.id),req.user.id),continuity:participantContinuity(db.prepare("SELECT userId,status,joinedAt,leftAt,reconnectCount,lastSeenAt FROM group_call_participants WHERE callId=?").all(c.id))});
    });
    app.get("/api/zeeza/group-calls/history", A, (req,res) => {
      const rows=db.prepare("SELECT DISTINCT c.* FROM group_call_sessions c JOIN group_call_participants p ON p.callId=c.id WHERE p.userId=? ORDER BY c.createdAt DESC LIMIT 100").all(req.user.id);
      res.json({history:callHistory(rows)});
    });

    app.post("/api/zeeza/group-calls/:callId/signals", A, (req,res) => {
      const c=call(req.params.callId); if(!c) return res.status(404).json({error:"Group call not found."});
      if(!member(c.id,req.user.id)) return res.status(403).json({error:"You are not a participant in this group call."});
      const type=String(req.body?.type||""); if(!VALID_TYPES.has(type)) return res.status(400).json({error:"Unsupported call signal."});
      if(["ended","expired"].includes(c.status)) return res.status(409).json({error:"This group call has ended."});
      const targetId=req.body?.targetUserId?String(req.body.targetUserId):null;
      if(targetId && !member(c.id,targetId)) return res.status(400).json({error:"Signal target is not a call participant."});
      const payload=req.body?.payload;
      if(!payload||typeof payload!=="object"||JSON.stringify(payload).length>100000) return res.status(400).json({error:"Invalid call signal."});
      const id=genRowId("gcallsig"); db.transaction(()=>{ db.prepare("INSERT INTO group_call_signals (id,callId,senderId,targetUserId,type,payload,createdAt) VALUES (?,?,?,?,?,?,?)").run(id,c.id,req.user.id,targetId,type,JSON.stringify(payload),now()); db.prepare("DELETE FROM group_call_signals WHERE callId=? AND id NOT IN (SELECT id FROM group_call_signals WHERE callId=? ORDER BY createdAt DESC LIMIT ?)").run(c.id,c.id,SIGNAL_LIMIT); db.prepare("UPDATE group_call_participants SET lastSeenAt=? WHERE callId=? AND userId=?").run(now(),c.id,req.user.id); })();
      res.status(201).json({ok:true,id});
    });
    app.get("/api/zeeza/group-calls/:callId/signals", A, (req,res) => {
      const c=call(req.params.callId); if(!c) return res.status(404).json({error:"Group call not found."});
      if(!member(c.id,req.user.id)) return res.status(403).json({error:"You are not a participant in this group call."});
      const after=String(req.query.after||"");
      const rows=after?db.prepare("SELECT id,senderId,targetUserId,type,payload,createdAt FROM group_call_signals WHERE callId=? AND createdAt>? AND (targetUserId IS NULL OR targetUserId=?) ORDER BY createdAt ASC LIMIT ?").all(c.id,after,req.user.id,SIGNAL_LIMIT):db.prepare("SELECT id,senderId,targetUserId,type,payload,createdAt FROM group_call_signals WHERE callId=? AND (targetUserId IS NULL OR targetUserId=?) ORDER BY createdAt ASC LIMIT ?").all(c.id,req.user.id,SIGNAL_LIMIT);
      res.json({signals:rows.map(r=>({...r,payload:JSON.parse(r.payload)}))});
    });
  }
  return {register};
}
module.exports={createGroupCallSignaling};
