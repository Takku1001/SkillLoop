// One-off maintenance: remove test/spam users and seed additional uni-life skills.
// Run with: node scripts/maintenance-cleanup-and-skills.js
const pool = require('../src/db');

const SPAM_EMAIL_PATTERNS = [
    '%@test.com',
    'e2e\\_%',      // escape underscore (LIKE wildcard)
    'testuser%',
    '%@t.com',
];

const UNI_LIFE_SKILLS = [
    ['Academic Writing', 'Writing'],
    ['Research Methods', 'Academics'],
    ['LaTeX', 'Writing'],
    ['Public Speaking', 'Communication'],
    ['Presentation Design', 'Communication'],
    ['Time Management', 'Productivity'],
    ['Note Taking', 'Productivity'],
    ['Exam Preparation', 'Academics'],
    ['Resume Building', 'Career'],
    ['Interview Preparation', 'Career'],
    ['LinkedIn Networking', 'Career'],
    ['Excel', 'Productivity'],
    ['PowerPoint', 'Productivity'],
    ['Git & GitHub', 'Programming'],
    ['Web Development', 'Programming'],
    ['Databases & SQL', 'Programming'],
    ['Machine Learning', 'AI'],
    ['Data Analysis', 'Data'],
    ['Statistics', 'Math'],
    ['Linear Algebra', 'Math'],
    ['Graphic Design', 'Design'],
    ['Video Editing', 'Design'],
    ['Photography', 'Design'],
    ['English Speaking', 'Language'],
    ['Arabic', 'Language'],
    ['Entrepreneurship', 'Business'],
    ['Financial Literacy', 'Business'],
    ['Study Group Coordination', 'Academics'],
];

async function main() {
    const client = pool;

    // 1. Identify spam/test users
    const conditions = SPAM_EMAIL_PATTERNS.map((_, i) => `email LIKE $${i + 1}`).join(' OR ');
    const spam = await client.query(
        `SELECT id, name, email FROM users WHERE ${conditions}`,
        SPAM_EMAIL_PATTERNS
    );
    const ids = spam.rows.map((r) => r.id);

    if (ids.length) {
        // sessions/reviews reference users without ON DELETE CASCADE, so clear them first
        await client.query(
            `DELETE FROM reviews WHERE reviewer_id = ANY($1::uuid[]) OR reviewee_id = ANY($1::uuid[])`,
            [ids]
        );
        await client.query(
            `DELETE FROM sessions WHERE teacher_id = ANY($1::uuid[]) OR learner_id = ANY($1::uuid[])`,
            [ids]
        );
        const del = await client.query(
            `DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING name, email`,
            [ids]
        );
        console.log(`Deleted ${del.rowCount} test/spam users:`);
        del.rows.forEach((r) => console.log('  -', r.name, '|', r.email));
    } else {
        console.log('No test/spam users matched.');
    }

    // 2. Seed additional uni-life skills (idempotent)
    let added = 0;
    for (const [name, category] of UNI_LIFE_SKILLS) {
        const r = await client.query(
            `INSERT INTO skills (name, category) VALUES ($1, $2)
             ON CONFLICT (name) DO NOTHING`,
            [name, category]
        );
        added += r.rowCount;
    }
    console.log(`Added ${added} new skills (${UNI_LIFE_SKILLS.length - added} already existed).`);

    const total = await client.query('SELECT COUNT(*)::int AS c FROM skills');
    console.log('Total skills now:', total.rows[0].c);

    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
