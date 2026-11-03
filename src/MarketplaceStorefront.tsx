import { NexaPressable } from './motion';
import React,{useEffect,useRef,useState} from 'react';
import {Alert,ActivityIndicator,Image,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {s} from './styles';
import {theme,tc,ds} from './theme';
import {API_BASE} from './api';
import {Product,ProductVariant,ProductReview,getProduct,listProductReviews,listProducts,startMarketplaceInquiry,reportMarketplaceTarget} from './marketplace';
import {ProductGallery} from './ProductGallery';
import {StoreFilters,DEFAULT_FILTERS,activeFilterCount,stockCap} from './useMarketplace';
import {axisValueInStock,findVariant,lineStockCap,variantAxes,variantLabel,Banner,CARD_WIDTH,countdownText,departmentIcon,departmentLabel,discountPercent,gridColumns,ratingLabel,soldLabel,SORT_LABELS} from './marketplaceStoreUtils';
import { formatMajorCurrency } from './currencyDisplay';
// White badge text needs >=4.5:1 in both themes; theme.colors.error is only 3.82:1 on Royal Dark.
const SALE_BADGE_BG = '#B83629';

/**
 * Dream Marketplace storefront building blocks (V5.98.45): Temu-style discovery (hero banners, flash deals with live
 * countdowns, best sellers, endless "Just for you" feed) on a Walmart-style structure (departments, filters + sort,
 * product pages with reviews, seller info, saved items, buyer-protection strip). Presentation only: every purchase,
 * payment, refund and dispute still goes through MarketplaceScreen and the server-owned routes.
 */

export const priceText=(price:number,currency?:string)=>formatMajorCurrency(Number(price),currency,'en-NG');
const imageUri=(url:string)=>url.startsWith('http')?url:`${API_BASE}${url}`;

export function useNow(active:boolean){const [now,setNow]=useState(Date.now());useEffect(()=>{if(!active)return;setNow(Date.now());const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[active]);return now;}

export function useColumns(){const {width}=useWindowDimensions();const cols=gridColumns(width);return {cols,cardWidth:CARD_WIDTH[cols]};}

export function ProductThumb({p,height=128,rounded=0}:{p:Product;height?:number;rounded?:number}){
 return <View style={ds({height,backgroundColor:p.imageColor||tc('#18202c'),alignItems:'center',justifyContent:'center',borderTopLeftRadius:rounded,borderTopRightRadius:rounded,overflow:'hidden'})}>
  {p.imageUrl?<Image accessibilityRole="image" accessibilityLabel={`${p.name} product image`} source={{uri:imageUri(p.imageUrl)}} style={ds({width:'100%',height:'100%'})} resizeMode="cover"/>:<Text style={ds({fontSize:Math.round(height*0.4)})}>{p.imageEmoji||'📦'}</Text>}
 </View>}

export function RatingLine({avg,count,sold,sellerBadge}:{avg?:number|null;count?:number;sold?:number;sellerBadge?:'reviewed_seller'|null}){
 const has=avg!=null&&(count||0)>0; const soldText=soldLabel(sold);
 return <View style={ds({flexDirection:'row',alignItems:'center',gap:6,marginTop:4,flexWrap:'wrap'})}>
  <Text accessibilityLabel={has?`Rated ${avg} out of 5 from ${count} reviews`:'No reviews yet'} style={ds({color:has?theme.colors.warning:theme.colors.muted,fontSize:14,fontWeight:'700'})}>{has?'★ ':''}{ratingLabel(avg,count)}</Text>
  {sellerBadge==='reviewed_seller'?<Text accessibilityLabel="Reviewed seller badge" style={ds({color:theme.colors.goldBright,fontSize:14,fontWeight:'800'})}>Reviewed seller</Text>:null}
  {soldText?<Text style={ds({color:theme.colors.muted,fontSize:14})}>{soldText}</Text>:null}
 </View>}

export function SectionTitle({title,subtitle,right,onRight}:{title:string;subtitle?:string;right?:string;onRight?:()=>void}){
 return <View style={ds({flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginTop:18,marginBottom:10})}>
  <View style={ds({flex:1,paddingRight:8})}><Text accessibilityRole="header" style={s.section}>{title}</Text>{subtitle?<Text style={[s.muted,ds({marginTop:-6})]}>{subtitle}</Text>:null}</View>
  {right&&onRight?<NexaPressable accessibilityRole="button" accessibilityLabel={`${right}: ${title}`} onPress={onRight} style={ds({minHeight:44,justifyContent:'center'})}><Text style={ds({color:theme.colors.goldBright,fontWeight:'800'})}>{right} ›</Text></NexaPressable>:null}
 </View>}

/** Small tile used by every horizontal rail. */
export function RailCard({p,onOpen,onAdd,now,timer}:{p:Product;onOpen:()=>void;onAdd:()=>void;now?:number;timer?:boolean}){
 const pct=discountPercent(p,now); const out=p.stock<=0;
 return <NexaPressable accessibilityRole="button" accessibilityLabel={`${p.name}, ${priceText(p.price,p.currency)}${pct?`, ${pct}% off`:''}. Open product`} onPress={onOpen} style={ds({width:146,backgroundColor:theme.colors.surface,borderRadius:16,borderWidth:1,borderColor:theme.colors.border,overflow:'hidden'})}>
  <View><ProductThumb p={p} height={116}/>
   {pct?<View style={ds({position:'absolute',top:6,left:6,backgroundColor:SALE_BADGE_BG,borderRadius:8,paddingHorizontal:7,paddingVertical:2})}><Text style={ds({color:'#fff',fontSize:14,fontWeight:'900'})}>-{pct}%</Text></View>:null}
  </View>
  <View style={ds({padding:8})}>
   <Text numberOfLines={2} style={ds({color:theme.colors.text,fontSize:15,lineHeight:17,minHeight:34,fontWeight:'600'})}>{p.name}</Text>
   <View style={ds({flexDirection:'row',alignItems:'baseline',gap:5,flexWrap:'wrap',marginTop:4})}>
    <Text style={ds({color:pct?theme.colors.errorText:theme.colors.text,fontWeight:'900',fontSize:17})}>{priceText(p.price,p.currency)}</Text>
    {pct&&p.regularPrice?<Text style={ds({color:theme.colors.muted,fontSize:14,textDecorationLine:'line-through'})}>{priceText(p.regularPrice,p.currency)}</Text>:null}
   </View>
   {timer&&p.saleEndsAt?<Text style={ds({color:theme.colors.errorText,fontSize:14,fontWeight:'800',marginTop:3})}>⏱ {countdownText(p.saleEndsAt,now)}</Text>:<RatingLine avg={p.ratingAvg} count={p.ratingCount} sold={p.soldCount} sellerBadge={p.sellerBadge}/>}
   <NexaPressable accessibilityRole="button" accessibilityLabel={out?`${p.name} is sold out`:`Add ${p.name} to cart`} disabled={out} accessibilityState={{disabled:out}} onPress={onAdd} style={[s.smallButton,ds({marginTop:6,minHeight:theme.accessibility.minTouchTarget,justifyContent:'center',opacity:out?0.4:1})]}><Text style={s.buttonText}>{out?'Sold out':'+ Add'}</Text></NexaPressable>
  </View>
 </NexaPressable>}

export function ProductRail({title,subtitle,products,onOpen,onAdd,onSeeAll,timer}:{title:string;subtitle?:string;products:Product[];onOpen:(p:Product)=>void;onAdd:(p:Product)=>void;onSeeAll?:()=>void;timer?:boolean}){
 const now=useNow(!!timer&&products.length>0);
 if(!products.length)return null;
 return <View><SectionTitle title={title} subtitle={subtitle} right={onSeeAll?'See all':undefined} onRight={onSeeAll}/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds({gap:10,paddingRight:8})}>
   {products.map(p=><RailCard key={p.id} p={p} now={now} timer={timer} onOpen={()=>onOpen(p)} onAdd={()=>onAdd(p)}/>)}
  </ScrollView></View>}

export function HeroBanners({banners,onPick}:{banners:Banner[];onPick:(b:Banner)=>void}){
 const {width}=useWindowDimensions(); const [index,setIndex]=useState(0); const ref=useRef<ScrollView>(null);
 const pageW=Math.max(260,Math.min(width-32,760));
 useEffect(()=>{if(banners.length<2)return;const t=setInterval(()=>setIndex(i=>{const n=(i+1)%banners.length;ref.current?.scrollTo({x:n*(pageW+10),animated:true});return n;}),5000);return()=>clearInterval(t);},[banners.length,pageW]);
 if(!banners.length)return null;
 return <View style={ds({marginTop:4})}>
  <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={pageW+10} decelerationRate="fast" onMomentumScrollEnd={e=>setIndex(Math.round(e.nativeEvent.contentOffset.x/(pageW+10)))} contentContainerStyle={ds({gap:10})}>
   {banners.map(b=><NexaPressable key={b.id} accessibilityRole="button" accessibilityLabel={`${b.title}. ${b.subtitle}`} onPress={()=>onPick(b)} style={ds({width:pageW,minHeight:118,borderRadius:20,padding:16,backgroundColor:theme.colors.goldWash,borderWidth:1.5,borderColor:theme.colors.royalGold,flexDirection:'row',alignItems:'center',gap:12,overflow:'hidden'})}>
    <View style={ds({flex:1})}><Text style={ds({color:theme.colors.text,fontSize:22,lineHeight:25,fontWeight:'900'})}>{b.title}</Text><Text style={[s.muted,ds({marginTop:4})]}>{b.subtitle}</Text><View style={[s.smallButton,ds({alignSelf:'flex-start',marginTop:10})]}><Text style={s.buttonText}>Shop now</Text></View></View>
    <Text accessible={false} style={ds({fontSize:58})}>{b.emoji}</Text>
   </NexaPressable>)}
  </ScrollView>
  {banners.length>1?<View accessible={false} style={ds({flexDirection:'row',justifyContent:'center',gap:6,marginTop:8})}>{banners.map((b,i)=><View key={b.id} style={ds({width:i===index?18:7,height:7,borderRadius:4,backgroundColor:i===index?theme.colors.royalGold:theme.colors.border})}/>)}</View>:null}
 </View>}

export function DepartmentGrid({departments,selected,onPick}:{departments:Array<{category:string;productCount:number;fromPrice:number|null}>;selected:string;onPick:(category:string)=>void}){
 const live=departments.filter(d=>d.productCount>0);
 if(!live.length)return null;
 return <View><SectionTitle title="Shop by department" subtitle="Browse every NEXA seller by category"/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds({gap:10,paddingRight:8})}>
   {live.map(d=>{const on=selected===d.category;return <NexaPressable key={d.category} accessibilityRole="tab" accessibilityState={{selected:on}} accessibilityLabel={`${departmentLabel(d.category)}, ${d.productCount} product${d.productCount===1?'':'s'}`} onPress={()=>onPick(on?'':d.category)} style={ds({width:92,alignItems:'center',paddingVertical:10,paddingHorizontal:6,borderRadius:16,borderWidth:1.5,borderColor:on?theme.colors.royalGold:theme.colors.border,backgroundColor:on?theme.colors.goldWash:theme.colors.surface})}>
    <View style={ds({width:52,height:52,borderRadius:26,backgroundColor:theme.colors.surfaceElevated,alignItems:'center',justifyContent:'center'})}><Text accessible={false} style={ds({fontSize:28})}>{departmentIcon(d.category)}</Text></View>
    <Text numberOfLines={2} style={ds({color:theme.colors.text,fontSize:14,fontWeight:'700',textAlign:'center',marginTop:6,minHeight:30})}>{departmentLabel(d.category)}</Text>
    <Text style={ds({color:theme.colors.muted,fontSize:14})}>{d.productCount} item{d.productCount===1?'':'s'}</Text>
   </NexaPressable>})}
  </ScrollView></View>}

