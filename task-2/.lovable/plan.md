## Goal

Seed the database with realistic demo data: 10+ users, 100+ events (10 in the past ~1 month ago, ~90 upcoming over the next few months), and multiple RSVPs per event. No images.

## Current state

- 2 auth users, 2 profiles, 6 hosts, 1 event, 1 RSVP — essentially empty.

## Approach

Because `auth.users` cannot be inserted via SQL migrations cleanly (and password hashing is required for sign-in), I'll seed users via a one-off Node script that uses the Supabase Admin API (service role key) to create real auth users. Then a SQL insert script will populate hosts, host_members, events, and rsvps.

### Step 1 — Create 12 auth users (script)

- Use `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` (already in env).
- Create users `demo01@gather.test` … `demo12@gather.test`, password `Password123!`, email auto-confirmed.
- The `handle_new_user` trigger auto-creates `profiles` rows (with display name like "Alex Rivera" set via user metadata).
- Save the resulting user IDs to a temp JSON file for step 2.

### Step 2 — Seed hosts, members, events, RSVPs (SQL via insert tool)

Using the user IDs from step 1:

- **Hosts (6 new)**: realistic names like "Brooklyn Tech Collective", "Berlin Design Circle", "PDX Run Club", etc., each `created_by` = one of the demo users; trigger auto-adds them as `host` member.
- **Extra host_members**: assign 2–4 additional members per host (mix of `host` and `checker` roles).
- **Events (100)**:
  - 10 past events: `starts_at` between 25–35 days ago, `ends_at` 2h later, `status='published'`, `published_at` set.
  - 90 upcoming events: `starts_at` spread across the next 1–120 days, `ends_at` 2–4h later, `status='published'`.
  - Distributed across the 6 hosts.
  - Realistic titles per host theme (e.g., "React Patterns Deep Dive", "Sunrise 5K", "Figma Variables Workshop"), descriptions, capacities (20–150), some with `venue_address`, some with `online_link`.
- **RSVPs**:
  - Each event gets 5–20 RSVPs from random demo users.
  - Status: most `confirmed`; if event is full, overflow → `waitlisted`.
  - For the 10 past events: mark ~70% of confirmed RSVPs as checked-in (`checked_in_at` during the event window).
- All inserts use `ON CONFLICT DO NOTHING` where applicable to be idempotent.

### Step 3 — Verify

Run counts + a couple of sample queries to confirm shapes look right, then report back.

## Technical notes

- Auth users created via admin API (not migration) — only way to get usable sign-in credentials and trigger profile creation.
- Event/RSVP seeding goes through the **insert tool** (data, not schema), per project conventions.
- `rsvp_to_event` RPC is bypassed — we insert directly with explicit status to control distribution and seed past check-ins. Capacity logic is enforced manually in the seed (count confirmed ≤ capacity).
- No image URLs — `cover_url` left NULL.
- Demo user password disclosed in final summary so you can log in as any of them.

## Deliverable

After execution:
- 12 demo users (login: `demo01@gather.test` … `demo12@gather.test` / `Password123!`)
- 6 hosts with multiple members each
- 100 events (10 past, 90 upcoming)
- ~1,000–1,500 RSVPs total, with check-in history on past events