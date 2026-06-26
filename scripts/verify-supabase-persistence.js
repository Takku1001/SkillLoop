const pool = require('../src/db');

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status} ${payload.error || 'Request failed'}`);
  }
  return payload;
}

async function main() {
  const base = 'http://localhost:3000/api/skills';
  const stamp = Date.now();
  const email = `e2e_${stamp}@itu.edu.pk`;
  const password = 'Pass@12345';

  const createdUser = await requestJson(`${base}/users`, {
    method: 'POST',
    body: JSON.stringify({
      name: `E2E User ${stamp}`,
      email,
      password,
      program: 'BSAI',
    }),
  });

  const loginUser = await requestJson(`${base}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const skills = await requestJson(`${base}`);
  if (!Array.isArray(skills) || skills.length === 0) {
    throw new Error('No skills found in database. Seed skills first.');
  }

  const offeringSkillId = skills[0].id;
  const requestSkillId = (skills[1] && skills[1].id) || skills[0].id;

  await requestJson(`${base}/offerings`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: createdUser.id,
      skill_id: offeringSkillId,
      proficiency: 'intermediate',
    }),
  });

  await requestJson(`${base}/requests`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: createdUser.id,
      skill_id: requestSkillId,
      urgency: 'medium',
    }),
  });

  const profile = await requestJson(`${base}/users/${createdUser.id}/profile`);

  const userRow = await pool.query(
    'SELECT id, email FROM users WHERE id = $1',
    [createdUser.id]
  );
  const offeringsCount = await pool.query(
    'SELECT COUNT(*)::int AS count FROM skill_offerings WHERE user_id = $1',
    [createdUser.id]
  );
  const requestsCount = await pool.query(
    'SELECT COUNT(*)::int AS count FROM skill_requests WHERE user_id = $1',
    [createdUser.id]
  );

  console.log(
    JSON.stringify(
      {
        createdUserId: createdUser.id,
        loginUserId: loginUser.id,
        profileOfferings: profile.offerings.length,
        profileRequests: profile.requests.length,
        dbUserFound: userRow.rowCount === 1,
        dbOfferingsCount: offeringsCount.rows[0].count,
        dbRequestsCount: requestsCount.rows[0].count,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
