import { writable } from 'svelte/store';

// The signed-in user (or null). Persisted to localStorage so a refresh keeps
// you logged in, mirroring the original app's behavior.
const KEY = 'skillloop.currentUserId';

export const currentUser = writable(null);
export const savedUserId = localStorage.getItem(KEY);

export function setCurrentUser(user) {
  currentUser.set(user);
  if (user) localStorage.setItem(KEY, user.id);
  else localStorage.removeItem(KEY);
}

export function clearCurrentUser() {
  currentUser.set(null);
  localStorage.removeItem(KEY);
}
