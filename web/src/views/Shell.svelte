<script>
  import { onMount, onDestroy } from 'svelte';
  import { data, loading, loadAll } from '../lib/data.js';
  import { currentUser, clearCurrentUser } from '../lib/stores.js';
  import { buildMatches, canonicalCycleKey, userById } from '../lib/util.js';
  import { toast } from '../lib/toast.js';
  import { initRealtime, teardownRealtime } from '../lib/chat.js';
  import { routeFly } from '../lib/transitions.js';
  import AnimatedNumber from '../lib/AnimatedNumber.svelte';
  import Sidebar from '../lib/Sidebar.svelte';
  import Home from './Home.svelte';
  import Messages from './Messages.svelte';
  import Profile from './Profile.svelte';
  import Requests from './Requests.svelte';
  import GraphView from './GraphView.svelte';

  let view = 'home';

  const titles = {
    home: { eyebrow: 'Home', heading: `Welcome back, NAME.`, lede: 'Your match board — loops, teachers, and people you can help.' },
    graph: { eyebrow: 'Network', heading: 'Skill network', lede: 'Every arrow is a teach-and-learn match across the community.' },
    requests: { eyebrow: 'Requests', heading: 'Connection requests', lede: 'People who want to connect, and invites you have sent.' },
    messages: { eyebrow: 'Messages', heading: 'Conversations', lede: 'Chat in real time, schedule sessions, and share video links.' },
    profile: { eyebrow: 'Profile', heading: 'Your profile', lede: 'Skills you teach, skills you want, sessions, and reputation.' },
  };
  $: header = (() => {
    const t = titles[view] || titles.home;
    return { ...t, heading: t.heading.replace('NAME', me?.name?.split(' ')[0] || 'there') };
  })();

  $: me = $currentUser;
  $: matches = buildMatches($data, me);
  $: receivedCount = $data.friendRequests.received.length;
  $: totalUnread = $data.friends.reduce((s, f) => s + (Number(f.unread_count) || 0), 0);

  // Notify on newly-detected loops only — the ones present on first load are
  // seeded silently once the initial fetch completes (see onMount).
  let knownLoopKeys = new Set();
  let loopsReady = false;
  $: if (loopsReady) announceLoops(matches.cycles);
  function announceLoops(cycles) {
    for (const c of cycles) {
      const key = canonicalCycleKey(c.path || []);
      if (knownLoopKeys.has(key)) continue;
      knownLoopKeys.add(key);
      const chain = (c.path || []).slice(0, -1).map((id) => userById($data.users, id)?.name || '?');
      const partner = chain.find((nm) => nm !== me?.name) || 'a new partner';
      toast.match({ name: partner, detail: chain.join(' → ') });
    }
  }

  onMount(async () => {
    if (me) {
      await loadAll(me.id);
      // Seed with whatever loops exist now, then start announcing new ones.
      knownLoopKeys = new Set(
        buildMatches($data, me).cycles.map((c) => canonicalCycleKey(c.path || [])),
      );
      loopsReady = true;
      initRealtime();
    }
  });

  onDestroy(teardownRealtime);

  function logout() {
    teardownRealtime();
    clearCurrentUser();
    toast.info('Signed out.');
  }
</script>

<div class="layout">
  <Sidebar
    {view}
    {me}
    {receivedCount}
    {totalUnread}
    on:select={(e) => (view = e.detail)}
    on:logout={logout}
  />

  <div class="main">
    <header class="pagehead">
      <div class="pagehead-copy">
        <p class="eyebrow">{header.eyebrow}</p>
        <h1>{header.heading}</h1>
        <p class="lede">{header.lede}</p>
      </div>
      <div class="stats">
        <div class="stat"><AnimatedNumber value={matches.cycles.length} /><small>Trade cycles</small></div>
        <div class="stat"><AnimatedNumber value={matches.canLearn.length} /><small>You can teach</small></div>
        <div class="stat"><AnimatedNumber value={matches.canTeach.length} /><small>Can teach you</small></div>
      </div>
    </header>

    <main class="content">
      {#key view}
        <div class="view" in:routeFly>
          {#if view === 'home'}
            <Home />
          {:else if view === 'messages'}
            <Messages />
          {:else if view === 'profile'}
            <Profile />
          {:else if view === 'requests'}
            <Requests />
          {:else if view === 'graph'}
            <GraphView />
          {/if}
        </div>
      {/key}
    </main>
  </div>
</div>

<style>
  .layout {
    min-height: 100vh;
    padding-left: 64px; /* reserve the collapsed rail; expansion overlays */
  }
  .main {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--space-6) var(--space-6) var(--space-9);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }
  .pagehead {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-6);
  }
  .eyebrow {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-fg);
    margin: 0 0 var(--space-2);
  }
  .pagehead h1 {
    font-size: var(--text-2xl);
    font-weight: var(--fw-bold);
    letter-spacing: -0.025em;
    margin: 0 0 var(--space-2);
  }
  .lede {
    color: var(--text-2);
    margin: 0;
    font-size: var(--text-base);
    max-width: 52ch;
  }
  .stats {
    display: flex;
    gap: var(--space-6);
    flex-shrink: 0;
  }
  .stat {
    text-align: right;
  }
  .stat :global(.mono) {
    font-size: var(--text-2xl);
    font-weight: var(--fw-semibold);
    color: var(--text-1);
  }
  .stat small {
    display: block;
    font-size: var(--text-xs);
    color: var(--text-3);
    margin-top: 0.1rem;
  }
  @media (max-width: 720px) {
    .layout {
      padding-left: 0;
    }
    .main {
      padding: var(--space-5) var(--space-4) var(--space-8);
    }
    .pagehead {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-4);
    }
    .stats {
      gap: var(--space-5);
    }
  }
</style>