export function TrustStrip(){
 const items:Array<[string,string,string]>=[['🔒','Secure checkout','Payments are verified by the server'],['📦','Order tracking','Follow every order under Orders & payments'],['🛡️','Buyer protection','Refund and dispute help on every order']];
 return <View style={ds({flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16})}>{items.map(([icon,title,text])=><View key={title} style={ds({flexGrow:1,flexBasis:150,flexDirection:'row',gap:10,alignItems:'center',padding:10,borderRadius:14,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.border})}><Text accessible={false} style={ds({fontSize:24})}>{icon}</Text><View style={ds({flex:1})}><Text style={ds({color:theme.colors.text,fontWeight:'800',fontSize:15})}>{title}</Text><Text style={ds({color:theme.colors.muted,fontSize:14,lineHeight:15})}>{text}</Text></View></View>)}</View>}

/** Sort pills + a "Filters" button with an active count; the sheet itself is FilterSheet. */
export function FilterBar({filters,onChange,onOpenSheet,resultCount,hasMore,title}:{filters:StoreFilters;onChange:(f:StoreFilters)=>void;onOpenSheet:()=>void;resultCount:number;hasMore?:boolean;title:string}){
 const n=activeFilterCount(filters);
 return <View style={ds({marginBottom:10})}>
  <View style={ds({flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8})}><Text accessibilityRole="header" style={ds({color:theme.colors.text,fontWeight:'900',fontSize:18,flex:1})}>{title}</Text><Text style={s.muted}>{resultCount}{hasMore?'+':''} result{resultCount===1?'':'s'}</Text></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
   <NexaPressable accessibilityRole="button" accessibilityLabel={`Open filters${n?`, ${n} active`:''}`} onPress={onOpenSheet} style={[s.pill,n>0&&s.pillActive]}><Text style={s.pillText}>⚙ Filters{n?` (${n})`:''}</Text></NexaPressable>
   {(Object.keys(SORT_LABELS) as Array<StoreFilters['sort']>).map(k=><NexaPressable key={k} disabled={k!=='newest'&&!filters.currency} accessibilityRole="tab" accessibilityState={{selected:filters.sort===k,disabled:k!=='newest'&&!filters.currency}} accessibilityLabel={`Sort by ${SORT_LABELS[k]}${k!=='newest'&&!filters.currency?' (select a currency first)':''}`} onPress={()=>onChange({...filters,sort:k})} style={[s.pill,filters.sort===k&&s.pillActive,ds({opacity:k!=='newest'&&!filters.currency?0.45:1})]}><Text style={s.pillText}>{SORT_LABELS[k]}</Text></NexaPressable>)}
   <NexaPressable accessibilityRole="tab" accessibilityState={{selected:!!filters.onSale}} accessibilityLabel="Show only deals" onPress={()=>onChange({...filters,onSale:!filters.onSale})} style={[s.pill,filters.onSale&&s.pillActive]}><Text style={s.pillText}>⚡ Deals</Text></NexaPressable>
   <NexaPressable accessibilityRole="tab" accessibilityState={{selected:filters.minRating===4}} accessibilityLabel="Show only 4 stars and up" onPress={()=>onChange({...filters,minRating:filters.minRating===4?undefined:4})} style={[s.pill,filters.minRating===4&&s.pillActive]}><Text style={s.pillText}>★ 4 &amp; up</Text></NexaPressable>
  </ScrollView></View>}

