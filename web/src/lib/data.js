import { writable } from 'svelte/store';
import { api } from './api.js';

// Central app data, loaded from the existing API. Components subscribe to this.
export const data = writable({
  users: [],
  skills: [],
  offerings: [],
  requests: [],
  loops: [],
  nearMiss: [],
  reputation: [],
  friends: [],
  friendRequests: { sent: [], received: [] },
  sessions: [],
  reviews: [],
});

export const loading = writable(true);

export async function loadAll(userId) {
  loading.set(true);
  try {
    const [users, skills, reputation, loops, offerings, requests, sessions, reviews] =
      await Promise.all([
        api('/users'),
        api(''),
        api('/reputation'),
        api('/loops'),
        api('/offerings'),
        api('/requests'),
        api('/sessions'),
        api('/reviews'),
      ]);

    let nearMiss = [];
    let friends = [];
    let friendRequests = { sent: [], received: [] };

    if (userId) {
      [nearMiss, friends, friendRequests] = await Promise.all([
        api(`/near-miss?user_id=${encodeURIComponent(userId)}`).catch(() => []),
        api(`/friends?user_id=${encodeURIComponent(userId)}`).catch(() => []),
        api(`/friend-requests?user_id=${encodeURIComponent(userId)}`).catch(() => ({
          sent: [],
          received: [],
        })),
      ]);
    }

    data.set({
      users,
      skills,
      reputation,
      loops,
      offerings,
      requests,
      sessions,
      reviews,
      nearMiss,
      friends,
      friendRequests,
    });
  } finally {
    loading.set(false);
  }
}
