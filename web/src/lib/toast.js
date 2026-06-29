import { writable } from 'svelte/store';

// Lightweight toast queue. push() returns nothing; toasts auto-dismiss.
export const toasts = writable([]);

let nextId = 1;

export function pushToast(message, type = 'info', timeout = 3200, extra = {}) {
  const id = nextId++;
  toasts.update((list) => [...list, { id, message, type, ...extra }]);
  if (timeout) {
    setTimeout(() => dismissToast(id), timeout);
  }
  return id;
}

export function dismissToast(id) {
  toasts.update((list) => list.filter((t) => t.id !== id));
}

export const toast = {
  success: (m) => pushToast(m, 'success'),
  error: (m) => pushToast(m, 'error', 4200),
  info: (m) => pushToast(m, 'info'),
  // Loop-match notification — renders top-right with a pulsing avatar, 4s.
  match: ({ name, detail, message = 'New loop match' } = {}) =>
    pushToast(message, 'match', 4000, { name, detail }),
};

// Dev-only handle so the match toast can be exercised from the browser console.
if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  if (typeof window !== 'undefined') window.__toast = toast;
}
