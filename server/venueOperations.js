"use strict";
function summarizeTickets(rows=[]){const byVenue={};for(const r of rows){const venue=String(r.venue||"Unspecified").trim()||"Unspecified";if(!byVenue[venue])byVenue[venue]={venue,listings:0,inventory:0,upcoming:0};byVenue[venue].listings++;byVenue[venue].inventory+=Math.max(0,Number(r.quantity)||0);if(r.startsAt&&new Date(r.startsAt).getTime()>=Date.now())byVenue[venue].upcoming++;}return Object.values(byVenue);}
function eventLifecycle(rows=[]){return rows.reduce((a,r)=>{const s=String(r.status||"unknown");a[s]=(a[s]||0)+1;return a;},{});}
module.exports={summarizeTickets,eventLifecycle};
