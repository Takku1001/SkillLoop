import { writable } from 'svelte/store';

// Lightweight toast queue. push() returns nothing; toasts auto-dismiss.
export const toasts = writable([]);

let nextId = 1;

export function pushToast(message, type = 'info', timeout = 3200) {
  const id = nextId++;
  toasts.update((list) => [...list, { id, message, type }]);
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
};
