import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtRelativeDay, eventEnded } from "@/lib/format";
import { CalendarDays } from "lucide-react";

export default function HostPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: h } = await supabase.from("hosts").select("*").eq("slug", slug!).maybeSingle();
      setHost(h);
      if (h) {
        const { data: ev } = await supabase
          .from("events")
          .select("id,title,starts_at,ends_at,cover_url,venue_address")
          .eq("host_id", h.id).eq("status", "published").eq("visibility", "public")
          .order("starts_at", { ascending: false }).limit(50);
        setEvents(ev ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => { if (host) document.title = `${host.name} · Gather`; }, [host]);

  if (loading) return <div className="container-tight py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!host) return <div className="container-tight py-16"><h1 className="text-xl font-semibold">Host not found</h1></div>;

  const upcoming = events.filter((e) => !eventEnded(e.ends_at));
  const past = events.filter((e) => eventEnded(e.ends_at));

  return (
    <div className="container-wide py-10">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-xl bg-secondary overflow-hidden flex items-center justify-center text-xl font-medium">
          {host.logo_url ? <img src={host.logo_url} alt="" className="w-full h-full object-cover" /> : host.name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{host.name}</h1>
          {host.bio && <p className="text-sm text-muted-foreground mt-1 max-w-prose">{host.bio}</p>}
        </div>
      </div>

      <Section title="Upcoming events" events={upcoming} empty="No upcoming events." />
      <Section title="Past events" events={past} empty="" />
    </div>
  );
}

function Section({ title, events, empty }: { title: string; events: any[]; empty: string }) {
  if (events.length === 0 && !empty) return null;
  return (
    <div className="mt-10">
      <h2 className="text-lg font-medium mb-4">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <Link key={e.id} to={`/events/${e.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-secondary">
                  {e.cover_url ? <img src={e.cover_url} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><CalendarDays className="h-6 w-6" /></div>}
                </div>
                <div className="p-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{fmtRelativeDay(e.starts_at)}</span>
                    {eventEnded(e.ends_at) && <Badge variant="secondary" className="text-[10px]">Ended</Badge>}
                  </div>
                  <div className="font-medium mt-1">{e.title}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
