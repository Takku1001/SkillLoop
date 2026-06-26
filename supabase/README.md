# Supabase GitHub Integration

Use this folder as the database source of truth for Supabase GitHub integration.

## What to connect in Supabase
- GitHub repository: `Takku1001/SkillLoop`
- Working directory: `.`
- Production branch: `main`

## What to run in Supabase
1. Connect the repository in Supabase Database -> GitHub Integration.
2. Make sure the project uses the `supabase/` folder at the repository root.
3. Apply the initial migration from `supabase/migrations/20260614000000_initial_schema.sql`.
4. Run `supabase/seed.sql` if you want the sample loop data.
5. Verify the app still points to the live database connection in `.env`.

## Notes
- The migration enables `pgcrypto`, `vector`, and `pg_trgm`.
- `database/schema.sql` is kept for reference, but the Supabase migration folder is the preferred sync target.