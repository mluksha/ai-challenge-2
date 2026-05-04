
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.host_role AS ENUM ('host', 'checker');
CREATE TYPE public.event_status AS ENUM ('draft', 'published');
CREATE TYPE public.event_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE public.rsvp_status AS ENUM ('confirmed', 'waitlisted', 'cancelled');
CREATE TYPE public.photo_status AS ENUM ('pending', 'approved', 'hidden');
CREATE TYPE public.report_target AS ENUM ('event', 'photo');
CREATE TYPE public.report_status AS ENUM ('open', 'resolved');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Member',
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- HOSTS
-- =========================================================
CREATE TABLE public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  logo_url TEXT,
  contact_email TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hosts_slug ON public.hosts(slug);

ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER hosts_updated_at BEFORE UPDATE ON public.hosts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- HOST MEMBERS (separate roles table for security)
-- =========================================================
CREATE TABLE public.host_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.host_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(host_id, user_id, role)
);

CREATE INDEX idx_host_members_user ON public.host_members(user_id);
CREATE INDEX idx_host_members_host ON public.host_members(host_id);

ALTER TABLE public.host_members ENABLE ROW LEVEL SECURITY;

-- Security definer role check (bypasses RLS recursion)
CREATE OR REPLACE FUNCTION public.has_host_role(_user_id UUID, _host_id UUID, _role public.host_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.host_members
    WHERE user_id = _user_id AND host_id = _host_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_host_member(_user_id UUID, _host_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.host_members
    WHERE user_id = _user_id AND host_id = _host_id
  );
$$;

-- Hosts: anyone can view (public profile), only Host members can update
CREATE POLICY "Hosts viewable by everyone"
  ON public.hosts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create hosts"
  ON public.hosts FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Host members with host role can update"
  ON public.hosts FOR UPDATE
  USING (public.has_host_role(auth.uid(), id, 'host'));

CREATE POLICY "Host members with host role can delete"
  ON public.hosts FOR DELETE
  USING (public.has_host_role(auth.uid(), id, 'host'));

-- Host members: viewable by other members of same host; managed by Host role
CREATE POLICY "Host members visible to other members"
  ON public.host_members FOR SELECT
  USING (public.is_host_member(auth.uid(), host_id) OR user_id = auth.uid());

CREATE POLICY "Host role can add members"
  ON public.host_members FOR INSERT
  WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host'));

CREATE POLICY "Host role can remove members"
  ON public.host_members FOR DELETE
  USING (public.has_host_role(auth.uid(), host_id, 'host'));

-- =========================================================
-- HOST INVITES
-- =========================================================
CREATE TABLE public.host_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'base64'),
  role public.host_role NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_host_invites_token ON public.host_invites(token);

ALTER TABLE public.host_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host members can view invites"
  ON public.host_invites FOR SELECT
  USING (public.has_host_role(auth.uid(), host_id, 'host'));

CREATE POLICY "Host role can create invites"
  ON public.host_invites FOR INSERT
  WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host') AND auth.uid() = created_by);

CREATE POLICY "Host role can delete invites"
  ON public.host_invites FOR DELETE
  USING (public.has_host_role(auth.uid(), host_id, 'host'));

-- Function to redeem an invite (security definer to read invite + insert membership atomically)
CREATE OR REPLACE FUNCTION public.redeem_host_invite(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite public.host_invites%ROWTYPE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_invite FROM public.host_invites WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invite'; END IF;
  IF v_invite.used_at IS NOT NULL THEN RAISE EXCEPTION 'Invite already used'; END IF;
  IF v_invite.expires_at < now() THEN RAISE EXCEPTION 'Invite expired'; END IF;

  INSERT INTO public.host_members (host_id, user_id, role)
  VALUES (v_invite.host_id, v_uid, v_invite.role)
  ON CONFLICT DO NOTHING;

  UPDATE public.host_invites SET used_at = now(), used_by = v_uid WHERE id = v_invite.id;
  RETURN v_invite.host_id;
END;
$$;

-- =========================================================
-- EVENTS
-- =========================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  venue_address TEXT,
  online_link TEXT,
  capacity INTEGER NOT NULL DEFAULT 50 CHECK (capacity > 0),
  cover_url TEXT,
  visibility public.event_visibility NOT NULL DEFAULT 'public',
  status public.event_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_host ON public.events(host_id);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_events_status_visibility ON public.events(status, visibility);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Anyone can view published events; host members can view all of their events (incl drafts)
CREATE POLICY "Published events viewable by everyone"
  ON public.events FOR SELECT
  USING (status = 'published' OR public.is_host_member(auth.uid(), host_id));

CREATE POLICY "Host role can insert events"
  ON public.events FOR INSERT
  WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host') AND auth.uid() = created_by);

CREATE POLICY "Host role can update events"
  ON public.events FOR UPDATE
  USING (public.has_host_role(auth.uid(), host_id, 'host'));

CREATE POLICY "Host role can delete events"
  ON public.events FOR DELETE
  USING (public.has_host_role(auth.uid(), host_id, 'host'));

-- =========================================================
-- RSVPS
-- =========================================================
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.rsvp_status NOT NULL,
  ticket_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  waitlist_position INTEGER,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce one active RSVP per user per event (active = not cancelled)
CREATE UNIQUE INDEX idx_rsvps_active_unique
  ON public.rsvps(event_id, user_id)
  WHERE status <> 'cancelled';

CREATE INDEX idx_rsvps_event ON public.rsvps(event_id, status);
CREATE INDEX idx_rsvps_user ON public.rsvps(user_id);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER rsvps_updated_at BEFORE UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Users see their own RSVPs; host members see all RSVPs for their events
CREATE POLICY "Users can view their own RSVPs"
  ON public.rsvps FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_host_member(auth.uid(), e.host_id)
    )
  );

