import React,{useState} from 'react';
import {Image,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {theme,tc,ds} from './theme';
import {API_BASE} from './api';
import {Product} from './marketplace';

const imageUri=(url:string)=>url.startsWith('http')||url.startsWith('data:')?url:`${API_BASE}${url}`;

/** Photos for a product: cover first. One photo (or none) renders exactly like the single-image thumb. */
export function productPhotos(p:Pick<Product,'imageUrl'|'imageUrls'>):string[]{
 const list=(p.imageUrls&&p.imageUrls.length?p.imageUrls:(p.imageUrl?[p.imageUrl]:[]));
 return list.filter(Boolean);
}

/** Swipeable gallery for the product page, with a position badge. */
export function ProductGallery({p,height=260}:{p:Product;height?:number}){
 const photos=productPhotos(p); const {width}=useWindowDimensions(); const [page,setPage]=useState(0);
 const pageWidth=Math.max(1,Math.min(width-56,560));
 if(photos.length<2){
  return <View style={ds({height,backgroundColor:p.imageColor||tc('#18202c'),alignItems:'center',justifyContent:'center',overflow:'hidden'})}>
   {photos[0]?<Image accessibilityRole="image" accessibilityLabel={`${p.name} product image`} source={{uri:imageUri(photos[0])}} style={ds({width:'100%',height:'100%'})} resizeMode="cover"/>:<Text style={ds({fontSize:Math.round(height*0.4)})}>{p.imageEmoji||'📦'}</Text>}
  </View>;
 }
 return <View style={ds({height,backgroundColor:p.imageColor||tc('#18202c'),overflow:'hidden'})}>
  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e=>setPage(Math.round(e.nativeEvent.contentOffset.x/pageWidth))}>
   {photos.map((u,i)=><Image key={u} accessibilityRole="image" accessibilityLabel={`${p.name} photo ${i+1} of ${photos.length}`} source={{uri:imageUri(u)}} style={ds({width:pageWidth,height})} resizeMode="cover"/>)}
  </ScrollView>
  <View style={ds({position:'absolute',bottom:10,right:10,backgroundColor:tc('#000000AA'),borderRadius:10,paddingHorizontal:10,paddingVertical:3})}><Text style={ds({color:theme.colors.text,fontWeight:'800'})}>{Math.min(page+1,photos.length)}/{photos.length}</Text></View>
 </View>;
}
