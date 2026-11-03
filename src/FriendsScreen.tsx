import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, ActivityIndicator, RefreshControl, Image } from "react-native";

import { s } from "./styles";
import {NexaPressable} from "./motion";
import { theme, ds } from "./theme";
import { gs } from "./groupStyles";
import { ss } from "./socialStyles";
import type { PublicUser, FriendRequest } from "./friends";
import type { Friends } from "./useFriends";

// Friends screen (V3.17). Drop in as its own screen/tab section, or as the first sub-tab inside
// Zeeza chat surfaces — it's self-contained and only needs `friends={useFriends(...)}`.
//
//   const friends = useFriends({ active: tab === "zeeza" });
//   <FriendsScreen friends={friends} onMessage={(friend) => { zeeza.openDm(friend); /* navigate to DM thread */ }} />
//
// `onMessage` is optional — omit it and the "Message" button on a friend row is hidden. Wire it to
// `zeeza.openDm(friend)` (from useZeeza) plus whatever navigation shows ZeezaThreadScreen next.

function initial(name: string): string {
  return (name.trim()[0] || "?").toUpperCase();
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <View style={ss.avatar}>
      {avatarUrl ? <Image source={{ uri: avatarUrl }} accessible accessibilityRole="image" accessibilityLabel={`${name} profile photo`} style={ds({ width: "100%", height: "100%", borderRadius: 999 })} /> : <Text style={ss.avatarText}>{initial(name)}</Text>}
    </View>
  );
}

