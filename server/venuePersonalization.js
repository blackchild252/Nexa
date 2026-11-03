"use strict";
function rankEvents(rows=[],prefs={}){const favoriteType=String(prefs.type||"").toLowerCase(); const favoriteVenue=String(prefs.venue||"").toLowerCase(); return [...rows].sort((a,b)=>{const score=x=>(favoriteType&&String(x.type||"").toLowerCase()===favoriteType?3:0)+(favoriteVenue&&String(x.venue||"").toLowerCase().includes(favoriteVenue)?2:0)+(Number(x.quantity||0)>0?1:0); return score(b)-score(a)||new Date(a.startsAt||0)-new Date(b.startsAt||0);});}
module.exports={rankEvents};
