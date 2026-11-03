import { StyleSheet } from "react-native";
import { tc, themedStyles } from './theme';

// Styles for the shared money groups screens (V3.14). Kept out of styles.ts so that file needs no merge;
// the shared look (cards, inputs, buttons, chips) still comes from `s`, this only adds what groups need.
export const gs = themedStyles(() => StyleSheet.create({
  topRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  topBtn: { flex: 1, borderWidth: 1, borderColor: tc("#D4AF37"), borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  topBtnPrimary: { backgroundColor: tc("#D4AF37"), borderColor: tc("#D4AF37") },
  topBtnText: { color: tc("#F8F5E9"), fontWeight: "700", fontSize: 15 },
  topBtnTextPrimary: { color: tc("#000000") },

  groupCard: { backgroundColor: tc("#1A1A1A"), borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: tc("rgba(212,175,55,0.3)") },
  groupName: { color: tc("#F8F5E9"), fontWeight: "800", fontSize: 18 },
  groupMeta: { color: tc("#A9A9A9"), fontSize: 14, marginTop: 3 },
  groupLine: { fontSize: 15, fontWeight: "700", marginTop: 8 },
  owed: { color: tc("#D4AF37") },
  owe: { color: tc("#D4AF37") },
  neutral: { color: tc("#F8F5E9") },
  danger: { color: tc("#f87171") },

  badge: { alignSelf: "flex-start", borderWidth: 1, borderColor: tc("#D4AF37"), borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6 },
  badgeText: { color: tc("#F8F5E9"), fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  badgeMint: { borderColor: tc("#D4AF37") },
  badgeMintText: { color: tc("#D4AF37") },
  badgeAmber: { borderColor: tc("#D4AF37") },
  badgeAmberText: { color: tc("#D4AF37") },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },

  kindCard: { borderWidth: 1, borderColor: tc("#D4AF37"), borderRadius: 12, padding: 12, marginBottom: 8 },
  kindCardOn: { borderColor: tc("#D4AF37"), backgroundColor: tc("#2A2A2A") },
  kindTitle: { color: tc("#F8F5E9"), fontWeight: "800", fontSize: 16 },

  label: { color: tc("#8f97a3"), fontSize: 15, textTransform: "uppercase", marginTop: 12, marginBottom: 6 },
  sectionTitle: { color: tc("#D4AF37"), fontWeight: "800", fontSize: 14, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 22, marginBottom: 8 },
  errorText: { color: tc("#f87171"), fontSize: 15, marginTop: 10 },

  bigNumber: { color: tc("#F8F5E9"), fontSize: 32, fontWeight: "900" },
  bigLabel: { color: tc("#F8F5E9"), fontSize: 14, marginBottom: 2 },
  statRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: tc("#1A1A1A"), borderRadius: 10, padding: 10, borderWidth: 1, borderColor: tc("rgba(212,175,55,0.3)") },
  statLabel: { color: tc("#A9A9A9"), fontSize: 15, marginBottom: 2 },
  statValue: { color: tc("#F8F5E9"), fontWeight: "800", fontSize: 16 },

  track: { height: 8, borderRadius: 4, backgroundColor: tc("rgba(212,175,55,0.4)"), marginTop: 10, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: tc("#D4AF37") },

  personRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: tc("rgba(212,175,55,0.4)") },
  personName: { color: tc("#F8F5E9"), fontWeight: "700", fontSize: 16 },
  personSub: { color: tc("#A9A9A9"), fontSize: 14, marginTop: 2 },
  personAmt: { fontWeight: "800", fontSize: 16 },
  smallBtn: { borderWidth: 1, borderColor: tc("#D4AF37"), borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginLeft: 8 },
  smallBtnText: { color: tc("#D4AF37"), fontWeight: "700", fontSize: 14 },
  smallBtnDanger: { borderColor: tc("#5b2a2a") },
  smallBtnDangerText: { color: tc("#f87171") },
  arrowBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  arrowText: { color: tc("#F8F5E9"), fontSize: 16 },
  posBubble: { width: 22, height: 22, borderRadius: 11, backgroundColor: tc("rgba(212,175,55,0.4)"), alignItems: "center", justifyContent: "center", marginRight: 10 },
  posText: { color: tc("#F8F5E9"), fontSize: 15, fontWeight: "800" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: tc("#D4AF37"), borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  chipOn: { backgroundColor: tc("#D4AF37"), borderColor: tc("#D4AF37") },
  chipText: { color: tc("#F8F5E9"), fontSize: 15, fontWeight: "700" },
  chipTextOn: { color: tc("#000000") },

  composer: { backgroundColor: tc("#2A2A2A"), borderRadius: 12, padding: 14, borderWidth: 1, borderColor: tc("rgba(212,175,55,0.4)"), marginTop: 12 },
  composerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  shareInput: { width: 96, backgroundColor: tc("#2A2A2A"), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: tc("#F8F5E9"), borderWidth: 1, borderColor: tc("rgba(212,175,55,0.4)"), textAlign: "right" },

  entry: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: tc("rgba(212,175,55,0.4)") },
  entryTitle: { color: tc("#F8F5E9"), fontSize: 16, fontWeight: "700" },
  entrySub: { color: tc("#A9A9A9"), fontSize: 14, marginTop: 2 },
  entryAmt: { color: tc("#F8F5E9"), fontWeight: "800", fontSize: 16 },
  voided: { opacity: 0.45, textDecorationLine: "line-through" },
  inviteBox: { backgroundColor: tc("#1A1A1A"), borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: tc("rgba(212,175,55,0.4)") },
  code: { color: tc("#D4AF37"), fontSize: 24, fontWeight: "900", letterSpacing: 4 },
}));
