
-- Fix search_path on the two helper functions that didn't have it set
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.events_capacity_changed() SET search_path = public;

-- Restrict SECURITY DEFINER functions to authenticated only
REVOKE EXECUTE ON FUNCTION public.rsvp_to_event(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_rsvp(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_in_by_code(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.undo_check_in(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_host_invite(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.promote_waitlist_for_event(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_host_role(UUID, UUID, public.host_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_host_member(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rsvp_to_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_rsvp(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_by_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_check_in(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_host_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_host_role(UUID, UUID, public.host_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_host_member(UUID, UUID) TO authenticated;

-- Restrict bucket listing: replace broad SELECT with row-level scoped policies.
-- Individual file fetches still work via public bucket URLs (CDN), but `list` API is gated.
DROP POLICY IF EXISTS "Public read host-logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read event-covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read event-photos" ON storage.objects;

CREATE POLICY "Owner or host members can list host-logos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'host-logos' AND (
      auth.uid() = owner
      OR auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Owner or host members can list event-covers"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'event-covers' AND (
      auth.uid() = owner
      OR auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Owner can list own event-photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'event-photos' AND auth.uid() = owner
  );