// -- my username: claim box if unset, badge if set --
function UsernameBox({ friends }: { friends: Friends }) {
  const [input, setInput] = useState("");
  const [check, setCheck] = useState<{ available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  if (friends.myUsernameLoading) return null;

  if (friends.myUsername) {
    return (
      <View style={ss.usernameBox}>
        <Text style={gs.groupMeta}>Your username</Text>
        <Text style={ss.usernameValue}>@{friends.myUsername}</Text>
      </View>
    );
  }

  const runCheck = async (v: string) => {
    setInput(v);
    setCheck(null);
    const cleaned = v.trim();
    if (cleaned.length < 3) return;
    setChecking(true);
    const result = await friends.checkUsername(cleaned);
    setChecking(false);
    setCheck(result);
  };

  return (
    <View style={ss.usernameBox}>
      <Text style={gs.label}>Pick a username</Text>
      <Text style={ss.usernameHint}>Friends find you by this — it's separate from your name.</Text>
      <View style={[s.targetRow, { marginTop: 8 }]}>
        <TextInput
          style={s.targetInput} value={input} onChangeText={runCheck} accessibilityLabel="Choose your NEXA username"
          placeholder="e.g. amaka_o" placeholderTextColor={theme.colors.muted} autoCapitalize="none" autoCorrect={false} maxLength={24}
        />
        <NexaPressable
          style={[gs.smallBtn, { marginLeft: 8 }]}
          accessibilityRole="button" accessibilityLabel="Save NEXA username"
          disabled={friends.usernameSaving || !check?.available} accessibilityState={{disabled:friends.usernameSaving || !check?.available}}
          onPress={async () => { if (await friends.claimUsername(input.trim())) setInput(""); }}
        >
          {friends.usernameSaving ? <ActivityIndicator color={theme.colors.royalGold} /> : <Text style={gs.smallBtnText}>Save</Text>}
        </NexaPressable>
      </View>
      {checking && <Text style={ss.usernameHint}>Checking…</Text>}
      {!checking && check && (
        <Text style={check.available ? ss.usernameAvailable : ss.usernameTaken}>
          {check.available ? "Available" : check.reason || "Already taken"}
        </Text>
      )}
    </View>
  );
}

// -- search by username, send a request --
function SearchBox({ friends, initialSearch }: { friends: Friends; initialSearch?: string }) {
  const [q, setQ] = useState("");
  useEffect(() => { const next = String(initialSearch || '').trim(); if (next) { setQ(next); void friends.search(next); } }, [initialSearch, friends.search]);
  return (
    <View style={ds({ marginBottom: 16 })}>
      <Text style={gs.sectionTitle}>Add a friend</Text>
      <TextInput
        style={ss.searchInput} value={q}
        onChangeText={(v) => { setQ(v); friends.search(v); }}
        placeholder="Search by username" placeholderTextColor={theme.colors.muted} accessibilityLabel="Search friends by username" autoCapitalize="none" autoCorrect={false}
      />
      {friends.searching && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Searching for friends" color={theme.colors.royalGold} style={ds({ marginTop: 8 })} />}
      {!friends.searching && q.trim().length >= 2 && friends.searchResults.length === 0 && (
        <Text style={ss.emptyState}>No one found with that username.</Text>
      )}
      {friends.searchResults.map((u: PublicUser) => (
        <View key={u.id} style={ss.userRow}>
          <Avatar name={u.name} avatarUrl={u.avatarUrl} />
          <View style={ds({ flex: 1 })}>
            <Text style={ss.userName}>{u.name}</Text>
            {u.username && <Text style={ss.userHandle}>@{u.username}</Text>}
          </View>
          <NexaPressable
            style={[gs.smallBtn, gs.topBtnPrimary, { marginLeft: 8 }]}
            accessibilityRole="button" accessibilityLabel={`Add ${u.name} as a friend`}
            disabled={friends.sendingRequest} accessibilityState={{disabled:friends.sendingRequest}}
            onPress={() => u.username && friends.sendFriendRequest(u.username)}
          >
            <Text style={[gs.smallBtnText, gs.topBtnTextPrimary]}>Add</Text>
          </NexaPressable>
          <NexaPressable
            style={[gs.smallBtn, gs.smallBtnDanger, { marginLeft: 6 }]}
            accessibilityRole="button" accessibilityLabel={`Block ${u.name}`} accessibilityState={{disabled:friends.sendingRequest}} disabled={friends.sendingRequest}
            onPress={() => friends.block(u)}
          >
            <Text style={[gs.smallBtnText, gs.smallBtnDangerText]}>Block</Text>
          </NexaPressable>
        </View>
      ))}
    </View>
  );
}

function RequestRow({ req, kind, friends }: { req: FriendRequest; kind: "incoming" | "outgoing"; friends: Friends }) {
  return (
    <View style={ss.userRow}>
      <Avatar name={req.user.name} avatarUrl={req.user.avatarUrl} />
      <View style={ds({ flex: 1 })}>
        <Text style={ss.userName}>{req.user.name}</Text>
        {req.user.username && <Text style={ss.userHandle}>@{req.user.username}</Text>}
      </View>
      {kind === "incoming" ? (
        <>
          <NexaPressable style={[gs.smallBtn, gs.topBtnPrimary]} accessibilityRole="button" accessibilityLabel={`Accept friend request from ${req.user.name}`} onPress={() => friends.acceptRequest(req)}>
            <Text style={[gs.smallBtnText, gs.topBtnTextPrimary]}>Accept</Text>
          </NexaPressable>
          <NexaPressable style={[gs.smallBtn, gs.smallBtnDanger]} accessibilityRole="button" accessibilityLabel={`Decline friend request from ${req.user.name}`} onPress={() => friends.declineRequest(req)}>
            <Text style={[gs.smallBtnText, gs.smallBtnDangerText]}>Decline</Text>
          </NexaPressable>
        </>
      ) : (
        <NexaPressable style={gs.smallBtn} accessibilityRole="button" accessibilityLabel={`Cancel friend request to ${req.user.name}`} onPress={() => friends.cancelRequest(req)}>
          <Text style={gs.smallBtnText}>Cancel</Text>
        </NexaPressable>
      )}
    </View>
  );
}

function FriendRow({ friend, friends, onMessage }: { friend: PublicUser; friends: Friends; onMessage?: (f: PublicUser) => void }) {
  return (
    <View style={ss.userRow}>
      <Avatar name={friend.name} avatarUrl={friend.avatarUrl} />
      <View style={ds({ flex: 1 })}>
        <Text style={ss.userName}>{friend.name}</Text>
        {friend.username && <Text style={ss.userHandle}>@{friend.username}</Text>}
      </View>
      {onMessage && (
        <NexaPressable style={gs.smallBtn} accessibilityRole="button" accessibilityLabel={`Message ${friend.name}`} onPress={() => onMessage(friend)}>
          <Text style={gs.smallBtnText}>Message</Text>
        </NexaPressable>
      )}
      <NexaPressable style={[gs.smallBtn, gs.smallBtnDanger]} accessibilityRole="button" accessibilityLabel={`Remove ${friend.name} from friends`} onPress={() => friends.unfriend(friend)}>
        <Text style={[gs.smallBtnText, gs.smallBtnDangerText]}>Remove</Text>
      </NexaPressable>
      <NexaPressable style={[gs.smallBtn, gs.smallBtnDanger]} accessibilityRole="button" accessibilityLabel={`Block ${friend.name}`} onPress={() => friends.block(friend)}>
        <Text style={[gs.smallBtnText, gs.smallBtnDangerText]}>Block</Text>
      </NexaPressable>
    </View>
  );
}

export function FriendsScreen({ friends, onMessage, initialSearch }: { friends: Friends; onMessage?: (friend: PublicUser) => void; initialSearch?: string }) {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={s.scrollWrap}
      refreshControl={
        <RefreshControl
          refreshing={refreshing} tintColor={theme.colors.royalGold}
          onRefresh={async () => { setRefreshing(true); await Promise.all([friends.loadFriends(), friends.loadRequests(), friends.loadBlocked()]); setRefreshing(false); }}
        />
      }
    >
      <Text style={s.heading}>Friends</Text>

      <UsernameBox friends={friends} />
      <SearchBox friends={friends} initialSearch={initialSearch} />

      {(friends.incoming.length > 0 || friends.outgoing.length > 0) && (
        <View style={ds({ marginBottom: 16 })}>
          {friends.incoming.length > 0 && (
            <>
              <Text style={gs.sectionTitle}>Requests</Text>
              {friends.incoming.map((r) => <RequestRow key={r.id} req={r} kind="incoming" friends={friends} />)}
            </>
          )}
          {friends.outgoing.length > 0 && (
            <>
              <Text style={gs.sectionTitle}>Sent</Text>
              {friends.outgoing.map((r) => <RequestRow key={r.id} req={r} kind="outgoing" friends={friends} />)}
            </>
          )}
        </View>
      )}

      <Text style={gs.sectionTitle}>Your friends</Text>
      {friends.friendsLoading && friends.friends.length === 0 && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading friends" color={theme.colors.royalGold} style={ds({ marginTop: 10 })} />}
      {friends.friendsError ? <Text style={[s.muted, gs.danger]}>{friends.friendsError}</Text> : null}
      {!friends.friendsLoading && !friends.friendsError && friends.friends.length === 0 && (
        <Text style={ss.emptyState}>No friends yet — search for a username above.</Text>
      )}
      {friends.friends.map((f) => <FriendRow key={f.id} friend={f} friends={friends} onMessage={onMessage} />)}

      <View style={ds({ marginTop: 22, marginBottom: 12 })}>
        <Text style={gs.sectionTitle}>Blocked users</Text>
        <Text style={ss.usernameHint}>People you block cannot find you, message you, or send you friend requests.</Text>
        {friends.blockedLoading ? (
          <ActivityIndicator color={theme.colors.royalGold} style={ds({ marginTop: 10 })} />
        ) : friends.blocked.length === 0 ? (
          <Text style={ss.emptyState}>No blocked users.</Text>
        ) : (
          friends.blocked.map((user) => (
            <View key={user.id} style={ss.userRow}>
              <Avatar name={user.name} avatarUrl={user.avatarUrl} />
              <View style={ds({ flex: 1 })}>
                <Text style={ss.userName}>{user.name}</Text>
                {user.username && <Text style={ss.userHandle}>@{user.username}</Text>}
              </View>
              <NexaPressable style={gs.smallBtn} accessibilityRole="button" accessibilityLabel={`Unblock ${user.name || user.username || "user"}`} onPress={() => friends.unblock(user.id)}>
                <Text style={gs.smallBtnText}>Unblock</Text>
              </NexaPressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
