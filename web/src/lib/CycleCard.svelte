<script>
  import { data } from './data.js';
  import { currentUser } from './stores.js';
  import { userById, skillName } from './util.js';
  import FriendAction from './FriendAction.svelte';

  export let loop;

  $: d = $data;
  $: me = $currentUser;
  $: rawPath = Array.isArray(loop.path) ? loop.path.slice(0, -1) : [];
  $: names = rawPath.map((id) => userById(d.users, id)?.name || 'Unknown');
  $: others = rawPath.filter((id) => id !== me?.id);
  // Score typically lands in ~0–6; normalize for the bar.
  $: scorePct = Math.max(6, Math.min(100, ((Number(loop.score) || 0) / 6) * 100));
</script>

<div class="cycle">
  <div class="head">
    <span class="path">
      {#each names as n, i}
        <span class="node">{n}</span>{#if i < names.length - 1}<span class="arrow">→</span>{/if}
      {/each}
    </span>
    {#if loop.score != null}
      <span class="score mono">{loop.score}</span>
    {/if}
  </div>

  {#if loop.score != null}
    <div class="bar"><div class="fill" style="width:{scorePct}%"></div></div>
  {/if}

  <div class="meta">
    <span class="chip"><i class="i star"></i>Reputation <b class="mono">{loop.avg_reputation ?? '—'}</b></span>
    <span class="chip">Urgency <b class="mono">{loop.avg_urgency ?? '—'}</b></span>
    <span class="chip">Proficiency <b class="mono">{loop.avg_proficiency ?? '—'}</b></span>
    <span class="chip">Depth <b class="mono">{loop.depth}</b></span>
  </div>

  {#if others.length}
    <div class="actions">
      {#each others as id}
        <FriendAction userId={id} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .cycle {
    background: var(--surface-1);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    transition: border-color var(--dur-2) var(--ease);
  }
  .cycle:hover {
    border-color: var(--border-strong);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .path {
    font-size: var(--text-md);
    color: var(--text-1);
    line-height: 1.4;
  }
  .node {
    font-weight: var(--fw-medium);
  }
  .arrow {
    color: var(--text-3);
    margin: 0 0.4rem;
  }
  .score {
    flex-shrink: 0;
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    color: var(--accent-fg);
    background: var(--accent-soft);
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-full);
  }
  .bar {
    height: 4px;
    margin: var(--space-3) 0;
    background: var(--surface-3);
    border-radius: var(--radius-full);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--accent);
    border-radius: var(--radius-full);
    transition: width 600ms var(--ease);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: var(--text-xs);
    color: var(--text-2);
    background: var(--surface-2);
    padding: 0.25rem 0.55rem;
    border-radius: var(--radius-sm);
  }
  .chip b {
    color: var(--text-1);
    font-weight: var(--fw-medium);
  }
  .i.star {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--warning);
    display: inline-block;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
</style>
