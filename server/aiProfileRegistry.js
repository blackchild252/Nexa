"use strict";
const {resolveProvider}=require("./aiProviderGateway");
const PROFILE_IDS=Object.freeze({CONSUMER:"consumer_dami",ADMIN:"admin_operations"});
const PROFILE_ENV=Object.freeze({
 [PROFILE_IDS.CONSUMER]:{model:"NEXA_AI_CONSUMER_MODEL",candidateModel:"NEXA_AI_CONSUMER_CANDIDATE_MODEL",version:"NEXA_AI_CONSUMER_PROFILE_VERSION",rollbackModel:"NEXA_AI_CONSUMER_ROLLBACK_MODEL",provider:"NEXA_AI_CONSUMER_PROVIDER"},
 [PROFILE_IDS.ADMIN]:{model:"NEXA_AI_ADMIN_MODEL",candidateModel:"NEXA_AI_ADMIN_CANDIDATE_MODEL",version:"NEXA_AI_ADMIN_PROFILE_VERSION",rollbackModel:"NEXA_AI_ADMIN_ROLLBACK_MODEL",provider:"NEXA_AI_ADMIN_PROVIDER"},
});
function requireProfile(id){if(!PROFILE_ENV[id])throw new Error(`Unknown AI profile: ${id}`);return id;}
function getAiProfile(profileId,env=process.env,{db=null}={}){const id=requireProfile(profileId),keys=PROFILE_ENV[id];const provider=resolveProvider(env[keys.provider]||env.DAMI_AI_PROVIDER||env.NEXA_AI_PROVIDER,env);let model=String(env[keys.model]||env.XAI_MODEL||"grok-4.7").trim();
if(db){try{const row=db.prepare("SELECT model,version FROM ai_profile_versions WHERE profileId=? AND state='promoted' ORDER BY createdAt DESC LIMIT 1").get(id);if(row?.model) model=String(row.model)}catch(_){} }const candidateModel=String(env[keys.candidateModel]||"").trim()||null;const rollbackModel=String(env[keys.rollbackModel]||"").trim()||null;const version=String(env[keys.version]||"1").trim()||"1";return Object.freeze({id,provider,model,version,candidateModel,rollbackModel,state:candidateModel?"candidate":"promoted"});}
function resolveAiModel(profileId,env=process.env,options={}){return getAiProfile(profileId,env,options).model;}
module.exports={PROFILE_IDS,PROFILE_ENV,getAiProfile,resolveAiModel};
