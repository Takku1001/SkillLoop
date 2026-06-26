<script>
  import { onMount, onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { data, loading, loadAll } from '../lib/data.js';
  import { currentUser, clearCurrentUser } from '../lib/stores.js';
  import { buildMatches } from '../lib/util.js';
  import { toast } from '../lib/toast.js';
  import { initRealtime, teardownRealtime } from '../lib/chat.js';
  import AnimatedNumber from '../lib/AnimatedNumber.svelte';
  import Home from './Home.svelte';
  import Messages from './Messages.svelte';
  import Profile from './Profile.svelte';
  import Requests from './Requests.svelte';
  import GraphView from './GraphView.svelte';

  let view = 'home';

  $: me = $currentUser;
  $: matches = buildMatches($data, me);
  $: receivedCount = $data.friendRequests.received.length;
  $: totalUnread = $data.friends.reduce((s, f) => s + (Number(f.unread_count) || 0), 0);

  onMount(async () => {
    if (me) {
      await loadAll(me.id);
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

<div class="app">
  <div class="appbrand">
    <span class="logo" aria-hidden="true">
      <svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round">
        <circle cx="10.5" cy="14" r="6" />
        <circle cx="17.5" cy="14" r="6" />
      </svg>
    </span>
    <span class="name">SkillLoop</span>
  </div>

  <header class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Home</p>
      <h1>Welcome back, {me?.name?.split(' ')[0] || 'there'}.</h1>
      <p class="lede">Your personalized match board — loops, teachers, and people you can help.</p>
    </div>
    <div class="stats">
      <div class="stat"><AnimatedNumber value={matches.cycles.length} /><small>Trade cycles</small></div>
      <div class="stat"><AnimatedNumber value={matches.canLearn.length} /><small>You can teach</small></div>
      <div class="stat"><AnimatedNumber value={matches.canTeach.length} /><small>Can teach you</small></div>
    </div>
  </header>

  <nav class="topbar">
    <div class="brand"><span class="dot"></span>SkillLoop</div>
    <div class="tabs">
      <button class:active={view === 'home'} on:click={() => (view = 'home')}>Home</button>
      <button class:active={view === 'graph'} on:click={() => (view = 'graph')}>Graph</button>
      <button class:active={view === 'requests'} on:click={() => (view = 'requests')}>
        Requests{#if receivedCount}<span class="badge">{receivedCount}</span>{/if}
      </button>
      <button class:active={view === 'messages'} on:click={() => (view = 'messages')}>
        Messages{#if totalUnread}<span class="badge">{totalUnread > 99 ? '99+' : totalUnread}</span>{/if}
      </button>
      <button class:active={view === 'profile'} on:click={() => (view = 'profile')}>Profile</button>
      <button class="logout" on:click={logout}>Log out</button>
    </div>
  </nav>

  <main class="content">
    {#key view}
      <div class="view" in:fly={{ y: 10, duration: 300, easing: backOut }}>
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

<style>
  .app {
    max-width: 1080px;
    margin: 0 auto;
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .appbrand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-1) var(--space-1);
  }
  .appbrand .logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }
  .appbrand .name {
    font-size: var(--text-xl);
    font-weight: var(--fw-bold);
    letter-spacing: -0.025em;
    color: var(--text-1);
  }
  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    background: var(--surface-1);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-6) var(--space-7);
  }
  .eyebrow {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-fg);
    margin: 0 0 var(--space-2);
  }
  .hero h1 {
    font-size: var(--text-2xl);
    font-weight: var(--fw-bold);
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-2);
  }
  .lede {
    color: var(--text-2);
    margin: 0;
    font-size: var(--text-base);
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
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface-1);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-2) var(--space-3);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    color: var(--text-2);
    padding-left: var(--space-2);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .tabs {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .tabs button {
    position: relative;
    background: transparent;
    border: none;
    color: var(--text-2);
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    padding: 0.45rem 0.8rem;
    border-radius: var(--radius-sm);
    transition: background var(--dur-1) var(--ease), color var(--dur-1) var(--ease);
  }
  .tabs button:hover {
    background: var(--surface-2);
    color: var(--text-1);
  }
  .tabs button.active {
    background: var(--surface-3);
    color: var(--text-1);
  }
  .badge {
    margin-left: 0.35rem;
    font-size: var(--text-xs);
    background: var(--accent);
    color: #fff;
    padding: 0.05rem 0.35rem;
    border-radius: var(--radius-full);
  }
  .logout {
    color: var(--text-3) !important;
  }
  .soon {
    text-align: center;
    padding: var(--space-10) var(--space-5);
    color: var(--text-2);
  }
  .soon h2 {
    font-size: var(--text-xl);
    font-weight: var(--fw-semibold);
    margin: 0 0 var(--space-2);
    color: var(--text-1);
  }
  @media (max-width: 720px) {
    .hero {
      flex-direction: column;
      align-items: flex-start;
    }
    .stats {
      gap: var(--space-5);
    }
    .topbar {
      flex-wrap: wrap;
      gap: var(--space-2);
    }
  }
</style>
