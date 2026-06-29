<script>
  // Minimal circular diagram of a swap loop (A → B → C → A). 160px, not a hero.
  // The dashed arrow arcs draw themselves in once on mount, then sit static —
  // an entrance gesture, not a continuous loop (respects the no-loop rule).
  export let names = [];
  export let highlight = -1; // index of the current user, to accent that node

  const SIZE = 160;
  const C = SIZE / 2;
  const R = 56; // node ring radius
  const NODE = 15;
  const GAP = 20; // angular gap (deg) so arrows don't collide with nodes

  const rad = (deg) => (deg * Math.PI) / 180;
  const pt = (deg, r = R) => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))];

  $: n = names.length;
  // Evenly spaced, starting at the top (-90°).
  $: angles = names.map((_, i) => -90 + (i * 360) / Math.max(1, n));
  $: nodes = names.map((name, i) => {
    const [x, y] = pt(angles[i]);
    return { name, x, y, initial: (name || '?').trim().slice(0, 1).toUpperCase(), me: i === highlight };
  });
  // One arc per edge i -> (i+1), inset by GAP at both ends, arrowhead at target.
  $: arcs = names.map((_, i) => {
    const a0 = angles[i] + GAP;
    const a1 = angles[(i + 1) % n] - GAP;
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    // sweep clockwise; large-arc only if the span exceeds 180°
    let span = a1 - a0;
    while (span < 0) span += 360;
    const large = span > 180 ? 1 : 0;
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  });
</script>

<svg class="ring" viewBox="0 0 {SIZE} {SIZE}" width={SIZE} height={SIZE} role="img" aria-label={`Swap loop: ${names.join(' to ')} to ${names[0] || ''}`}>
  <defs>
    <marker id="loop-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
    </marker>
  </defs>

  {#if n > 1}
    {#each arcs as d, i}
      <path
        class="arc"
        {d}
        style="animation-delay:{i * 120}ms"
        fill="none"
        stroke="var(--accent)"
        stroke-width="1.5"
        stroke-linecap="round"
        marker-end="url(#loop-arrow)"
      />
    {/each}
  {/if}

  {#each nodes as node}
    <g transform="translate({node.x},{node.y})">
      <circle
        r={NODE}
        fill={node.me ? 'var(--accent)' : 'var(--surface-3)'}
        stroke={node.me ? 'var(--accent-fg)' : 'var(--border-strong)'}
        stroke-width="1"
      />
      <text text-anchor="middle" dy="0.34em" fill={node.me ? '#fff' : 'var(--text-1)'} font-size="12" font-weight="600">{node.initial}</text>
    </g>
  {/each}
</svg>

<style>
  .ring {
    display: block;
    flex-shrink: 0;
  }
  .arc {
    stroke-dasharray: 3 6;
    /* draw-in once: the dash pattern marches into place, then stops */
    animation: loop-draw 0.7s var(--ease) both;
  }
  @keyframes loop-draw {
    from {
      stroke-dashoffset: 60;
      opacity: 0;
    }
    to {
      stroke-dashoffset: 0;
      opacity: 1;
    }
  }
  text {
    font-family: var(--font-sans);
    user-select: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .arc {
      animation: none;
    }
  }
</style>
