const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const skillsRouter = require('./routes/skills');

const app = express();
const PORT = process.env.PORT || 3000;

// Built Svelte frontend (produced by `npm run build:web`)
const distPath = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json());
app.use(express.static(distPath));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ message: 'SkillLoop API is running' });
});

// Public client config (anon key is safe to expose to the browser)
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    });
});

// API routes
app.use('/api/skills', skillsRouter);

// SPA fallback — any non-API GET serves the built index.html
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
