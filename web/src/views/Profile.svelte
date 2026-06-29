<script>
  import { data, loading, loadAll } from '../lib/data.js';
  import { currentUser } from '../lib/stores.js';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toast.js';
  import { skillName } from '../lib/util.js';
  import { cardIn, STAGGER } from '../lib/transitions.js';
  import Reveal from '../lib/Reveal.svelte';
  import Skeleton from '../lib/Skeleton.svelte';
  import { press } from '../lib/actions/press.js';

  const category = (id) => d.skills.find((s) => s.id === id)?.category || 'Skill';

  $: d = $data;
  $: me = $currentUser;

  $: myOfferings = d.offerings.filter((o) => o.user_id === me?.id);
  $: myRequests = d.requests.filter((r) => r.user_id === me?.id);
  $: mySessions = d.sessions.filter((s) => s.teacher_id === me?.id || s.learner_id === me?.id);
  $: myReviews = d.reviews.filter((r) => r.reviewer_id === me?.id || r.reviewee_id === me?.id);
  $: offeredSkillIds = new Set(myOfferings.map((o) => o.skill_id));
  $: sessionSkills = d.skills.filter((s) => offeredSkillIds.has(s.id));
  $: learners = d.users.filter((u) => u.id !== me?.id);
  $: completable = mySessions.filter((s) => s.teacher_id === me?.id && s.status !== 'completed');
  $: reviewedIds = new Set(
    d.reviews.filter((r) => r.reviewer_id === me?.id).map((r) => r.session_id),
  );
  $: reviewable = mySessions.filter((s) => s.status === 'completed' && !reviewedIds.has(s.id));
  $: rep = d.reputation.find((r) => r.id === me?.id);

  // form state
  let offerSkill = '';
  let offerProf = 'intermediate';
  let wantSkill = '';
  let wantUrgency = 'medium';
  let sessLearner = '';
  let sessSkill = '';
  let sessWhen = '';
  let completeId = '';
  let reviewId = '';
  let reviewRating = '5';
  let reviewComment = '';

  async function refresh() {
    await loadAll(me.id);
  }

  async function addOffering() {
    if (!offerSkill) return toast.error('Pick a skill.');
    try {
      await api('/offerings', {
        method: 'POST',
        body: JSON.stringify({ user_id: me.id, skill_id: offerSkill, proficiency: offerProf }),
      });
      toast.success('Skill added to your profile.');
      offerSkill = '';
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function addRequest() {
    if (!wantSkill) return toast.error('Pick a skill.');
    try {
      await api('/requests', {
        method: 'POST',
        body: JSON.stringify({ user_id: me.id, skill_id: wantSkill, urgency: wantUrgency }),
      });
      toast.success('Wanted skill added.');
      wantSkill = '';
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function scheduleSession() {
    if (!sessLearner || !sessSkill) return toast.error('Pick a learner and skill.');
    try {
      await api('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          teacher_id: me.id,
          learner_id: sessLearner,
          skill_id: sessSkill,
          scheduled_at: sessWhen || null,
        }),
      });
      toast.success('Session scheduled.');
      sessWhen = '';
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function completeSession() {
    if (!completeId) return toast.error('Pick a session.');
    try {
      await api(`/sessions/${completeId}/complete`, { method: 'PATCH' });
      toast.success('Session marked complete.');
      completeId = '';
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function submitReview() {
    const session = mySessions.find((s) => s.id === reviewId);
    if (!session) return toast.error('Pick a completed session.');
    const revieweeId = session.teacher_id === me.id ? session.learner_id : session.teacher_id;
    try {
      await api('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          session_id: reviewId,
          reviewer_id: me.id,
          reviewee_id: revieweeId,
          rating: Number(reviewRating),
          comment: reviewComment || null,
        }),
      });
      toast.success('Review submitted.');
      reviewId = '';
      reviewComment = '';
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const partner = (s) => (s.teacher_id === me?.id ? s.learner_name : s.teacher_name);
</script>

<div class="profile">
  <Reveal y={14}>
    <section class="panel">
      <header><h2>Profile</h2><span>Your account</span></header>
      {#if $loading}
        <Skeleton height="120px" />
      {:else}
        <div class="rows">
          <div class="kv"><span>Name</span><strong>{me?.name}</strong></div>
          <div class="kv"><span>Email</span><strong>{me?.email}</strong></div>
          <div class="kv"><span>Program</span><strong>{me?.program || 'Not set'}</strong></div>
        </div>
      {/if}
    </section>
  </Reveal>

  <Reveal y={14} delay={60}>
    <section class="panel">
      <header><h2>Reputation</h2><span>Live standing</span></header>
      {#if $loading}
        <Skeleton height="120px" />
      {:else}
        <div class="stats3">
          <div><strong class="mono">{rep?.avg_rating ?? '—'}</strong><small>Avg rating</small></div>
          <div><strong class="mono">{rep?.total_reviews ?? 0}</strong><small>Reviews</small></div>
          <div><strong class="mono">{rep?.completed_sessions ?? 0}</strong><small>Sessions</small></div>
        </div>
      {/if}
    </section>
  </Reveal>

  <Reveal y={14} delay={120}>
    <section class="panel">
      <header><h2>Skills I have</h2><span>What you can teach</span></header>
      <form class="form" on:submit|preventDefault={addOffering}>
        <select bind:value={offerSkill}>
          <option value="" disabled>Select a skill</option>
          {#each d.skills as s}<option value={s.id}>{s.name}</option>{/each}
        </select>
        <select bind:value={offerProf}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <button use:press type="submit">Add</button>
      </form>
      <div class="pills">
        {#each myOfferings as o, i (o.id)}
          <div class="pill" in:cardIn={{ delay: i * STAGGER }}>
            <span class="pname">{skillName(d.skills, o.skill_id)}</span>
            <span class="ptag mono">{category(o.skill_id)}</span>
            <span class="plevel">{o.proficiency}</span>
          </div>
        {:else}
          <p class="muted">No skills added yet.</p>
        {/each}
      </div>
    </section>
  </Reveal>

  <Reveal y={14} delay={180}>
    <section class="panel">
      <header><h2>Skills I want</h2><span>What you want to learn</span></header>
      <form class="form" on:submit|preventDefault={addRequest}>
        <select bind:value={wantSkill}>
          <option value="" disabled>Select a skill</option>
          {#each d.skills as s}<option value={s.id}>{s.name}</option>{/each}
        </select>
        <select bind:value={wantUrgency}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button use:press type="submit">Add</button>
      </form>
      <div class="pills">
        {#each myRequests as r, i (r.id)}
          <div class="pill" in:cardIn={{ delay: i * STAGGER }}>
            <span class="pname">{skillName(d.skills, r.skill_id)}</span>
            <span class="ptag mono">{category(r.skill_id)}</span>
            <span class="plevel want">{r.urgency}</span>
          </div>
        {:else}
          <p class="muted">No wanted skills yet.</p>
        {/each}
      </div>
    </section>
  </Reveal>

  <Reveal y={14} delay={240}>
    <section class="panel wide">
      <header><h2>Sessions</h2><span>Schedule, complete, and join</span></header>
      <div class="form-row">
        <form class="form" on:submit|preventDefault={scheduleSession}>
          <select bind:value={sessLearner}>
            <option value="" disabled>Learner</option>
            {#each learners as u}<option value={u.id}>{u.name}</option>{/each}
          </select>
          <select bind:value={sessSkill}>
            <option value="" disabled>Skill</option>
            {#each sessionSkills as s}<option value={s.id}>{s.name}</option>{/each}
          </select>
          <input type="datetime-local" bind:value={sessWhen} />
          <button use:press type="submit">Schedule</button>
        </form>
        <form class="form" on:submit|preventDefault={completeSession}>
          <select bind:value={completeId}>
            <option value="" disabled>Active session</option>
            {#each completable as s}<option value={s.id}>{s.skill_name} · {partner(s)}</option>{/each}
          </select>
          <button use:press type="submit">Mark complete</button>
        </form>
      </div>
      <div class="stack">
        {#each mySessions as s}
          <div class="row">
            <div>
              <strong>{s.skill_name}</strong>
              <span>{s.teacher_id === me?.id ? 'Teaching' : 'Learning from'} {partner(s)} · {s.status}</span>
            </div>
            {#if s.video_url}
              <a class="join" href={s.video_url} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m16 10 4-2v8l-4-2"/><rect x="3" y="6" width="13" height="12" rx="2"/></svg>
                Join
              </a>
            {/if}
          </div>
        {:else}
          <p class="muted">No sessions yet.</p>
        {/each}
      </div>
    </section>
  </Reveal>

  <Reveal y={14} delay={300}>
    <section class="panel wide">
      <header><h2>Reviews</h2><span>Feedback after sessions</span></header>
      <form class="form" on:submit|preventDefault={submitReview}>
        <select bind:value={reviewId}>
          <option value="" disabled>Completed session</option>
          {#each reviewable as s}<option value={s.id}>{s.skill_name} · {partner(s)}</option>{/each}
        </select>
        <select bind:value={reviewRating}>
          {#each [5, 4, 3, 2, 1] as n}<option value={String(n)}>{n} ★</option>{/each}
        </select>
        <input placeholder="Optional comment" bind:value={reviewComment} />
        <button use:press type="submit">Submit</button>
      </form>
      <div class="stack">
        {#each myReviews as r}
          <div class="row">
            <div>
              <strong>{r.rating} / 5</strong>
              <span>{r.reviewer_name} → {r.reviewee_name} · {r.comment || 'No comment'}</span>
            </div>
          </div>
        {:else}
          <p class="muted">No reviews yet.</p>
        {/each}
      </div>
    </section>
  </Reveal>
</div>

<style>
  .profile {
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
  .panel.wide {
    grid-column: 1 / -1;
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
  .rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .kv {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-base);
  }
  .kv span {
    color: var(--text-3);
  }
  .kv strong {
    font-weight: var(--fw-medium);
  }
  .stats3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }
  .stats3 div {
    background: var(--surface-2);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    text-align: center;
  }
  .stats3 strong {
    font-size: var(--text-xl);
    font-weight: var(--fw-semibold);
    display: block;
  }
  .stats3 small {
    font-size: var(--text-xs);
    color: var(--text-3);
  }
  .form {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-5);
  }
  .form-row .form {
    flex: 1;
    min-width: 240px;
  }
  select,
  input {
    height: 40px;
    padding: 0 var(--space-3);
    background: var(--surface-2);
    border: 0.5px solid var(--border-strong);
    border-radius: var(--radius-md);
    color: var(--text-1);
    font-size: var(--text-sm);
    flex: 1;
    min-width: 120px;
    transition: border-color var(--dur-1) var(--ease), box-shadow var(--dur-1) var(--ease);
  }
  select:focus,
  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: var(--ring);
  }
  .form button {
    height: 40px;
    padding: 0 var(--space-4);
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    transition: background var(--dur-1) var(--ease);
  }
  .form button:hover {
    background: var(--accent-hover);
  }
  .pills {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .pill {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.55rem 0.8rem;
    transition: border-color var(--dur-1) var(--ease);
  }
  .pill:hover {
    border-color: var(--border-strong);
  }
  .pname {
    font-size: var(--text-base);
    font-weight: var(--fw-medium);
    color: var(--text-1);
  }
  /* category = skill tag: mono teal, fills left-to-right on hover */
  .ptag {
    position: relative;
    overflow: hidden;
    font-size: var(--text-xs);
    color: var(--success);
    border: 1px solid var(--success-soft);
    border-radius: var(--radius-sm);
    padding: 0.15rem 0.45rem;
    z-index: 0;
  }
  .ptag::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--success-soft);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform var(--dur-2) var(--ease);
    z-index: -1;
  }
  .ptag:hover::before {
    transform: scaleX(1);
  }
  .plevel {
    margin-left: auto;
    font-size: var(--text-xs);
    text-transform: capitalize;
    color: var(--accent-fg);
  }
  .plevel.want {
    color: var(--warning);
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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
  .row strong {
    display: block;
    font-size: var(--text-base);
    font-weight: var(--fw-medium);
  }
  .row span {
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .join {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
    background: var(--accent);
    color: #fff;
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    padding: 0.4rem 0.8rem;
    border-radius: var(--radius-md);
    transition: background var(--dur-1) var(--ease);
  }
  .join:hover {
    background: var(--accent-hover);
  }
  .muted {
    color: var(--text-3);
    font-size: var(--text-sm);
    margin: 0;
  }
  @media (max-width: 820px) {
    .profile {
      grid-template-columns: 1fr;
    }
  }
</style>
