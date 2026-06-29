<script>
  import { toasts, dismissToast } from './toast.js';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { backOut, cubicOut } from 'svelte/easing';
  import { toastIn, toastOut } from './transitions.js';

  // Match notifications go top-right with a pulsing avatar; everything else
  // keeps the original bottom-right behavior.
  $: matchToasts = $toasts.filter((t) => t.type === 'match');
  $: plainToasts = $toasts.filter((t) => t.type !== 'match');

  const initial = (name) => (name || '?').trim().slice(0, 1).toUpperCase();
</script>

<div class="matches" aria-live="polite" aria-atomic="false">
  {#each matchToasts as t (t.id)}
    <button
      class="match"
      animate:flip={{ duration: 200 }}
      in:toastIn
      out:toastOut
      on:click={() => dismissToast(t.id)}
    >
      <span class="avatar" aria-hidden="true">{initial(t.name)}</span>
      <span class="copy">
        <strong>{t.message}</strong>
        {#if t.name || t.detail}<small>{t.name}{t.name && t.detail ? ' · ' : ''}{t.detail || ''}</small>{/if}
      </span>
    </button>
  {/each}
</div>

<div class="toaster" aria-live="polite" aria-atomic="false">
  {#each plainToasts as t (t.id)}
    <button
      class="toast {t.type}"
      animate:flip={{ duration: 260 }}
      in:fly={{ y: 16, duration: 320, easing: backOut }}
      out:fly={{ y: 10, duration: 200, easing: cubicOut }}
      on:click={() => dismissToast(t.id)}
    >
      <span class="dot" aria-hidden="true"></span>
      <span class="msg">{t.message}</span>
    </button>
  {/each}
</div>

<style>
  .matches {
    position: fixed;
    top: var(--space-5);
    right: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    z-index: 110;
    max-width: min(340px, calc(100vw - 2rem));
  }
  .match {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    text-align: left;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    box-shadow: var(--shadow-md);
    cursor: pointer;
  }
  .avatar {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    background: var(--success-soft);
    color: var(--success);
    font-weight: var(--fw-semibold);
    font-size: var(--text-sm);
    /* match badge: two pulses, then stop */
    animation: pulse-ring 1.3s ease-out 2;
  }
  .copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .copy strong {
    font-size: var(--text-base);
    font-weight: var(--fw-medium);
    color: var(--text-1);
  }
  .copy small {
    font-size: var(--text-xs);
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

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
    width: 100%;
    text-align: left;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
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
