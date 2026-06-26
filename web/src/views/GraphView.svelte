<script>
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { data } from '../lib/data.js';
  import { currentUser } from '../lib/stores.js';
  import { skillName } from '../lib/util.js';

  const W = 820;
  const H = 540;

  let svgEl;
  let sim;
  let nodes = [];
  let links = [];
  let hovered = null;
  let neighbors = new Set();

  $: d = $data;
  $: me = $currentUser;

  function build() {
    const reqBySkill = new Map();
    d.requests.forEach((r) => {
      if (!reqBySkill.has(r.skill_id)) reqBySkill.set(r.skill_id, []);
      reqBySkill.get(r.skill_id).push(r.user_id);
    });

    // Directed edge A -> B: A offers a skill B wants
    const edgeMap = new Map();
    d.offerings.forEach((o) => {
      (reqBySkill.get(o.skill_id) || []).forEach((uid) => {
        if (uid === o.user_id) return;
        const key = `${o.user_id}>${uid}`;
        if (!edgeMap.has(key)) {
          edgeMap.set(key, { source: o.user_id, target: uid, skills: [] });
        }
        edgeMap.get(key).skills.push(o.skill_id);
      });
    });

    const linkList = [...edgeMap.values()];
    const involved = new Set();
    linkList.forEach((l) => {
      involved.add(l.source);
      involved.add(l.target);
    });

    const nodeList = d.users
      .filter((u) => involved.has(u.id))
      .map((u) => ({ id: u.id, name: u.name, isMe: u.id === me?.id }));

    return { nodeList, linkList };
  }

  function neighborSet(id) {
    const set = new Set([id]);
    links.forEach((l) => {
      const s = l.source.id || l.source;
      const t = l.target.id || l.target;
      if (s === id) set.add(t);
      if (t === id) set.add(s);
    });
    return set;
  }

  function setHover(node) {
    hovered = node ? node.id : null;
    neighbors = node ? neighborSet(node.id) : new Set();
  }

  function svgPoint(ev) {
    const pt = svgEl.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    return pt.matrixTransform(svgEl.getScreenCTM().inverse());
  }

  function startDrag(ev, node) {
    ev.preventDefault();
    sim.alphaTarget(0.3).restart();
    const move = (e) => {
      const p = svgPoint(e);
      node.fx = p.x;
      node.fy = p.y;
    };
    const end = () => {
      sim.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
    const p = svgPoint(ev);
    node.fx = p.x;
    node.fy = p.y;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  }

  onMount(() => {
    const { nodeList, linkList } = build();
    nodes = nodeList;
    links = linkList;
    if (!nodes.length) return;

    sim = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((n) => n.id).distance(120).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-340))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(34))
      .force('x', d3.forceX(W / 2).strength(0.04))
      .force('y', d3.forceY(H / 2).strength(0.04))
      .on('tick', () => {
        nodes = nodes;
        links = links;
      });
  });

  onDestroy(() => sim && sim.stop());

  const dim = (id) => hovered && !neighbors.has(id);
  const ex = (n) => (typeof n === 'object' ? n.x : 0);
  const ey = (n) => (typeof n === 'object' ? n.y : 0);
</script>

<div class="graph-card">
  <header>
    <div>
      <h2>Skill network</h2>
      <span>Each arrow: someone can teach what another wants. Hover a node to trace its connections; drag to rearrange.</span>
    </div>
    <div class="legend">
      <span><i class="d me"></i>You</span>
      <span><i class="d other"></i>Student</span>
    </div>
  </header>

  {#if !nodes.length}
    <div class="empty">
      <p>Not enough activity yet.</p>
      <small>As students add skills they offer and want, the trade network appears here.</small>
    </div>
  {:else}
    <svg bind:this={svgEl} viewBox="0 0 {W} {H}" role="img" aria-label="Skill trade network">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--border-strong)" />
        </marker>
        <marker id="arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
        </marker>
      </defs>

      {#each links as l}
        {@const s = l.source}
        {@const t = l.target}
        {@const hot = hovered && (s.id === hovered || t.id === hovered)}
        <line
          x1={ex(s)} y1={ey(s)} x2={ex(t)} y2={ey(t)}
          stroke={hot ? 'var(--accent)' : 'var(--border-strong)'}
          stroke-width={hot ? 1.6 : 1}
          opacity={hovered && !hot ? 0.15 : 0.65}
          marker-end={hot ? 'url(#arrow-hot)' : 'url(#arrow)'}
        />
      {/each}

      {#each nodes as n}
        <g
          transform="translate({n.x},{n.y})"
          opacity={dim(n.id) ? 0.25 : 1}
          on:pointerdown={(e) => startDrag(e, n)}
          on:pointerenter={() => setHover(n)}
          on:pointerleave={() => setHover(null)}
          role="button"
          tabindex="0"
          style="cursor:grab"
        >
          <circle
            r={n.isMe ? 13 : 10}
            fill={n.isMe ? 'var(--accent)' : 'var(--surface-3)'}
            stroke={hovered === n.id ? 'var(--accent-fg)' : n.isMe ? 'var(--accent-fg)' : 'var(--border-strong)'}
            stroke-width={hovered === n.id ? 2 : 1}
          />
          <text x="0" y={n.isMe ? 26 : 23} text-anchor="middle"
            fill={hovered === n.id ? 'var(--text-1)' : 'var(--text-2)'}
            font-size="11">{n.name}</text>
        </g>
      {/each}
    </svg>
  {/if}
</div>

<style>
  .graph-card {
    background: var(--surface-1);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  h2 {
    font-size: var(--text-lg);
    font-weight: var(--fw-semibold);
    margin: 0 0 var(--space-1);
  }
  header span {
    font-size: var(--text-sm);
    color: var(--text-3);
    max-width: 46ch;
    display: block;
  }
  .legend {
    display: flex;
    gap: var(--space-4);
    flex-shrink: 0;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-2);
  }
  .legend .d {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }
  .legend .me {
    background: var(--accent);
  }
  .legend .other {
    background: var(--surface-3);
    border: 1px solid var(--border-strong);
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
    touch-action: none;
  }
  text {
    user-select: none;
    pointer-events: none;
    font-family: var(--font-sans);
  }
  g:focus {
    outline: none;
  }
  .empty {
    text-align: center;
    padding: var(--space-10) var(--space-4);
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
</style>
