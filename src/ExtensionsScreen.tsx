import { NexaPressable } from './motion';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, Text, TextInput,  View} from 'react-native';
import {authedFetch} from './api';
import {s} from './styles';
import { theme, tc, ds } from './theme';
import {NexaWorldBackground} from './NexaWorldBackground';

type Extension = {
  id:string; name:string; slug:string; version:string; description:string;
  requestedScopes:string[]; publicConfig:Record<string,any>; status:'registered'|'enabled'|'disabled'|'revoked';
  consentedScopes:string[]; canEnable:boolean; createdAt:string; updatedAt:string;
  compatibility:{minNexaVersion:string;maxNexaVersion:string};
};
type Audit = {id:string; action:string; metadata:Record<string,any>; createdAt:string};

type Props = {onBack:()=>void};

const scopeLabels:Record<string,string> = {
  'profile.read':'Profile', 'money.read':'Sky Money', 'market.read':'Market',
  'mall.read':'Mall', 'chat.read':'Chat', 'notifications.send':'Notifications',
};

function statusLabel(status:string){return status.charAt(0).toUpperCase()+status.slice(1);}

export function ExtensionsScreen({onBack}:Props){
  const [extensions,setExtensions]=useState<Extension[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [audit,setAudit]=useState<Record<string,Audit[]>>({});
  const [showRegister,setShowRegister]=useState(false);
  const [name,setName]=useState('');
  const [slug,setSlug]=useState('');
  const [version,setVersion]=useState('1.0');
  const [description,setDescription]=useState('');
  const [scopes,setScopes]=useState<string[]>([]);
  const [registering,setRegistering]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [editName,setEditName]=useState('');
  const [editVersion,setEditVersion]=useState('');
  const [editDescription,setEditDescription]=useState('');
  const [editMinNexaVersion,setEditMinNexaVersion]=useState('3.59.0');
  const [editMaxNexaVersion,setEditMaxNexaVersion]=useState('');
  const [savingEdit,setSavingEdit]=useState(false);
  const loadRequest=useRef(0);
  const auditRequests=useRef<Record<string,number>>({});

  const load=useCallback(async()=>{
    const requestId=++loadRequest.current;
    setLoading(true);
    try { const data=await authedFetch('/api/extensions'); if(requestId===loadRequest.current)setExtensions(data.extensions||[]); }
    catch(e:any){if(requestId===loadRequest.current)Alert.alert('Extensions',e.message||'Could not load extensions.');}
    finally{if(requestId===loadRequest.current)setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  const toggleScope=(scope:string)=>setScopes(prev=>prev.includes(scope)?prev.filter(x=>x!==scope):[...prev,scope]);

  const act=async(id:string, action:string, options:any={})=>{
    setBusy(id+action);
    try {
      const method=action==='revoke'?'DELETE':'POST';
      const path=action==='revoke'?`/api/extensions/${id}`:
        action==='consent'?`/api/extensions/${id}/consent`:
        `/api/extensions/${id}/${action}`;
      await authedFetch(path,{method, ...(action==='consent'?{body:JSON.stringify({scopes:options.scopes})}:{})});
      await load();
    } catch(e:any){Alert.alert('Extensions',e.message||'Action failed.');}
    finally{setBusy(null);}
  };

  const toggleConsent=(ext:Extension)=>{
    const missing=ext.requestedScopes.filter(x=>!ext.consentedScopes.includes(x));
    if(missing.length) return act(ext.id,'consent',{scopes:missing});
    return authedFetch(`/api/extensions/${ext.id}/consent`,{method:'DELETE',body:JSON.stringify({scopes:ext.requestedScopes})})
      .then(load).catch((e:any)=>Alert.alert('Extensions',e.message||'Could not revoke consent.'));
  };

  const loadAudit=async(id:string)=>{
    if(audit[id]){setExpanded(expanded===id?null:id);return;}
    const requestId=(auditRequests.current[id]||0)+1; auditRequests.current[id]=requestId;
    try { const data=await authedFetch(`/api/extensions/${id}/audit`); if(auditRequests.current[id]===requestId){setAudit(prev=>({...prev,[id]:data.audit||[]}));setExpanded(id);} }
    catch(e:any){if(auditRequests.current[id]===requestId)Alert.alert('Audit',e.message||'Could not load audit history.');}
  };

  const register=async()=>{
    if(!name.trim()||!slug.trim()){Alert.alert('Extensions','Name and slug are required.');return;}
    setRegistering(true);
    try{
      await authedFetch('/api/extensions',{method:'POST',body:JSON.stringify({name,slug,version,description,requestedScopes:scopes,publicConfig:{}})});
      setName('');setSlug('');setVersion('1.0');setDescription('');setScopes([]);setShowRegister(false);await load();
    }catch(e:any){Alert.alert('Extensions',e.message||'Could not register extension.');}
    finally{setRegistering(false);}
  };

  const scopeList=useMemo(()=>Object.keys(scopeLabels),[]);
  const startEdit=(ext:Extension)=>{setEditing(ext.id);setEditName(ext.name);setEditVersion(ext.version);setEditDescription(ext.description);setEditMinNexaVersion(ext.compatibility?.minNexaVersion||'3.59.0');setEditMaxNexaVersion(ext.compatibility?.maxNexaVersion||'');};
  const saveEdit=async()=>{
    if(!editing)return;
    setSavingEdit(true);
    try{await authedFetch(`/api/extensions/${editing}`,{method:'PATCH',body:JSON.stringify({name:editName,version:editVersion,description:editDescription,compatibility:{minNexaVersion:editMinNexaVersion,maxNexaVersion:editMaxNexaVersion}})});setEditing(null);await load();}
    catch(e:any){Alert.alert('Extensions',e.message||'Could not save changes.');}
    finally{setSavingEdit(false);}
  };


  return <NexaWorldBackground world="extensions"><View style={s.wrap}>
    <View style={ds({flexDirection:'row',alignItems:'center',marginBottom:16})}>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Back from Extensions" onPress={onBack} style={ds({paddingRight:14})}><Text style={s.back}>‹</Text></NexaPressable>
      <View style={ds({flex:1})}><Text style={s.heading}>Extensions</Text><Text style={s.muted}>Connected capabilities and permissions</Text></View>
      <NexaPressable accessibilityRole="button" accessibilityLabel={showRegister?"Close extension registration":"Add extension"} accessibilityState={{expanded:showRegister}} onPress={()=>setShowRegister(!showRegister)} style={s.smallButton}><Text style={s.buttonText}>{showRegister?'Close':'Add'}</Text></NexaPressable>
    </View>

    {showRegister&&<View style={s.card}>
      <Text style={s.section}>Register extension</Text>
      <Text style={s.muted}>Only public metadata is stored. NEXA never asks extensions for server secrets here.</Text>
      <TextInput accessibilityLabel="Extension name" style={s.authInput} placeholder="Extension name" placeholderTextColor={tc("#666")} value={name} onChangeText={setName}/>
      <TextInput accessibilityLabel="Extension slug" style={s.authInput} placeholder="Slug, e.g. my-tool" placeholderTextColor={tc("#666")} autoCapitalize="none" value={slug} onChangeText={setSlug}/>
      <TextInput accessibilityLabel="Extension version" style={s.authInput} placeholder="Version" placeholderTextColor={tc("#666")} value={version} onChangeText={setVersion}/>
      <TextInput accessibilityLabel="Extension description" style={[s.authInput,{minHeight:70}]} placeholder="Description" placeholderTextColor={tc("#666")} multiline value={description} onChangeText={setDescription}/>
      <Text style={[s.muted,{marginTop:12,marginBottom:8}]}>Requested permissions</Text>
      <View style={ds({flexDirection:'row',flexWrap:'wrap'})}>{scopeList.map(scope=><NexaPressable accessibilityRole="checkbox" accessibilityState={{checked:scopes.includes(scope)}} accessibilityLabel={`Toggle extension scope ${scopeLabels[scope]}`} key={scope} onPress={()=>toggleScope(scope)} style={[s.pill,scopes.includes(scope)&&s.pillActive,{marginBottom:8}]}><Text style={s.pillText}>{scopeLabels[scope]}</Text></NexaPressable>)}</View>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Register extension" accessibilityState={{disabled:registering}} disabled={registering} onPress={register} style={[s.button,{marginTop:8}]}>{registering?<ActivityIndicator/>:<Text style={s.buttonText}>Register extension</Text>}</NexaPressable>
    </View>}

    {loading?<ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading extensions" style={ds({marginTop:30})}/>:<ScrollView showsVerticalScrollIndicator={false}>
      {!extensions.length&&!showRegister&&<View style={s.card}><Text style={s.section}>No extensions yet</Text><Text style={s.muted}>Register an extension to start managing permissions and consent.</Text></View>}
      {extensions.map(ext=>{
        const missing=ext.requestedScopes.filter(x=>!ext.consentedScopes.includes(x));
        return <View key={ext.id} style={s.card}>
          <View style={ds({flexDirection:'row',alignItems:'center'})}>
            <View style={ds({flex:1})}><Text style={s.section}>{ext.name}</Text><Text style={s.muted}>{ext.slug} · v{ext.version}</Text></View>
            <View style={[s.pill,{marginRight:0}]}><Text style={s.pillText}>{statusLabel(ext.status)}</Text></View>
          </View>
          {!!ext.description&&<Text style={[s.muted,{marginTop:10}]}>{ext.description}</Text>}
          <Text style={[s.muted,{marginTop:8}]}>NEXA compatibility: {ext.compatibility?.minNexaVersion||'3.58.0'}{ext.compatibility?.maxNexaVersion?` – ${ext.compatibility.maxNexaVersion}`:'+'}{!ext.canEnable&&ext.status!=='revoked'?' · activation may be blocked':''}</Text>
          <Text style={[s.muted,{marginTop:12,marginBottom:7}]}>Permissions</Text>
          <View style={ds({flexDirection:'row',flexWrap:'wrap'})}>{ext.requestedScopes.map(scope=><View key={scope} style={[s.pill,{marginBottom:7,backgroundColor:ext.consentedScopes.includes(scope)?tc('#332a18'):tc('#0D0B08')}]}><Text style={s.pillText}>{scopeLabels[scope]||scope}{ext.consentedScopes.includes(scope)?' ✓':''}</Text></View>)}</View>
          {missing.length>0&&<Text style={ds({color:tc('#f1c75b'),marginTop:2})}>Consent required for: {missing.map(x=>scopeLabels[x]||x).join(', ')}</Text>}
          <View style={ds({flexDirection:'row',gap:8,marginTop:14})}>
            {ext.status!=='revoked'&&<NexaPressable accessibilityRole="button" accessibilityLabel={`${missing.length?"Grant":"Revoke"} extension consent`} accessibilityState={{disabled:!!busy}} disabled={!!busy} onPress={()=>toggleConsent(ext)} style={[s.buttonSecondary,{flex:1}]}><Text style={s.saveText}>{missing.length?'Grant consent':'Revoke consent'}</Text></NexaPressable>}
            {ext.status!=='revoked'&&<NexaPressable accessibilityRole="button" accessibilityLabel={ext.status==='enabled'?"Disable extension":"Enable extension"} accessibilityState={{disabled:!!busy}} disabled={!!busy} onPress={()=>act(ext.id,ext.status==='enabled'?'disable':'enable')} style={[s.button,{flex:1,opacity:ext.status==='registered'&&!ext.canEnable?0.5:1}]}><Text style={s.buttonText}>{ext.status==='enabled'?'Disable':'Enable'}</Text></NexaPressable>}
          </View>
          <View style={ds({flexDirection:'row',gap:8,marginTop:8})}>
            {ext.status!=='revoked'&&<NexaPressable accessibilityRole="button" accessibilityLabel="Edit extension details" accessibilityState={{disabled:savingEdit}} disabled={savingEdit} onPress={()=>startEdit(ext)} style={[s.buttonSecondary,{flex:1}]}><Text style={s.saveText}>Edit details</Text></NexaPressable>}
            <NexaPressable accessibilityRole="button" accessibilityLabel={expanded===ext.id?"Hide extension audit":"View extension audit"} accessibilityState={{expanded:expanded===ext.id,disabled:!!busy}} disabled={!!busy} onPress={()=>loadAudit(ext.id)} style={[s.buttonSecondary,{flex:1}]}><Text style={s.saveText}>{expanded===ext.id?'Hide audit':'View audit'}</Text></NexaPressable>
            {ext.status!=='revoked'&&<NexaPressable accessibilityRole="button" accessibilityLabel="Revoke extension" accessibilityState={{disabled:!!busy}} disabled={!!busy} onPress={()=>Alert.alert('Revoke extension','This is permanent. The extension cannot be enabled again.',[{text:'Cancel'},{text:'Revoke',style:'destructive',onPress:()=>act(ext.id,'revoke')}])} style={[s.buttonSecondary,{flex:1}]}><Text style={s.saveText}>Revoke</Text></NexaPressable>}
          </View>
          {editing===ext.id&&<View style={ds({marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:tc('#3B2C13')})}>
            <Text style={s.section}>Edit details</Text>
            <TextInput accessibilityLabel="Edited extension name" style={s.authInput} placeholder="Extension name" placeholderTextColor={tc("#666")} value={editName} onChangeText={setEditName}/>
            <TextInput accessibilityLabel="Edited extension version" style={s.authInput} placeholder="Version" placeholderTextColor={tc("#666")} value={editVersion} onChangeText={setEditVersion}/>
            <TextInput accessibilityLabel="Edited extension description" style={[s.authInput,{minHeight:70}]} placeholder="Description" placeholderTextColor={tc("#666")} multiline value={editDescription} onChangeText={setEditDescription}/>
            <Text style={[s.muted,{marginTop:8}]}>Minimum NEXA version (x.y.z)</Text>
            <TextInput accessibilityLabel="Minimum NEXA version for extension" style={s.authInput} placeholder="3.59.0" placeholderTextColor={tc("#666")} autoCapitalize="none" value={editMinNexaVersion} onChangeText={setEditMinNexaVersion}/>
            <Text style={[s.muted,{marginTop:8}]}>Maximum NEXA version (optional)</Text>
            <TextInput accessibilityLabel="Maximum NEXA version for extension" style={s.authInput} placeholder="Leave blank for no maximum" placeholderTextColor={tc("#666")} autoCapitalize="none" value={editMaxNexaVersion} onChangeText={setEditMaxNexaVersion}/>
            <View style={ds({flexDirection:'row',gap:8})}><NexaPressable accessibilityRole="button" accessibilityLabel="Cancel extension edit" onPress={()=>setEditing(null)} style={[s.buttonSecondary,{flex:1}]}><Text style={s.saveText}>Cancel</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel="Save extension changes" accessibilityState={{disabled:savingEdit}} disabled={savingEdit} onPress={saveEdit} style={[s.button,{flex:1}]}>{savingEdit?<ActivityIndicator/>:<Text style={s.buttonText}>Save</Text>}</NexaPressable></View>
          </View>}
          {expanded===ext.id&&<View style={ds({marginTop:12,borderTopWidth:1,borderTopColor:tc('#3B2C13'),paddingTop:10})}>{(audit[ext.id]||[]).map(event=><View key={event.id} style={ds({paddingVertical:7})}><Text style={ds({color:theme.colors.ivoryText,fontWeight:'700'})}>{event.action}</Text><Text style={s.muted}>{new Date(event.createdAt).toLocaleString()}</Text></View>)}</View>}
        </View>;
      })}
    </ScrollView>}
  </View></NexaWorldBackground>;
}
