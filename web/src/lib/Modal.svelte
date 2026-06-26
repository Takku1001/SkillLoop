<script>
  // Spring-physics modal. The open progress is a real svelte/motion spring that
  // drives backdrop opacity + panel scale/translate on BOTH open and close.
  import { spring } from 'svelte/motion';
  import { createEventDispatcher } from 'svelte';

  export let open = false;

  const dispatch = createEventDispatcher();
  const p = spring(0, { stiffness: 0.14, damping: 0.82 });

  let visible = false;

  $: if (open) {
    visible = true;
    p.set(1);
  } else {
    p.set(0);
  }

  // Unmount once the close spring has settled near zero
  $: if (!open && visible && $p < 0.02) {
    visible = false;
  }

  function close() {
    dispatch('close');
  }

  function onKeydown(event) {
    if (event.key === 'Escape' && open) close();
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if visible}
  <div
    class="backdrop"
    style="opacity:{$p}"
    on:click|self={close}
    role="presentation"
  >
    <div
      class="panel"
      role="dialog"
      aria-modal="true"
      style="opacity:{$p}; transform: scale({0.95 + 0.05 * $p}) translateY({(1 - $p) * 10}px)"
    >
      <button class="close" aria-label="Close" on:click={close}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <slot />
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-5);
    z-index: 90;
  }
  .panel {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: var(--surface-1);
    border: 0.5px solid var(--border-strong);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: var(--space-7);
    transform-origin: center;
  }
  .close {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-3);
    transition: background var(--dur-1) var(--ease), color var(--dur-1) var(--ease);
  }
  .close:hover {
    background: var(--surface-3);
    color: var(--text-1);
  }
</style>