-- All writes go through SECURITY DEFINER functions (no direct insert/update from client)

-- =========================================================
-- RSVP / CHECK-IN FUNCTIONS (transactional)
-- =========================================================

-- Create or restore an RSVP
CREATE OR REPLACE FUNCTION public.rsvp_to_event(_event_id UUID)
RETURNS public.rsvps
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event public.events%ROWTYPE;
  v_confirmed_count INTEGER;
  v_existing public.rsvps%ROWTYPE;
  v_result public.rsvps;
  v_status public.rsvp_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  -- Lock the event row to serialize concurrent RSVPs
  SELECT * INTO v_event FROM public.events WHERE id = _event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF v_event.status <> 'published' THEN RAISE EXCEPTION 'Event not published'; END IF;
  IF v_event.ends_at < now() THEN RAISE EXCEPTION 'Event has ended'; END IF;

  -- Check for existing active RSVP
  SELECT * INTO v_existing FROM public.rsvps
    WHERE event_id = _event_id AND user_id = v_uid AND status <> 'cancelled';
  IF FOUND THEN RETURN v_existing; END IF;

  SELECT count(*) INTO v_confirmed_count FROM public.rsvps
    WHERE event_id = _event_id AND status = 'confirmed';

  IF v_confirmed_count < v_event.capacity THEN
    v_status := 'confirmed';
  ELSE
    v_status := 'waitlisted';
  END IF;

  INSERT INTO public.rsvps (event_id, user_id, status)
  VALUES (_event_id, v_uid, v_status)
  RETURNING * INTO v_result;

  -- Notify
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_uid,
    CASE WHEN v_status = 'confirmed' THEN 'rsvp_confirmed' ELSE 'rsvp_waitlisted' END,
    CASE WHEN v_status = 'confirmed' THEN 'You''re going to ' || v_event.title ELSE 'Added to waitlist for ' || v_event.title END,
    NULL,
    '/events/' || v_event.id
  );

  RETURN v_result;
END;
$$;

-- Cancel an RSVP and promote next waitlisted
CREATE OR REPLACE FUNCTION public.cancel_rsvp(_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event public.events%ROWTYPE;
  v_was_confirmed BOOLEAN;
  v_promote public.rsvps%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = _event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  UPDATE public.rsvps
  SET status = 'cancelled'
  WHERE event_id = _event_id AND user_id = v_uid AND status <> 'cancelled'
  RETURNING (status = 'confirmed') INTO v_was_confirmed;

  -- If a confirmed seat opened up, promote the oldest waitlisted
  IF v_was_confirmed THEN
    SELECT * INTO v_promote FROM public.rsvps
      WHERE event_id = _event_id AND status = 'waitlisted'
      ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
    IF FOUND THEN
      UPDATE public.rsvps SET status = 'confirmed' WHERE id = v_promote.id;
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_promote.user_id,
        'waitlist_promoted',
        'You''re in! ' || v_event.title,
        'A spot opened up and you''ve been moved off the waitlist.',
        '/events/' || v_event.id
      );
    END IF;
  END IF;
END;
$$;

-- Promote waitlist when capacity changes (called from a trigger)
CREATE OR REPLACE FUNCTION public.promote_waitlist_for_event(_event_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_confirmed INTEGER;
  v_seats INTEGER;
  v_promote public.rsvps%ROWTYPE;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = _event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT count(*) INTO v_confirmed FROM public.rsvps
    WHERE event_id = _event_id AND status = 'confirmed';
  v_seats := v_event.capacity - v_confirmed;

  WHILE v_seats > 0 LOOP
    SELECT * INTO v_promote FROM public.rsvps
      WHERE event_id = _event_id AND status = 'waitlisted'
      ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
    EXIT WHEN NOT FOUND;
    UPDATE public.rsvps SET status = 'confirmed' WHERE id = v_promote.id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_promote.user_id,
      'waitlist_promoted',
      'You''re in! ' || v_event.title,
      'Capacity increased — you''ve been moved off the waitlist.',
      '/events/' || v_event.id
    );
    v_seats := v_seats - 1;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Trigger: capacity bump auto-promotes
