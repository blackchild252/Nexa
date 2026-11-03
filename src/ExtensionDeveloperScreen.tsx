import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, Text, TextInput, View} from 'react-native';
import {authedFetch} from './api';
import {s} from './styles';
import {NexaPressable} from './motion';
import { theme, tc, ds } from './theme';
import {NexaWorldBackground} from './NexaWorldBackground';

type Extension = {id:string;name:string;slug:string;version:string;status:string;compatibility?:{minNexaVersion:string;maxNexaVersion:string}};
type Identity = {id:string;clientId:string;keyPrefix:string;createdAt:string;lastUsedAt:string|null;revokedAt:string|null};
type AuditEvent = {id:string;action:string;metadata:any;createdAt:string};
type Capability = {id:string;description:string;type:'read'|'action';endpoint:string};

const EXAMPLE = JSON.stringify({
  manifestVersion:'1.0', name:'Weather Helper', slug:'weather-helper', version:'1.0.0',
  description:'Example extension showing the NEXA controlled-capability contract.',
  requestedScopes:['profile.read','market.read'], publicConfig:{units:'metric'},
  compatibility:{minNexaVersion:'3.59.0',maxNexaVersion:''}
}, null, 2);

export function ExtensionDeveloperScreen({onBack}:{onBack:()=>void}){
  const [loading,setLoading]=useState(true);
  const [platform,setPlatform]=useState('');
  const [capabilities,setCapabilities]=useState<Capability[]>([]);
  const [extensions,setExtensions]=useState<Extension[]>([]);
  const [selected,setSelected]=useState('');
  const [identities,setIdentities]=useState<Identity[]>([]);
  const [audit,setAudit]=useState<AuditEvent[]>([]);
  const [manifest,setManifest]=useState(EXAMPLE);
  const [validation,setValidation]=useState<any>(null);
  const [busy,setBusy]=useState<string|null>(null);
  const loadRequest=useRef(0);
  const detailRequests=useRef<Record<string, number>>({});

  const load=useCallback(async()=>{
    const requestId=++loadRequest.current;
    setLoading(true);
    try{
      const [dev, caps, ext] = await Promise.all([
        authedFetch('/api/extensions/developer/manifest'),
        authedFetch('/api/extensions/developer/capabilities'),
        authedFetch('/api/extensions'),
      ]);
      if(requestId!==loadRequest.current)return;
      setPlatform(String(dev.platform?.currentVersion||''));
      setCapabilities(caps.capabilities||[]);
      const list=ext.extensions||[];
      setExtensions(list);
      if(!selected && list.length) setSelected(list[0].id);
    }catch(e:any){if(requestId===loadRequest.current)Alert.alert('Developer Console',e.message||'Could not load developer information.');}
    finally{if(requestId===loadRequest.current)setLoading(false);}
  },[selected]);

  const loadAudit=useCallback(async(id:string)=>{
    if(!id){setAudit([]);return;}
    const requestId=(detailRequests.current[id]||0)+1; detailRequests.current[id]=requestId;
    try{const data=await authedFetch(`/api/extensions/${id}/audit`);if(requestId!==detailRequests.current[id])return;setAudit(data.audit||[]);}
    catch(e:any){if(requestId===detailRequests.current[id])Alert.alert('Extension audit',e.message||'Could not load extension audit.');}
  },[]);

  const loadIdentities=useCallback(async(id:string)=>{
    if(!id){setIdentities([]);return;}
    const requestId=(detailRequests.current[`identity:${id}`]||0)+1; detailRequests.current[`identity:${id}`]=requestId;
    try{const data=await authedFetch(`/api/extensions/${id}/identity`);if(requestId!==detailRequests.current[`identity:${id}`])return;setIdentities(data.identities||[]);}
    catch(e:any){if(requestId===detailRequests.current[`identity:${id}`])Alert.alert('API identities',e.message||'Could not load API identities.');}
  },[]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{loadIdentities(selected);loadAudit(selected);},[selected,loadIdentities,loadAudit]);

  const validate=async()=>{
    setBusy('validate'); setValidation(null);
    try{
      let parsed:any; try{parsed=JSON.parse(manifest);}catch{throw new Error('Manifest must be valid JSON.');}
      const data=await authedFetch('/api/extensions/developer/validate',{method:'POST',body:JSON.stringify(parsed)});
      setValidation(data); 
    }catch(e:any){setValidation({valid:false,error:e.message||'Manifest validation failed.'});}
    finally{setBusy(null);}
  };

  const createKey=async()=>{
    if(!selected)return Alert.alert('API identity','Select an extension first.');
    setBusy('create');
    try{
      const data=await authedFetch(`/api/extensions/${selected}/identity/keys`,{method:'POST'});
      await loadIdentities(selected); await loadAudit(selected);
      Alert.alert('API key created','Copy this key now. NEXA will not show it again.\n\n'+data.apiKey);
    }catch(e:any){Alert.alert('API key',e.message||'Could not create API key.');}
    finally{setBusy(null);}
  };

  const revoke=async(keyId:string)=>{
    if(!selected)return;
    setBusy(keyId);
    try{await authedFetch(`/api/extensions/${selected}/identity/keys/${keyId}`,{method:'DELETE'});await loadIdentities(selected); await loadAudit(selected);}
    catch(e:any){Alert.alert('API key',e.message||'Could not revoke API key.');}
    finally{setBusy(null);}
  };

  const rotate=async(keyId:string)=>{
    if(!selected)return;
    setBusy('rotate'+keyId);
    try{
      const data=await authedFetch(`/api/extensions/${selected}/identity/keys/${keyId}/rotate`,{method:'POST'});
      await loadIdentities(selected); await loadAudit(selected);
      Alert.alert('API key rotated','The previous key is revoked. Store the new key now.\n\n'+data.apiKey);
    }catch(e:any){Alert.alert('API key',e.message||'Could not rotate API key.');}
    finally{setBusy(null);}
  };

  const current=extensions.find(x=>x.id===selected);

  return <NexaWorldBackground world="developer"><View style={s.wrap}>
    <View style={ds({flexDirection:'row',alignItems:'center',marginBottom:14})}>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Back from Developer Console" onPress={onBack} style={ds({paddingRight:14})}><Text style={s.back}>‹</Text></NexaPressable>
      <View style={ds({flex:1})}><Text style={s.heading}>Developer Console</Text><Text style={s.muted}>API identities, compatibility and capability contracts</Text></View>
    </View>
    {loading?<ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading developer extensions" style={ds({marginTop:30})}/>:<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds({paddingBottom:50})}>
      <View style={s.card}>
        <Text style={s.section}>Platform contract</Text>
        <Text style={s.muted}>Current NEXA platform version: <Text style={ds({color:theme.colors.ivoryText,fontWeight:'700'})}>{platform||'unknown'}</Text></Text>
        <Text style={[s.muted,{marginTop:7}]}>Extensions run through controlled capability endpoints. NEXA does not execute arbitrary third-party server code.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.section}>Manifest validator</Text>
        <Text style={s.muted}>Paste a developer manifest. Validation normalizes scopes, public configuration, and the NEXA compatibility range.</Text>
        <TextInput accessibilityLabel="Extension manifest JSON" style={[s.authInput,{minHeight:210,textAlignVertical:'top',fontFamily:'monospace'}]} multiline value={manifest} onChangeText={setManifest} autoCapitalize="none" spellCheck={false}/>
        <View style={ds({flexDirection:'row',gap:8,marginTop:8})}>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Validate extension manifest" style={[s.button,{flex:1}]} disabled={busy==='validate'} accessibilityState={{disabled:busy==='validate'}} onPress={validate}>{busy==='validate'?<ActivityIndicator/>:<Text style={s.buttonText}>Validate manifest</Text>}</NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Load example manifest" accessibilityState={{disabled:busy==='validate'}} disabled={busy==='validate'} style={[s.buttonSecondary,{flex:1}]} onPress={()=>{setManifest(EXAMPLE);setValidation(null)}}><Text style={s.saveText}>Load example</Text></NexaPressable>
        </View>
        {validation&&<View style={ds({marginTop:12,padding:12,borderRadius:12,backgroundColor:validation.valid?tc('#17261e'):tc('#2a1717')})}>
          <Text style={ds({color:validation.valid?tc('#9ff0b5'):tc('#ef9b9b'),fontWeight:'800'})}>{validation.valid?'Valid manifest':'Invalid manifest'}</Text>
          {validation.valid?<Text style={[s.muted,{marginTop:7}]}>{JSON.stringify(validation.manifest,null,2)}</Text>:<Text style={[s.muted,{marginTop:7}]}>{validation.error}</Text>}
        </View>}
      </View>

      <View style={s.card}>
        <Text style={s.section}>Capabilities</Text>
        {capabilities.map(c=><View key={c.id} style={ds({paddingVertical:8,borderBottomWidth:1,borderBottomColor:tc('#232a35')})}><View style={ds({flexDirection:'row',justifyContent:'space-between'})}><Text style={ds({color:theme.colors.ivoryText,fontWeight:'700'})}>{c.id}</Text><Text style={s.muted}>{c.type}</Text></View><Text style={[s.muted,{marginTop:4}]}>{c.description}</Text><Text style={[s.muted,{marginTop:3,fontSize:14}]}>{c.endpoint}</Text></View>)}
      </View>

      <View style={s.card}>
        <Text style={s.section}>API identities</Text>
        {!extensions.length?<Text style={s.muted}>Register an extension first in Extensions.</Text>:<>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds({marginBottom:10})}>{extensions.map(ext=><NexaPressable accessibilityRole="tab" accessibilityState={{selected:selected===ext.id}} accessibilityLabel={`Open extension ${ext.name}`} key={ext.id} onPress={()=>setSelected(ext.id)} style={[s.pill,selected===ext.id&&s.pillActive]}><Text style={s.pillText}>{ext.name}</Text></NexaPressable>)}</ScrollView>
          {current&&<Text style={s.muted}>{current.slug} · v{current.version} · {current.status} · NEXA {current.compatibility?.minNexaVersion||'3.58.0'}{current.compatibility?.maxNexaVersion?`–${current.compatibility.maxNexaVersion}`:'+'}</Text>}
          <NexaPressable accessibilityRole="button" accessibilityLabel="Create API key" style={[s.button,{marginTop:10}]} disabled={busy==='create'||current?.status==='revoked'} accessibilityState={{disabled:busy==='create'||current?.status==='revoked'}} onPress={createKey}>{busy==='create'?<ActivityIndicator/>:<Text style={s.buttonText}>Create API key</Text>}</NexaPressable>
          <Text style={[s.muted,{marginTop:10}]}>Raw keys are shown only at creation or rotation. Stored records contain a one-way hash and a short prefix.</Text>
          {identities.map(item=><View key={item.id} style={[s.card,{marginTop:10,marginBottom:0,padding:12}]}><Text style={ds({color:theme.colors.ivoryText,fontWeight:'700'})}>{item.clientId}</Text><Text style={s.muted}>{item.keyPrefix} · created {new Date(item.createdAt).toLocaleString()}</Text><Text style={s.muted}>{item.lastUsedAt?`Last used ${new Date(item.lastUsedAt).toLocaleString()}`:'Not used yet'}</Text><Text style={ds({color:item.revokedAt?tc('#ef8d8d'):tc('#9ff0b5'),marginTop:4})}>{item.revokedAt?'Revoked':'Active'}</Text>{!item.revokedAt&&<View style={ds({flexDirection:'row',gap:8,marginTop:8})}><NexaPressable accessibilityRole="button" accessibilityLabel={`Rotate API key ${item.keyPrefix}`} style={[s.buttonSecondary,{flex:1}]} disabled={!!busy} accessibilityState={{disabled:!!busy}} onPress={()=>rotate(item.id)}><Text style={s.saveText}>{busy==='rotate'+item.id?'Rotating…':'Rotate'}</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel={`Revoke API key ${item.keyPrefix}`} style={[s.buttonSecondary,{flex:1}]} disabled={!!busy} onPress={()=>revoke(item.id)}><Text style={s.saveText}>Revoke</Text></NexaPressable></View>}</View>)}
        </>}
      </View>

      <View style={s.card}>
        <Text style={s.section}>Recent audit activity</Text>
        {!audit.length?<Text style={s.muted}>No audit events yet.</Text>:audit.slice(0,20).map(event=><View key={event.id} style={ds({paddingVertical:8,borderBottomWidth:1,borderBottomColor:tc('#232a35')})}><Text style={ds({color:theme.colors.ivoryText,fontWeight:'700'})}>{event.action}</Text><Text style={s.muted}>{new Date(event.createdAt).toLocaleString()}</Text></View>)}
      </View>
    </ScrollView>}
  </View></NexaWorldBackground>;
}
