import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtRelativeDay, eventEnded } from "@/lib/format";
import { CalendarDays, MapPin, Link as LinkIcon, Users, Flag, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import EventGallery from "@/components/EventGallery";
import EventFeedback from "@/components/EventFeedback";
import ReportDialog from "@/components/ReportDialog";

interface Event {
  id: string; title: string; description: string | null; starts_at: string; ends_at: string;
  venue_address: string | null; online_link: string | null; cover_url: string | null;
  capacity: number; status: string; visibility: string;
  hosts: { id: string; name: string; slug: string; bio: string | null; logo_url: string | null } | null;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(0);
  const [waitlist, setWaitlist] = useState(0);
  const [myRsvp, setMyRsvp] = useState<{ id: string; status: string; ticket_code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const intentHandled = useRef(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: ev } = await supabase
      .from("events")
      .select("id,title,description,starts_at,ends_at,venue_address,online_link,cover_url,capacity,status,visibility,hosts(id,name,slug,bio,logo_url)")
      .eq("id", id).maybeSingle();
    setEvent(ev as any);

    const [{ count: c }, { count: w }] = await Promise.all([
      supabase.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "confirmed"),
      supabase.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "waitlisted"),
    ]);
    setConfirmed(c ?? 0); setWaitlist(w ?? 0);

    if (user) {
      const { data: r } = await supabase.from("rsvps")
        .select("id,status,ticket_code").eq("event_id", id).eq("user_id", user.id).neq("status", "cancelled").maybeSingle();
      setMyRsvp(r as any);
    } else {
      setMyRsvp(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);
  useEffect(() => { if (event) document.title = `${event.title} · Gather`; }, [event]);

  // OG / social metadata
  useEffect(() => {
    if (!event) return;
    const setMeta = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("og:title", event.title);
    setMeta("og:description", (event.description ?? "").slice(0, 200));
    if (event.cover_url) setMeta("og:image", event.cover_url);
    setMeta("og:type", "website");
    let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!desc) { desc = document.createElement("meta"); desc.name = "description"; document.head.appendChild(desc); }
    desc.content = (event.description ?? "").slice(0, 160);
  }, [event]);

  // Auto-resume RSVP after sign-in (must run before early returns)
  useEffect(() => {
    if (intentHandled.current) return;
    if (loading || !event) return;
    if (!user) return;
    if (searchParams.get("intent") !== "rsvp") return;
    if (myRsvp) {
      intentHandled.current = true;
      const sp = new URLSearchParams(searchParams); sp.delete("intent");
      setSearchParams(sp, { replace: true });
      return;
    }
    if (eventEnded(event.ends_at)) return;
    intentHandled.current = true;
    (async () => {
      const { data, error } = await supabase.rpc("rsvp_to_event", { _event_id: event.id });
      const sp = new URLSearchParams(searchParams); sp.delete("intent");
      setSearchParams(sp, { replace: true });
      if (error) { toast.error(error.message); return; }
      toast.success(data?.status === "confirmed" ? "You're going!" : "Added to waitlist");
      load();
    })();
    // eslint-disable-next-line
  }, [user, loading, event, myRsvp]);

  if (loading) return <div className="container-tight py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!event) return <div className="container-tight py-16">
    <h1 className="text-xl font-semibold">Event not found</h1>
    <Link to="/explore" className="text-sm text-primary hover:underline mt-2 inline-block">Back to explore</Link>
  </div>;

  const ended = eventEnded(event.ends_at);
  const seatsLeft = Math.max(0, event.capacity - confirmed);
  const isFull = seatsLeft === 0;

  const handleRsvp = async () => {
    if (!user) {
      const next = `/events/${event.id}?intent=rsvp`;
      navigate(`/auth?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("rsvp_to_event", { _event_id: event.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(data?.status === "confirmed" ? "You're going!" : "Added to waitlist");
    load();
  };

  const handleCancel = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("cancel_rsvp", { _event_id: event.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast("RSVP cancelled");
    load();
  };

  return (
    <div className="container-wide py-8">
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div>
          <div className="aspect-video rounded-xl overflow-hidden bg-secondary">
            {event.cover_url ? (
              <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /></div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-2">
            {ended && <Badge variant="secondary">Ended</Badge>}
            {event.visibility === "unlisted" && <Badge variant="outline">Unlisted</Badge>}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">{event.title}</h1>

          {event.hosts && (
            <Link to={`/hosts/${event.hosts.slug}`} className="inline-flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-foreground">
              <div className="h-6 w-6 rounded bg-secondary overflow-hidden flex items-center justify-center text-xs">
                {event.hosts.logo_url ? <img src={event.hosts.logo_url} alt="" className="w-full h-full object-cover" /> : event.hosts.name[0]}
              </div>
              by {event.hosts.name}
            </Link>
          )}

          <div className="mt-6 prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
            {event.description || <span className="text-muted-foreground">No description provided.</span>}
          </div>

          <div className="mt-8 border-t pt-6">
            <EventGallery eventId={event.id} hostId={event.hosts?.id ?? ""} ended={ended} />
          </div>

          {ended && (
            <div className="mt-8 border-t pt-6">
              <EventFeedback eventId={event.id} />
            </div>
          )}
        </div>

        <aside>
          <Card className="p-5 sticky top-20">
            <div className="space-y-3 text-sm">
              <Row icon={<CalendarDays className="h-4 w-4" />}>
                <div>{fmtRelativeDay(event.starts_at)}</div>
                <div className="text-muted-foreground text-xs">until {new Date(event.ends_at).toLocaleString()}</div>
              </Row>
              {event.venue_address && <Row icon={<MapPin className="h-4 w-4" />}>{event.venue_address}</Row>}
              {event.online_link && <Row icon={<LinkIcon className="h-4 w-4" />}><a href={event.online_link} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{event.online_link}</a></Row>}
              <Row icon={<Users className="h-4 w-4" />}>
                {confirmed} going · {seatsLeft} seats left
                {waitlist > 0 && <span className="text-muted-foreground"> · {waitlist} on waitlist</span>}
              </Row>
            </div>

            <div className="mt-5 pt-5 border-t">
              {ended ? (
                <Button disabled className="w-full">Event ended</Button>
              ) : myRsvp ? (
                <div className="space-y-2">
                  <Badge className="w-full justify-center py-2" variant={myRsvp.status === "confirmed" ? "default" : "secondary"}>
                    {myRsvp.status === "confirmed" ? "You're going" : "On the waitlist"}
                  </Badge>
                  <Button asChild variant="outline" className="w-full"><Link to={`/tickets/${myRsvp.id}`}>View ticket</Link></Button>
                  <Button onClick={handleCancel} disabled={busy} variant="ghost" className="w-full text-destructive hover:text-destructive">
                    Cancel RSVP
                  </Button>
                </div>
              ) : (
                <Button onClick={handleRsvp} disabled={busy} className="w-full">
                  {!user ? "Sign in to RSVP" : isFull ? "Join waitlist" : "RSVP — Free"}
                </Button>
              )}
            </div>

            {user && (
              <button onClick={() => setReportOpen(true)} className="mt-4 text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                <Flag className="h-3 w-3" /> Report this event
              </button>
            )}
          </Card>
        </aside>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="event" targetId={event.id} hostId={event.hosts?.id ?? null} />
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex gap-3"><div className="text-muted-foreground mt-0.5">{icon}</div><div className="flex-1">{children}</div></div>;
}
