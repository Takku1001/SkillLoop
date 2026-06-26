<script>
  import { api } from './api.js';
  import { data, loadAll } from './data.js';
  import { currentUser } from './stores.js';
  import { toast } from './toast.js';
  import { userById } from './util.js';
  import { press } from './actions/press.js';

  export let item;

  let busy = false;
  $: d = $data;
  $: me = $currentUser;
  $: chain = (item.path || []).map((id) => userById(d.users, id)?.name || 'Unknown');
  $: endName = item.end_user_name || userById(d.users, item.end_user)?.name || 'someone';

  async function add() {
    busy = true;
    try {
      await api('/requests', {
        method: 'POST',
        body: JSON.stringify({
          user_id: me.id,
          skill_id: item.missing_skill_id,
          urgency: 'medium',
        }),
      });
      toast.success(`Added ${item.missing_skill_name} — loop complete.`);
      await loadAll(me.id);
    } catch (e) {
      toast.error(e.message);
    } finally {
      busy = false;
    }
  }
</script>

<div class="miss">
  <div class="head">
    <span class="path">
      {#each chain as n, i}
        <span>{n}</span>{#if i < chain.length - 1}<span class="arrow">→</span>{/if}
      {/each}
      <span class="gap" aria-label="missing connection">┄┄</span>
      <span class="back">you</span>
    </span>
    <span class="tag">1 connection away</span>
  </div>

  <p class="hint">
    Closes if you learn <b>{item.missing_skill_name}</b> from {endName}.
  </p>

  <button class="add" use:press disabled={busy} on:click={add}>
    {busy ? 'Adding…' : `Add ${item.missing_skill_name} to my wants`}
  </button>
</div>

<style>
  .miss {
    background: var(--surface-1);
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }
  .path {
    font-size: var(--text-base);
    color: var(--text-1);
  }
  .arrow {
    color: var(--text-3);
    margin: 0 0.35rem;
  }
  .gap {
    color: var(--warning);
    margin: 0 0.35rem;
    letter-spacing: -1px;
  }
  .back {
    color: var(--text-3);
  }
  .tag {
    flex-shrink: 0;
    font-size: var(--text-xs);
    color: var(--warning);
    background: var(--warning-soft);
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }
  .hint {
    font-size: var(--text-sm);
    color: var(--text-2);
    margin: 0 0 var(--space-3);
  }
  .hint b {
    color: var(--text-1);
    font-weight: var(--fw-medium);
  }
  .add {
    background: transparent;
    border: 0.5px solid var(--border-strong);
    color: var(--text-1);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.8rem;
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    transition: background var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease);
  }
  .add:hover:not(:disabled) {
    background: var(--warning-soft);
    border-color: var(--warning);
  }
  .add:disabled {
    opacity: 0.6;
  }
</style>
