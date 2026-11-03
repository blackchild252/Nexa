"use strict";
function uniqueRows(rows=[]){const seen=new Set();return (Array.isArray(rows)?rows:[]).filter(r=>{const id=String(r?.id||"");if(!id||seen.has(id))return false;seen.add(id);return true;});}
function batch(rows=[],prefs={}){const frequency=String(prefs.digestFrequency||"off");if(!prefs.digestEnabled||frequency==="off")return {enabled:false,frequency,items:[]};return {enabled:true,frequency,items:uniqueRows(rows).slice(0,25).map(r=>({id:String(r.id),type:String(r.type||"system"),title:String(r.title||""),createdAt:r.createdAt}))};}
function recovery(rows=[]){const due=uniqueRows(rows).filter(r=>["pending","retry"].includes(String(r.status)));return {due:due.length,ids:due.map(r=>String(r.id))};}
module.exports={batch,recovery,uniqueRows};
