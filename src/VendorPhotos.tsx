import React,{useState} from 'react';
import {ActivityIndicator,Alert,Image,Modal,Text,View} from 'react-native';
import { NexaPressable, useModalAnimation } from './motion';
import * as ImagePicker from 'expo-image-picker';
import {s} from './styles';
import {theme,tc,ds} from './theme';
import {API_BASE} from './api';
import {Product,addProductImage,approveBeautifiedVendorProductImage,beautifyVendorProductImage,makeProductCover,removeProductImage,updateProduct} from './marketplace';
import {productPhotos} from './ProductGallery';

const MAX_PHOTOS=6;
const uri=(url:string)=>url.startsWith('http')?url:`${API_BASE}${url}`;

/** Vendor photo manager for one product: add (up to 6), make cover, remove. The first photo is the cover. */
export function VendorPhotos({product,onChanged}:{product:Product;onChanged:()=>void|Promise<void>}){
 const previewModalAnimation=useModalAnimation('sheet');
 const [busy,setBusy]=useState(false); const [beautifyBusy,setBeautifyBusy]=useState(false); const [preview,setPreview]=useState<string|null>(null); const [previewStyle,setPreviewStyle]=useState('clean_marketplace'); const [previewToken,setPreviewToken]=useState<string|null>(null); const photos=productPhotos(product); const hasCover=!!product.imageUrl;
 const run=async(job:()=>Promise<any>,failTitle:string)=>{if(busy)return;setBusy(true);try{await job();await onChanged();}catch(e:any){Alert.alert(failTitle,e?.message||'Something went wrong. Please try again.');}finally{setBusy(false);}};
 const beautify=async(i:number)=>{
  if(busy||beautifyBusy)return;
  const styles=[['clean_marketplace','Clean Marketplace'],['premium','Premium'],['3d_render','3D Render'],['luxury','Luxury'],['food_hero','Food Hero'],['lifestyle','Lifestyle'],['illustrated','Illustrated'],['seasonal','Seasonal']];
  Alert.alert('AI Beautifier','Choose a presentation style.',styles.map(([value,label])=>({text:label,onPress:async()=>{setBeautifyBusy(true);setPreviewStyle(value);try{const r=await beautifyVendorProductImage(product.id,i,value);setPreview(r.preview);setPreviewToken(String(r.previewToken||''));}catch(e:any){Alert.alert('AI Beautifier',e?.message||'Could not beautify this photo. Please try again.');}finally{setBeautifyBusy(false);}}})).concat([{text:'Cancel',style:'cancel'}] as any));
 };
 const approve=()=>{if(!preview||!previewToken)return;run(async()=>{if(photos.length>=MAX_PHOTOS)throw new Error('This product already has the maximum of 6 photos: 1 AI main image plus real reference photos. Remove one before saving another.');await approveBeautifiedVendorProductImage(product.id,previewToken);setPreview(null);setPreviewToken(null);},'Save beautified photo');};
 const add=()=>run(async()=>{
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!permission.granted){Alert.alert('Photo access needed','Allow NEXA to access your photos so you can add product pictures.');return;}
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'] as any,allowsEditing:true,aspect:[1,1],quality:0.6,base64:true});
  if(result.canceled||!result.assets?.[0]?.base64)return;
  const a=result.assets[0]; const mime=a.mimeType==='image/png'?'image/png':a.mimeType==='image/webp'?'image/webp':'image/jpeg';
  const dataUrl=`data:${mime};base64,${a.base64}`;
  // No cover yet: the first photo becomes the cover. Otherwise it joins the gallery.
  if(!hasCover)await updateProduct(product.id,{imageUrl:dataUrl}); else await addProductImage(product.id,dataUrl);
 },'Add photo');
 // Gallery index n (0-based) is photos[n+1] when there is a cover.
 const galleryIndex=(i:number)=>hasCover?i-1:i;
 const cover=(i:number)=>run(()=>makeProductCover(product.id,galleryIndex(i)),'Make cover photo');
 const remove=(i:number)=>Alert.alert('Remove photo','Remove this photo from the product?',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>{
  if(hasCover&&i===0)return void run(()=>updateProduct(product.id,{imageUrl:null}),'Remove photo');
  void run(()=>removeProductImage(product.id,galleryIndex(i)),'Remove photo');
 }}]);
 return <View style={ds({marginTop:10})}>
  <Text style={s.muted}>Photos {photos.length}/{MAX_PHOTOS}{hasCover?' · main image + up to 4 real reference photos':photos.length?' · first photo becomes the main image':''}</Text>
  <View style={ds({flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:6})}>
   {photos.map((u,i)=><View key={u} style={ds({width:84})}>
    <Image accessibilityRole="image" accessibilityLabel={`${product.name} photo ${i+1}`} source={{uri:uri(u)}} style={ds({width:84,height:84,borderRadius:10,backgroundColor:tc('#18202c')})}/>
    {hasCover&&i===0?<Text accessibilityLabel={`${product.name} photo ${i+1} is the cover`} style={ds({color:theme.colors.goldBright,fontSize:14,fontWeight:'800',marginTop:2})}>Cover</Text>:<NexaPressable accessibilityRole="button" accessibilityLabel={`Make photo ${i+1} the cover`} disabled={busy} accessibilityState={{disabled:busy}} onPress={()=>cover(i)} style={ds({minHeight:28,justifyContent:'center'})}><Text style={ds({color:tc('#9bd8ff'),fontSize:14})}>Make cover</Text></NexaPressable>}
    {i===0?<NexaPressable accessibilityRole="button" accessibilityLabel="Beautify main product image with AI" disabled={busy||beautifyBusy} accessibilityState={{disabled:busy||beautifyBusy}} onPress={()=>beautify(0)} style={ds({minHeight:28,justifyContent:'center'})}><Text style={ds({color:tc('#9bd8ff'),fontSize:14})}>✨ AI Main Image</Text></NexaPressable>:<Text accessibilityLabel={`Photo ${i+1} is an original reference photo and cannot be AI beautified`} style={ds({color:tc('#9aa6b2'),fontSize:14,minHeight:28,paddingTop:5})}>Real reference</Text>}<NexaPressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i+1}`} disabled={busy} accessibilityState={{disabled:busy}} onPress={()=>remove(i)} style={ds({minHeight:28,justifyContent:'center'})}><Text style={ds({color:tc('#ef8d8d'),fontSize:14})}>Remove</Text></NexaPressable>
   </View>)}
   {photos.length<MAX_PHOTOS&&<NexaPressable accessibilityRole="button" accessibilityLabel="Add a product photo" disabled={busy} accessibilityState={{disabled:busy}} onPress={add} style={ds({width:84,height:84,borderRadius:10,borderWidth:1,borderColor:theme.colors.goldBright,alignItems:'center',justifyContent:'center'})}>{busy?<ActivityIndicator/>:<Text style={ds({color:theme.colors.goldBright,fontWeight:'800',textAlign:'center'})}>+ Add photo</Text>}</NexaPressable>}
  </View>
  <Modal visible={!!preview} transparent animationType={previewModalAnimation} onRequestClose={()=>{setPreview(null);setPreviewToken(null);}}>
   <View style={ds({flex:1,backgroundColor:tc('#000000DD'),justifyContent:'center',padding:18})}>
    <View style={ds({backgroundColor:theme.colors.card,borderRadius:18,padding:14})}>
     <Text style={s.section}>AI Beautifier Preview</Text>
     <Text style={[s.muted,{marginBottom:10}]}>Review the generated main image. Photos 2–5 remain the original reference photos.</Text>
     {preview?<Image accessibilityRole="image" accessibilityLabel={`${product.name} AI beautifier preview`} source={{uri:preview}} style={ds({width:'100%',height:280,borderRadius:14,backgroundColor:tc('#18202c')})} resizeMode="contain"/>:null}
     <Text style={[s.muted,{marginTop:8}]}>Style: {previewStyle.replace(/_/g,' ')}</Text>
     <View style={ds({flexDirection:'row',gap:10,marginTop:12,justifyContent:'flex-end'})}>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Discard AI beautifier preview" onPress={()=>{setPreview(null);setPreviewToken(null);}} style={ds({minHeight:44,justifyContent:'center',paddingHorizontal:14})}><Text style={ds({color:tc('#ef8d8d'),fontWeight:'800'})}>Discard</Text></NexaPressable>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Approve and save AI beautifier image" onPress={approve} style={ds({minHeight:44,justifyContent:'center',paddingHorizontal:14,borderRadius:10,backgroundColor:theme.colors.goldBright})}><Text style={ds({color:'#111',fontWeight:'900'})}>Approve & Save</Text></NexaPressable>
     </View>
    </View>
   </View>
  </Modal>
 </View>;
}
