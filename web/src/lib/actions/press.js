import { spring } from 'svelte/motion';

// Spring-driven press feedback for buttons / interactive cards.
// Usage: <button use:press> or <div use:press={{ scale: 0.98 }}>
export function press(node, { scale = 0.96 } = {}) {
  const s = spring(1, { stiffness: 0.2, damping: 0.8 });
  const unsub = s.subscribe((v) => {
    node.style.transform = `scale(${v})`;
  });

  const down = () => s.set(scale);
  const up = () => s.set(1);

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointerleave', up);
  window.addEventListener('pointercancel', up);

  return {
    destroy() {
      unsub();
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointerleave', up);
      window.removeEventListener('pointercancel', up);
    },
  };
}
