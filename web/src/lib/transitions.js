// Reusable Svelte transition configs for the SkillLoop UI.
// Every animation in the app should come from here so timing/easing stay
// consistent and `prefers-reduced-motion` is honored in one place.
//
// Usage:
//   import { routeFly, cardIn, chatMessage, STAGGER } from '$lib/transitions.js';
//   <div in:cardIn={{ delay: i * STAGGER }}>…</div>
import { cubicOut } from 'svelte/easing';

// Single source of truth for "should we animate at all?"
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Stagger step for lists of cards (ms per item).
export const STAGGER = 40;

// 1. Page / route transition — fly in from the right, 200ms ease-out.
export function routeFly(node, { duration = 200, x = 24 } = {}) {
  if (prefersReducedMotion()) return { duration: 0 };
  return {
    duration,
    easing: cubicOut,
    css: (t) => `opacity:${t};transform:translateX(${(1 - t) * x}px)`,
  };
}

// 2. Card enter — fade + slight scale(0.97 → 1). Caller staggers via `delay`.
export function cardIn(node, { delay = 0, duration = 200 } = {}) {
  if (prefersReducedMotion()) return { delay, duration: 0 };
  return {
    delay,
    duration,
    easing: cubicOut,
    css: (t) => `opacity:${t};transform:scale(${0.97 + 0.03 * t})`,
  };
}

// 3. Sidebar nav label — slide in horizontally on hover-expand.
export function slideLabel(node, { duration = 160, x = -6 } = {}) {
  if (prefersReducedMotion()) return { duration: 0 };
  return {
    duration,
    easing: cubicOut,
    css: (t) => `opacity:${t};transform:translateX(${(1 - t) * x}px)`,
  };
}

// 4. Match / notification toast — slide in from the right.
export function toastIn(node, { duration = 200, x = 20 } = {}) {
  if (prefersReducedMotion()) return { duration: 0 };
  return {
    duration,
    easing: cubicOut,
    css: (t) => `opacity:${t};transform:translateX(${(1 - t) * x}px)`,
  };
}

export function toastOut(node, { duration = 160, x = 20 } = {}) {
  if (prefersReducedMotion()) return { duration: 0 };
  return {
    duration,
    easing: cubicOut,
    css: (t) => `opacity:${t};transform:translateX(${(1 - t) * x}px)`,
  };
}

// 5. Chat message — fly up from the bottom, 150ms.
export function chatMessage(node, { duration = 150, y = 8 } = {}) {
  if (prefersReducedMotion()) return { duration: 0 };
  return {
    duration,
    easing: cubicOut,
    css: (t) => `opacity:${t};transform:translateY(${(1 - t) * y}px)`,
  };
}
