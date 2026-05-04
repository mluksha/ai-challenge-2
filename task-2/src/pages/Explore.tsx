import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtRelativeDay, eventEnded } from "@/lib/format";
import { Search, MapPin, CalendarDays } from "lucide-react";

interface EventRow {
  id: string; title: string; description: string | null;
  starts_at: string; ends_at: string; venue_address: string | null;
  online_link: string | null; cover_url: string | null; capacity: number;
  hosts: { id: string; name: string; slug: string; logo_url: string | null } | null;
}

export default function Explore() {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Explore events · Gather"; }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("events")
        .select("id,title,description,starts_at,ends_at,venue_address,online_link,cover_url,capacity,hosts(id,name,slug,logo_url)")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("starts_at", { ascending: true })
        .limit(100);
      if (!includePast) query = query.gte("ends_at", new Date().toISOString());
      const { data } = await query;
      if (!cancelled) { setEvents((data ?? []) as any); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [includePast]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const ll = location.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return events.filter((e) => {
      if (ql && !(`${e.title} ${e.description ?? ""}`.toLowerCase().includes(ql))) return false;
      if (ll && !((e.venue_address ?? "").toLowerCase().includes(ll))) return false;
      const startTs = new Date(e.starts_at).getTime();
      if (fromTs !== null && startTs < fromTs) return false;
      if (toTs !== null && startTs > toTs) return false;
      return true;
    });
  }, [events, q, location, dateFrom, dateTo]);

  return (
    <div className="container-wide py-8">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Explore events</h1>
          <p className="text-sm text-muted-foreground mt-1">Discover what your community is hosting.</p>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="q" className="text-xs">Search</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or description" className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc" className="text-xs">Location</Label>
            <div className="relative">
              <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or venue" className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch id="past" checked={includePast} onCheckedChange={setIncludePast} />
            <Label htmlFor="past" className="text-sm">Include past events</Label>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="font-medium">No events match your filters</div>
          <div className="text-sm text-muted-foreground mt-1">Try widening your search or checking back soon.</div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => <EventCard key={e.id} e={e} />)}
        </div>
      )}
    </div>
  );
}

function EventCard({ e }: { e: EventRow }) {
  const ended = eventEnded(e.ends_at);
  return (
    <Link to={`/events/${e.id}`} className="group">
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="aspect-video bg-secondary relative">
          {e.cover_url ? (
            <img src={e.cover_url} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <CalendarDays className="h-8 w-8" />
            </div>
          )}
          {ended && <Badge variant="secondary" className="absolute top-2 left-2">Ended</Badge>}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="text-xs text-muted-foreground">{fmtRelativeDay(e.starts_at)}</div>
          <div className="font-medium leading-snug mt-1 group-hover:text-primary transition-colors">{e.title}</div>
          <div className="text-xs text-muted-foreground mt-2 truncate">
            {e.venue_address || (e.online_link ? "Online" : "Location TBA")}
          </div>
          {e.hosts && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
              <span>by {e.hosts.name}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
