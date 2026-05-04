import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtRelativeDay, eventEnded } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";

export default function HostDashboard() {
  const { hostId } = useParams<{ hostId: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { confirmed: number; waitlist: number; checked_in: number }>>({});

  const load = async () => {
    const { data } = await supabase
      .from("events").select("id,title,starts_at,ends_at,status,capacity,visibility")
      .eq("host_id", hostId!).order("starts_at", { ascending: false });
    setEvents(data ?? []);
    const ids = (data ?? []).map((e) => e.id);
    if (ids.length === 0) return;
    const { data: r } = await supabase.from("rsvps").select("event_id,status,checked_in_at").in("event_id", ids);
    const s: typeof stats = {};
    for (const id of ids) s[id] = { confirmed: 0, waitlist: 0, checked_in: 0 };
    for (const row of r ?? []) {
      if (row.status === "confirmed") s[row.event_id].confirmed++;
      else if (row.status === "waitlisted") s[row.event_id].waitlist++;
      if (row.checked_in_at) s[row.event_id].checked_in++;
    }
    setStats(s);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hostId]);

  const exportRsvps = async (eventId: string, title: string) => {
    const { data } = await supabase
      .from("rsvps")
      .select("status,checked_in_at,ticket_code,profiles:user_id(display_name,email)")
      .eq("event_id", eventId);
    const rows = (data ?? []).map((r: any) => ({
      Name: r.profiles?.display_name ?? "",
      Email: r.profiles?.email ?? "",
      "RSVP status": r.status,
      "Check-in time": r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : "",
    }));
    if (rows.length === 0) { toast("No RSVPs to export"); return; }
    downloadCSV(`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-rsvps.csv`, rows);
  };

  const upcoming = events.filter((e) => !eventEnded(e.ends_at));
  const past = events.filter((e) => eventEnded(e.ends_at));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <Button asChild size="sm"><Link to={`/host/${hostId}/events/new`}><Plus className="h-4 w-4 mr-1.5" />New event</Link></Button>
      </div>

      <Section title="Upcoming" events={upcoming} stats={stats} hostId={hostId!} onExport={exportRsvps} empty="No upcoming events. Create one to get started." />
      <Section title="Past" events={past} stats={stats} hostId={hostId!} onExport={exportRsvps} empty="" />
    </div>
  );
}

function Section({ title, events, stats, hostId, onExport, empty }: any) {
  if (events.length === 0 && !empty) return null;
  return (
    <div className="mt-8">
      <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
      {events.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{empty}</Card>
      ) : (
        <div className="space-y-2">
          {events.map((e: any) => {
            const s = stats[e.id] ?? { confirmed: 0, waitlist: 0, checked_in: 0 };
            return (
              <Card key={e.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{fmtRelativeDay(e.starts_at)}</span>
                    {e.status === "draft" && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                    {e.visibility === "unlisted" && <Badge variant="outline" className="text-[10px]">Unlisted</Badge>}
                  </div>
                  <Link to={`/events/${e.id}`} className="font-medium hover:text-primary block mt-1 truncate">{e.title}</Link>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Stat label="Going" value={`${s.confirmed} / ${e.capacity}`} />
                  <Stat label="Waitlist" value={s.waitlist} />
                  <Stat label="Checked-in" value={s.checked_in} />
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm"><Link to={`/host/${hostId}/events/${e.id}/edit`}>Edit</Link></Button>
                  <Button asChild variant="outline" size="sm"><Link to={`/host/${hostId}/events/${e.id}/checkin`}>Check-in</Link></Button>
                  <Button variant="ghost" size="sm" onClick={() => onExport(e.id, e.title)}><Download className="h-4 w-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="text-center"><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}
