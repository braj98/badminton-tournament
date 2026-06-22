# Setup Guide

## Git (push changes)

```bash
git add .
git commit -m "what changed"
git push
```

## GitHub Pages (shareable URL)

1. Go to https://github.com/braj98/badminton-tournament/settings/pages
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)` → **Save**
4. Wait ~1 minute, then site is live at `https://braj98.github.io/badminton-tournament`

---

## Supabase (live sync — optional, for real-time across devices)

### 1. Create a Supabase project

- Go to https://supabase.com → New project
- Note the **Project URL** and **anon public key** from Project Settings → API

### 2. Create the state table

Open **SQL Editor** and run:

```sql
create table state (
  key text primary key,
  data jsonb not null
);
alter table state enable row level security;

create policy "Anyone can read state"
  on state for select using (true);

create policy "Only authenticated can write"
  on state for all using (auth.role() = 'authenticated');
```

### 3. Create admin user

Go to **Authentication → Users → Add User** → create one admin account (email/password).

### 4. Send to developer

Send these to the developer:
- **Supabase Project URL**
- **anon public key**

### Cost note

Supabase Free tier supports ~3-5 concurrent connections (too few for 100 viewers).
**Pro plan ($25/mo)** needed for 100 simultaneous viewers.
Alternative: Firebase Blaze (~$0.50/mo) with simpler setup.
