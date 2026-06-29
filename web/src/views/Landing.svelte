<script>
  import { createEventDispatcher } from 'svelte';
  import Reveal from '../lib/Reveal.svelte';
  import Galaxy from '../lib/Galaxy.svelte';
  import { press } from '../lib/actions/press.js';

  const dispatch = createEventDispatcher();

  const features = [
    {
      title: 'Learn new skills',
      body: 'Find peers in your network ready to teach you something valuable.',
      icon: 'cap',
    },
    {
      title: 'Create trade cycles',
      body: 'Discover circular skill exchanges that benefit several people at once.',
      icon: 'loop',
    },
    {
      title: 'Build community',
      body: 'Connect with students who share your interests and learning goals.',
      icon: 'people',
    },
  ];
</script>

<section class="landing">
  <div class="galaxy-bg" aria-hidden="true">
    <Galaxy
      density={0.9}
      hueShift={250}
      saturation={0.25}
      glowIntensity={0.22}
      twinkleIntensity={0.5}
      starSpeed={0.2}
      speed={0.7}
      rotationSpeed={0.03}
      mouseInteraction={false}
      mouseRepulsion={false}
    />
  </div>
  <div class="glow" aria-hidden="true"></div>

  <Reveal y={14} delay={40} damping={0.7}>
    <div class="wordmark">
      <span class="dot" aria-hidden="true"></span>
      SkillLoop
    </div>
  </Reveal>

  <Reveal y={16} delay={120} damping={0.7}>
    <h1 class="headline">Trade skills, not money.</h1>
  </Reveal>

  <Reveal y={16} delay={200} damping={0.75}>
    <p class="sub">
      A peer skill-exchange for students. Offer what you know, request what you
      want, and SkillLoop finds the loops that connect you.
    </p>
  </Reveal>

  <div class="features">
    {#each features as feature, i}
      <Reveal y={20} delay={320 + i * 70} stiffness={0.14} damping={0.62}>
        <article class="feature">
          <span class="feature-icon" aria-hidden="true">
            {#if feature.icon === 'cap'}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>
            {:else if feature.icon === 'loop'}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
            {:else}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3 3 0 0 1 0 5.5"/><path d="M21 20c0-2.5-1.5-4.7-3.7-5.6"/></svg>
            {/if}
          </span>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
        </article>
      </Reveal>
    {/each}
  </div>

  <Reveal y={14} delay={560} damping={0.8}>
    <div class="cta">
      <button class="btn btn-primary" use:press on:click={() => dispatch('login')}>
        Log in
      </button>
      <button class="btn btn-ghost" use:press on:click={() => dispatch('signup')}>
        Create account
      </button>
    </div>
  </Reveal>
</section>

<style>
  .landing {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: clamp(3.5rem, 13vh, 9rem) var(--space-5) var(--space-9);
    max-width: 880px;
    margin: 0 auto;
  }

  /* Full-bleed animated starfield background (React Bits "Galaxy", ported). */
  .galaxy-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.85;
    /* Fade the field toward the edges so it reads as ambience, not noise. */
    -webkit-mask-image: radial-gradient(120% 90% at 50% 38%, #000 35%, transparent 100%);
    mask-image: radial-gradient(120% 90% at 50% 38%, #000 35%, transparent 100%);
  }

  /* Lift every real content layer above the starfield + glow. */
  .landing > :not(.galaxy-bg):not(.glow) {
    position: relative;
    z-index: 2;
  }

  .glow {
    position: fixed;
    top: -8%;
    left: 50%;
    transform: translateX(-50%);
    width: 620px;
    height: 620px;
    max-width: 120vw;
    background: radial-gradient(circle, var(--accent-soft) 0%, transparent 62%);
    pointer-events: none;
    opacity: 0.5;
    z-index: 1;
  }

  .wordmark {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    letter-spacing: 0.02em;
    color: var(--text-2);
    margin-bottom: var(--space-7);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }

  .headline {
    font-size: clamp(2.4rem, 6.5vw, 2.85rem);
    font-weight: var(--fw-bold);
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin: 0 0 var(--space-5);
    color: var(--text-1);
  }

  .sub {
    font-size: var(--text-lg);
    line-height: 1.6;
    color: var(--text-2);
    max-width: 34rem;
    margin: 0 0 var(--space-9);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    width: 100%;
    margin-bottom: var(--space-9);
  }

  .feature {
    height: 100%;
    text-align: left;
    background: var(--surface-1);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    transition: border-color var(--dur-2) var(--ease),
      background var(--dur-2) var(--ease), transform var(--dur-2) var(--ease);
  }
  .feature:hover {
    border-color: var(--border-strong);
    background: var(--surface-2);
    transform: translateY(-2px);
  }
  .feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    background: var(--accent-soft);
    color: var(--accent-fg);
    margin-bottom: var(--space-4);
  }
  .feature h3 {
    font-size: var(--text-lg);
    font-weight: var(--fw-semibold);
    margin: 0 0 var(--space-2);
    color: var(--text-1);
  }
  .feature p {
    font-size: var(--text-base);
    line-height: 1.55;
    color: var(--text-2);
    margin: 0;
  }

  .cta {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
  }
  .btn {
    appearance: none;
    border: 0.5px solid transparent;
    border-radius: var(--radius-md);
    padding: 0.75rem 1.5rem;
    font-size: var(--text-md);
    font-weight: var(--fw-medium);
    transition: background var(--dur-1) var(--ease),
      border-color var(--dur-1) var(--ease), color var(--dur-1) var(--ease);
  }
  .btn:focus-visible {
    outline: none;
    box-shadow: var(--ring);
  }
  .btn-primary {
    position: relative;
    overflow: hidden;
    background: var(--accent);
    color: #fff;
  }
  .btn-primary:hover {
    background: var(--accent-hover);
  }
  /* subtle shimmer sweep, once per hover */
  .btn-primary::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 45%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.22), transparent);
    transform: translateX(-120%) skewX(-12deg);
    pointer-events: none;
  }
  .btn-primary:hover::after {
    animation: shimmer-sweep 0.7s var(--ease) 1;
  }
  .btn-ghost {
    background: transparent;
    border-color: var(--border-strong);
    color: var(--text-1);
  }
  .btn-ghost:hover {
    background: var(--surface-2);
    border-color: #3a3f47;
  }

  @media (max-width: 640px) {
    .features {
      grid-template-columns: 1fr;
    }
    .cta {
      flex-direction: column;
      width: 100%;
    }
    .btn {
      width: 100%;
    }
  }
</style>