CREATE OR REPLACE FUNCTION public.events_capacity_changed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.capacity > OLD.capacity THEN
    PERFORM public.promote_waitlist_for_event(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_capacity_changed
  AFTER UPDATE OF capacity ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_capacity_changed();

-- Check-in by ticket code
CREATE OR REPLACE FUNCTION public.check_in_by_code(_event_id UUID, _code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event public.events%ROWTYPE;
  v_rsvp public.rsvps%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_event FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF NOT public.is_host_member(v_uid, v_event.host_id) THEN
    RAISE EXCEPTION 'Not authorized to check in';
  END IF;

  SELECT * INTO v_rsvp FROM public.rsvps
    WHERE event_id = _event_id AND ticket_code = upper(trim(_code))
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;
  IF v_rsvp.status <> 'confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_confirmed', 'status', v_rsvp.status);
  END IF;
  IF v_rsvp.checked_in_at IS NOT NULL THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_rsvp.user_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'already_checked_in',
      'rsvp_id', v_rsvp.id, 'name', v_profile.display_name, 'at', v_rsvp.checked_in_at);
  END IF;

  UPDATE public.rsvps SET checked_in_at = now(), checked_in_by = v_uid
    WHERE id = v_rsvp.id;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_rsvp.user_id;
  RETURN jsonb_build_object('ok', true, 'rsvp_id', v_rsvp.id,
    'name', v_profile.display_name, 'email', v_profile.email);
END;
$$;

-- Undo last check-in
CREATE OR REPLACE FUNCTION public.undo_check_in(_rsvp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rsvp public.rsvps%ROWTYPE;
  v_event public.events%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_rsvp FROM public.rsvps WHERE id = _rsvp_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_event FROM public.events WHERE id = v_rsvp.event_id;
  IF NOT public.is_host_member(v_uid, v_event.host_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.rsvps SET checked_in_at = NULL, checked_in_by = NULL WHERE id = _rsvp_id;
  RETURN true;
END;
$$;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE USING (user_id = auth.uid());

-- =========================================================
-- EVENT PHOTOS
-- =========================================================
CREATE TABLE public.event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  status public.photo_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_photos_event ON public.event_photos(event_id, status);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved photos are public; pending visible to uploader and host members"
  ON public.event_photos FOR SELECT
  USING (
    status = 'approved'
    OR uploader_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_host_member(auth.uid(), e.host_id))
  );

CREATE POLICY "Authenticated users can upload photos"
  ON public.event_photos FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Host role can moderate photos"
  ON public.event_photos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.has_host_role(auth.uid(), e.host_id, 'host')));

CREATE POLICY "Uploader or Host can delete photo"
  ON public.event_photos FOR DELETE
  USING (
    uploader_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.has_host_role(auth.uid(), e.host_id, 'host'))
  );

-- =========================================================
-- EVENT FEEDBACK
-- =========================================================
CREATE TABLE public.event_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback visible to event host members and own user"
  ON public.event_feedback FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_host_member(auth.uid(), e.host_id))
  );

CREATE POLICY "Users submit own feedback after event ends"
  ON public.event_feedback FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.ends_at <= now())
  );

CREATE POLICY "Users can update own feedback"
  ON public.event_feedback FOR UPDATE USING (user_id = auth.uid());

-- =========================================================
-- REPORTS
-- =========================================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  host_id UUID REFERENCES public.hosts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status public.report_status NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_host ON public.reports(host_id, status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter and host members can view reports"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid() OR (host_id IS NOT NULL AND public.is_host_member(auth.uid(), host_id)));

CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Host role can update reports"
  ON public.reports FOR UPDATE
  USING (host_id IS NOT NULL AND public.has_host_role(auth.uid(), host_id, 'host'));

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('host-logos', 'host-logos', true),
  ('event-covers', 'event-covers', true),
  ('event-photos', 'event-photos', true)
ON CONFLICT DO NOTHING;

-- Storage policies (apply to storage.objects)
CREATE POLICY "Public read host-logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'host-logos');

CREATE POLICY "Authenticated upload host-logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'host-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update own host-logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'host-logos' AND auth.uid() = owner);

CREATE POLICY "Authenticated delete own host-logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'host-logos' AND auth.uid() = owner);

CREATE POLICY "Public read event-covers"
  ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');

CREATE POLICY "Authenticated upload event-covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update own event-covers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-covers' AND auth.uid() = owner);

CREATE POLICY "Authenticated delete own event-covers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-covers' AND auth.uid() = owner);

CREATE POLICY "Public read event-photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'event-photos');

CREATE POLICY "Authenticated upload event-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Uploader can delete own event-photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-photos' AND auth.uid() = owner);
