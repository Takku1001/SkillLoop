-- Sample users
INSERT INTO users (name, email, program) VALUES
('Rayyan Malik',  'rayyan@itu.edu.pk',  'BSAI'),
('Sarah Fawad Rizvi',    'sarah@itu.edu.pk',    'BSCS'),
('Ali Hassan',    'ali@itu.edu.pk',     'BSEE'),
('Zara Khan',     'zara@itu.edu.pk',    'BSAI')
ON CONFLICT (email) DO NOTHING;

-- Sample skills
INSERT INTO skills (name, category, metadata) VALUES
('Calculus',        'Math',        '{"difficulty": "hard"}'),
('DSA',             'Programming', '{"difficulty": "medium"}'),
('Assembly',        'Programming', '{"difficulty": "hard"}'),
('Neural Networks', 'AI',          '{"difficulty": "hard"}'),
('Python',          'Programming', '{"difficulty": "easy"}')
ON CONFLICT (name) DO NOTHING;

-- Rayyan teaches Python, wants DSA
INSERT INTO skill_offerings (user_id, skill_id, proficiency)
SELECT u.id, s.id, 'advanced'
FROM users u, skills s
WHERE u.email = 'rayyan@itu.edu.pk' AND s.name = 'Python'
ON CONFLICT (user_id, skill_id) DO NOTHING;

INSERT INTO skill_requests (user_id, skill_id, urgency)
SELECT u.id, s.id, 'high'
FROM users u, skills s
WHERE u.email = 'rayyan@itu.edu.pk' AND s.name = 'DSA'
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Sarah teaches DSA, wants Calculus
INSERT INTO skill_offerings (user_id, skill_id, proficiency)
SELECT u.id, s.id, 'advanced'
FROM users u, skills s
WHERE u.email = 'sarah@itu.edu.pk' AND s.name = 'DSA'
ON CONFLICT (user_id, skill_id) DO NOTHING;

INSERT INTO skill_requests (user_id, skill_id, urgency)
SELECT u.id, s.id, 'medium'
FROM users u, skills s
WHERE u.email = 'sarah@itu.edu.pk' AND s.name = 'Calculus'
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Ali teaches Calculus, wants Python  (completes the loop)
INSERT INTO skill_offerings (user_id, skill_id, proficiency)
SELECT u.id, s.id, 'intermediate'
FROM users u, skills s
WHERE u.email = 'ali@itu.edu.pk' AND s.name = 'Calculus'
ON CONFLICT (user_id, skill_id) DO NOTHING;

INSERT INTO skill_requests (user_id, skill_id, urgency)
SELECT u.id, s.id, 'high'
FROM users u, skills s
WHERE u.email = 'ali@itu.edu.pk' AND s.name = 'Python'
ON CONFLICT (user_id, skill_id) DO NOTHING;
