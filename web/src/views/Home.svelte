<script>
  import { data, loading } from '../lib/data.js';
  import { currentUser } from '../lib/stores.js';
  import { buildMatches, skillName } from '../lib/util.js';
  import { cardIn, STAGGER } from '../lib/transitions.js';
  import Reveal from '../lib/Reveal.svelte';
  import Skeleton from '../lib/Skeleton.svelte';
  import CycleCard from '../lib/CycleCard.svelte';
  import NearMissCard from '../lib/NearMissCard.svelte';
  import FriendAction from '../lib/FriendAction.svelte';
  import SkillCard from '../lib/SkillCard.svelte';

  $: d = $data;
  $: me = $currentUser;
  $: matches = buildMatches(d, me);

  const category = (id) => d.skills.find((s) => s.id === id)?.category || 'Skill';
  const rating = (uid) =>
    d.reputation.find((r) => r.id === uid)?.avg_rating ??
    d.users.find((u) => u.id === uid)?.reputation_score ??
    0;
</script>

<div class="home">
  <section class="panel">
    <header><h2>Your loops</h2><span>Ranked best-first</span></header>
    {#if $loading}
      <div class="stack">{#each [1, 2] as _}<Skeleton height="120px" radius="var(--radius-lg)" />{/each}</div>
    {:else if matches.cycles.length}
      <div class="stack">
        {#each matches.cycles as loop, i (loop.start_user + (loop.path || []).join())}
          <Reveal y={16} delay={i * 45}><CycleCard {loop} /></Reveal>
        {/each}
      </div>
    {:else}
      <div class="empty">
        <span class="emoji-free" aria-hidden="true">◇</span>
        <p>No complete loops yet.</p>
        <small>Add skills you have and want — loops connecting you will appear here.</small>
      </div>
    {/if}
  </section>

  <section class="panel">
    <header><h2>Almost a loop</h2><span>1 connection away</span></header>
    {#if $loading}
      <div class="stack"><Skeleton height="96px" radius="var(--radius-lg)" /></div>
    {:else if d.nearMiss.length}
      <div class="stack">
        {#each d.nearMiss as item, i (item.end_user + item.missing_skill_id)}
          <Reveal y={16} delay={i * 45}><NearMissCard {item} /></Reveal>
        {/each}
      </div>
    {:else}
      <div class="empty">
        <span aria-hidden="true">┄</span>
        <p>No near-misses right now.</p>
        <small>When you're one connection from a loop, we'll suggest the missing skill.</small>
      </div>
    {/if}
  </section>

  <section class="panel">
    <header><h2>Who can teach me</h2><span>Direct matches</span></header>
    {#if $loading}
      <div class="grid"><Skeleton height="140px" radius="var(--radius-lg)" /><Skeleton height="140px" radius="var(--radius-lg)" /></div>
    {:else if matches.canTeach.length}
      <div class="grid">
        {#each matches.canTeach as item, i (item.id)}
          <div in:cardIn={{ delay: i * STAGGER }}>
            <SkillCard
              skill={skillName(d.skills, item.skill_id)}
              category={category(item.skill_id)}
              userName={item.user_name}
              rating={rating(item.user_id)}
              direction="they-teach"
            >
              <FriendAction userId={item.user_id} />
            </SkillCard>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty"><p>No direct teachers yet.</p><small>Add skills you want to find teachers.</small></div>
    {/if}
  </section>

  <section class="panel">
    <header><h2>Whom I can teach</h2><span>Potential exchange</span></header>
    {#if $loading}
      <div class="grid"><Skeleton height="140px" radius="var(--radius-lg)" /><Skeleton height="140px" radius="var(--radius-lg)" /></div>
    {:else if matches.canLearn.length}
      <div class="grid">
        {#each matches.canLearn as item, i (item.id)}
          <div in:cardIn={{ delay: i * STAGGER }}>
            <SkillCard
              skill={skillName(d.skills, item.skill_id)}
              category={category(item.skill_id)}
              userName={item.user_name}
              rating={rating(item.user_id)}
              direction="they-want"
            >
              <FriendAction userId={item.user_id} />
            </SkillCard>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty"><p>No one needs your skills yet.</p><small>Add skills you have to surface matches.</small></div>
    {/if}
  </section>
</div>

<style>
  .home {
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
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
    transition: border-color var(--dur-1) var(--ease);
  }
  .row:hover {
    border-color: var(--border-strong);
  }
  .row strong {
    display: block;
    font-size: var(--text-base);
    font-weight: var(--fw-medium);
  }
  .row span {
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .empty {
    text-align: center;
    padding: var(--space-6) var(--space-4);
    color: var(--text-2);
  }
  .empty span {
    font-size: var(--text-xl);
    color: var(--text-3);
    display: block;
    margin-bottom: var(--space-2);
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
    .home {
      grid-template-columns: 1fr;
    }
  }
</style>