export function FilterSheet({filters,onApply,onClose}:{filters:StoreFilters;onApply:(f:StoreFilters)=>void;onClose:()=>void}){
 const [draft,setDraft]=useState<StoreFilters>(filters); const [min,setMin]=useState(filters.minPrice!==undefined?String(filters.minPrice):''); const [max,setMax]=useState(filters.maxPrice!==undefined?String(filters.maxPrice):'');
 const apply=()=>{const lo=min.trim()===''?undefined:Number(min.replace(/,/g,'')),hi=max.trim()===''?undefined:Number(max.replace(/,/g,''));
  if((lo!==undefined||hi!==undefined||draft.sort!=='newest')&&!draft.currency)return Alert.alert('Price range','Choose a currency before filtering or sorting by price.');
  if((lo!==undefined&&(!Number.isFinite(lo)||lo<0))||(hi!==undefined&&(!Number.isFinite(hi)||hi<0)))return Alert.alert('Price range','Enter valid prices, or leave them empty.');
  if(lo!==undefined&&hi!==undefined&&lo>hi)return Alert.alert('Price range','The minimum price cannot be higher than the maximum.');
  onApply({...draft,minPrice:lo,maxPrice:hi});};
 const reset=()=>{setDraft(DEFAULT_FILTERS);setMin('');setMax('');};
 const Toggle=({label,on,onPress}:{label:string;on:boolean;onPress:()=>void})=><NexaPressable accessibilityRole="switch" accessibilityState={{checked:on}} accessibilityLabel={label} onPress={onPress} style={ds({flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12,borderBottomWidth:1,borderBottomColor:theme.colors.border})}><Text style={ds({flex:1,flexShrink:1,marginRight:12,color:theme.colors.text,fontWeight:'700'})}>{label}</Text><View style={ds({flexShrink:0,width:44,height:26,borderRadius:13,backgroundColor:on?theme.colors.royalGold:theme.colors.surfacePressed,justifyContent:'center',paddingHorizontal:3,alignItems:on?'flex-end':'flex-start'})}><View style={ds({width:20,height:20,borderRadius:10,backgroundColor:'#fff'})}/></View></NexaPressable>;
 return <View style={s.modal}><View style={s.modalCard}><ScrollView keyboardShouldPersistTaps="handled">
  <Text accessibilityRole="header" style={s.title}>Filters</Text>
  <Text style={[s.section,ds({marginTop:12})]}>Currency for price filtering and sorting</Text>
  <View style={ds({flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:6})}>{['NGN','USD','GBP','EUR','GHS','KES','ZAR','CAD','AUD','NZD','INR','JPY','CNY','AED','SAR','CHF','SEK','NOK','DKK','BRL','MXN','SGD','HKD','BHD','KWD','UGX','TZS','RWF','XOF','XAF'].map(code=><NexaPressable key={code} accessibilityRole="radio" accessibilityState={{selected:draft.currency===code}} accessibilityLabel={`Filter price by ${code}`} onPress={()=>setDraft({...draft,currency:draft.currency===code?undefined:code})} style={[s.pill,draft.currency===code&&s.pillActive]}><Text style={s.pillText}>{code}</Text></NexaPressable>)}</View>
  <Text style={s.muted}>Prices are compared only within the selected currency. NEXA does not convert listing prices.</Text>
  <Text style={[s.section,ds({marginTop:12})]}>Price range ({draft.currency||'select currency first'})</Text>
  <View style={ds({flexDirection:'row',gap:8})}><TextInput accessibilityLabel="Minimum price" value={min} onChangeText={setMin} keyboardType="numeric" placeholder="Min" placeholderTextColor={theme.colors.muted} style={[s.authInput,ds({flex:1})]}/><TextInput accessibilityLabel="Maximum price" value={max} onChangeText={setMax} keyboardType="numeric" placeholder="Max" placeholderTextColor={theme.colors.muted} style={[s.authInput,ds({flex:1})]}/></View>
  <Text style={[s.section,ds({marginTop:12})]}>Customer rating</Text>
  <View style={ds({flexDirection:'row',gap:8,flexWrap:'wrap'})}>{[undefined,4,3].map(r=><NexaPressable key={String(r)} accessibilityRole="radio" accessibilityState={{selected:draft.minRating===r}} accessibilityLabel={r?`${r} stars and up`:'Any rating'} onPress={()=>setDraft({...draft,minRating:r})} style={[s.pill,draft.minRating===r&&s.pillActive]}><Text style={s.pillText}>{r?`${r}★ & up`:'Any'}</Text></NexaPressable>)}</View>
  <Toggle label="Deals only" on={!!draft.onSale} onPress={()=>setDraft({...draft,onSale:!draft.onSale})}/>
  <Toggle label="In stock only" on={!!draft.inStock} onPress={()=>setDraft({...draft,inStock:!draft.inStock})}/>
  <View style={ds({flexDirection:'row',gap:8,marginTop:18})}><NexaPressable accessibilityRole="button" accessibilityLabel="Reset filters" style={[s.buttonSecondary,ds({flex:1})]} onPress={reset}><Text style={s.buttonText}>Reset</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel="Apply filters" style={[s.button,ds({flex:1})]} onPress={apply}><Text style={s.buttonText}>Show results</Text></NexaPressable></View>
  <NexaPressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={ds({minHeight:44,justifyContent:'center',alignItems:'center',marginTop:6})}><Text style={s.muted}>Close</Text></NexaPressable>
 </ScrollView></View></View>}

