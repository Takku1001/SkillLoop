import { writable, get } from 'svelte/store';
import { createClient } from '@supabase/supabase-js';
import { api } from './api.js';
import { data } from './data.js';
import { currentUser } from './stores.js';

export const selectedFriendshipId = writable(null);
export const messages = writable([]);
export const typingName = writable(''); // friend currently typing in the open chat

const me = () => get(currentUser);

// ── helpers ────────────────────────────────────────────────
function userName(id) {
  const u = get(data).users.find((x) => x.id === id);
  return u?.name;
}

function selectedFriend() {
  const id = get(selectedFriendshipId);
  return get(data).friends.find((f) => f.id === id) || null;
}

function appendMessage(msg) {
  let added = false;
  messages.update((list) => {
    if (list.some((m) => m.id === msg.id)) return list;
    added = true;
    const friend = selectedFriend();
    const name =
      msg.sender_id === me()?.id
        ? me().name
        : userName(msg.sender_id) || friend?.friend_name || 'Friend';
    return [...list, { ...msg, sender_name: name }];
  });
  return added;
}

function updatePreview(friendshipId, msg) {
  data.update((d) => {
    const f = d.friends.find((x) => x.id === friendshipId);
    if (f) {
      f.last_message = msg.body;
      f.last_message_at = msg.created_at;
    }
    return { ...d };
  });
}

function markReadRemote(friendshipId) {
  if (!me()) return;
  api(`/friends/${friendshipId}/read`, {
    method: 'POST',
    body: JSON.stringify({ user_id: me().id }),
  }).catch(() => {});
}

function findSkillByName(name) {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const skills = get(data).skills;
  return (
    skills.find((s) => s.name.toLowerCase() === q) ||
    skills.find((s) => s.name.toLowerCase().includes(q)) ||
    null
  );
}

// ── actions ────────────────────────────────────────────────
export async function openChat(friendshipId) {
  selectedFriendshipId.set(friendshipId);
  typingName.set('');
  const msgs = await api(
    `/friends/${friendshipId}/messages?user_id=${encodeURIComponent(me().id)}`,
  );
  messages.set(msgs);
  data.update((d) => {
    const f = d.friends.find((x) => x.id === friendshipId);
    if (f) f.unread_count = 0;
    return { ...d };
  });
}

export async function sendMessage(body) {
  const sel = get(selectedFriendshipId);
  const text = body.trim();
  if (!sel || !text) return;
  if (text.startsWith('/schedule')) return scheduleCommand(sel, text);

  const saved = await api(`/friends/${sel}/messages`, {
    method: 'POST',
    body: JSON.stringify({ user_id: me().id, body: text }),
  });
  if (appendMessage(saved)) updatePreview(sel, saved);
}

async function scheduleCommand(friendshipId, raw) {
  const arg = raw.slice('/schedule'.length).trim();
  const friend = get(data).friends.find((f) => f.id === friendshipId);
  if (!arg) throw new Error('Usage: /schedule <skill name>');
  const skill = findSkillByName(arg);
  if (!skill) throw new Error(`No skill matching "${arg}".`);

  const meId = me().id;
  const friendId = friend.friend_id;
  const offers = (uid) =>
    get(data).offerings.some((o) => o.user_id === uid && o.skill_id === skill.id);
  let teacherId = meId;
  let learnerId = friendId;
  if (!offers(meId) && offers(friendId)) {
    teacherId = friendId;
    learnerId = meId;
  }

  const session = await api('/sessions', {
    method: 'POST',
    body: JSON.stringify({ teacher_id: teacherId, learner_id: learnerId, skill_id: skill.id }),
  });
  const teacherName = teacherId === meId ? me().name : friend.friend_name;
  const learnerName = learnerId === meId ? me().name : friend.friend_name;
  const announcement = `📅 Session scheduled: ${skill.name} — ${teacherName} will teach ${learnerName}. Join the video call: ${session.video_url}`;
  const saved = await api(`/friends/${friendshipId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ user_id: meId, body: announcement }),
  });
  if (appendMessage(saved)) updatePreview(friendshipId, saved);
}

// ── realtime ───────────────────────────────────────────────
let client = null;
let chatChannel = null;
let typingChannel = null;
let lastTypingAt = 0;
let typingTimer = null;

export async function initRealtime() {
  if (client) return;
  let cfg;
  try {
    cfg = await fetch('/api/config').then((r) => r.json());
  } catch {
    return;
  }
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

  client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  chatChannel = client
    .channel('public:chat_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (p) =>
      handleIncoming(p.new),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendship_reads' }, (p) =>
      handleRead(p.new),
    )
    .subscribe();

  typingChannel = client
    .channel('skillloop-typing', { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, ({ payload }) => handleTyping(payload))
    .subscribe();
}

export function teardownRealtime() {
  if (client && chatChannel) client.removeChannel(chatChannel);
  if (client && typingChannel) client.removeChannel(typingChannel);
  client = null;
  chatChannel = null;
  typingChannel = null;
}

function handleIncoming(msg) {
  if (!msg || !me()) return;
  const friend = get(data).friends.find((f) => f.id === msg.friendship_id);
  if (!friend) return;
  updatePreview(msg.friendship_id, msg);

  if (msg.friendship_id === get(selectedFriendshipId)) {
    const added = appendMessage(msg);
    if (added && msg.sender_id !== me().id) {
      data.update((d) => {
        const f = d.friends.find((x) => x.id === msg.friendship_id);
        if (f) f.unread_count = 0;
        return { ...d };
      });
      markReadRemote(msg.friendship_id);
    }
  } else if (msg.sender_id !== me().id) {
    data.update((d) => {
      const f = d.friends.find((x) => x.id === msg.friendship_id);
      if (f) f.unread_count = (Number(f.unread_count) || 0) + 1;
      return { ...d };
    });
  }
}

function handleRead(read) {
  if (!read || !me() || read.user_id === me().id) return;
  data.update((d) => {
    const f = d.friends.find((x) => x.id === read.friendship_id);
    if (f) f.friend_last_read_at = read.last_read_at;
    return { ...d };
  });
}

function handleTyping(payload) {
  if (!payload || !me() || payload.userId === me().id) return;
  if (payload.friendshipId !== get(selectedFriendshipId)) return;
  typingName.set(payload.name || 'Friend');
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => typingName.set(''), 3000);
}

export function sendTyping() {
  const sel = get(selectedFriendshipId);
  if (!typingChannel || !me() || !sel) return;
  const now = Date.now();
  if (now - lastTypingAt < 1500) return;
  lastTypingAt = now;
  typingChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { friendshipId: sel, userId: me().id, name: me().name },
  });
}
