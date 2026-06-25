# Supabase — JJS App

**Project ID:** `tglfymxwpryfibknfith`

## Structure

```
supabase/
├── schema.md                  # Full column/type reference for all 32 Trainerize-mirror tables
├── trainerizeMigration.py     # One-time migration script: Trainerize API → Supabase
├── README.md                  # This file
└── migrations/
    ├── 20260625_001_nutrition_goals_fix.sql   # Bump macro goal columns integer → numeric
    └── 20260625_002_app_tables.sql            # New app-native tables (see below)
```

## Two layers of data

| Layer | Tables | Source |
|---|---|---|
| **Trainerize mirror** | trainers, clients, programs, workouts, nutrition, body metrics, etc. (32 tables) | Populated by `trainerizeMigration.py` |
| **App-native** | courses, lessons, lesson_progress, run_sessions, conversations, messages, push_tokens, badges | Created by the mobile app and admin dashboard |

## App-native tables (migration 002)

| Table | Purpose |
|---|---|
| `courses` | Video course library — created/managed in admin dashboard |
| `lessons` | Individual video lessons within a course |
| `lesson_progress` | Per-client progress through each lesson |
| `run_sessions` | GPS run data logged natively from the mobile app |
| `conversations` | 1-to-1 and group message threads |
| `conversation_participants` | Who is in each conversation (clients + trainers) |
| `messages` | Individual messages within a conversation |
| `push_tokens` | Expo push tokens for iOS/Android notifications |
| `badges` | Badge/achievement definitions |
| `client_badges` | Badges earned by each client |

Plus: `clients.auth_user_id` column linking Supabase Auth → clients table.

## Running migrations

These are plain SQL — paste into the Supabase SQL Editor or use the CLI:

```bash
supabase db push  # if using Supabase CLI with linked project
```

Or run manually in order via **Supabase Dashboard → SQL Editor**.

## Generating TypeScript types

After running migrations, regenerate types for the app:

```bash
npx supabase gen types typescript --project-id tglfymxwpryfibknfith > packages/shared/database.types.ts
```

## Known issues / notes

- `nutrition_goals` macro columns were `integer` in the original schema; migration 001 bumps them to `numeric` to match `daily_nutrition_logs` and avoid rounding Trainerize decimal values.
- `workout_exercises.id` in the migration script is a composite string (`workoutId_index`) since Trainerize has no native ID for exercise slots — if you re-run the migration, upserts use this as the conflict key.
- RLS policies on app-native tables assume `clients.auth_user_id` is populated. The Trainerize-mirror tables (trainers, clients, etc.) do **not** have RLS enabled — admin dashboard accesses them via the service role key only.
