<script>
  import { data, loadAll } from './data.js';
  import { currentUser } from './stores.js';
  import { api } from './api.js';
  import { toast } from './toast.js';
  import { press } from './actions/press.js';

  export let userId;

  let busy = false;
  $: d = $data;
  $: me = $currentUser;

  $: rel = (() => {
    const f = d.friends.find((x) => x.friend_id === userId);
    if (f) return { type: 'accepted' };
    const s = d.friendRequests.sent.find((x) => x.friend_id === userId);
    if (s) return { type: 'sent' };
    const r = d.friendRequests.received.find((x) => x.friend_id === userId);
    if (r) return { type: 'received', record: r };
    return { type: 'none' };
  })();

  async function send() {
    busy = true;
    try {
      const res = await api('/friends', {
        method: 'POST',
        body: JSON.stringify({ user_id: me.id, friend_id: userId }),
      });
      toast.success(res.status === 'accepted' ? 'Connected.' : 'Request sent.');
      await loadAll(me.id);
    } catch (e) {
      toast.error(e.message);
    } finally {
      busy = false;
    }
  }

  async function accept() {
    busy = true;
    try {
      await api(`/friend-requests/${rel.record.id}/accept`, {
        method: 'PATCH',
        body: JSON.stringify({ user_id: me.id }),
      });
      toast.success('Connected.');
      await loadAll(me.id);
    } catch (e) {
      toast.error(e.message);
    } finally {
      busy = false;
    }
  }
</script>

{#if rel.type === 'accepted'}
  <span class="pill ok">Connected</span>
{:else if rel.type === 'sent'}
  <span class="pill muted">Request sent</span>
{:else if rel.type === 'received'}
  <button class="act" use:press disabled={busy} on:click={accept}>Accept request</button>
{:else}
  <button class="act" use:press disabled={busy} on:click={send}>Connect</button>
{/if}

<style>
  .act {
    background: var(--accent-soft);
    color: var(--accent-fg);
    border: 0.5px solid transparent;
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.7rem;
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    transition: background var(--dur-1) var(--ease);
  }
  .act:hover:not(:disabled) {
    background: rgba(94, 106, 210, 0.22);
  }
  .act:disabled {
    opacity: 0.6;
  }
  .pill {
    font-size: var(--text-xs);
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-full);
  }
  .pill.ok {
    background: var(--success-soft);
    color: var(--success);
  }
  .pill.muted {
    background: var(--surface-3);
    color: var(--text-3);
  }
</style>
