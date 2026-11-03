import { StyleSheet } from 'react-native';
import { theme, tc, themedStyles } from './theme';
import { NEXA_FONTS } from './nexaFonts';

export const s = themedStyles(() => StyleSheet.create({
  wrap:{flex:1,padding:theme.layout.pagePadding,backgroundColor:'transparent'},
  scrollWrap:{flexGrow:1,padding:theme.layout.pagePadding,backgroundColor:'transparent'},
  card:{backgroundColor:theme.colors.surface,borderRadius:theme.radius.lg,padding:theme.layout.cardPadding,marginBottom:theme.spacing.md,borderWidth:1,borderColor:tc('rgba(212,175,55,0.4)'),...theme.shadow.card},
  title:{fontFamily:NEXA_FONTS.bold,fontSize:30,lineHeight:34,fontWeight:'700',letterSpacing:-0.25,color:theme.colors.text},
  subtitle:{fontFamily:NEXA_FONTS.regular,fontSize:18,color:theme.colors.textSecondary,marginTop:5,lineHeight:23},
  muted:{fontFamily:NEXA_FONTS.regular,fontSize:16,lineHeight:20,color:theme.colors.muted},
  authInput:{backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:tc('rgba(212,175,55,0.4)'),borderRadius:theme.radius.md,padding:12,color:theme.colors.text,marginTop:6},
  targetRow:{flexDirection:'row',alignItems:'center'},targetInput:{flex:1,backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:tc('rgba(212,175,55,0.4)'),borderRadius:theme.radius.md,padding:12,color:theme.colors.text},
  back:{fontFamily:NEXA_FONTS.semibold,fontSize:32,color:theme.colors.goldHot,fontWeight:'600'},heading:{fontFamily:NEXA_FONTS.bold,fontSize:25,lineHeight:29,fontWeight:'700',color:theme.colors.text},
  dashCard:{backgroundColor:theme.colors.surface,borderRadius:theme.radius.lg,padding:theme.layout.cardPadding,marginBottom:theme.spacing.md,borderWidth:1,borderColor:tc('rgba(212,175,55,0.4)'),...theme.shadow.card},
  detailTop:{flexDirection:'row',alignItems:'center',marginBottom:6},detailTitle:{fontFamily:NEXA_FONTS.bold,fontSize:24,lineHeight:28,fontWeight:'700',color:theme.colors.text,marginBottom:10},
  btn:{backgroundColor:theme.colors.royalGold,paddingVertical:13,paddingHorizontal:18,minHeight:theme.accessibility.minTouchTarget,borderRadius:theme.radius.pill,alignItems:'center',justifyContent:'center',...theme.shadow.gold},btnText:{color:theme.colors.black,fontWeight:'900'},
  saveBtn:{backgroundColor:theme.colors.surface,borderWidth:1,borderColor:tc('rgba(212,175,55,0.4)'),paddingVertical:12,paddingHorizontal:16,minHeight:theme.accessibility.minTouchTarget,borderRadius:theme.radius.md,alignItems:'center',justifyContent:'center',marginTop:8},saveText:{color:theme.colors.text,fontWeight:'800'},
  targetBtn:{backgroundColor:theme.colors.royalGold,paddingVertical:10,paddingHorizontal:16,minHeight:theme.accessibility.minTouchTarget,borderRadius:theme.radius.pill,alignItems:'center',justifyContent:'center'},targetBtnText:{color:theme.colors.black,fontWeight:'900'},
  section:{fontFamily:NEXA_FONTS.semibold,fontSize:20,lineHeight:24,fontWeight:'600',color:theme.colors.text,marginBottom:10},
  button:{backgroundColor:theme.colors.royalGold,paddingVertical:13,paddingHorizontal:18,minHeight:theme.accessibility.minTouchTarget,borderRadius:theme.radius.pill,alignItems:'center',justifyContent:'center',...theme.shadow.gold},
  buttonSecondary:{backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderStrong,paddingVertical:12,paddingHorizontal:16,minHeight:theme.accessibility.minTouchTarget,borderRadius:theme.radius.md,alignItems:'center',justifyContent:'center',...theme.shadow.card},
  smallButton:{backgroundColor:theme.colors.royalGold,paddingVertical:9,paddingHorizontal:14,minHeight:theme.accessibility.minTouchTarget,justifyContent:'center',borderRadius:theme.radius.pill,alignItems:'center'},buttonText:{fontFamily:NEXA_FONTS.bold,color:theme.colors.black,fontWeight:'700',fontSize:16},
  pill:{backgroundColor:theme.colors.surface,borderWidth:1,borderColor:tc('rgba(212,175,55,0.4)'),paddingVertical:8,paddingHorizontal:12,minHeight:theme.accessibility.minTouchTarget,borderRadius:theme.radius.pill,marginRight:8,justifyContent:'center'},
  pillActive:{backgroundColor:theme.colors.goldWash,borderColor:theme.colors.goldBright,...theme.shadow.gold},pillText:{fontFamily:NEXA_FONTS.semibold,color:theme.colors.text,fontWeight:'600',fontSize:16},
  modal:{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:tc('rgba(0,0,0,.78)'),justifyContent:'flex-end'},modalCard:{backgroundColor:theme.colors.surfaceElevated,borderTopLeftRadius:theme.radius.xl,borderTopRightRadius:theme.radius.xl,padding:theme.spacing.lg,maxHeight:'90%',borderWidth:1,borderColor:tc('rgba(212,175,55,0.4)')},
}));
