export const skillName = (skills, id) =>
  skills.find((s) => s.id === id)?.name || 'Unknown skill';

export const userById = (users, id) => users.find((u) => u.id === id);

// Canonical key so rotations of the same cycle dedupe to one entry.
export function canonicalCycleKey(path) {
  const nodes = path.slice(0, -1);
  const rotations = nodes.map((_, i) =>
    [...nodes.slice(i), ...nodes.slice(0, i)].join('|'),
  );
  return rotations.sort()[0];
}

// Build the match board rows from raw data for the current user.
export function buildMatches(d, me) {
  if (!me) return { canTeach: [], canLearn: [], cycles: [] };

  const wanted = new Set(
    d.requests.filter((r) => r.user_id === me.id).map((r) => r.skill_id),
  );
  const offered = new Set(
    d.offerings.filter((o) => o.user_id === me.id).map((o) => o.skill_id),
  );

  const canTeach = d.offerings.filter(
    (o) => o.user_id !== me.id && wanted.has(o.skill_id),
  );
  const canLearn = d.requests.filter(
    (r) => r.user_id !== me.id && offered.has(r.skill_id),
  );

  const cycles = [];
  const keys = new Set();
  const related = [...wanted, ...offered];

  d.loops.forEach((loop) => {
    const match =
      related.includes(loop.skill_offered) ||
      related.includes(loop.skill_wanted) ||
      loop.start_user === me.id;
    if (!match || !Array.isArray(loop.path) || loop.path.length < 2) return;
    const key = canonicalCycleKey(loop.path);
    if (keys.has(key)) return;
    keys.add(key);
    cycles.push(loop);
  });

  return { canTeach, canLearn, cycles };
}
