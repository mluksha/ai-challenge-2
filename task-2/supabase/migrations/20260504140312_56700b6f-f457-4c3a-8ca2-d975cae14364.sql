ALTER TABLE public.rsvps DROP CONSTRAINT IF EXISTS rsvps_user_id_fkey;

ALTER TABLE public.rsvps
  ADD CONSTRAINT rsvps_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;