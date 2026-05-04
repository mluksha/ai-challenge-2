import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtRelativeDay, eventEnded } from "@/lib/format";
import { Search } from "lucide-react";

export default function MyEvents() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [hostFilter, setHostFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "My events · Gather"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: mems } = await supabase
        .from("host_members").select("host_id,role,hosts(id,name,slug)").eq("user_id", user.id);
      setMemberships(mems ?? []);
      const hostIds = (mems ?? []).map((m: any) => m.host_id);
      if (hostIds.length === 0) { setLoading(false); return; }
      const { data: ev } = await supabase
        .from("events").select("id,title,starts_at,ends_at,status,host_id,hosts(id,name,slug)")
        .in("host_id", hostIds).order("starts_at", { ascending: false });
      setEvents(ev ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  const roleFor = (hostId: string) =>
    memberships.find((m) => m.host_id === hostId)?.role as "host" | "checker" | undefined;

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return events.filter((e) => {
      if (hostFilter !== "all" && e.host_id !== hostFilter) return false;
      if (ql && !e.title.toLowerCase().includes(ql)) return false;
      const startTs = new Date(e.starts_at).getTime();
      if (fromTs !== null && startTs < fromTs) return false;
      if (toTs !== null && startTs > toTs) return false;
      return true;
    });
  }, [events, hostFilter, q, dateFrom, dateTo]);

  if (loading) return <div className="container-tight py-16 text-sm text-muted-foreground">Loading…</div>;

  if (memberships.length === 0) {
    return (
      <div className="container-tight py-16 text-center">
        <h1 className="text-xl font-semibold">You're not part of any host yet</h1>
        <p className="text-sm text-muted-foreground mt-2">Create your own host or accept an invite link to get started.</p>
        <Link to="/become-host" className="text-primary hover:underline text-sm mt-4 inline-block">Become a host</Link>
      </div>
    );
  }

  return (
    <div className="container-wide py-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My events</h1>
          <p className="text-sm text-muted-foreground mt-1">Events across all the hosts you belong to.</p>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" className="pl-9" />
          </div>
          <Select value={hostFilter} onValueChange={setHostFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All hosts</SelectItem>
              {memberships.map((m) => (
                <SelectItem key={m.host_id} value={m.host_id}>{m.hosts?.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">No events match.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => {
            const role = roleFor(e.host_id);
            const ended = eventEnded(e.ends_at);
            return (
              <Card key={e.id} className="p-4">
                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                  <span>{fmtRelativeDay(e.starts_at)}</span>
                  {e.status === "draft" && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                  {ended && <Badge variant="secondary" className="text-[10px]">Ended</Badge>}
                </div>
                <div className="font-medium mt-1">{e.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{e.hosts?.name}</div>
                <div className="mt-3 flex gap-2 text-xs">
                  {role === "host" && (
                    <>
                      <Link to={`/host/${e.host_id}/events/${e.id}/edit`} className="px-2 py-1 rounded bg-secondary hover:bg-accent">Edit</Link>
                      <Link to={`/host/${e.host_id}/dashboard`} className="px-2 py-1 rounded bg-secondary hover:bg-accent">Dashboard</Link>
                    </>
                  )}
                  <Link to={`/host/${e.host_id}/events/${e.id}/checkin`} className="px-2 py-1 rounded bg-secondary hover:bg-accent">Check-in</Link>
                  <Link to={`/events/${e.id}`} className="px-2 py-1 rounded bg-secondary hover:bg-accent">View</Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
