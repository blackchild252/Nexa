import { StyleSheet } from "react-native";
import { tc, themedStyles } from './theme';

// Styles for the social layer screens (V3.17: friends, inbox, rooms). Same token palette as
// groupStyles.ts (dark cards, mint accent, amber/red for warnings) but its own file since these
// screens need things groups never did — message bubbles, a username claim box, a sub-tab strip.
// Reuse `gs` from groupStyles.ts alongside this for the generic bits (badges, smallBtn, composer,
// inviteBox/code) rather than duplicating them here — see FriendsScreen.tsx / RoomScreen.tsx.
export const ss = themedStyles(() => StyleSheet.create({
  // -- sub-tab strip (Messages / Rooms inside Inbox surface) --
  subTabRow: { flexDirection: "row", marginBottom: 14, borderBottomWidth: 1, borderBottomColor: tc("rgba(212,175,55,0.4)") },
  subTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  subTabOn: { borderBottomColor: tc("#D4AF37") },
  subTabText: { color: tc("#A9A9A9"), fontWeight: "700", fontSize: 15 },
  subTabTextOn: { color: tc("#F8F5E9") },

  // -- username --
  usernameBox: { backgroundColor: tc("#1A1A1A"), borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: tc("rgba(212,175,55,0.4)") },
  usernameValue: { color: tc("#D4AF37"), fontWeight: "800", fontSize: 18 },
  usernameHint: { color: tc("#A9A9A9"), fontSize: 14, marginTop: 3 },
  usernameAvailable: { color: tc("#D4AF37"), fontSize: 14, marginTop: 6 },
  usernameTaken: { color: tc("#f87171"), fontSize: 14, marginTop: 6 },

  // -- search / user rows --
  searchInput: { backgroundColor: tc("#2A2A2A"), borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: tc("#F8F5E9"), borderWidth: 1, borderColor: tc("rgba(212,175,55,0.4)"), fontSize: 16 },
  userRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: tc("rgba(212,175,55,0.4)") },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: tc("rgba(212,175,55,0.4)"), alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { color: tc("#F8F5E9"), fontWeight: "800", fontSize: 16 },
  userName: { color: tc("#F8F5E9"), fontWeight: "700", fontSize: 16 },
  userHandle: { color: tc("#A9A9A9"), fontSize: 14, marginTop: 2 },

  // -- inbox rows (direct-message threads, rooms) --
  inboxRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: tc("rgba(212,175,55,0.4)") },
  inboxName: { color: tc("#F8F5E9"), fontWeight: "700", fontSize: 17 },
  inboxPreview: { color: tc("#A9A9A9"), fontSize: 15, marginTop: 2 },
  inboxPreviewUnread: { color: tc("#F8F5E9"), fontWeight: "600" },
  inboxMeta: { color: tc("#756e61"), fontSize: 15, marginLeft: 8 },
  unreadDot: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: tc("#D4AF37"), alignItems: "center", justifyContent: "center", paddingHorizontal: 5, marginLeft: 8 },
  unreadDotText: { color: tc("#000000"), fontWeight: "800", fontSize: 14 },

  // -- thread / room detail header --
  threadHeader: { flexDirection: "row", alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tc("rgba(212,175,55,0.4)"), marginBottom: 10 },
  threadTitle: { color: tc("#F8F5E9"), fontWeight: "800", fontSize: 18 },
  threadSub: { color: tc("#A9A9A9"), fontSize: 14, marginTop: 2 },

  // -- message bubbles --
  msgRow: { marginVertical: 3, maxWidth: "80%" },
  msgRowMine: { alignSelf: "flex-end" },
  msgRowTheirs: { alignSelf: "flex-start" },
  bubble: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMine: { backgroundColor: tc("#D4AF37"), borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: tc("rgba(212,175,55,0.4)"), borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: tc("#000000"), fontSize: 16 },
  bubbleTextTheirs: { color: tc("#F8F5E9"), fontSize: 16 },
  bubbleSender: { color: tc("#D4AF37"), fontSize: 15, fontWeight: "700", marginBottom: 2, marginLeft: 2 },
  bubbleTime: { color: tc("#756e61"), fontSize: 14, marginTop: 3, marginHorizontal: 2 },
  bubbleTimeMine: { alignSelf: "flex-end" },

  // -- composer (message input + send) --
  sendBar: { flexDirection: "row", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: tc("rgba(212,175,55,0.4)") },
  sendInput: { flex: 1, backgroundColor: tc("#2A2A2A"), borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: tc("#F8F5E9"), borderWidth: 1, borderColor: tc("rgba(212,175,55,0.4)"), fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: tc("#D4AF37"), alignItems: "center", justifyContent: "center", marginLeft: 8 },
  sendBtnDisabled: { backgroundColor: tc("rgba(212,175,55,0.4)") },
  sendBtnText: { color: tc("#000000"), fontWeight: "900", fontSize: 18 },

  emptyState: { color: tc("#A9A9A9"), fontSize: 15, marginTop: 20, textAlign: "center" },
}));
