<script>
  import { data, loading, loadAll } from '../lib/data.js';
  import { currentUser } from '../lib/stores.js';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toast.js';
  import Reveal from '../lib/Reveal.svelte';
  import Skeleton from '../lib/Skeleton.svelte';
  import { press } from '../lib/actions/press.js';

  $: d = $data;
  $: me = $currentUser;
  $: received = d.friendRequests.received;
  $: sent = d.friendRequests.sent;

  async function act(id, kind) {
    try {
      await api(`/friend-requests/${id}/${kind}`, {
        method: 'PATCH',
        body: JSON.stringify({ user_id: me.id }),
      });
      toast[kind === 'accept' ? 'success' : 'info'](
        kind === 'accept' ? 'Connected.' : 'Request removed.',
      );
      await loadAll(me.id);
    } catch (e) {
      toast.error(e.message);
    }
  }
</script>

<div class="requests">
  <section class="panel">
    <header><h2>Received</h2><span>People who want to connect</span></header>
    {#if $loading}
      <Skeleton height="64px" /><div style="height:8px"></div><Skeleton height="64px" />
    {:else if received.length}
      <div class="stack">
        {#each received as r, i (r.id)}
          <Reveal y={12} delay={i * 40}>
            <div class="row">
              <div class="who">
                <div class="avatar">{(r.friend_name || '?').slice(0, 1)}</div>
                <div>
                  <strong>{r.friend_name}</strong>
                  <span>{r.friend_program || 'Student'}</span>
                </div>
              </div>
              <div class="acts">
                <button class="accept" use:press on:click={() => act(r.id, 'accept')}>Accept</button>
                <button class="decline" use:press on:click={() => act(r.id, 'decline')}>Decline</button>
              </div>
            </div>
          </Reveal>
        {/each}
      </div>
    {:else}
      <div class="empty"><p>No incoming requests.</p><small>When someone wants to connect, they'll show up here.</small></div>
    {/if}
  </section>

  <section class="panel">
    <header><h2>Sent</h2><span>Waiting for a response</span></header>
    {#if $loading}
      <Skeleton height="64px" />
    {:else if sent.length}
      <div class="stack">
        {#each sent as r, i (r.id)}
          <Reveal y={12} delay={i * 40}>
            <div class="row">
              <div class="who">
                <div class="avatar">{(r.friend_name || '?').slice(0, 1)}</div>
                <div>
                  <strong>{r.friend_name}</strong>
                  <span>Sent {new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button class="decline" use:press on:click={() => act(r.id, 'decline')}>Cancel</button>
            </div>
          </Reveal>
        {/each}
      </div>
    {:else}
      <div class="empty"><p>No sent requests.</p><small>Connect with people from Home to start a conversation.</small></div>
    {/if}
  </section>
</div>

<style>
  .requests {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
  }
  .panel {
    background: var(--surface-1);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
  }
  .panel header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }
  .panel h2 {
    font-size: var(--text-lg);
    font-weight: var(--fw-semibold);
    margin: 0;
  }
  .panel header span {
    font-size: var(--text-xs);
    color: var(--text-3);
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    background: var(--surface-2);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
  }
  .who {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--accent-fg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--fw-medium);
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .who strong {
    display: block;
    font-size: var(--text-base);
    font-weight: var(--fw-medium);
  }
  .who span {
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .acts {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }
  button {
    border: 0.5px solid var(--border-strong);
    background: transparent;
    color: var(--text-1);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.8rem;
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    transition: background var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease);
  }
  .accept {
    background: var(--accent);
    color: #fff;
    border-color: transparent;
  }
  .accept:hover {
    background: var(--accent-hover);
  }
  .decline:hover {
    background: var(--surface-3);
    border-color: #3a3f47;
  }
  .empty {
    text-align: center;
    padding: var(--space-6) var(--space-4);
    color: var(--text-2);
  }
  .empty p {
    margin: 0 0 var(--space-1);
    color: var(--text-1);
  }
  .empty small {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  @media (max-width: 820px) {
    .requests {
      grid-template-columns: 1fr;
    }
  }
</style>
