-- ============================================================================
-- Row Level Security (RLS) lockdown for the event registration app.
-- Run this in the Supabase SQL editor (Dashboard > SQL).
--
-- Model:
--   * The browser uses the ANON key. It must only READ public marketing data
--     (categories, events, media, page content) and must have NO access to
--     the registrations table (which holds attendee PII).
--   * All writes to registrations, and all admin reads/writes, go through
--     server Route Handlers using the SERVICE_ROLE key, which BYPASSES RLS.
--
-- After running this, the public anon key cannot read or write registrations,
-- and cannot modify any table. Anything that still needs that access has been
-- moved server-side in the application code.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- registrations: PII. No anon access at all (deny by enabling RLS with no
-- permissive policy for the anon/authenticated roles). The service role
-- bypasses RLS, so the server routes continue to work.
-- ---------------------------------------------------------------------------
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing permissive policies you may have created earlier.
DROP POLICY IF EXISTS "public read registrations"   ON public.registrations;
DROP POLICY IF EXISTS "public insert registrations"  ON public.registrations;
DROP POLICY IF EXISTS "anon all registrations"       ON public.registrations;
-- (No new policy = no access for anon/authenticated.)

-- ---------------------------------------------------------------------------
-- categories: public can READ only. Writes happen server-side / admin only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories read for all" ON public.categories;
CREATE POLICY "categories read for all"
  ON public.categories FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- events: public can READ only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events read for all" ON public.events;
CREATE POLICY "events read for all"
  ON public.events FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- event_media: public can READ only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_media read for all" ON public.event_media;
CREATE POLICY "event_media read for all"
  ON public.event_media FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- page_content: public can READ only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page_content read for all" ON public.page_content;
CREATE POLICY "page_content read for all"
  ON public.page_content FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Sanity check: list policies after running.
--   select schemaname, tablename, policyname, cmd
--   from pg_policies where schemaname = 'public' order by tablename;
-- ---------------------------------------------------------------------------
