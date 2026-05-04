import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { fmtRelativeDay, fmtDateTime } from "@/lib/format";
import { downloadICS } from "@/lib/ics";
import { CalendarPlus, Copy, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function TicketDetail() {
  const { rsvpId } = useParams<{ rsvpId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rsvp, setRsvp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rsvpId) return;
    (async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("id,status,ticket_code,checked_in_at,user_id,events(id,title,description,starts_at,ends_at,venue_address,online_link,cover_url)")
        .eq("id", rsvpId).maybeSingle();
      setRsvp(data); setLoading(false);
    })();
  }, [rsvpId]);

  useEffect(() => { if (rsvp?.events) document.title = `Ticket · ${rsvp.events.title}`; }, [rsvp]);

  if (loading) return <div className="container-tight py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!rsvp || rsvp.user_id !== user?.id) return (
    <div className="container-tight py-16">
      <h1 className="text-xl font-semibold">Ticket not found</h1>
      <Link to="/my-tickets" className="text-sm text-primary hover:underline mt-2 inline-block">Back to my tickets</Link>
    </div>
  );

  const ev = rsvp.events;

  const handleCancel = async () => {
    if (!confirm("Cancel this RSVP? If someone is on the waitlist, they'll be moved up.")) return;
    const { error } = await supabase.rpc("cancel_rsvp", { _event_id: ev.id });
    if (error) { toast.error(error.message); return; }
    toast("RSVP cancelled");
    navigate("/my-tickets");
  };

  const copyCode = () => { navigator.clipboard.writeText(rsvp.ticket_code); toast.success("Code copied"); };

  return (
    <div className="container-tight py-8 max-w-xl">
      <Link to="/my-tickets" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> My tickets
      </Link>

      <Card className="overflow-hidden">
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">Your ticket</div>
            <div className="font-medium">{ev.title}</div>
          </div>
          <Badge variant="secondary">{rsvp.status === "confirmed" ? "Going" : "Waitlist"}</Badge>
        </div>

        <div className="p-6">
          {rsvp.status === "confirmed" ? (
            <>
              <div className="bg-white p-4 rounded-lg flex items-center justify-center border">
                <QRCodeSVG value={rsvp.ticket_code} size={180} level="M" />
              </div>
              <div className="text-center mt-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Manual code</div>
                <div className="font-mono text-2xl tracking-widest font-semibold mt-1">{rsvp.ticket_code}</div>
                <button onClick={copyCode} className="mt-2 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <Copy className="h-3 w-3" /> Copy code
                </button>
              </div>
              {rsvp.checked_in_at && (
                <div className="mt-4 text-center text-sm text-success font-medium">
                  ✓ Checked in at {fmtDateTime(rsvp.checked_in_at)}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-6">
              You're on the waitlist. We'll notify you the moment a spot opens up.
            </div>
          )}

          <div className="mt-6 pt-6 border-t space-y-2 text-sm">
            <div><span className="text-muted-foreground">When:</span> {fmtRelativeDay(ev.starts_at)}</div>
            {ev.venue_address && <div><span className="text-muted-foreground">Where:</span> {ev.venue_address}</div>}
            {ev.online_link && <div><span className="text-muted-foreground">Link:</span> <a href={ev.online_link} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">{ev.online_link}</a></div>}
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => downloadICS({
              uid: `gather-${rsvp.id}`, title: ev.title, description: ev.description ?? undefined,
              location: ev.venue_address ?? ev.online_link ?? undefined,
              startsAt: ev.starts_at, endsAt: ev.ends_at,
            })}>
              <CalendarPlus className="h-4 w-4 mr-2" /> Add to calendar
            </Button>
            <Button asChild variant="outline"><Link to={`/events/${ev.id}`}>Event page</Link></Button>
          </div>

          <button onClick={handleCancel} className="w-full text-center text-sm text-destructive hover:underline mt-4">
            Cancel RSVP
          </button>
        </div>
      </Card>
    </div>
  );
}
