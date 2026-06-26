<script>
  // Real spring-physics entrance. Reusable for cards, list items, chat bubbles.
  import { spring } from 'svelte/motion';
  import { onMount } from 'svelte';

  export let y = 12;          // px to travel upward into place
  export let delay = 0;       // ms (use index * stagger for lists)
  export let stiffness = 0.15;
  export let damping = 0.6;

  const t = spring(0, { stiffness, damping });

  onMount(() => {
    const id = setTimeout(() => t.set(1), delay);
    return () => clearTimeout(id);
  });
</script>

<div style="opacity:{$t}; transform: translateY({(1 - $t) * y}px);">
  <slot />
</div>
