# Supabase-Setup (pluviodev-Account) — alles im Dashboard, keine CLI nötig

## 1. Projekt anlegen
- Dashboard → **New project** (Name z.B. `hall-sketcher`, Region Europe, DB-Passwort merken).
- Nach dem Anlegen: **Project Settings → API** öffnen. Von dort brauchst du später:
  - **Project URL** (`https://xxxx.supabase.co`) → wird `SUPA.url`
  - **anon public key** → wird `SUPA.anon` (durch RLS geschützt, darf im Client stehen)

## 2. Tabelle + RLS  (SQL Editor → New query → Run)
```sql
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nickname text not null,
  mode text not null check (mode in ('hall','battle')),
  battle_week int,
  battle_word text,
  motif text,
  image_path text not null
);
alter table public.entries enable row level security;
create policy "public read" on public.entries for select using (true);
-- KEIN insert-Policy für anon: Schreiben nur über Service-Rolle (Edge Function).

-- Voting: 1 Vote pro Gerät pro Battle-Woche (Unique-Constraint erzwingt das serverseitig)
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  device_id text not null,
  battle_week int not null,
  unique (device_id, battle_week)
);
alter table public.votes enable row level security;
create policy "votes read"   on public.votes for select using (true);
create policy "votes insert" on public.votes for insert with check (true);
-- Kein update/delete für anon: ein Vote ist endgültig. Doppel-Votes blockt der Unique-Constraint (HTTP 409).
```

## 3. Storage-Bucket
- **Storage → New bucket** → Name `artworks` → **Public bucket = an** (öffentliches Lesen der Bilder).

## 4. Edge Function `submit`
- **Edge Functions → Create a new function** → Name `submit`.
- Im Editor zwei Dateien anlegen und den Inhalt aus diesem Repo hineinkopieren:
  - `index.ts`  ← `supabase/functions/submit/index.ts`
  - `isCodeValid.ts` ← `supabase/functions/submit/isCodeValid.ts`
- **Deploy**.
- `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` sind in Edge Functions automatisch verfügbar.
- „Verify JWT" auf Standard (an) lassen — der Client schickt den anon-Key als `Authorization`.

## 5. Secrets (Edge Functions → Secrets bzw. Project Settings → Edge Functions → Secrets)
- `UPLOAD_CODE` = `<Community-Upload-Code>`  (zum Hochladen; nicht im Chat teilen)
- `ADMIN_CODE`  = `<geheimer Admin-Code>`  (NUR jh; zum Löschen von Galerie-Bildern via 🗑)

Beide Werte nur hier im Dashboard setzen, niemals in Client-Code/Chat. Nach dem Ändern von Function-Code (`index.ts`) neu **deployen**.

## 6. Werte an Claude geben (für Task 6)
Nur diese zwei (beide public-safe):
- **Project URL** → `SUPA.url`
- **anon public key** → `SUPA.anon`

## Referenz-Endpunkte (nutzt der Client)
- Submit:    `POST {url}/functions/v1/submit`  (Header `Authorization: Bearer {anon}`, JSON-Body mit `code`)
- Lesen:     `GET  {url}/rest/v1/entries?...`   (Header `apikey: {anon}`, `Authorization: Bearer {anon}`)
- Bild-URL:  `{url}/storage/v1/object/public/artworks/{image_path}`

## Test der Code-Prüfung (falls Deno installiert)
```bash
cd supabase/functions/submit && deno test isCodeValid.test.ts
```
