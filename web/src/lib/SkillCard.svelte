<script>
  // Match card used on the Home board. The CTA (FriendAction) is passed in as a
  // slot so this component stays presentational and isn't duplicated per case.
  export let skill = '';
  export let category = '';
  export let userName = '';
  export let rating = 0;
  // 'they-teach' = they have the skill / you want it; 'they-want' = inverse.
  export let direction = 'they-teach';

  $: initial = (userName || '?').trim().slice(0, 1).toUpperCase();
  $: filled = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  $: haveActive = direction === 'they-teach';
</script>

<article class="card">
  <div class="top">
    <h3 class="skill">{skill}</h3>
    <span class="cat mono">{category || 'Skill'}</span>
  </div>

  <div class="who">
    <span class="avatar" aria-hidden="true">{initial}</span>
    <div class="meta">
      <strong>{userName}</strong>
      <span class="dots" aria-label={`Reputation ${filled} of 5`}>
        {#each Array(5) as _, i}<i class:on={i < filled}></i>{/each}
      </span>
    </div>
  </div>

  <div class="bottom">
    <span
      class="toggle"
      role="img"
      aria-label={haveActive ? 'They have this skill, you want it' : 'You have this skill, they want it'}
    >
      <span class:on={haveActive}>Have</span>
      <span class:on={!haveActive}>Want</span>
    </span>
    <span class="cta"><slot /></span>
  </div>
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    transition: border-color var(--dur-2) var(--ease), background var(--dur-2) var(--ease);
  }
  .card:hover {
    border-color: var(--accent);
    background: var(--surface-2);
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .skill {
    margin: 0;
    font-size: var(--text-md);
    font-weight: var(--fw-medium);
    color: var(--text-1);
    letter-spacing: -0.01em;
  }

  /* Category = the "skill tag": mono, teal, with a left-to-right fill on hover. */
  .cat {
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    font-size: var(--text-xs);
    color: var(--success);
    border: 1px solid var(--success-soft);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.5rem;
    z-index: 0;
    transition: color var(--dur-2) var(--ease);
  }
  .cat::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--success-soft);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform var(--dur-2) var(--ease);
    z-index: -1;
  }
  .cat:hover::before {
    transform: scaleX(1);
  }

  .who {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--accent-fg);
    font-weight: var(--fw-semibold);
    font-size: var(--text-sm);
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .meta strong {
    font-size: var(--text-base);
    font-weight: var(--fw-medium);
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dots {
    display: inline-flex;
    gap: 3px;
  }
  .dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--surface-3);
  }
  .dots i.on {
    background: var(--accent);
  }

  .bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-top: auto;
  }
  .toggle {
    display: inline-flex;
    padding: 2px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--fw-medium);
  }
  .toggle span {
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
    color: var(--text-3);
    transition: background var(--dur-1) var(--ease), color var(--dur-1) var(--ease);
  }
  .toggle span.on {
    color: var(--text-1);
    background: var(--surface-3);
  }
  .cta {
    display: inline-flex;
  }
</style>