/** Size and colour chips. A value is greyed out (but still readable) when every matching option is sold out. */
function VariantPicker({sizes,colours,variants,size,colour,onSize,onColour,failed}:{sizes:string[];colours:string[];variants:ProductVariant[];size?:string;colour?:string;onSize:(v:string)=>void;onColour:(v:string)=>void;failed:boolean}){
 if(failed)return <Text style={[s.muted,ds({marginTop:8})]}>Sizes and colours could not be loaded. Close and reopen this product.</Text>;
 if(!variants.length)return <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading product options" style={ds({marginTop:8})}/>;
 const row=(title:string,axis:'size'|'colour',values:string[],picked:string|undefined,other:string|undefined,pick:(v:string)=>void)=>values.length?<View style={ds({marginTop:10})}><Text style={s.section}>{title}{picked?`: ${picked}`:''}</Text><View style={ds({flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:6})}>{values.map(v=>{const has=axisValueInStock(variants,axis,v,other);const on=picked===v;return <NexaPressable key={v} accessibilityRole="radio" accessibilityState={{selected:on,disabled:!has}} accessibilityLabel={`${title} ${v}${has?'':', sold out'}`} disabled={!has} onPress={()=>pick(v)} style={[s.pill,on&&s.pillActive,ds({minHeight:44,justifyContent:'center',opacity:has?1:0.35})]}><Text style={[s.pillText,!has&&ds({textDecorationLine:'line-through'})]}>{v}</Text></NexaPressable>})}</View></View>:null;
 return <View>{row('Size','size',sizes,size,colours.length?colour:undefined,onSize)}{row('Colour','colour',colours,colour,sizes.length?size:undefined,onColour)}</View>}

