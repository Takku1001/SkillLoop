<script>
  // Left icon rail (64px) that expands to 200px on hover as an overlay, so
  // content never reflows. Active item = accent left border + bg tint.
  import { createEventDispatcher } from 'svelte';
  import { slideLabel } from './transitions.js';

  export let view = 'home';
  export let me = null;
  export let receivedCount = 0;
  export let totalUnread = 0;

  const dispatch = createEventDispatcher();
  let expanded = false;

  // Lucide-style inline icons (Lucide isn't installed; matches the codebase's
  // existing inline-SVG convention).
  const icons = {
    home: '<path d="m3 10 9-7 9 7"/><path d="M5 9v11h5v-6h4v6h5V9"/>',
    graph:
      '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.4 13.4 7.2 4.2M15.6 6.4 8.4 10.6"/>',
    requests:
      '<path d="M15 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="8.5" cy="7" r="3.5"/><path d="M19 7v6M22 10h-6"/>',
    messages: '<path d="M21 14a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    logout:
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  };

  $: items = [
    { id: 'home', label: 'Home', icon: icons.home },
    { id: 'graph', label: 'Graph', icon: icons.graph },
    { id: 'requests', label: 'Requests', icon: icons.requests, badge: receivedCount },
    {
      id: 'messages',
      label: 'Messages',
      icon: icons.messages,
      badge: totalUnread ? (totalUnread > 99 ? '99+' : totalUnread) : 0,
    },
    { id: 'profile', label: 'Profile', icon: icons.profile },
  ];

  $: initial = (me?.name || '?').trim().slice(0, 1).toUpperCase();
</script>

<nav
  class="sidebar"
  class:expanded
  on:mouseenter={() => (expanded = true)}
  on:mouseleave={() => (expanded = false)}
  aria-label="Primary"
>
  <div class="brand">
    <span class="logo" aria-hidden="true">
      <svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round">
        <circle cx="10.5" cy="14" r="6" /><circle cx="17.5" cy="14" r="6" />
      </svg>
    </span>
    {#if expanded}<span class="brand-name" in:slideLabel>SkillLoop</span>{/if}
  </div>

  <ul class="nav">
    {#each items as item (item.id)}
      <li>
        <button
          class="item"
          class:active={view === item.id}
          on:click={() => dispatch('select', item.id)}
          aria-current={view === item.id ? 'page' : undefined}
        >
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{@html item.icon}</svg>
          </span>
          {#if expanded}<span class="label" in:slideLabel>{item.label}</span>{/if}
          {#if item.badge}<span class="badge" class:dot={!expanded}>{expanded ? item.badge : ''}</span>{/if}
          {#if !expanded}<span class="tip" role="tooltip">{item.label}</span>{/if}
        </button>
      </li>
    {/each}
  </ul>

  <div class="foot">
    <button class="user" on:click={() => dispatch('select', 'profile')}>
      <span class="avatar" aria-hidden="true">{initial}</span>
      {#if expanded}
        <span class="who" in:slideLabel>
          <strong>{me?.name || 'You'}</strong>
          <small>{me?.email || ''}</small>
        </span>
      {/if}
      {#if !expanded}<span class="tip wide" role="tooltip">{me?.name || 'You'}{me?.email ? ' · ' + me.email : ''}</span>{/if}
    </button>
    <button class="item logout" on:click={() => dispatch('logout')}>
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{@html icons.logout}</svg>
      </span>
      {#if expanded}<span class="label" in:slideLabel>Log out</span>{/if}
      {#if !expanded}<span class="tip" role="tooltip">Log out</span>{/if}
    </button>
  </div>
</nav>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 64px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-2);
    background: var(--surface-1);
    border-right: 1px solid var(--border);
    overflow: hidden;
    transition: width var(--dur-2) var(--ease);
  }
  .sidebar.expanded {
    width: 200px;
    box-shadow: var(--shadow-md);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 44px;
    padding: 0 6px;
    margin-bottom: var(--space-2);
    white-space: nowrap;
  }
  .logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }
  .brand-name {
    font-size: var(--text-md);
    font-weight: var(--fw-bold);
    letter-spacing: -0.02em;
    color: var(--text-1);
  }

  .nav {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .item {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    height: 44px;
    padding: 0 9px;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-2);
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    white-space: nowrap;
    transition: background var(--dur-1) var(--ease), color var(--dur-1) var(--ease);
  }
  .item .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
  }
  .item:hover {
    background: var(--surface-2);
    color: var(--text-1);
  }
  .item.active {
    background: var(--accent-soft);
    color: var(--text-1);
  }
  /* accent left border for the active item */
  .item.active::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 9px;
    bottom: 9px;
    width: 3px;
    border-radius: var(--radius-full);
    background: var(--accent);
  }
  .item.active .icon {
    color: var(--accent-fg);
  }
  .label {
    flex: 1;
    text-align: left;
  }

  .badge {
    margin-left: auto;
    font-size: var(--text-xs);
    font-weight: var(--fw-semibold);
    background: var(--accent);
    color: #fff;
    padding: 0.05rem 0.4rem;
    border-radius: var(--radius-full);
  }
  /* collapsed: show the badge as a small dot at the icon's corner */
  .badge.dot {
    position: absolute;
    top: 8px;
    left: 32px;
    margin: 0;
    min-width: 8px;
    width: 8px;
    height: 8px;
    padding: 0;
    border: 2px solid var(--surface-1);
  }

  .foot {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: var(--space-2);
    border-top: 1px solid var(--border);
  }
  .user {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    height: 48px;
    padding: 0 8px;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    white-space: nowrap;
    position: relative;
    transition: background var(--dur-1) var(--ease);
  }
  .user:hover {
    background: var(--surface-2);
  }
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--accent-fg);
    font-weight: var(--fw-semibold);
    font-size: var(--text-sm);
  }
  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  .who strong {
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .who small {
    font-size: var(--text-xs);
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .logout {
    color: var(--text-3);
  }

  /* Tooltip shown only in the collapsed state */
  .tip {
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    padding: 0.3rem 0.55rem;
    background: var(--surface-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--text-1);
    font-size: var(--text-xs);
    font-weight: var(--fw-medium);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    box-shadow: var(--shadow-sm);
    transition: opacity var(--dur-1) var(--ease), transform var(--dur-1) var(--ease);
    z-index: 60;
  }
  .tip.wide {
    font-weight: var(--fw-normal);
  }
  .item:hover .tip,
  .user:hover .tip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
  /* once the rail is expanded, suppress tooltips */
  .sidebar.expanded .tip {
    display: none;
  }

  @media (max-width: 720px) {
    .sidebar,
    .sidebar.expanded {
      width: 100%;
      flex-direction: row;
      position: sticky;
      inset: auto;
      height: auto;
      border-right: none;
      border-bottom: 1px solid var(--border);
      align-items: center;
      gap: var(--space-1);
      overflow-x: auto;
    }
    .brand {
      margin: 0;
      height: auto;
    }
    .nav {
      flex-direction: row;
      flex: 1;
    }
    .foot {
      flex-direction: row;
      border-top: none;
      padding-top: 0;
    }
    .who,
    .tip {
      display: none;
    }
  }
</style>
