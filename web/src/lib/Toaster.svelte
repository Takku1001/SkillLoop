<script>
  import { toasts, dismissToast } from './toast.js';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { backOut, cubicOut } from 'svelte/easing';
</script>

<div class="toaster" aria-live="polite" aria-atomic="false">
  {#each $toasts as t (t.id)}
    <div
      class="toast {t.type}"
      role="status"
      animate:flip={{ duration: 260 }}
      in:fly={{ y: 16, duration: 320, easing: backOut }}
      out:fly={{ y: 10, duration: 200, easing: cubicOut }}
      on:click={() => dismissToast(t.id)}
    >
      <span class="dot" aria-hidden="true"></span>
      <span class="msg">{t.message}</span>
    </div>
  {/each}
</div>

<style>
  .toaster {
    position: fixed;
    bottom: var(--space-5);
    right: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    z-index: 100;
    max-width: min(360px, calc(100vw - 2rem));
  }
  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface-2);
    border: 0.5px solid var(--border-strong);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    box-shadow: var(--shadow-md);
    font-size: var(--text-base);
    color: var(--text-1);
    cursor: pointer;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
    background: var(--accent);
  }
  .toast.success .dot {
    background: var(--success);
  }
  .toast.error .dot {
    background: var(--danger);
  }
  .msg {
    line-height: 1.4;
  }
</style>