/** Full product page: gallery image, price + savings, rating, seller, quantity, reviews, ask-seller, report, more from this shop. */
export function ProductDetail({p,saved,onClose,onAdd,onQuickAdd,onBuyNow,onToggleSaved,onOpenShop,onOpenProduct}:{p:Product;saved:boolean;onClose:()=>void;onAdd:(qty:number,variant:ProductVariant|null)=>void;onQuickAdd:(x:Product)=>void;onBuyNow:(qty:number,variant:ProductVariant|null)=>void;onToggleSaved:()=>void;onOpenShop:()=>void;onOpenProduct:(x:Product)=>void}){
 const [qty,setQty]=useState(1); const [reviews,setReviews]=useState<ProductReview[]|null>(null); const [reviewCursor,setReviewCursor]=useState<string|null>(null); const [reviewLoading,setReviewLoading]=useState(false); const [reviewSummary,setReviewSummary]=useState<{ratingAvg:number|null;ratingCount:number}|null>(null); const [reviewError,setReviewError]=useState(''); const [more,setMore]=useState<Product[]>([]); const [ask,setAsk]=useState(''); const [asking,setAsking]=useState(false);
 const [variants,setVariants]=useState<ProductVariant[]>(p.variants||[]); const [size,setSize]=useState<string|undefined>(); const [colour,setColour]=useState<string|undefined>(); const [variantsFailed,setVariantsFailed]=useState(false);
 const {sizes,colours}=variantAxes(variants); const chosen=p.hasVariants?findVariant(variants,size,colour):null; const needsChoice=!!p.hasVariants&&!chosen;
 const cap=p.hasVariants?(chosen?lineStockCap(p,chosen):0):stockCap(p); const out=stockCap(p)<=0; const canBuy=!out&&!needsChoice&&cap>0; const now=useNow(!!p.saleEndsAt); const pct=discountPercent(p,now);
 useEffect(()=>{setSize(undefined);setColour(undefined);setVariantsFailed(false);setVariants(p.variants||[]);if(p.hasVariants&&!p.variants)getProduct(p.id).then(r=>setVariants(r.product.variants||[])).catch(()=>setVariantsFailed(true));},[p.id]);
 useEffect(()=>{setQty(1);},[size,colour]);
 useEffect(()=>{setQty(1);setReviews(null);setReviewCursor(null);setReviewSummary(null);setReviewLoading(false);setMore([]);let live=true;
  listProductReviews(p.id,undefined,20).then(r=>{if(live){setReviews(r.reviews||[]);setReviewCursor(r.nextCursor||null);setReviewSummary(r.summary||null);}}).catch(()=>{if(live){setReviews([]);setReviewCursor(null);}});
  if(p.vendorId)listProducts('','',{vendorId:p.vendorId,limit:10}).then(r=>{if(live)setMore((r.products||[]).filter(x=>x.id!==p.id).slice(0,8));}).catch(()=>{});
  return()=>{live=false;};},[p.id,p.vendorId]);
 const send=async()=>{const text=ask.trim();if(!text)return Alert.alert('Ask the seller','Type your question first.');if(asking)return;setAsking(true);try{await startMarketplaceInquiry(p.id,text,`${p.id}-${Date.now()}`);setAsk('');Alert.alert('Question sent','The seller will reply in your marketplace messages.');}catch(e:any){Alert.alert('Ask the seller',e?.message||'Could not send your question.');}finally{setAsking(false);}};
 const report=()=>Alert.alert('Report this listing','Tell NEXA moderators about a problem with this listing?',[{text:'Cancel',style:'cancel'},{text:'Report',style:'destructive',onPress:async()=>{try{await reportMarketplaceTarget('listing',p.id,'Reported from product page');Alert.alert('Report sent','Thank you. Our moderators will review this listing.');}catch(e:any){Alert.alert('Report listing',e?.message||'Could not send the report.');}}}]);
 return <View style={s.modal}><View style={[s.modalCard,ds({maxHeight:'94%'})]}><ScrollView keyboardShouldPersistTaps="handled">
  <View style={ds({flexDirection:'row',justifyContent:'space-between',marginBottom:8})}>
   <NexaPressable accessibilityRole="button" accessibilityLabel="Close product" onPress={onClose} style={ds({minHeight:44,justifyContent:'center'})}><Text style={ds({color:theme.colors.goldBright,fontWeight:'800'})}>‹ Back</Text></NexaPressable>
   <NexaPressable accessibilityRole="button" accessibilityState={{selected:saved}} accessibilityLabel={saved?`Remove ${p.name} from saved items`:`Save ${p.name}`} onPress={onToggleSaved} style={ds({minHeight:44,minWidth:44,justifyContent:'center',alignItems:'flex-end'})}><Text style={ds({fontSize:28,color:saved?theme.colors.errorText:theme.colors.muted})}>{saved?'♥':'♡'}</Text></NexaPressable>
  </View>
  <View style={ds({borderRadius:18,overflow:'hidden'})}><ProductGallery p={p} height={260}/>{pct?<View style={ds({position:'absolute',top:10,left:10,backgroundColor:SALE_BADGE_BG,borderRadius:10,paddingHorizontal:10,paddingVertical:4})}><Text style={ds({color:'#fff',fontWeight:'900'})}>-{pct}%</Text></View>:null}</View>
  <View style={ds({flexDirection:'row',alignItems:'baseline',gap:8,flexWrap:'wrap',marginTop:12})}>
   <Text style={ds({color:pct?theme.colors.errorText:theme.colors.text,fontSize:28,fontWeight:'900'})}>{priceText(p.price,p.currency)}</Text>
   {pct&&p.regularPrice?<Text style={ds({color:theme.colors.muted,fontSize:17,textDecorationLine:'line-through'})}>{priceText(p.regularPrice,p.currency)}</Text>:null}
   {pct&&p.regularPrice?<Text style={ds({color:theme.colors.success,fontWeight:'800'})}>You save {priceText(p.regularPrice-p.price,p.currency)}</Text>:null}
  </View>
  {pct&&p.saleEndsAt?<Text style={ds({color:theme.colors.errorText,fontWeight:'800',marginTop:4})}>⏱ Deal ends in {countdownText(p.saleEndsAt,now)}</Text>:null}
  <Text accessibilityRole="header" style={ds({color:theme.colors.text,fontSize:20,lineHeight:24,fontWeight:'800',marginTop:8})}>{p.name}</Text>
  <RatingLine avg={p.ratingAvg} count={p.ratingCount} sold={p.soldCount} sellerBadge={p.sellerBadge}/>
  {p.weightKg!=null?<Text accessibilityLabel={`Product weight ${p.weightKg} kilograms`} style={s.muted}>Weight: {p.weightKg} kg</Text>:null}
  {p.hasVariants&&!out?<VariantPicker sizes={sizes} colours={colours} variants={variants} size={size} colour={colour} onSize={setSize} onColour={setColour} failed={variantsFailed}/>:null}
  <Text style={ds({marginTop:6,fontWeight:'700',color:out?theme.colors.errorText:needsChoice?theme.colors.muted:cap<=5?theme.colors.warning:theme.colors.success})}>{out?'Sold out':needsChoice?(variantsFailed?'Options could not be loaded':'Choose your options'):cap<=5?`Only ${cap} left in stock${chosen?` (${variantLabel(chosen)})`:''}`:'In stock'}</Text>
  {p.vendorName?<NexaPressable accessibilityRole="button" accessibilityLabel={`Visit shop ${p.vendorName}`} onPress={onOpenShop} style={ds({marginTop:12,padding:12,borderRadius:14,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'})}><View style={ds({flex:1})}><Text style={ds({color:theme.colors.text,fontWeight:'800'})}>Sold by {p.vendorName}</Text><Text style={s.muted}>{p.vendorRatingAvg!=null&&(p.vendorRatingCount||0)>0?`Seller rating ★ ${ratingLabel(p.vendorRatingAvg,p.vendorRatingCount)}`:'New seller · no reviews yet'}</Text></View><Text style={ds({color:theme.colors.goldBright,fontWeight:'800'})}>Visit shop ›</Text></NexaPressable>:null}
  <View style={ds({flexDirection:'row',alignItems:'center',gap:12,marginTop:14})}><Text style={s.section}>Quantity</Text>
   <NexaPressable accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={!canBuy||qty<=1} accessibilityState={{disabled:!canBuy||qty<=1}} style={[s.smallButton,ds({minWidth:44,minHeight:44,justifyContent:'center',opacity:qty<=1?0.4:1})]} onPress={()=>setQty(q=>Math.max(1,q-1))}><Text style={s.buttonText}>−</Text></NexaPressable>
   <Text accessibilityLabel={`Quantity ${qty}`} style={s.section}>{qty}</Text>
   <NexaPressable accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={!canBuy||qty>=cap} accessibilityState={{disabled:!canBuy||qty>=cap}} style={[s.smallButton,ds({minWidth:44,minHeight:44,justifyContent:'center',opacity:qty>=cap?0.4:1})]} onPress={()=>setQty(q=>Math.min(cap,q+1))}><Text style={s.buttonText}>+</Text></NexaPressable>
  </View>
  <View style={ds({flexDirection:'row',gap:8,marginTop:14})}>
   <NexaPressable accessibilityRole="button" accessibilityLabel={out?`${p.name} is sold out`:needsChoice?'Choose size or colour first':`Add ${qty} ${p.name} to cart`} disabled={!canBuy} accessibilityState={{disabled:!canBuy}} style={[s.buttonSecondary,ds({flex:1,minHeight:48,justifyContent:'center',opacity:canBuy?1:0.4})]} onPress={()=>{onAdd(qty,chosen);Alert.alert('Added to cart',`${qty} × ${p.name}${chosen?` (${variantLabel(chosen)})`:''}`);}}><Text style={s.buttonText}>{needsChoice&&!out?'Choose options':'Add to cart'}</Text></NexaPressable>
   <NexaPressable accessibilityRole="button" accessibilityLabel={`Buy ${p.name} now`} disabled={!canBuy} accessibilityState={{disabled:!canBuy}} style={[s.button,ds({flex:1,minHeight:48,justifyContent:'center',opacity:canBuy?1:0.4})]} onPress={()=>onBuyNow(qty,chosen)}><Text style={s.buttonText}>Buy now</Text></NexaPressable>
  </View>
  {p.description?<><Text style={[s.section,ds({marginTop:18})]}>About this item</Text><Text style={s.muted}>{p.description}</Text></>:null}
  <Text style={[s.section,ds({marginTop:18})]}>Customer reviews</Text>
  {reviewSummary&&reviewSummary.ratingCount>0?<Text style={s.muted}>{ratingLabel(reviewSummary.ratingAvg,reviewSummary.ratingCount)}</Text>:null}
  {reviews===null?<ActivityIndicator/>:reviewError?<View><Text style={s.muted}>Customer reviews are temporarily unavailable. Your seller rating above remains the authoritative Marketplace summary.</Text><NexaPressable accessibilityRole="button" accessibilityLabel="Retry customer reviews" onPress={()=>{setReviews(null);setReviewError('');listProductReviews(p.id,undefined,20).then(r=>{setReviews(r.reviews||[]);setReviewCursor(r.nextCursor||null);setReviewSummary(r.summary||null);}).catch((e:any)=>{setReviews([]);setReviewError(e?.message||'Could not load customer reviews.');})}} style={[s.buttonSecondary,ds({marginTop:8,minHeight:44,justifyContent:'center'})]}><Text style={s.buttonText}>Retry reviews</Text></NexaPressable></View>:reviews.length?reviews.map(r=><View key={r.id} style={ds({paddingVertical:10,borderBottomWidth:1,borderBottomColor:theme.colors.border})}><Text style={ds({color:theme.colors.warning,fontWeight:'800'})}>{'★'.repeat(Math.max(0,Math.min(5,r.rating)))}<Text style={ds({color:theme.colors.muted})}>{'★'.repeat(5-Math.max(0,Math.min(5,r.rating)))}</Text> <Text style={ds({color:theme.colors.text,fontWeight:'700'})}>{r.reviewerName||'NEXA member'}</Text></Text><Text style={ds({color:theme.colors.muted,fontSize:14,marginTop:2})}>Verified purchase · {new Date(r.createdAt).toLocaleDateString()}</Text>{r.comment?<Text style={[s.muted,ds({marginTop:3})]}>{r.comment}</Text>:null}{r.sellerReply?<Text style={[s.muted,ds({marginTop:4,fontStyle:'italic'})]}>Seller reply: {r.sellerReply}</Text>:null}</View>):<Text style={s.muted}>No reviews yet. Only buyers with a delivered order can review this item.</Text>}
  {reviewCursor?<NexaPressable accessibilityRole="button" accessibilityLabel="Load more customer reviews" disabled={reviewLoading} accessibilityState={{disabled:reviewLoading}} onPress={async()=>{if(!reviewCursor||reviewLoading)return;setReviewLoading(true);try{const r=await listProductReviews(p.id,reviewCursor,20);setReviews(prev=>[...(prev||[]),...(r.reviews||[])]);setReviewCursor(r.nextCursor||null);}catch(e:any){Alert.alert('Customer reviews',e?.message||'Could not load more reviews.');}finally{setReviewLoading(false);}}} style={[s.buttonSecondary,ds({marginTop:10,minHeight:44,justifyContent:'center'})]}><Text style={s.buttonText}>{reviewLoading?'Loading…':'Load more reviews'}</Text></NexaPressable>:null}
  <Text style={[s.section,ds({marginTop:18})]}>Ask the seller</Text>
  <TextInput accessibilityLabel="Question for the seller" value={ask} onChangeText={setAsk} placeholder="Size, delivery, availability…" placeholderTextColor={theme.colors.muted} multiline style={[s.authInput,ds({minHeight:56,textAlignVertical:'top'})]}/>
  <NexaPressable accessibilityRole="button" accessibilityLabel="Send question to seller" disabled={asking} accessibilityState={{disabled:asking}} onPress={send} style={[s.buttonSecondary,ds({marginTop:6,minHeight:44,justifyContent:'center'})]}><Text style={s.buttonText}>{asking?'Sending…':'Send question'}</Text></NexaPressable>
  {more.length?<ProductRail title={`More from ${p.vendorName||'this shop'}`} products={more} onOpen={onOpenProduct} onAdd={onQuickAdd}/>:null}
  <NexaPressable accessibilityRole="button" accessibilityLabel="Report this listing" onPress={report} style={ds({minHeight:44,justifyContent:'center',alignItems:'center',marginTop:12})}><Text style={ds({color:tc('#ef8d8d'),fontWeight:'700'})}>Report this listing</Text></NexaPressable>
 </ScrollView></View></View>;
}

/** Saved items ("wishlist") panel; products are fetched by id so prices and stock are always current. */
export function SavedPanel({ids,renderCard,onClose}:{ids:string[];renderCard:(p:Product)=>React.ReactNode;onClose:()=>void}){
 const [items,setItems]=useState<Product[]|null>(null);
 useEffect(()=>{let live=true;if(!ids.length){setItems([]);return;}listProducts('','',{ids:ids.slice(0,50),limit:50}).then(r=>{if(live)setItems(r.products||[]);}).catch(()=>{if(live)setItems([]);});return()=>{live=false;};},[ids.join(',')]);
 return <View style={s.card}>
  <View style={ds({flexDirection:'row',justifyContent:'space-between',alignItems:'center'})}><Text accessibilityRole="header" style={s.section}>Saved items</Text><NexaPressable accessibilityRole="button" accessibilityLabel="Close saved items" onPress={onClose} style={ds({minHeight:44,justifyContent:'center'})}><Text style={ds({color:theme.colors.goldBright,fontWeight:'800'})}>Close</Text></NexaPressable></View>
  {items===null?<ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading saved marketplace items"/>:items.length?<View style={ds({flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:12})}>{items.map(p=>renderCard(p))}</View>:<Text style={s.muted}>Nothing saved yet. Tap the heart on any product to keep it here.</Text>}
 </View>}
